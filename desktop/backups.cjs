const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
function createBackups(directory,{now=()=>new Date(),limit=30}={}){
 let queue=Promise.resolve(),lastHash='',lastAt=0,lastSnapshot=null,error=null;
 function validate(raw){if(typeof raw!=='string'||Buffer.byteLength(raw)>5000000)throw Error('Слишком большая резервная копия.');const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.tasks)||data.tasks.length>500||!data.settings||!data.weeks||typeof data.weeks!=='object')throw Error('Некорректная копия.');return data;}
 async function files(){await fs.mkdir(directory,{recursive:true});return (await fs.readdir(directory)).filter(n=>/^\d{13}-[a-f0-9]{12}\.json$/.test(n)).sort().reverse();}
 function write(raw,force=false){
   const data=validate(raw);lastSnapshot=raw;
   const operation=queue.then(async()=>{
     const hash=crypto.createHash('sha256').update(raw).digest('hex'),at=now().getTime();
     if(!force&&(hash===lastHash||(lastHash&&at-lastAt<3600000)))return {saved:false};
     await fs.mkdir(directory,{recursive:true});const name=at+'-'+hash.slice(0,12)+'.json',target=path.join(directory,name);
     await fs.writeFile(target+'.tmp',raw,'utf8');await fs.rename(target+'.tmp',target);
     lastHash=hash;lastAt=at;error=null;
     for(const old of (await files()).slice(limit))await fs.unlink(path.join(directory,old));
     return {saved:true,name,tasks:data.tasks.length};
   });
   queue=operation.catch(e=>{error=e.message;});return operation;
 }
 async function list(){await queue;const result=[];for(const name of await files()){try{const raw=await fs.readFile(path.join(directory,name),'utf8'),data=validate(raw);result.push({id:name,created:new Date(Number(name.slice(0,13))).toISOString(),tasks:data.tasks.length});}catch{}}return {items:result,error};}
 async function read(id){await queue;if(!/^\d{13}-[a-f0-9]{12}\.json$/.test(id))throw Error('Неизвестная копия.');const raw=await fs.readFile(path.join(directory,id),'utf8');validate(raw);return raw;}
 async function beforeRestore(){if(lastSnapshot)await write(lastSnapshot,true);}
 return {write,list,read,beforeRestore};
}
module.exports={createBackups};
