import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync,existsSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocketServer} from 'ws';
import {unzipSync,strFromU8} from 'fflate';
import {Resvg} from '@resvg/resvg-js';
import {keySvg,THEMES,setAppDesign} from '../shared/icons.js';
const config=JSON.parse(readFileSync('companion.config.json'));setAppDesign(config.design);
const sd=join(process.cwd(),'plugins',config.id,config.uuid+'.sdPlugin');
const manifest=JSON.parse(readFileSync(join(sd,'manifest.json'))),temp=mkdtempSync(join(tmpdir(),'companion-test-')),log=join(temp,'commands.jsonl');
// Fake Codex usage log: 5-hour window 42 % used, weekly 17 %.
const codexHome=join(temp,'codex');mkdirSync(join(codexHome,'sessions','2026','10','24'),{recursive:true});
writeFileSync(join(codexHome,'sessions','2026','10','24','rollout-test.jsonl'),JSON.stringify({type:'event_msg',payload:{type:'token_count',rate_limits:{primary:{used_percent:42,window_minutes:300,resets_at:Math.floor(Date.now()/1000)+3600},secondary:{used_percent:17,window_minutes:10080,resets_at:Math.floor(Date.now()/1000)+86400}}}})+'\n');
const server=new WebSocketServer({port:0}),received=[],settings=new Map();let socket;
server.on('connection',s=>{socket=s;s.on('message',raw=>{const m=JSON.parse(raw);received.push(m);if(m.event==='getGlobalSettings')s.send(JSON.stringify({event:'didReceiveGlobalSettings',payload:{settings:{}}}));if(m.event==='getSettings')s.send(JSON.stringify({event:'didReceiveSettings',action:config.uuid+'.'+m.context,context:m.context,device:'TEST',payload:{settings:settings.get(m.context)||{},controller:'Keypad'}}));});});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async pred=>{for(let i=0;i<400;i++){if(pred())return;await sleep(20);}throw Error('SDK event timed out');};
const event=(name,c,s={})=>{const changed=JSON.stringify(settings.get(c.id))!==JSON.stringify(s);settings.set(c.id,s);const message={event:name,action:config.uuid+'.'+c.id,context:c.id,device:'TEST',payload:{settings:s,coordinates:{column:0,row:0},controller:'Keypad',isInMultiAction:false,state:0}};if(name==='keyDown'&&changed)socket.send(JSON.stringify({...message,event:'didReceiveSettings'}));socket.send(JSON.stringify(message));};
const press=(c,s={})=>{event('keyDown',c,s);event('keyUp',c,s);};
const info={application:{font:'Segoe UI',language:'en',platform:'windows',platformVersion:'10.0.22631',version:'7.6.0.0'},colors:{},devicePixelRatio:2,devices:[{id:'TEST',name:'Stream Deck',size:{columns:5,rows:3},type:0}],plugin:{uuid:config.uuid,version:config.version}};
const proc=spawn(process.execPath,[join(sd,'bin/plugin.js'),'-port',String(server.address().port),'-pluginUUID',config.uuid,'-registerEvent','registerPlugin','-info',JSON.stringify(info)],{cwd:sd,env:{...process.env,WINTOOLKIT_CODEX_HOME:codexHome,WINTOOLKIT_DRYRUN:'1',WINTOOLKIT_DRYRUN_LOG:log,WINTOOLKIT_COMPANION_PIPE:process.platform==='win32'?'\\\\.\\pipe\\companion-test-'+process.pid:join(temp,'test.sock')},stdio:['ignore','pipe','pipe']});
let output='';proc.stdout.on('data',d=>output+=d);proc.stderr.on('data',d=>output+=d);
const commands=()=>existsSync(log)?readFileSync(log,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
let count=0;const check=(name,condition)=>{assert.ok(condition,name);console.log('PASS '+name);count++;};
try{
 await wait(()=>received.some(m=>m.event==='registerPlugin'));
 check('all actions register in the manifest',manifest.Actions.length===config.commands.length);
 const files=unzipSync(readFileSync(join(sd,config.profile+'.streamDeckProfile')));
 const top=JSON.parse(strFromU8(files[Object.keys(files).find(n=>/^Profiles\/[^/]+\/manifest.json$/.test(n))]));
 check('bundled profile contains every workflow page',top.Pages.Pages.length===(config.pages?.length||1));
 for(const c of config.commands)event('willAppear',c);
 await wait(()=>received.filter(m=>m.event==='setImage').length>=config.commands.length*2);
 for(const c of config.commands){
  if(c.meter){
   const img=()=>decodeURIComponent(received.filter(m=>m.event==='setImage'&&m.context===c.id).at(-1)?.payload.image||'');
   await wait(()=>/data-meter="(ok|setup|nodata|signin|blocked|error)"/.test(img()));
   if(c.meter.source==='codex'){check(c.id+' shows the Codex '+c.meter.window+' percentage',img().includes(c.meter.window==='5h'?'42%':'17%'));}
   else check(c.id+' asks for setup without a session key',img().includes('data-meter="setup"'));
   check(c.id+' never logs or sends a key in dry-run',!commands().some(x=>JSON.stringify(x).includes('sessionKey')));
   continue;
  }
  const imgs=received.filter(m=>m.event==='setImage'&&m.context===c.id).map(m=>m.payload.image);
  check(c.id+' animates in the app theme',imgs.length>=2&&new Set(imgs).size>1);
  const needsBinding=c.requiresBinding||c.trading==='submit'||(!c.operation&&!c.menu&&!c.shortcut);
  const needsURL=c.operation==='url'&&!c.url;
  if(needsBinding||needsURL){
   const before=commands().length,alerts=received.filter(m=>m.event==='showAlert').length;
   press(c);await wait(()=>received.filter(m=>m.event==='showAlert').length>alerts);
   check(c.id+' refuses an unconfigured action',commands().length===before);
  }
  const binding=needsBinding?{shortcut:'Ctrl+Shift+X'}:needsURL?{destination:'https://example.com/trade-plan'}:{};
  const before=commands().length,switches=received.filter(m=>m.event==='switchToProfile').length;
  if(c.holdMs){event('keyDown',c,binding);await wait(()=>commands().length>before);event('keyUp',c,binding);}else press(c,binding);
  if(c.operation==='back'||c.operation==='page'){
   await wait(()=>received.filter(m=>m.event==='switchToProfile').length>(c.operation==='page'?switches+1:switches));
   if(c.operation==='page'){const sw=received.filter(m=>m.event==='switchToProfile').slice(switches);check(c.id+' leaves to the main keys before opening its page',!sw[0].payload.profile);check(c.id+' switches to its zero-based page',sw.at(-1).payload.page===c.page);}
  }else{
   await wait(()=>commands().length>before);const sent=commands().at(-1);
   if(c.operation==='url')check(c.id+' opens the exact configured URL',sent.command==='url'&&sent.args[0]===(binding.destination||c.url));
   else if(c.operation==='applink')check(c.id+' opens its in-app link',sent.command==='url'&&sent.args[0]===c.link&&c.link.startsWith(config.linkScheme));
   else if(sent.command==='appkeys'){const steps=JSON.parse(sent.args[2]);check(c.id+' sends only to the verified app',sent.args[0]===config.selector.names.join('|')&&sent.args[1]===(config.selector.path||''));if(c.shortcut==='Win+H')check(c.id+' presses Win+H',steps.some(x=>x.win===72));if(c.operation!=='focus'&&c.shortcut)check(c.id+' sends its shortcut steps',steps.some(x=>x.k||x.win));}
   else{check(c.id+' targets only the configured app',JSON.stringify(sent.data.selector)===JSON.stringify(config.selector));if(c.menu&&!needsBinding)check(c.id+' preserves panel and picker navigation',JSON.stringify(sent.data.menu)===JSON.stringify(c.menu));if(needsBinding&&c.trading)check(c.id+' sends one chord without an appended submit',sent.command==='trading-hotkey'&&sent.data.chord.key===88);}
  }
 }
 const url=config.commands.find(c=>c.operation==='url');
 if(url){const before=commands().length,alerts=received.filter(m=>m.event==='showAlert').length;press(url,{destination:'javascript:alert(1)'});await wait(()=>received.filter(m=>m.event==='showAlert').length>alerts);check('non-web URL overrides are rejected',commands().length===before);}
 const buy=config.commands.find(c=>c.id==='buy');
 if(buy){
  const before=commands().length;event('keyDown',buy,{shortcut:'Ctrl+Alt+B'});event('keyDown',buy,{shortcut:'Ctrl+Alt+B'});await wait(()=>commands().length>before);await sleep(100);check('one held Buy press dispatches exactly once',commands().length===before+1);event('keyUp',buy);
  const hold=config.commands.find(c=>c.holdMs),start=commands().length;if(hold){press(hold,{shortcut:'Ctrl+Alt+F'});await sleep(hold.holdMs+80);check('short tap cannot fire a hold action',commands().length===start);
  event('keyDown',hold,{shortcut:'Ctrl+Alt+F'});event('willDisappear',hold);await sleep(hold.holdMs+80);check('leaving the page cancels a pending hold',commands().length===start);}
  check('Buy and Sell have no guessed executable defaults',config.commands.filter(c=>['buy','sell'].includes(c.id)).every(c=>!c.shortcut&&!c.menu));
 }
 const ent=config.commands.find(c=>c.allowEnter);if(config.trading&&ent){const before=commands().length,alerts=received.filter(m=>m.event==='showAlert').length;press(ent,{shortcut:'1 Enter'});await wait(()=>received.filter(m=>m.event==='showAlert').length>alerts);check('an override on a built-in Enter key is still refused',commands().length===before);}
 if(config.trading){const sc=config.commands.find(c=>c.id==='shortcut');for(const bad of ['Ctrl+Alt+B Enter','Enter','Ctrl+Enter']){const before=commands().length,alerts=received.filter(m=>m.event==='showAlert').length;press(sc,{shortcut:bad});await wait(()=>received.filter(m=>m.event==='showAlert').length>alerts);check('custom key refuses '+bad+' in a trading app',commands().length===before);}}
 for(const style of ['app','light','neon','vivid','pro'])for(const c of config.commands){
  const render=phase=>new Resvg(keySvg({glyph:c.glyph,theme:c.theme,label:c.name,style,motion:{kind:'comp-'+c.id,phase}})).render().pixels;
  check(c.id+' '+style+' motion loops without a jump',!Buffer.from(render(0)).equals(Buffer.from(render(.25)))&&Buffer.from(render(0)).equals(Buffer.from(render(1))));
 }
 check('custom colours remain available',Object.keys(THEMES).length>=29);
 console.log(`${count} checks passed for ${config.app}`);
}catch(error){console.error(output.slice(-1800));console.error(JSON.stringify(received.filter(m=>m.event!=='setImage').slice(-10)));throw error;}finally{proc.kill();server.close();}
