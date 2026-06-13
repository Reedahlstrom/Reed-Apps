// Mobile screenshot helper — drives the locally-installed Chrome (no download).
// Usage:  node scripts/shot.mjs "<route>" <name> [seed]
//   seed = "seed" injects a realistic onboarded trip into localStorage first.
import { chromium } from 'playwright-core'

const route = process.argv[2] ?? '/'
const name = process.argv[3] ?? 'shot'
const doSeed = process.argv[4] === 'seed'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = 'http://localhost:5173/Reed-Apps/'

function seedTrip() {
  const now = '2026-06-13T12:00:00.000Z'
  const p = (name, role, i) => ({ id: `p_${role}_${i}`, name, role, createdAt: now })
  const builders = ['Maddie Clark','Joshua Reed','Elena Voss','Caleb Stone','Ana Ruiz','Liam Park','Sofia Mendez','Noah Hale','Grace Kim','Ethan Brooks','Mia Torres','Owen Frost','Lucy Chen','Jonah Webb','Ivy Nash','Sam Quinn','Ruby Vance','Eli Dawson','Nina Holt']
    .map((n, i) => p(n, 'builder', i))
  const people = [
    p('Reed Ahlstrom', 'leader', 0),
    p('Hannah Lewis', 'coleader', 0),
    p('David Clark', 'parent', 0),
    p('Maria Ruiz', 'parent', 1),
    ...builders,
  ]
  const poopNights = [
    { date: '2026-06-11', notPooped: ['p_builder_3', 'p_builder_7'], createdAt: now },
    { date: '2026-06-12', notPooped: ['p_builder_3'], createdAt: now },
    { date: '2026-06-13', notPooped: ['p_builder_3', 'p_builder_11'], createdAt: now },
  ]
  const trip = {
    id: 'trip_demo', name: 'Trip 1',
    meta: { startDate: '2026-06-15', endDate: '2026-07-01', destination: 'Patagonia & Concepción, Chile' },
    people, foodDays: [], busDays: [],
    meetings: builders.map((b, i) => ({ personId: b.id, status: i < 3 ? 'done' : i < 5 ? 'scheduled' : 'pending', followUps: i === 3 ? [{ id: 'fu1', text: 'Check in about homesickness', done: false }] : [], updatedAt: now })),
    notes: [], roomPlans: [], groupSets: [], poopNights,
    onboarded: true, createdAt: now, updatedAt: now,
  }
  return JSON.stringify({ state: { trips: [trip], activeTripId: 'trip_demo', rev: 1 }, version: 1 })
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true })
const page = await ctx.newPage()

if (doSeed) {
  const payload = seedTrip()
  await page.addInitScript((v) => { window.localStorage.setItem('reed-apps-trip-store', v) }, payload)
}

const url = BASE.replace(/\/$/, '') + '/' + route.replace(/^\//, '')
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.screenshot({ path: `/tmp/reedapps-${name}.png` })
console.log(`saved /tmp/reedapps-${name}.png  (${url})`)
await browser.close()
