import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {chromium} from 'playwright';
const config=JSON.parse(readFileSync('companion.config.json')),ui=join(process.cwd(),'plugins',config.id,config.uuid+'.sdPlugin/ui');
const server=createServer((req,res)=>{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'pi.html';if(!['pi.html','pi.js','pi.css','icons.js','companion.js'].includes(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(readFileSync(join(ui,file)));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:440,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.saved=[];window.globalSaved=[];window.events=[];window.WebSocket=class{readyState=1;constructor(){setTimeout(()=>this.onopen?.(),0);}send(raw){const m=JSON.parse(raw);if(m.event==='setSettings')window.saved.push(m.payload);if(m.event==='setGlobalSettings')window.globalSaved.push(m.payload);if(m.event==='sendToPlugin')window.events.push(m.payload.event);if(m.event==='getGlobalSettings')setTimeout(()=>this.onmessage?.({data:JSON.stringify({event:'didReceiveGlobalSettings',payload:{settings:{}}})}),0);}};});
 const open=async command=>{await page.goto(`http://127.0.0.1:${server.address().port}/pi.html`);await page.evaluate(({config,command})=>window.connectElgatoStreamDeckSocket(123,'inspector','registerPropertyInspector','{}',JSON.stringify({action:config.uuid+'.'+command.id,payload:{settings:{}}})),{config,command});await page.waitForSelector('#sec-companion',{state:'visible'});};
 const command=config.commands.find(c=>c.shortcut);await open(command);
 assert.match(await page.locator('#companionTitle').textContent(),new RegExp(config.app.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.equal(await page.locator('#animate').isChecked(),true);
 assert.equal(await page.locator('#preview [data-app-design]').count(),1);
 assert.equal(await page.locator('#themes').isVisible(),false);
 for(const style of ['neon','vivid','pro']){await page.locator(`#styleSeg [data-style="${style}"]`).click();await page.waitForFunction(style=>window.saved.at(-1)?.iconStyle===style,style);}
 for(const theme of ['sunset','electric','tropical']){await page.locator(`[data-theme="${theme}"]`).click();await page.waitForFunction(theme=>window.saved.at(-1)?.iconTheme===theme,theme);}
 await page.locator('#companionShortcut').fill('Ctrl+Shift+X');await page.waitForFunction(()=>window.saved.at(-1)?.shortcut==='Ctrl+Shift+X');
 await page.locator('#animate').uncheck();await page.waitForFunction(()=>window.saved.at(-1)?.animate===false);assert.equal(await page.locator('#preview rect[stroke-dashoffset]').count(),0);
 await page.locator('#animate').check();await page.waitForFunction(()=>window.saved.at(-1)?.animate===true);
 await page.locator('#companionShow').click();await page.waitForFunction(()=>window.events.includes('companionShow'));
 if(config.design?.light){await page.locator('#styleLight').click();await page.waitForFunction(()=>window.saved.at(-1)?.iconStyle==='light');}
 await page.locator('#styleApp').click();await page.waitForFunction(()=>window.saved.at(-1)?.iconStyle==='app');
 mkdirSync('docs/images',{recursive:true});await page.screenshot({path:'docs/images/settings.png',fullPage:true});
 const url=config.commands.find(c=>c.operation==='url');
 if(url){await open(url);assert.equal(await page.locator('#companionShortcutRow').isVisible(),false);assert.equal(await page.locator('#companionDestinationRow').isVisible(),true);await page.locator('#companionDestination').fill('https://example.com/personal-page');await page.locator('#companionDestination').blur();await page.waitForFunction(()=>window.saved.at(-1)?.destination==='https://example.com/personal-page');}
 await open(config.commands[0]);assert.equal(await page.locator('#companionBack').isVisible(),true);await page.locator('#companionFollow').uncheck();await page.waitForFunction(()=>window.globalSaved.at(-1)?.autoFollow===false);
 await page.locator('#companionBack').click();await page.waitForFunction(()=>window.events.includes('companionBack'));
 assert.deepEqual(errors,[]);console.log('PASS inspector: styles, colours, animation, custom shortcut, navigation, follow-focus and no browser errors');
}finally{await browser.close();server.close();}
