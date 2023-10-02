const { contextBridge, ipcRenderer } = require('electron')




console.log('We are ere now......')
ipcRenderer.on('sendMessage',(event,message)=>{

    // get the message field and press the send button wowowowo

    console.log(document.querySelector('div[aria-label="Write a message…"] p').textContent)
    console.log(message)


})