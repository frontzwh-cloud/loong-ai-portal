import { chromium } from '../frontend/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const base = process.env.PORTAL_TEST_URL || 'http://127.0.0.1:8000'
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless:true, args:['--no-sandbox']})
const results=[]
const page=await browser.newPage({viewport:{width:1440,height:1000}})
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
const input=()=>page.getByPlaceholder('向龙小智提问，或描述你想完成的工作...')
async function check(name,fn){await fn(); results.push({name,status:'passed'}); console.log('PASS',name)}
try {
await check('desktop homepage / no horizontal overflow',async()=>{
 await page.goto(base); await page.getByText('本地演示 · 非真实 AI',{exact:true}).waitFor()
 assert(await page.getByAltText('龙小智完整形象').isVisible())
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.screenshot({path:'artifacts/desktop.png',fullPage:true})
})
await check('demo streaming, repeated send, service navigation preserves conversation',async()=>{
 await input().fill('你好，测试本地对话'); await page.getByRole('button',{name:'发送消息',exact:true}).click()
 await page.getByText(/【本地演示 · 非真实 AI】/).waitFor()
 await page.getByRole('button',{name:'发送消息',exact:true}).waitFor()
 await input().fill('第二次测试'); await page.getByRole('button',{name:'发送消息',exact:true}).click()
 await page.getByRole('button',{name:'发送消息',exact:true}).waitFor()
 assert.equal(await page.locator('.assistant-text').count(),2)
 await page.getByRole('button',{name:'打开应用中心',exact:true}).click()
 await page.getByRole('textbox',{name:'搜索应用'}).fill('nonexistent')
 await page.getByText('找到 0 个匹配服务').waitFor()
 await page.getByRole('button',{name:'查看全部服务',exact:true}).click()
 await page.getByRole('button',{name:'返回对话',exact:true}).click()
 assert.equal(await page.locator('.assistant-text').count(),2)
})
await check('stop response and new chat are reusable',async()=>{
 await input().fill('测试停止'); await page.getByRole('button',{name:'发送消息',exact:true}).click()
 await page.getByRole('button',{name:'停止回答',exact:true}).click()
 await page.getByRole('button',{name:'发送消息',exact:true}).waitFor()
 await input().fill('停止之后仍可发送'); await page.getByRole('button',{name:'发送消息',exact:true}).click()
 await page.getByRole('button',{name:'发送消息',exact:true}).waitFor()
 assert(!(await page.locator('.assistant-text').last().innerText()).includes('格式无效'))
 await page.getByRole('button',{name:'新对话',exact:true}).click()
 await page.getByText('你好，我是龙小智').waitFor()
 assert.equal(await page.locator('.user-message').count(),0)
})
await check('Presentation simulated canvas / boundaries / escape',async()=>{
 await page.getByRole('button',{name:'AI Presentation，界面演示',exact:true}).click()
 await page.getByText('此处为模拟故事板，不代表 PPT 已生成。').waitFor()
 assert(await page.getByRole('button',{name:'上一页',exact:true}).isDisabled())
 for(let i=0;i<3;i++) await page.getByRole('button',{name:'下一页',exact:true}).click()
 assert(await page.getByRole('button',{name:'下一页',exact:true}).isDisabled())
 await page.keyboard.press('Escape'); assert.equal(await page.getByText('Presentation Canvas',{exact:true}).count(),0)
})
await check('offline request failure appears and next request recovers',async()=>{
 await page.route('**/api/chat',route=>route.abort('failed'))
 await input().fill('普通消息'); await page.getByRole('button',{name:'发送消息',exact:true}).click()
 await page.getByText('无法连接 AI 后端。请检查启动窗口，然后重新发送消息。',{exact:true}).waitFor()
 await page.unroute('**/api/chat')
 await input().fill('恢复测试'); await page.getByRole('button',{name:'发送消息',exact:true}).click()
 await page.getByText(/【本地演示 · 非真实 AI】/).waitFor()
 await page.getByRole('button',{name:'发送消息',exact:true}).waitFor()
})
await check('HTTP validation error and interrupted stream are visible',async()=>{
 await page.route('**/api/chat',route=>route.fulfill({status:422,body:'{}'}))
 await input().fill('验证失败测试'); await page.getByRole('button',{name:'发送消息',exact:true}).click()
 await page.getByText('对话过长或格式无效，请缩短消息或开始新对话。',{exact:true}).waitFor()
 await page.unroute('**/api/chat')
 await page.route('**/api/chat',route=>route.fulfill({status:200,contentType:'application/x-ndjson',body:'{"type":"answer_delta","content":"部分回答"}'}))
 await input().fill('断流测试'); await page.getByRole('button',{name:'发送消息',exact:true}).click()
 await page.getByText(/部分回答.*连接提前结束/s).waitFor()
 await page.unroute('**/api/chat')
})
await check('runtime public link configuration and new-tab launch',async()=>{
 await page.context().route('https://example.com/**',route=>route.fulfill({body:'Mock destination only; no real integration tested'}))
 await page.route('**/api/config',route=>route.fulfill({json:{links:{gemba:'https://example.com/approved-demo-link'}}}))
 await page.reload()
 const link=page.getByRole('button',{name:'AI Gemba，打开应用',exact:true}); await link.waitFor()
 const popupPromise=page.waitForEvent('popup'); await link.click(); const popup=await popupPromise
 assert.equal(popup.url(),'https://example.com/approved-demo-link'); await popup.close()
 await page.unroute('**/api/config')
})
await check('mobile navigation / composer / no horizontal overflow',async()=>{
 await page.setViewportSize({width:390,height:844}); await page.reload()
 await page.getByRole('button',{name:'打开导航',exact:true}).click()
 await page.getByRole('button',{name:'全部服务',exact:true}).click()
 await page.getByRole('textbox',{name:'搜索应用'}).waitFor()
 await page.getByRole('button',{name:'返回对话',exact:true}).click()
 assert(await input().isVisible()); assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.screenshot({path:'artifacts/mobile.png',fullPage:true})
 await input().fill('手机测试'); await page.getByRole('button',{name:'发送消息',exact:true}).click()
 await page.getByText(/【本地演示 · 非真实 AI】/).waitFor()
})
await check('refresh clears session and no browser exceptions',async()=>{
 await page.reload(); await page.getByText('你好，我是龙小智').waitFor()
 assert.equal(await page.locator('.user-message').count(),0)
 assert.deepEqual(errors,[])
})
} catch(error) {results.push({name:'browser acceptance',status:'failed',error:String(error)}); throw error}
finally {fs.writeFileSync('artifacts/browser-results.json',JSON.stringify(results,null,2));await browser.close()}
