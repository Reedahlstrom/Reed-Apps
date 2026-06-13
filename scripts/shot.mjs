// Mobile screenshot helper — drives locally-installed Chrome (no download).
// Usage:  node scripts/shot.mjs "<route>" <name> [seed] [click:"<text>"] ...
//   seed         injects a realistic onboarded trip into localStorage first
//   click:"..."  clicks the first element matching the text, then waits
import { chromium } from 'playwright-core'
import { seedPayload } from './seed-data.mjs'

const route = process.argv[2] ?? '/'
const name = process.argv[3] ?? 'shot'
const rest = process.argv.slice(4)
const doSeed = rest.includes('seed')
const clicks = rest.filter((a) => a.startsWith('click:')).map((a) => a.slice(6))
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = 'http://localhost:5173/Reed-Apps/'

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true })
const page = await ctx.newPage()
if (doSeed) await page.addInitScript((v) => window.localStorage.setItem('reed-apps-trip-store', v), seedPayload())

const url = BASE.replace(/\/$/, '') + '/' + route.replace(/^\//, '')
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
for (const text of clicks) {
  await page.getByText(text, { exact: false }).first().click().catch((e) => console.log('click miss:', text, e.message))
  await page.waitForTimeout(500)
}
await page.waitForTimeout(300)
await page.screenshot({ path: `/tmp/reedapps-${name}.png` })
console.log(`saved /tmp/reedapps-${name}.png  (${url})`)
await browser.close()
