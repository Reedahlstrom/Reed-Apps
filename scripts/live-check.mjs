import { chromium } from 'playwright-core'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const b = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3, isMobile:true })
const page = await ctx.newPage()
const errs=[]; page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()) })
page.on('pageerror', e=>errs.push('PAGEERR: '+e.message))
await page.goto('https://reedahlstrom.github.io/Reed-Apps/', { waitUntil:'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path:'/tmp/reedapps-live.png' })
const body = await page.evaluate(()=>document.body.innerText.slice(0,120))
console.log('console errors:', errs.length ? errs.slice(0,5) : 'none')
console.log('visible text:', JSON.stringify(body))
await b.close()
