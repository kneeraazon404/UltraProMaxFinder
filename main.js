const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const fs = require('fs').promises;
const { ToadScheduler, SimpleIntervalJob, AsyncTask } = require('toad-scheduler')
const schedule = require('node-schedule');
const puppeteer = require('puppeteer');

// const chokidar = require('chokidar');



const fssync = require('fs');
const path = require('path');
const readline = require('readline');
const { getSavedTemplate, saveTemplateToFile, deleteTemplateKey } = require('./templateFunctions')
const { getCredentials, deleteObjectsWithValue } = require('./getCredentials')
const { readDataFromGoogleSheet } = require('./googleDocsConnections')
const { extractProposals, sendMessage } = require('./proposals')
// const {readExcelFile}=require('./excelFunctions')
const { scheduleDialog, scheduleTask, removeSchedule } = require('./scheduleSettings');
// const { scheduler } = require('timers/promises');

let scheduler;
let mainWindow;
let width;
let height;


async function readTemplateFile(event, templateFileName) {
  const templatePath = path.join(__dirname, templateFileName);
  return await fs.readFile(templatePath, 'utf-8');
}


async function readProposalTemplate(event, filename = 'template.txt') { /// for reading proposal template from file
  return getSavedTemplate(app, filename)
}



const downloadFileFromUserData = async (event, mainWindow) => {
  dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('downloads'), 'output.xlsx'),
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
  }).then((result) => {
    if (!result.canceled) {
      const downloadPath = result.filePath;
      const sourceFilePath = path.join(app.getPath('userData'), 'output.xlsx');;
      fssync.copyFileSync(sourceFilePath, downloadPath);

      mainWindow.webContents.send('download-complete', downloadPath);
    }
  }).catch((error) => {
    console.error('Error in file dialog:', error);
  });
};





async function extractRequestForProposals(event, username, app, mainWindow) {
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
  // rfpPage.webContents.openDevTools({ mode: 'detach' })


  let cookies = await linkedInSession.cookies.get({});
  // let browser = await puppeteer.launch({ headless: false,maxConcurrency: 1  });
  // let messagePage = await browser.newPage();

  // await messagePage.setCookie(...cookies)
  // await messagePage.goto('https://www.linkedin.com/service-marketplace/provider/requests', { timeout: 10000 });
  // setTimeout(() => { }, 5000);
  // await linkedInSession.clearCache();
  rfpPage.loadURL("https://www.linkedin.com/feed/?trk=homepage-basic_sign-in-submit")
  rfpPage.loadURL('https://www.linkedin.com/service-marketplace/provider/requests')
  rfpPage.once('ready-to-show', () => {
    rfpPage.show()
  })
  rfpPage.webContents.on('did-redirect-navigation',(details)=>{
    console.log(details.url)
    if(!details.isSameDocument && details.url.includes('login?session_redirect')){
      const fileContent = fssync.readFileSync(path.join(app.getPath('userData'), 'pass.json'), 'utf8');
      existingData = fileContent.split('\n').filter(Boolean).map(JSON.parse);
      let passwordStored=existingData.filter(data=>data.username=username)[0].password
      rfpPage.webContents.executeJavaScript(`document.querySelector('#password').value="${passwordStored}";document.querySelector('button[type=submit]').click()`)
    }
    // if(rfpPage.isVisible()){
    //   rfpPage.close();
    // }

  })
  const capturedRequests = [];

  // Array to store captured requests

  if(rfpPage.isClosable()){
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log("fuck tbis is running")
    rfpPage.close();
  }

  linkedInSession.webRequest.onBeforeSendHeaders({ urls: ['https://www.linkedin.com/*queryId=voyagerMarketplacesDashMarketplaceProjects.*'], types: ['xhr'] }, async (details, callback) => {
    // Log headers

    const { accept, 'accept-language': acceptLanguage, 'csrf-token': csrfToken, 'x-li-lang': xlilang, 'x-li-page-instance': xlipageinstance,
      'x-li-pem-metadata': xlipenmetadata, 'x-li-track': xlitrack, } = { ...details.requestHeaders }

    try {
      const res = await linkedInSession.fetch(details.url, {
        headers: { accept, 'accept-language': acceptLanguage, 'csrf-token': csrfToken, 'x-li-lang': xlilang, 'x-li-page-instance': xlipageinstance,'x-li-pem-metadata':xlipenmetadata },
      })
      if (res.ok) {
        const body = await res.json();    
        console.log(body)    // use this to get all the pending requests
      await extractProposals(body,username,rfpPage,linkedInSession,details.requestHeaders,app,mainWindow,linkedInSessionPartitionName)

      }
      else {
        console.log(res)
      }

    } catch (error) {
      console.log(error);
    
    }

    callback({ cancel: false, requestHeaders: details.requestHeaders })

  })

  
  
  // setTimeout(() => {
  //   rfpPage.close()
  // }, 10000);

}



