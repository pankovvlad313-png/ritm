const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ritmDesktop',{
  getUpdateState:()=>ipcRenderer.invoke('ritm:update-state'),
  checkForUpdates:()=>ipcRenderer.invoke('ritm:update-check'),
  installUpdate:()=>ipcRenderer.invoke('ritm:update-install'),
  onUpdateState:callback=>{
    if(typeof callback!=='function')return ()=>{};
    const listener=(_event,state)=>callback(state);
    ipcRenderer.on('ritm:update-status',listener);
    return ()=>ipcRenderer.removeListener('ritm:update-status',listener);
  }
});
