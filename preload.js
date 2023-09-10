const { contextBridge, ipcRenderer,shell } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
readTemplate: (filename) => ipcRenderer.invoke('readTemplateFromFile',filename),
sendCredentials:(credentials)=>ipcRenderer.send('send-credentials',credentials),
readUsersData:()=>ipcRenderer.invoke('readUsersData'),
getProposals:(username)=>ipcRenderer.invoke('getProposals',username),
sendRFPtoClient:(callback)=>ipcRenderer.on('rfpCurrent',callback),
readExcelFile:(username)=>ipcRenderer.invoke('read-excel-file',username),
downloadExcelFile:(username)=>ipcRenderer.send('download-excel',username),
fileDownloaded:(callback)=>ipcRenderer.on('download-complete',callback),
saveTemplate:(data)=>ipcRenderer.invoke('saveTemplateToFile',data),
readTemplateText:()=>ipcRenderer.invoke('readProposalTemplate',),
scheduleSetting:(username)=>ipcRenderer.invoke('scheduleSetting',username),



})


contextBridge.exposeInMainWorld('electronShell', {
    openExternal: (filepath) => {
      shell.showItemInFolder(filepath);
    },
  });