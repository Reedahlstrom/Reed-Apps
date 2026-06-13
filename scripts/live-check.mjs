import { chromium } from 'playwright-core'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const url = process.argv[2] || 'https://reed-apps.pages.dev/'
const b = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3, isMobile:true })
const page = await ctx.newPage()
const errs=[]; page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()) })
page.on('pageerror', e=>errs.push('PAGEERR: '+e.message))
await page.goto(url, { waitUntil:'networkidle' })
await page.waitForTimeout(1800)
await page.screenshot({ path:'/tmp/reedapps-cf.png' })
const txt = await page.evaluate(()=>document.body.innerText.replace(/\n+/g,' | ').slice(0,160))
console.log('URL:', url)
console.log('errors:', errs.length?errs.slice(0,4):'none')
console.log('text:', JSON.stringify(txt))
await b.close()
