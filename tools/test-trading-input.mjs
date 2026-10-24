import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const source=readFileSync('shared/trading-input.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {TradingInput,tradingChord,TRADING_INPUT_SCRIPT}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
let count=0;const check=(name,test)=>{assert.ok(test,name);console.log('PASS '+name);count++;};
for(const [text,key,modifiers] of [['Ctrl+Alt+B',66,[17,18]],['Control+Shift+S',83,[17,16]],['F8',119,[]],['Ctrl+1',49,[17]],['Alt+Numpad1',97,[18]]])check(text+' parses one native chord',JSON.stringify(tradingChord(text))===JSON.stringify({key,modifiers}));
for(const bad of ['','B','Shift+B','Enter','Ctrl+Enter','Ctrl+B Enter','Ctrl+B Ctrl+S','Win+B','Ctrl+Ctrl+B','Ctrl+Alt','Ctrl+{ENTER}','Ctrl+Alt+%'])check('rejects macro or unsupported input: '+bad,!tradingChord(bad));
process.env.DAILYOPS_DRYRUN='1';process.env.DAILYOPS_DRYRUN_LOG=join(mkdtempSync(join(tmpdir(),'trading-input-')),'commands.jsonl');
const selector={names:['Fixture Trader'],path:'fixture'},bridge=new TradingInput(selector);
check('invalid input is not dispatched',(await bridge.send('Enter')).status==='miss');
check('configured buy hotkey is dispatched',(await bridge.send('Ctrl+Alt+B')).status==='ok');
const sent=JSON.parse(readFileSync(process.env.DAILYOPS_DRYRUN_LOG,'utf8').trim());
check('only one chord is sent, with verified app identity',sent.command==='trading-hotkey'&&sent.data.chord.key===66&&sent.data.selector.path==='fixture'&&!('keys' in sent.data));
check('does not steal focus',!TRADING_INPUT_SCRIPT.includes('SetForegroundWindow'));
check('foreground, executable and expiry are checked',TRADING_INPUT_SCRIPT.includes('QueryFullProcessImageName')&&TRADING_INPUT_SCRIPT.includes('GetForegroundWindow()!=window')&&TRADING_INPUT_SCRIPT.includes('ToUnixTimeMilliseconds()>deadline'));
check('does not queue or retry old presses',source.includes('this press was not queued')&&source.includes('Date.now() + 200')&&!source.includes('SendKeys'));
if(process.platform==='win32'){
 // Compile the actual worker and close stdin immediately. No input request is supplied.
 const bootstrap="$s=[Console]::In.ReadLine(); & ([ScriptBlock]::Create([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s))))";
 const output=execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(bootstrap,'utf16le').toString('base64')],{input:Buffer.from(TRADING_INPUT_SCRIPT).toString('base64')+'\n',encoding:'utf8',windowsHide:true,timeout:15000});
 check('native worker compiles and becomes ready without sending input',JSON.parse(output.trim()).ready===true);
}
console.log(`${count} trading input checks passed`);