async function setCookiesInElectron(cookies,session) {

  // Convert Puppeteer cookies to Electron format
  const electronCookies = cookies.map((cookie) => {
  let {size,sameSite,sameParty,sourceScheme,sourcePort,expires,...rest}=cookie;
  return {...rest,expirationDate:expires,sameSite:'no_restriction',hostOnly:false};
  });
let sesCookies=await session.cookies.get({});
  console.log(sesCookies )
  console.log(electronCookies)

  // Set cookies in Electron session
  electronCookies.forEach(electronCookie => {
    session.cookies.set(electronCookie, (error) => {
      if (error) {
        console.error(error);
      } else {
        console.log('Cookies set successfully');
      }
    });
    
  });

}



async function readUserData(event) {
  const parsedData = [];
  let rl;
  const filePath = path.join(app.getPath('userData'), 'userInfo.json');
  try {
    await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
    rl = readline.createInterface({
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

    // chokidar.watch(path.join(app.getPath('userData'), '*.txt', '*.json')).on('all', (event, path) => {
    //   console.log('this is good')
    //   mainWindow.webContents.reload();
    // });

    //   writeData().then(out=>console.log(out)).catch(e=>console.log(e));

    // die;
    createRequiredFiles(app)
    ipcMain.handle('removeSchedule', (event, username) => removeSchedule(event, username, app))
    ipcMain.handle('scheduleTask', (event, data, username) => scheduleTask(event, data, username, mainWindow, app))
    ipcMain.handle('scheduleSetting', (event, username) => scheduleDialog(event, username, app, mainWindow))
    ipcMain.handle('readTemplateFromFile', readTemplateFile) // handler for html template
    ipcMain.handle('read-excel-file', (event, username) => readDataFromGoogleSheet(event, username, app))
    ipcMain.handle('readUsersData', readUserData)
    ipcMain.on('send-credentials', (event, credentials) => getCredentials(event, credentials, mainWindow, app))
    ipcMain.handle('saveTemplateToFile', (event, data, filename) => saveTemplateToFile(event, data, app, filename)),
      ipcMain.handle('sendMessage', sendMessage)
    ipcMain.handle('readProposalTemplate', readProposalTemplate)
    ipcMain.handle('deleteTemplateKey', (event, keyName) => deleteTemplateKey(event, keyName, app))
    ipcMain.handle('removeAccount', (event, username) => removeAccount(event, username, app, mainWindow));


    async function removeAccount(event, username, app, mainWindow) {

      let folderPath = path.join(app.getPath('userData'), 'Partitions', username)
      try {
        await removeFolderRecursive(folderPath);
        const filePath = path.join(app.getPath('userData'), 'userInfo.json');
        await deleteObjectsWithValue(filePath, username);
        mainWindow.webContents.reload()

        return success;


      } catch (error) {

      }

    }

    async function removeFolderRecursive(folderPath) {
      try {
        const stats = await fs.stat(folderPath);

        if (stats.isDirectory()) {
          const files = await fs.readdir(folderPath);

          for (const file of files) {
            const curPath = path.join(folderPath, file);
            await removeFolderRecursive(curPath);
          }

          await fs.rmdir(folderPath);
        } else {
          await fs.unlink(folderPath);
        }

        console.log(`Folder ${folderPath} and its contents have been deleted.`);
      } catch (error) {
        console.error(`Error deleting ${folderPath}:`, error.message);
      }
    }

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

    ipcMain.handle('getProposals', (event, username) => extractRequestForProposals(event, username, app, mainWindow))
    mainWindow.loadFile('index.html');
    ipcMain.on('download-excel', (event, username) => {
      downloadFileFromUserData(event, mainWindow, username, app);
    });



    let scheduleFile;
    scheduleFile = path.join(app.getPath('userData'), 'schedules.json');
    let existingData = {};
    try {
      const savedData = fssync.readFileSync(scheduleFile, 'utf8');
      existingData = JSON.parse(savedData);
    } catch (err) {
      // Handle the error if the file doesn't exist or is not valid JSON
      console.error(`Error reading file: ${err} ${scheduleFile}`);
    }

    if (existingData) {
      // scheduler= new ToadScheduler()
      Object.keys(existingData).forEach(key => {
        let username = key;
        let data = existingData[key];
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
        let randomMinute = Math.floor(Math.random() * (data.durationMinutesValueHigher - data.durationMinutesValueLower + 1)) + data.durationMinutesValueLower;
        const job = schedule.scheduleJob({ start: startDateTime, end: endDateTime == '' ? undefined : endDateTime, rule: `*/${randomMinute} * * * *` }, (_) => {
          extractRequestForProposals(_, username, app, mainWindow);
          let randomMinute = Math.floor(Math.random() * (data.durationMinutesValueHigher - data.durationMinutesValueLower + 1)) + data.durationMinutesValueLower;
          let isReschuled = job.reschedule({ start: startDateTime, end: endDateTime == '' ? undefined : endDateTime, rule: `*/${randomMinute} * * * *` })
          if (isReschuled) {
            console.log("Reschuled Successfully....")
          }
          else {
            console.log("Reschedule failed....")
          }
        }
        );
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
  if (scheduler instanceof ToadScheduler)
    scheduler.stop()

})


function createRequiredFiles(app) {

  const fileNames = ['userInfo.json', 'schedules.json','pass.json','credentials.json']
  const directoryPath = app.getPath('userData');

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








