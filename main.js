const { app, BrowserWindow, ipcMain, session,dialog } = require('electron');
const fs = require('fs').promises;
const { ToadScheduler, SimpleIntervalJob, AsyncTask } = require('toad-scheduler')
const schedule = require('node-schedule');
const chokidar = require('chokidar');



const fssync = require('fs');
const path = require('path');
const readline = require('readline');
const {getSavedTemplate,saveTemplateToFile}=require('./templateFunctions')
const {getCredentials}=require('./getCredentials')
const {readDataFromGoogleSheet} = require('./googleDocsConnections')
const {extractProposals,sendMessage}=require('./proposals')
const {readExcelFile}=require('./excelFunctions')
const {scheduleDialog,scheduleTask,removeSchedule}=require('./scheduleSettings');
// const { scheduler } = require('timers/promises');

let scheduler;
let mainWindow;
let width;
let height;


async function readTemplateFile(event, templateFileName) {
  const templatePath = path.join(__dirname, templateFileName);
  return await fs.readFile(templatePath, 'utf-8');
}


async function readProposalTemplate(event,filename='template.txt') { /// for reading proposal template from file
 return getSavedTemplate(app,filename)
}



const downloadFileFromUserData = async (event,mainWindow) => {
  dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('downloads'), 'output.xlsx'),
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
  }).then((result) => {
    if (!result.canceled) {
      const downloadPath = result.filePath;
      const sourceFilePath =  path.join(app.getPath('userData'), 'output.xlsx');;
      fssync.copyFileSync(sourceFilePath, downloadPath);

      mainWindow.webContents.send('download-complete', downloadPath);
    }
  }).catch((error) => {
    console.error('Error in file dialog:', error);
  });
};





async function extractRequestForProposals(event, username,app,mainWindow) {
  // will write the logic for extracting proposals here after getting username from file
  // first load the specific session based on userdata
  const userDataPath = app.getPath('userData');
  const linkedInSessionPartitionName = `persist:${username}`;
  const linkedInSession = session.fromPartition(linkedInSessionPartitionName, {
    cache: path.join(userDataPath, username),
  });
  // console.log(await linkedInSession.cookies.get({}))
  const rfpPage = new BrowserWindow({
    parent: mainWindow, modal: true, show: false, webPreferences: {
      partition: linkedInSessionPartitionName,
      preload: path.join(__dirname, 'messagePagePreload.js'),
      devTools:true,
    }
  })
  rfpPage.webContents.openDevTools({ mode: 'detach' })

  rfpPage.loadURL('https://www.linkedin.com/service-marketplace/provider/requests')
  rfpPage.once('ready-to-show', () => {
    rfpPage.show()
  })
  linkedInSession.webRequest.onBeforeSendHeaders({ urls: ['https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(count:20,start:0)&&queryId=voyagerMarketplacesDashMarketplaceProjects.*'], types: ['xhr'] }, async (details, callback) => {
    // Log headers

    const { accept, 'accept-language': acceptLanguage, 'csrf-token': csrfToken, 'x-li-lang': xlilang, 'x-li-page-instance': xlipageinstance,
      'x-li-pem-metadata': xlipenmetadata, 'x-li-track': xlitrack, } = { ...details.requestHeaders }

    try {
      const res = await linkedInSession.fetch(details.url, {
        headers: { accept, 'accept-language': acceptLanguage, 'csrf-token': csrfToken, 'x-li-lang': xlilang, 'x-li-page-instance': xlipageinstance,'x-li-pem-metadata':xlipenmetadata },
      })
      if (res.ok) {
        const body = await res.json()
        // use this to get all the pending requests
      await extractProposals(body,username,rfpPage,linkedInSession,details.requestHeaders,app,mainWindow,linkedInSessionPartitionName)

      }
    } catch (error) {
      console.log(error)

    }
   
    callback({ cancel: false, requestHeaders: details.requestHeaders })

  })
}


