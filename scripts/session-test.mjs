// Session persistence: sign in once → reload and reopen (new context) →
// still logged in (no re-login) and the trip + roster are right there.
import { chromium } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = 'http://localhost:5173'
const EMAIL = `sess-${Date.now()}@example.com`, PASS = 'Test123456!'
let failures = 0
const check = (c, m) => { if (!c) failures++; console.log(`${c ? '✅' : '❌'} ${m}`) }
const onStep = (p, h) => p.getByText(h, { exact: false }).first().waitFor({ state: 'visible', timeout: 14000 })
const loginVisible = (p) => p.getByPlaceholder('Password').isVisible().catch(() => false)

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const p = await ctx.newPage()
  // sign up + onboard a quick trip
  await p.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /Create a login/i }).click()
  await p.getByPlaceholder('you@email.com').fill(EMAIL)
  await p.getByPlaceholder('Password').fill(PASS)
  await p.getByRole('button', { name: /Create & enter/i }).click()
  await onStep(p, "Let's get")
  await p.getByText('Start a new trip').click()
  await onStep(p, 'You, the leader')
  await p.getByPlaceholder(/Reed Ahlstrom/i).fill('Sess Leader', { force: true }); await p.getByRole('button', { name: /Continue/i }).click()
  await onStep(p, 'Your co-leader'); await p.getByRole('button', { name: /Continue/i }).click()
  await onStep(p, 'Parent builders'); await p.getByRole('button', { name: /Continue/i }).click()
  await onStep(p, 'The builders')
  await p.getByPlaceholder(/Maddie/i).fill('Riley\nSage', { force: true }); await p.getByRole('button', { name: /Continue/i }).click()
  await onStep(p, 'Trip dates'); await p.getByRole('button', { name: /Continue/i }).click()
  await onStep(p, 'Ready to go'); await p.getByRole('button', { name: /Enter trip/i }).click()
  await p.waitForURL(/\/trip$/, { timeout: 8000 })
  await p.waitForTimeout(2500)
  check(true, 'signed up + onboarded a trip')

  // 1) RELOAD the same page — must stay logged in
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  check(!(await loginVisible(p)), 'after reload: still logged in (no login screen)')
  await p.goto(BASE + '/trip/people', { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  const reloadBody = await p.locator('body').innerText()
  check(/Riley/.test(reloadBody) && /Sage/.test(reloadBody), 'after reload: roster (Riley, Sage) is right there')

  // 2) Reopen in a brand-new browser context using the saved session
  const storage = await ctx.storageState()
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, storageState: storage })
  const p2 = await ctx2.newPage()
  await p2.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p2.waitForTimeout(1500)
  check(!(await loginVisible(p2)), 'reopened app: still logged in (no re-login needed)')
  await p2.goto(BASE + '/trip/people', { waitUntil: 'networkidle' })
  await p2.waitForTimeout(1500)
  const body2 = await p2.locator('body').innerText()
  check(/Riley/.test(body2) && /Sage/.test(body2), 'reopened app: sees their trip + roster')
} catch (e) {
  failures++; console.log('❌ EXCEPTION:', e.message.split('\n')[0])
} finally {
  const { data } = await admin.auth.admin.listUsers()
  for (const u of (data?.users ?? [])) if (u.email === EMAIL) { await admin.from('trips').delete().eq('owner', u.id); await admin.auth.admin.deleteUser(u.id) }
  await browser.close()
  console.log(`\n${failures === 0 ? '✅ SESSION PERSISTS — log in once, come back, trip is there' : `❌ ${failures} FAILURE(S)`}`)
  process.exit(failures === 0 ? 0 : 1)
}
