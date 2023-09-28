const path = require('path');
const fssync = require('fs');
const fs = require('fs').promises;


let page;
const {BrowserWindow } = require('electron');
function scheduleDialog(event,username,app,mainWindow){
  page= new BrowserWindow({
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

      page.webContents.on('dom-ready', () => {
        page.webContents.send('getUsername',username,existingData[username])
      })

      
      page.loadFile(path.join(__dirname, 'schedule.html'))
      // page.webContents.openDevTools({ mode: 'detach' })

      page.once('ready-to-show', () => {
        page.show()
      })

  
}
function removeSchedule(event,username,app){
  const scheduleFile = path.join(app.getPath('userData'),'schedules.json');
  let existingData = {};
  try {
    const savedData = fssync.readFileSync(scheduleFile, 'utf8');
    existingData = JSON.parse(savedData);
  } catch (err) {
    console.error(`Error reading file: ${err}`);
  }
  console.log(existingData)
   console.log(username)
  if (existingData.hasOwnProperty(username)) {
    delete existingData[username];
  }
  try {
    fssync.writeFileSync(scheduleFile, JSON.stringify(existingData, null, 2));
    console.log(`Schedule data for ${username} removed successfully.`);
    return 1;
  } catch (err) {
    console.error(`Error writing file: ${err}`);
  }
  
}


 function scheduleTask(event,data,username,mainWindow,app){

 const scheduleFile = path.join(app.getPath('userData'),'schedules.json');
let existingData = {};
try {
  const savedData = fssync.readFileSync(scheduleFile, 'utf8');
  existingData = JSON.parse(savedData);
} catch (err) {
  // Handle the error if the file doesn't exist or is not valid JSON
  console.error(`Error reading file: ${err}`);
}
if(username)
existingData[username]=data;
try {

  fs.writeFile(scheduleFile, JSON.stringify(existingData, null, 2))

} catch (error) {
  console.log('error');
  
}
if(page instanceof BrowserWindow)
 page.close();
}

module.exports={
    scheduleDialog,
    removeSchedule,
    scheduleTask
}

