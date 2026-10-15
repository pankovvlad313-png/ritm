const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ritmDesktop',{
  sync:raw=>ipcRenderer.invoke('ritm:sync',raw),
  listBackups:()=>ipcRenderer.invoke('ritm:backup-list'),
  readBackup:id=>ipcRenderer.invoke('ritm:backup-read',id),
  createBackup:()=>ipcRenderer.invoke('ritm:backup-create'),
  beforeRestore:()=>ipcRenderer.invoke('ritm:backup-before-restore'),
  testNotification:()=>ipcRenderer.invoke('ritm:notification-test'),
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
