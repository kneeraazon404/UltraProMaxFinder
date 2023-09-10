const path = require('path');
const fssync = require('fs');
const fs = require('fs').promises;
var cron = require('node-cron');



const {BrowserWindow } = require('electron');

function scheduleDialog(event,username,app,mainWindow){
   let page= new BrowserWindow({
        parent: mainWindow, modal: true, show: false, webPreferences: {
            preload:path.join(__dirname, 'schedulePreload.js')
        }
      })
      const scheduleFile = path.join(app.getPath('userData'),'schedules.json');
      let existingData = {};
      try {
        const savedData = fssync.readFileSync(scheduleFile, 'utf8');
        existingData = JSON.parse(savedData);
      } catch (err) {
        // Handle the error if the file doesn't exist or is not valid JSON
        console.error(`Error reading file: ${err}`);
      }
      page.webContents.send('getUsername',username,existingData[username])
      page.loadFile(path.join(__dirname, 'schedule.html'))

      page.once('ready-to-show', () => {
        page.show()
      })

  
}


async function scheduleTask(event,data,username,mainWindow,app){

 // save the data with username as a key
 const scheduleFile = path.join(app.getPath('userData'),'schedules.json');
let existingData = {};
try {
  const savedData = fssync.readFileSync(scheduleFile, 'utf8');
  existingData = JSON.parse(savedData);
} catch (err) {
  // Handle the error if the file doesn't exist or is not valid JSON
  console.error(`Error reading file: ${err}`);
}
existingData[username]=data;
try {

  fs.writeFile(scheduleFile, JSON.stringify(existingData, null, 2))

} catch (error) {
  console.log('error');
  
}


}

module.exports={
    scheduleDialog,
    scheduleTask
}