async function readUserData(event) {
  const parsedData = [];
  let  rl ;
  const filePath = path.join(app.getPath('userData'), 'userInfo.json');
  try {
    await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
    rl= readline.createInterface({
      input: fssync.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
    
        const jsonObject = JSON.parse(line);
        parsedData.push(jsonObject);
     
    }

  } catch (error) {
    console.log(error)
  }



  return parsedData;


}


app.whenReady().then(
 () => {

  chokidar.watch(path.join(app.getPath('userData'),'*.txt', '*.json')).on('all', (event, path) => {
    console.log('this is good')
    mainWindow.webContents.reload();
  });

  //   writeData().then(out=>console.log(out)).catch(e=>console.log(e));
 
  // die;
  createRequiredFiles(app)
    ipcMain.handle('removeSchedule',(event,username)=>removeSchedule(event,username,app))
    ipcMain.handle('scheduleTask',(event,data,username)=>scheduleTask(event,data,username,mainWindow,app))
    ipcMain.handle('scheduleSetting',(event,username)=>scheduleDialog(event,username,app,mainWindow))
    ipcMain.handle('readTemplateFromFile', readTemplateFile) // handler for html template
    ipcMain.handle('read-excel-file',(event,username)=>readDataFromGoogleSheet(event,username,app))
    ipcMain.handle('readUsersData', readUserData)
    ipcMain.on('send-credentials',(event,credentials)=> getCredentials(event,credentials,mainWindow,app))
    ipcMain.handle('saveTemplateToFile',(event,data,filename)=>saveTemplateToFile(event,data,app,filename)),
    ipcMain.handle('sendMessage',sendMessage)
    ipcMain.handle('readProposalTemplate', readProposalTemplate)

    const { screen } = require('electron')
    const primaryDisplay = screen.getPrimaryDisplay()
    width = primaryDisplay.workAreaSize.width;
    height = primaryDisplay.workAreaSize.height;


    mainWindow = new BrowserWindow({
      width, height,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true, // Allow using Node.js APIs in the renderer process
      },
    });

    ipcMain.handle('getProposals',(event,username)=> extractRequestForProposals(event,username,app,mainWindow))
    mainWindow.loadFile('index.html');
    ipcMain.on('download-excel', (event,username) => {
      downloadFileFromUserData(event,mainWindow,username,app);
  });



let scheduleFile;
scheduleFile = path.join(app.getPath('userData'),'schedules.json');
let existingData = {};
try {
  const savedData = fssync.readFileSync(scheduleFile, 'utf8');
  existingData = JSON.parse(savedData);
} catch (err) {
  // Handle the error if the file doesn't exist or is not valid JSON
  console.error(`Error reading file: ${err} ${scheduleFile}`);
}

if(existingData){
  // scheduler= new ToadScheduler()
  Object.keys(existingData).forEach(key => {
    let username=key;
    let data=existingData[key];
    console.log(data)
    let startDateTime = new Date(`${data.startDateValue}T${data.timeValue}:00`);
    let endDateTime = new Date(data.endDateValue);
    const now = new Date();
    console.log(startDateTime)
    console.log(now)
    if (startDateTime < now) {
    startDateTime = new Date(now.getTime() + 120000); 
  }
    
    // endDateTime.setMinutes(startDateTime.getMinutes() + data.durationMinutesValue);
    // const repeatInterval = `*/${data.durationMinutesValue} * * * *`; // Repeat every specified duration

    // console.log(startDateTime)
    // const rule = new schedule.RecurrenceRule();
    // rule.minute=data.durationMinutesValue;
    const job=schedule.scheduleJob({ start: startDateTime, end: endDateTime==''?undefined:endDateTime, rule: `*/${data.durationMinutesValue} * * * *` },(_)=>extractRequestForProposals(_,username,app,mainWindow))
    console.log(job.nextInvocation())
    // const job = new SimpleIntervalJob({ minutes:,}, task)
    // scheduler.addSimpleIntervalJob(job)
  });
}




    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  }

);






app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
  if(scheduler instanceof ToadScheduler)
  scheduler.stop()

})


function createRequiredFiles(app){

  const fileNames=['userInfo.json','schedules.json']
  const directoryPath=app.getPath('userData');
  
fileNames.forEach((fileName) => {
  const filePath = `${directoryPath}/${fileName}`;
  console.log(filePath)
  if (!fssync.existsSync(filePath)) {
  fssync.writeFileSync(filePath, '', (err) => {
    if (err) {
      console.error(`Error creating ${filePath}: ${err}`);
    } else {
      console.log(`${filePath} created successfully.`);
    }
  });
}
});

}








