import { chromium } from 'playwright-core'
import { seedPayload } from './seed-data.mjs'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const routes = ['/','/trip','/trip/food','/trip/bus','/trip/meetings','/trip/notes','/trip/rooms','/trip/groups','/trip/committees','/trip/devotionals','/trip/flights','/trip/letters','/trip/poop','/trip/people','/trip/settings','/trip/tools']
const b = await chromium.launch({ executablePath: CHROME, headless: true })
let fails = 0
for (const r of routes) {
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', m => { if (m.type()==='error') errs.push(m.text()) })
  page.on('pageerror', e => errs.push('PAGEERR: '+e.message))
  await page.addInitScript((v)=>{ localStorage.setItem('reed-apps-trip-store', v); localStorage.setItem('reed-offline','1') }, seedPayload())
  await page.goto('http://localhost:5173'+r, { waitUntil:'networkidle' })
  await page.waitForTimeout(400)
  const real = errs.filter(e => !/favicon|fontshare|gstatic|googleapis|preload/i.test(e))
  console.log(`${real.length? 'FAIL':'ok  '} ${r}${real.length? '  '+real.slice(0,2).join(' | '):''}`)
  if (real.length) fails++
  await ctx.close()
}
console.log(fails? `\n${fails} routes with errors`:'\nAll routes clean')
await b.close()
