// Mobile screenshot helper — drives the locally-installed Chrome (no download).
// Usage: node scripts/shot.mjs "/#/trip" food
import { chromium } from 'playwright-core'

const route = process.argv[2] ?? '/'
const name = process.argv[3] ?? 'shot'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = 'http://localhost:5173/Reed-Apps/'

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14
  deviceScaleFactor: 3,
  isMobile: true,
})
const page = await ctx.newPage()
const url = BASE.replace(/\/$/, '') + '/' + route.replace(/^\//, '')
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.screenshot({ path: `/tmp/reedapps-${name}.png` })
console.log(`saved /tmp/reedapps-${name}.png  (${url})`)
await browser.close()
