// LIVE-USER test: drive the real app UI in two browsers.
// Leader A signs up → onboards a trip → makes an invite link.
// Co-leader B opens that link → signs up → must land on the SAME trip.
import { chromium } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = 'http://localhost:5173'
const stamp = Date.now()
const A_EMAIL = `uitest-a-${stamp}@example.com`
const B_EMAIL = `uitest-b-${stamp}@example.com`
const PASS = 'Test123456!'
let failures = 0
const check = (c, m) => { if (!c) failures++; console.log(`${c ? '✅' : '❌'} ${m}`) }

async function signup(page, email) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Create a login/i }).click()
  await page.getByPlaceholder('you@email.com').fill(email)
  await page.getByPlaceholder('Password').fill(PASS)
  await page.getByRole('button', { name: /Create & enter/i }).click()
}

async function activeTripId(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('reed-apps-trip-store') || '{}')?.state?.activeTripId)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
try {
  // ---------- Leader A ----------
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const A = await ctxA.newPage()
  await signup(A, A_EMAIL)
  console.log('A signed up')

  // onboarding intro → skip
  await A.waitForTimeout(1500)
  await A.locator('body').click({ position: { x: 195, y: 700 } }).catch(() => {})
  await A.waitForTimeout(800)
  // welcome → continue
  await A.getByRole('button', { name: /Continue/i }).click()
  // leader name
  await A.getByPlaceholder(/Reed Ahlstrom/i).fill('Alice Leader')
  await A.getByRole('button', { name: /Continue/i }).click()
  // co-leader (skip)
  await A.getByRole('button', { name: /Continue/i }).click()
  // parents (skip)
  await A.getByRole('button', { name: /Continue/i }).click()
  // builders
  await A.getByPlaceholder(/Maddie/i).fill('Tom\nKate\nSam\nLily')
  await A.getByRole('button', { name: /Continue/i }).click()
  // dates → continue
  await A.getByRole('button', { name: /Continue/i }).click()
  // review → enter trip
  await A.getByRole('button', { name: /Enter trip/i }).click()
  await A.waitForURL(/\/trip$/, { timeout: 8000 })
  check(true, 'A completed onboarding → dashboard')
  await A.waitForTimeout(2500) // let sync push the trip

  const aTripId = await activeTripId(A)
  check(!!aTripId, `A has a trip id (${aTripId?.slice(0, 8)}…)`)

  // create invite link
  await A.goto(BASE + '/trip/settings', { waitUntil: 'networkidle' })
  await A.getByRole('button', { name: /Create invite link/i }).click()
  await A.waitForTimeout(1500)
  const linkText = await A.getByText(/\/join\//).first().textContent()
  const code = linkText?.match(/\/join\/([A-Za-z0-9]+)/)?.[1]
  check(!!code, `A created an invite link (code ${code})`)

  // ---------- Co-leader B ----------
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const B = await ctxB.newPage()
  await B.goto(`${BASE}/join/${code}`, { waitUntil: 'networkidle' })
  // signup as B (pending_invite captured)
  await B.getByRole('button', { name: /Create a login/i }).click()
  await B.getByPlaceholder('you@email.com').fill(B_EMAIL)
  await B.getByPlaceholder('Password').fill(PASS)
  await B.getByRole('button', { name: /Create & enter/i }).click()
  await B.waitForTimeout(4000) // redeem + navigate + sync

  const bTripId = await activeTripId(B)
  check(bTripId === aTripId, `B landed on the SAME trip id as A (${bTripId?.slice(0, 8)}… == ${aTripId?.slice(0, 8)}…)`)

  // B sees A's builders
  await B.goto(BASE + '/trip/people', { waitUntil: 'networkidle' })
  await B.waitForTimeout(1000)
  for (const name of ['Tom', 'Kate', 'Sam', 'Lily']) {
    const seen = await B.getByText(name, { exact: false }).count()
    check(seen > 0, `B sees builder "${name}" on the shared trip`)
  }

  // B adds a builder → A should see it (live)
  // (skip heavy UI add; covered by data-check) — instead verify reload persistence for A
  await A.reload({ waitUntil: 'networkidle' })
  await A.waitForTimeout(1500)
  await A.goto(BASE + '/trip/people', { waitUntil: 'networkidle' })
  const aStillHas = await A.getByText('Tom', { exact: false }).count()
  check(aStillHas > 0, 'A reloaded the app and the roster persisted (nothing lost)')
} catch (e) {
  failures++
  console.log('❌ EXCEPTION:', e.message)
} finally {
  // cleanup users + their trips
  const { data } = await admin.auth.admin.listUsers()
  for (const u of (data?.users ?? [])) {
    if (u.email === A_EMAIL || u.email === B_EMAIL) {
      await admin.from('trips').delete().eq('owner', u.id).catch(() => {})
      await admin.auth.admin.deleteUser(u.id).catch(() => {})
    }
  }
  await browser.close()
  console.log(`\n${failures === 0 ? '✅ LIVE-USER TEST PASSED' : `❌ ${failures} FAILURE(S)`}`)
  process.exit(failures === 0 ? 0 : 1)
}
