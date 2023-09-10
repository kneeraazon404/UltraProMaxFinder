const { contextBridge, ipcRenderer,shell } = require('electron')


contextBridge.exposeInMainWorld('scheduleApi', {
  
    scheduleTask: (data,username) => {
        ipcRenderer.invoke('scheduleTask',data,username)
      },
      receiveUsername:(callback)=>ipcRenderer.on('getUsername',callback)
    })
  
    