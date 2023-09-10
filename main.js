const { app, BrowserWindow, ipcMain, session,dialog } = require('electron');
const fs = require('fs').promises;
const { ToadScheduler, SimpleIntervalJob, AsyncTask } = require('toad-scheduler')

const fssync = require('fs');
const path = require('path');
const readline = require('readline');
const {getSavedTemplate,saveTemplateToFile}=require('./templateFunctions')
const {getCredentials}=require('./getCredentials')
const {extractProposals}=require('./proposals')
const {readExcelFile}=require('./excelFunctions')
const {scheduleDialog,scheduleTask}=require('./scheduleSettings')


let mainWindow;
let width;
let height;


async function readTemplateFile(event, templateFileName) {
  const templatePath = path.join(__dirname, templateFileName);
  return await fs.readFile(templatePath, 'utf-8');
}


async function readProposalTemplate(event) { /// for reading proposal template from file
 return getSavedTemplate(app)
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
      partition: linkedInSessionPartitionName
    }
  })
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
      extractProposals(body,username,rfpPage,linkedInSession,details.requestHeaders,app,mainWindow)

      }
    } catch (error) {
      console.log(error)

    }
    setTimeout(() => {
      rfpPage.close()
    }, 10000);
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
    // createWindow();
    ipcMain.handle('scheduleTask',(event,data,username)=>scheduleTask(event,data,username,mainWindow,app))
    ipcMain.handle('scheduleSetting',(event,username)=>scheduleDialog(event,username,app,mainWindow))
    ipcMain.handle('readTemplateFromFile', readTemplateFile) // handler for html template
    ipcMain.handle('read-excel-file',(event,username)=>readExcelFile(event,username,app))
    ipcMain.handle('readUsersData', readUserData)
    ipcMain.on('send-credentials',(event,credentials)=> getCredentials(event,credentials,mainWindow,app))
    ipcMain.handle('saveTemplateToFile',(event,data)=>saveTemplateToFile(event,data,app))
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
      downloadFileFromUserData(event,mainWindow);
  });


  const scheduler = new ToadScheduler()
  const scheduleFile = path.join(app.getPath('userData'),'schedules.json');

let existingData = {};
try {
  const savedData = fssync.readFileSync(scheduleFile, 'utf8');
  existingData = JSON.parse(savedData);
} catch (err) {
  // Handle the error if the file doesn't exist or is not valid JSON
  console.error(`Error reading file: ${err}`);
}
Object.keys(existingData).forEach(key => {
  let username=key;
  let data=existingData[key];
  console.log(existingData)
  const task=new AsyncTask(username,(_)=>extractRequestForProposals(_,username,app,mainWindow).then((result) => { /* continue the promise chain */ }) ,
  (err) => {console.log(err) })
  const job = new SimpleIntervalJob({ minutes:data.durationMinutesValue,}, task)
  scheduler.addSimpleIntervalJob(job)
});



    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  }

);




app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
  scheduler.stop()

})









