const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const names=fs.readdirSync('release').filter(n=>/^Ritm-Setup-.*\.exe$/.test(n));
if(names.length!==1)throw Error('Expected exactly one Windows installer');
for(const name of names){const sum=crypto.createHash('sha256').update(fs.readFileSync(path.join('release',name))).digest('hex');fs.writeFileSync(path.join('release',name+'.sha256'),`${sum}  ${name}\n`);console.log(name+' SHA256 '+sum);}
