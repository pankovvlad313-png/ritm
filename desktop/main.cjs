const {app,BrowserWindow,Menu,protocol,session,dialog,ipcMain}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {assetFor,internal,types,csp}=require('./policy.cjs');
const {createUpdates}=require('./updates.cjs');
const smoke=process.argv.includes('--smoke-test');
app.setName('Ритм');
app.setAppUserModelId('io.github.pankovvlad313.ritm');
app.setPath('userData',smoke?require('node:fs').mkdtempSync(path.join(os.tmpdir(),'ritm-smoke-')):path.join(app.getPath('appData'),'Ritm'));
protocol.registerSchemesAsPrivileged([{scheme:'ritm',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
let window,updates;
const ownsLock=smoke||app.requestSingleInstanceLock();
if(!ownsLock)app.quit();
else {
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
  app.whenReady().then(async()=>{
    const webRoot=path.join(app.getAppPath(),'.desktop','web');
    protocol.handle('ritm',async req=>{
      const file=assetFor(req.url,req.method);
      if(!file)return new Response('Not found',{status:404});
      try{return new Response(req.method==='HEAD'?null:await fs.readFile(path.join(webRoot,file)),{headers:{'Content-Type':types[path.extname(file)],'Content-Security-Policy':csp}});}
      catch{return new Response('Not found',{status:404});}
    });
    session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
    session.defaultSession.setPermissionCheckHandler(()=>false);
    session.defaultSession.on('will-download',(_event,item)=>{
      item.setSaveDialogOptions({title:'Сохранить файл из Ритма',defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))});
    });
    const {autoUpdater}=require('electron-updater');
    updates=createUpdates({updater:autoUpdater,version:app.getVersion(),enabled:app.isPackaged&&!smoke,onState:state=>{if(window&&!window.isDestroyed())window.webContents.send('ritm:update-status',state);}});
    const authorize=event=>{if(!window||event.sender!==window.webContents||!internal(event.senderFrame?.url||''))throw Error('Unsupported caller');};
    ipcMain.handle('ritm:update-state',event=>{authorize(event);return updates.getState();});
    ipcMain.handle('ritm:update-check',event=>{authorize(event);return updates.check();});
    ipcMain.handle('ritm:update-install',event=>{authorize(event);return updates.install();});
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label:'Файл',submenu:[{label:'Выйти',role:'quit'}]},
      {label:'Правка',submenu:[{label:'Отменить',role:'undo'},{label:'Повторить',role:'redo'},{type:'separator'},{label:'Вырезать',role:'cut'},{label:'Копировать',role:'copy'},{label:'Вставить',role:'paste'},{label:'Выбрать всё',role:'selectAll'}]},
      {label:'Справка',submenu:[{label:'Ритм '+app.getVersion(),enabled:false},{label:'Проверить обновления',click:()=>updates.check()}]},
      {label:'Вид',submenu:[{label:'Обновить',role:'reload'},{type:'separator'},{label:'Увеличить',role:'zoomIn'},{label:'Уменьшить',role:'zoomOut'},{label:'Исходный масштаб',role:'resetZoom'},{label:'Полный экран',role:'togglefullscreen'}]}
    ]));
    createWindow();
  }).catch(error=>{console.error(error);if(!smoke)dialog.showErrorBox('Не удалось открыть Ритм','Попробуйте перезапустить приложение.');app.exit(1);});
}
function createWindow(){
  window=new BrowserWindow({title:'Ритм',width:1400,height:920,minWidth:420,minHeight:620,backgroundColor:'#f8f9fb',show:false,icon:path.join(app.getAppPath(),'.desktop','icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(!internal(url))event.preventDefault();});
  window.webContents.on('will-redirect',(event,url)=>{if(!internal(url))event.preventDefault();});
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  window.webContents.on('render-process-gone',(_event,details)=>{console.error(details.reason);if(smoke)app.exit(1);});
  window.once('ready-to-show',()=>{if(!smoke)window.show();});
  if(smoke){
    const timer=setTimeout(()=>{console.error('Smoke test timeout');app.exit(1);},30000);
    window.webContents.once('did-finish-load',async()=>{
      try{
        const result=await window.webContents.executeJavaScript('('+require('./renderer-smoke.cjs').toString()+')()');
        if(!result.title.includes('Ритм')||result.days!==7||result.cards!==22||result.hasNode||!result.storageWorks||!result.practicePreserved||!result.guideComplete||!result.updaterPanel||!result.updaterDisabled||result.version!==app.getVersion())throw Error(JSON.stringify(result));
        clearTimeout(timer);console.log('PASS: desktop renderer, sandbox, preload IPC, 7-step tutorial, preserved planner data and updater panel');app.exit(0);
      }catch(error){console.error(error);app.exit(1);}
    });
    window.webContents.once('did-fail-load',(_event,code,description)=>{console.error(code,description);app.exit(1);});
  }
  window.loadURL('ritm://app/index.html').catch(error=>{console.error(error);if(smoke)app.exit(1);});
  window.on('closed',()=>{window=null;});
}
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(ownsLock&&BrowserWindow.getAllWindows().length===0)createWindow();});
