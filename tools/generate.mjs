import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { keySvg, monoSvg, setAppDesign } from '../shared/icons.js';
import { ROOT, buildProfile, copyUi, writePluginIcons } from './common.mjs';
const config=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(join(ROOT,'companion.config.json'))));
setAppDesign(config.design);
const sd=join(ROOT,'plugins',config.id,config.uuid+'.sdPlugin');
const put=(path,data)=>{const target=join(sd,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,data);};
for(const command of config.commands){
 put(`imgs/keys/${command.id}.svg`,keySvg({glyph:command.glyph,theme:command.theme,label:command.name,style:config.design?'app':'vivid'}));
 put(`imgs/actions/${command.id}.svg`,monoSvg(command.glyph,20));
}
writePluginIcons(sd,{glyph:config.glyph,theme:config.theme,style:config.design?'app':'vivid'});
copyUi(sd);
put('ui/companion.js','window.DailyOpsCompanion='+JSON.stringify(config)+';\nwindow.DailyOpsDesign=window.DailyOpsCompanion.design;window.DailyOpsIcons.setAppDesign(window.DailyOpsDesign);\nfor(const c of window.DailyOpsCompanion.commands) window.DailyOpsIcons.PRESET_ICONS["comp-"+c.id]={glyph:c.glyph,theme:c.theme,label:c.name,style:window.DailyOpsDesign?"app":"vivid"};\n');
put('companion-config.json',JSON.stringify(config,null,2));
const layout=config.layout||Object.fromEntries(config.commands.slice(0,15).map((c,i)=>[`${i%5},${Math.floor(i/5)}`,c.id]));
buildProfile({sd,uuid:config.uuid,pluginName:config.name,version:config.version,profile:config.profile,title:config.app,layout,pages:config.pages,actions:config.commands.map(c=>[c.id,c.name,c.description])});
put('manifest.json',JSON.stringify({
 $schema:'https://schemas.elgato.com/streamdeck/plugins/manifest.json',Name:config.name,Version:config.version,Author:'Daily Ops',UUID:config.uuid,
 Description:`Unofficial ${config.app} controls for Windows. Animated keys, configurable shortcuts and automatic switching with Windows Daily Toolkit.`,
 Icon:'imgs/plugin/icon',Category:config.name,CategoryIcon:'imgs/plugin/category',CodePath:'bin/plugin.js',PropertyInspectorPath:'ui/pi.html',SDKVersion:2,
 Software:{MinimumVersion:'7.1'},OS:[{Platform:'windows',MinimumVersion:'10'}],Nodejs:{Version:'20'},
 ApplicationsToMonitor:{windows:config.selector.names.map(n=>n+'.exe')},
 Profiles:[{Name:config.profile,DeviceType:0,Readonly:false,DontAutoSwitchWhenInstalled:true,AutoInstall:true}],
 Actions:config.commands.map(c=>({Name:c.name,UUID:config.uuid+'.'+c.id,Icon:'imgs/actions/'+c.id,Tooltip:c.description,...(c.hidden?{VisibleInActionsList:false}:{}),Controllers:['Keypad'],States:[{Image:'imgs/keys/'+c.id,ShowTitle:false,TitleAlignment:'bottom'}]}))
},null,2));
console.log(`Generated ${config.name}: ${config.commands.length} actions`);
