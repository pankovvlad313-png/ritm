// Keep the updater lifecycle independent of Electron so failures and retries can be tested.
function createUpdates({updater,version,enabled,onState=()=>{},schedule=setTimeout,repeat=setInterval}){
  let state={status:enabled?'idle':'disabled',currentVersion:version,version:null,percent:0};
  let checking=false;
  const emit=patch=>{state={...state,...patch};onState({...state});};
  updater.autoDownload=true;
  updater.autoInstallOnAppQuit=true;
  updater.allowDowngrade=false;
  updater.allowPrerelease=false;
  updater.on('checking-for-update',()=>emit({status:'checking',version:null,percent:0}));
  updater.on('update-available',info=>emit({status:'downloading',version:String(info.version),percent:0}));
  updater.on('download-progress',progress=>emit({status:'downloading',percent:Math.max(0,Math.min(100,Math.round(Number(progress.percent)||0)))}));
  updater.on('update-downloaded',info=>emit({status:'ready',version:String(info.version),percent:100}));
  updater.on('update-not-available',()=>emit({status:'current',version:null,percent:0}));
  updater.on('error',()=>emit({status:'error',percent:0}));
  updater.on('update-cancelled',()=>emit({status:'idle',version:null,percent:0}));
  async function check(){
    if(!enabled||checking||['downloading','ready','installing'].includes(state.status))return {...state};
    checking=true;emit({status:'checking',percent:0});
    try{await updater.checkForUpdates();}catch{emit({status:'error',percent:0});}
    finally{checking=false;}
    return {...state};
  }
  function install(){
    if(!enabled||state.status!=='ready')return false;
    emit({status:'installing'});
    try{updater.quitAndInstall(false,true);return true;}catch{emit({status:'error'});return false;}
  }
  if(enabled){schedule(check,15000)?.unref?.();repeat(check,6*60*60*1000)?.unref?.();}
  return {check,install,getState:()=>({...state})};
}
module.exports={createUpdates};
