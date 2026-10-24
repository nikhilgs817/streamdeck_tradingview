import {createHash} from 'node:crypto';
import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {zipSync} from 'fflate';
import {ROOT} from './common.mjs';
const config=JSON.parse(readFileSync(join(ROOT,'installer/plugin.json'),'utf8'));
const manifest=JSON.parse(readFileSync(join(ROOT,'plugins',config.PluginFolder,config.PluginId+'.sdPlugin/manifest.json'),'utf8'));
if(manifest.UUID!==config.PluginId||manifest.Version!==config.Version||manifest.Name!==config.Name)throw Error('Installer and generated plugin must have matching identity, name and version.');
const packageName=config.PluginId+'.streamDeckPlugin',packageFile=join(ROOT,'dist',packageName);
if(!existsSync(packageFile))throw Error('Run npm run build and npm run pack first.');
const bundleName=config.InstallerId+'-Installer',bundle=join(ROOT,'dist',bundleName);
mkdirSync(join(bundle,'installer'),{recursive:true});mkdirSync(join(bundle,'dependency'),{recursive:true});
const launcher='Install-'+config.InstallerId+'.cmd';
for(const file of [launcher,'installer/Install-Plugin.ps1','installer/plugin.json'])copyFileSync(join(ROOT,file),join(bundle,file));
copyFileSync(packageFile,join(bundle,packageName));copyFileSync(join(ROOT,'docs/INSTALL.md'),join(bundle,'READ-ME-FIRST.txt'));
const sha=data=>createHash('sha256').update(data).digest('hex');
const dependencyFile=join(bundle,'dependency/WindowsDailyToolkit-Installer.zip');
if(!existsSync(dependencyFile)||sha(readFileSync(dependencyFile))!==config.Toolkit.Sha256){
 const response=await fetch(config.Toolkit.Url);if(!response.ok)throw Error('Cannot download pinned Windows Daily Toolkit release: '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());if(sha(bytes)!==config.Toolkit.Sha256)throw Error('Dependency checksum mismatch.');writeFileSync(dependencyFile,bytes);
}
const metadata={PluginId:manifest.UUID,Version:manifest.Version,File:packageName,Sha256:sha(readFileSync(packageFile))};
for(const destination of [join(bundle,'installer-manifest.json'),join(ROOT,'dist/installer-manifest.json')])writeFileSync(destination,JSON.stringify(metadata,null,2)+'\n');
// Pin the package hash in the installer itself so a downloaded manifest cannot vouch for itself.
const pinned={...config,PackageSha256:metadata.Sha256};
for(const destination of [join(bundle,'installer/plugin.json'),join(ROOT,'installer/plugin.json')])writeFileSync(destination,JSON.stringify(pinned,null,2)+'\n');
const files={};
// Explicit allowlist: never archive a whole build directory or local runtime data.
for(const file of [launcher,'installer/Install-Plugin.ps1','installer/plugin.json',packageName,'installer-manifest.json','READ-ME-FIRST.txt','dependency/WindowsDailyToolkit-Installer.zip'])files[bundleName+'/'+file]=readFileSync(join(bundle,file));
writeFileSync(join(ROOT,'dist',bundleName+'-'+config.Version+'.zip'),zipSync(files,{level:9}));
console.log('Built '+bundleName+'-'+config.Version+'.zip with verified Toolkit dependency.');
