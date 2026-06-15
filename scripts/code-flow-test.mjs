// LIVE-USER test of the trip-CODE flow, driving the real UI in two browsers.
import { chromium } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = 'http://localhost:5173'
const stamp = Date.now()
const A_EMAIL = `cf-a-${stamp}@example.com`, B_EMAIL = `cf-b-${stamp}@example.com`, PASS = 'Test123456!'
let failures = 0
const check = (c, m) => { if (!c) failures++; console.log(`${c ? '✅' : '❌'} ${m}`) }

async function signup(page, email) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Create a login/i }).click()
  await page.getByPlaceholder('you@email.com').fill(email)
  await page.getByPlaceholder('Password').fill(PASS)
  await page.getByRole('button', { name: /Create & enter/i }).click()
}
async function dismissIntro(page) {
  // The onboarding intro auto-finishes (~4.5s) and reveals the choice screen.
  // Just wait for it — clicking risks hitting an onboarding button underneath.
  await page.getByText(/Let.s get/i).waitFor({ state: 'visible', timeout: 14000 })
  await page.waitForTimeout(400)
}
const tripId = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('reed-apps-trip-store') || '{}')?.state?.activeTripId)

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
try {
  // ---- branding check ----
  const ctxL = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const L = await ctxL.newPage()
  await L.addInitScript(() => localStorage.setItem('reed-offline', '1'))
  await L.goto(BASE + '/', { waitUntil: 'networkidle' })
  const body = await L.locator('body').innerText()
  check(/supergoodtripleaders/i.test(body), 'launcher shows "supergoodtripleaders" branding')
  check(!/reed apps/i.test(body), 'no "Reed Apps" branding on launcher')
  await ctxL.close()

  // ---- A: create a trip ----
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const A = await ctxA.newPage()
  await signup(A, A_EMAIL)
  await dismissIntro(A)
  check(true, 'A signed up → onboarding choice screen')
  // Step-text-driven so we never race the intro/animations.
  const onStep = (p, heading) => p.getByText(heading, { exact: false }).first().waitFor({ state: 'visible', timeout: 14000 })
  const cont = (p) => p.getByRole('button', { name: /Continue/i }).click()
  await A.getByText('Start a new trip').click()
  await onStep(A, 'You, the leader')
  await A.getByPlaceholder(/Reed Ahlstrom/i).fill('Alice Leader', { force: true }); await cont(A)
  await onStep(A, 'Your co-leader'); await cont(A)
  await onStep(A, 'Parent builders'); await cont(A)
  await onStep(A, 'The builders')
  await A.getByPlaceholder(/Maddie/i).fill('Tom\nKate\nSam\nLily', { force: true }); await cont(A)
  await onStep(A, 'Trip dates'); await cont(A)
  await onStep(A, 'Ready to go')
  await A.getByRole('button', { name: /Enter trip/i }).click()
  await A.waitForURL(/\/trip$/, { timeout: 8000 })
  await A.waitForTimeout(2500)
  const aTripId = await tripId(A)
  check(!!aTripId, `A created a trip (${aTripId?.slice(0, 8)}…)`)

  // get the code from Settings
  await A.goto(BASE + '/trip/settings', { waitUntil: 'networkidle' })
  const codeEl = A.getByText(/^[A-Z2-9]{8}$/).first()
  await codeEl.waitFor({ timeout: 8000 })
  const code = (await codeEl.innerText()).trim()
  check(/^[A-Z2-9]{8}$/.test(code), `A's Settings shows a trip code (${code})`)

  // ---- B: join with the code ----
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const B = await ctxB.newPage()
  await signup(B, B_EMAIL)
  await dismissIntro(B)
  await B.getByText('Join with a code').click()
  await B.getByPlaceholder('Trip code').fill(code)
  await B.getByRole('button', { name: /Find/i }).click()
  await B.getByRole('button', { name: /Join this trip/i }).waitFor({ timeout: 8000 })
  check(true, 'B entered code and saw the trip preview')
  await B.getByRole('button', { name: /Join this trip/i }).click()
  await B.waitForURL(/\/trip$/, { timeout: 8000 })
  await B.waitForTimeout(2000)
  const bTripId = await tripId(B)
  check(bTripId === aTripId, `B joined the SAME trip (${bTripId?.slice(0, 8)}… == ${aTripId?.slice(0, 8)}…)`)

  await B.goto(BASE + '/trip/people', { waitUntil: 'networkidle' })
  await B.waitForTimeout(800)
  const btext = await B.locator('body').innerText()
  check(/Tom/.test(btext) && /Lily/.test(btext), 'B sees the roster A created (Tom…Lily)')
} catch (e) {
  failures++; console.log('❌ EXCEPTION:', e.message.split('\n')[0])
} finally {
  const { data } = await admin.auth.admin.listUsers()
  for (const u of (data?.users ?? [])) if (u.email === A_EMAIL || u.email === B_EMAIL) {
    await admin.from('trips').delete().eq('owner', u.id)
    await admin.auth.admin.deleteUser(u.id)
  }
  await browser.close()
  console.log(`\n${failures === 0 ? '✅ CODE-FLOW LIVE TEST PASSED' : `❌ ${failures} FAILURE(S)`}`)
  process.exit(failures === 0 ? 0 : 1)
}
