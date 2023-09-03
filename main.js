const { app, BrowserWindow, ipcMain, BrowserView, MessageChannelMain, session, webContents,dialog } = require('electron');
const fs = require('fs').promises;
const fssync = require('fs');
const XLSX = require("xlsx");
const ExcelJS = require('exceljs');
const path = require('path');
const readline = require('readline');
const { download } = require('electron-dl');



let mainWindow;
let width;
let height;



const { port1 } = new MessageChannelMain()


async function readTemplateFile(event, templateFileName) {
  const templatePath = path.join(__dirname, templateFileName);
  return await fs.readFile(templatePath, 'utf-8');
}



const downloadFileFromUserData = async (event,mainWindow) => {
  dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('downloads'), 'output.xlsx'), // Default download path
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
  }).then((result) => {
    if (!result.canceled) {
      const downloadPath = result.filePath;

      // You can replace this with your own file download logic
      // For example, here we're copying a sample file to the download location
      const sourceFilePath =  path.join(app.getPath('userData'), 'output.xlsx');;
      fssync.copyFileSync(sourceFilePath, downloadPath);

      mainWindow.webContents.send('download-complete', downloadPath);
    }
  }).catch((error) => {
    console.error('Error in file dialog:', error);
  });
};


function saveToDisk(data) {
  const filePath = path.join(app.getPath('userData'), 'userInfo.json');
  // will call this upon successful login in linkedin account

  try {
    let jsonData = JSON.stringify(data);
    fs.appendFile(filePath, jsonData + '\n');
  }
  catch (error) {

  }


}


function getCredentials(event, credentials) {
  const { username, password } = credentials;
  // we need to render sub
  const userDataPath = app.getPath('userData');
  const linkedInSessionPartitionName = `persist:${username}`;
  const linkedInSession = session.fromPartition(linkedInSessionPartitionName, {
    cache: path.join(userDataPath, username),
  });

  let view = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'linpreload.js'),
      partition: linkedInSessionPartitionName
    }
  })
  mainWindow.setBrowserView(view)
  view.webContents.on("did-finish-load", () => view.setBounds({ x: 0, y: (height / 3) | 0, width: width, height: height }))
  view.setAutoResize({ height: true, width: true })
  // =view.webContents.session.from;
  // Intercept and inspect requests  


  view.webContents.on("did-navigate", async (event, url) => {
    if (url.includes('feed')) {
      let hasAuthKey = await view.webContents.executeJavaScript("localStorage.getItem('C_C_M') !== null");
      if (hasAuthKey) {
        saveToDisk({ username, isScheduled: true });
        setTimeout(() => {
          mainWindow.removeBrowserView(view);
        }, 10000);
      }
    }
  })

  // linkedInSession.webRequest.onCompleted((details) => {
  //   // Log headers
  //   console.log('Request Headers:', details.responseHeaders);

  //   // Log cookiesBrowserView
  //   linkedInSession.cookies.get({ url: details.url }, (error, cookies) => {
  //     if (error) {
  //       console.error('Error getting cookies:', error);
  //     } else {
  //       console.log('Cookies:', cookies);
  //     }
  //   });

  //   // Continue with the request
  //   // callback({ cancel: false, requestHeaders: details.requestHeaders });
  // });

  view.webContents.loadURL('https://linkedin.com')
  view.webContents.send('expose-variable', credentials);
  view.webContents.openDevTools({ mode: 'detach' })
  view.webContents.on('close', () => {
    view = null;

  });


}




async function extractRequestForProposals(event, username) {
  // will write the logic for extracting proposals here after getting username from file
  // first load the specific session based on userdata
  console.log(username)
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
      extractProposals(body,username,rfpPage,linkedInSession,details.requestHeaders)
      }
    } catch (error) {
      console.log(error)

    }
    callback({ cancel: false, requestHeaders: details.requestHeaders })

  })
}


function extractProposals(data,username,page,linkedInSession,headers){

 
  const proposalsArr=[];
  const proposals=data.included.filter((item)=>item.$type=='com.linkedin.voyager.dash.marketplaces.projects.MarketplaceProject')
  // const filter=(proposals,property)=>proposals[property]
  proposals.forEach(proposal => {
    let jobTitle=proposal.detailViewSectionsResolutionResults.filter((item)=>item.header?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.title.text
    let jobCreatedDate=proposal.detailViewSectionsResolutionResults.filter((item)=>item.header?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.insight?.text

    let jobProvider=proposal.detailViewSectionsResolutionResults.filter((item)=>item.creatorInformation?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup.title?.text;
    let jobProviderDesignation=proposal.detailViewSectionsResolutionResults.filter((item)=>item.creatorInformation?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup.subtitle?.text;
    let jobProviderLinkedIn=proposal.detailViewSectionsResolutionResults.filter((item)=>item.creatorInformation?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup?.navigationUrl;
    let mutualConnectionUrl=proposal.detailViewSectionsResolutionResults.filter((item)=>item.creatorInformation?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation?.mutualConnectionsInsightUrl;
    let totalMutualConnections=proposal.detailViewSectionsResolutionResults.filter((item)=>item.creatorInformation?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.mutualConnectionsInsight?.text?.text;
    let questions=proposal.detailViewSectionsResolutionResults.filter((item)=>item.description?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsDescription')[0].description.questionnaireQuestions;
    let projectDetails=questions.map((question)=>`${question.question}\n${question.answer.textualAnswer}\n`).join('\n')
    proposalsArr.push({jobProvider,jobTitle,jobCreatedDate,jobProviderDesignation,jobProviderLinkedIn,mutualConnectionUrl,totalMutualConnections,projectDetails})
  });
  mainWindow.webContents.send('rfpCurrent',proposalsArr);
  saveToExcel(proposalsArr,username).catch((err) => {
    console.error('Error inserting data into Excel:', err);
  });
  submitProposals(proposals,linkedInSession,headers);
  setTimeout(() => {
    page.close()
  }, 10000);
  

}


async function submitProposals(proposals,session,headers){
  const { accept, 'accept-language': acceptLanguage, 'csrf-token': csrfToken, 'x-li-lang': xlilang, 'x-li-page-instance': xlipageinstance,
  'x-li-pem-metadata': xlipenmetadata, 'x-li-track': xlitrack, } = { ...headers }




  proposals.forEach(async proposal => {

    let urn=proposal.entityUrn;
    // console.log(urn)

    try {
      const res=await session.fetch('https://www.linkedin.com/voyager/api/voyagerMarketplacesDashProposalSubmissionForm?action=submitProposal&decorationId=com.linkedin.voyager.dash.deco.marketplaces.MarketplaceProject-46',{
      headers:{ accept, 'accept-language': acceptLanguage,
      'Content-Type':'application/json; charset=UTF-8',
       'csrf-token': csrfToken, 'x-li-lang': xlilang, 'x-li-page-instance': xlipageinstance,'x-li-pem-metadata':'Voyager - Services Marketplace=service-request-proposal-submission-form-submit' },
      method:'POST',
      'body':JSON.stringify({
        proposalDetailsAnswers: [
          {
            formElementUrn: `urn:li:fsd_marketplaceProposalSubmissionFormElementV2:(PROPOSAL_DETAILS,${urn})`,
            formElementInputValues: [
              {
                textInputValue: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Suspendisse bibendum ex at massa venenatis, nec scelerisque elit vulputate. Sed eget ligula non justo facilisis volutpat. Aliquam erat volutpat. Proin vel turpis at quam vehicula lacinia. Aenean sollicitudin magna a justo cursus, at lacinia odio ullamcorper. Sed auctor bibendum quam, eget vestibulum ex varius eu. Etiam vel arcu justo. Curabitur nec enim a metus ullamcorper tincidunt. Praesent nec urna id ex eleifend facilisis ac vel ipsum. Sed tincidunt tortor ac nibh gravida, eget cursus urna bibendum. Nullam id dolor eget augue malesuada dictum."
              }
            ]
          },
          {
            formElementUrn: `urn:li:fsd_marketplaceProposalSubmissionFormElementV2:(INCLUDE_FREE_CONSULTATION,${urn})`,
            formElementInputValues: [
              // {
              //   entityInputValue: {
              //     inputEntityName: "INCLUDE_FREE_CONSULTATION"
              //   }
              // }
            ]
          }
        ],
        marketplaceProjectProposalUrn: proposal.detailViewSectionsResolutionResults.filter((item)=>item.header?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.serviceProviderInsight.providerProjectActions['*marketplaceProjectProposal']
      })
    })
    console.log(res)
    if(res.ok){
      const body = await res.json()
      console.log(body)
    }
      
    } catch (error) {
      console.log(error);
      
    }
    
  });
}





async function readUserData(event) {
  const parsedData = [];
  const filePath = path.join(app.getPath('userData'), 'userInfo.json');
  const rl = readline.createInterface({
    input: fssync.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    try {
      const jsonObject = JSON.parse(line);
      parsedData.push(jsonObject);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  }
  return parsedData;


}


app.whenReady().then(
  () => {
    // createWindow();
    ipcMain.handle('read-excel-file',readExcelFile)
    ipcMain.handle('getProposals', extractRequestForProposals)
    ipcMain.handle('readUsersData', readUserData)
    ipcMain.on('send-credentials', getCredentials)
    ipcMain.handle('readTemplateFromFile', readTemplateFile)
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

    mainWindow.loadFile('index.html');


    // const view = new BrowserView()
    // win.setBrowserView(view)
    // view.webContents.on("did-finish-load", () =>view.setBounds({ x: 100, y: 100, width: 800, height: 400 }))
    // view.webContents.loadURL('https://electronjs.org')
    // win.webContents.setWindowOpenHandler(async (details) =>{
    //   console.log(details);
    //     const browser = await playwright.chromium.launch({
    //       headless:false,

    //     }
    //     );
    //     const context = await browser.newContext();
    //     const page = await context.newPage();
    //     await page.goto('https://www.example.com');
    // });
    ipcMain.on('download-excel', (event,username) => {
      downloadFileFromUserData(event,mainWindow);
  });
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  }

);




app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})




async function readExcelFile(event,username){
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath,'output.xlsx'); 
    const data = fssync.readFileSync(filePath);
    const workbook = XLSX.read(data, { type: 'buffer' });
    const sheetName = username;
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    return sheetData;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return [];
  }


}




async function saveToExcel(data,pagename){
  const userDataPath = app.getPath('userData');
  const filePath = path.join(userDataPath,'output.xlsx'); 
  let workbook;
  if (fssync.existsSync(filePath)) {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
  } else {
    workbook = new ExcelJS.Workbook();
  }
  let worksheet = workbook.getWorksheet(pagename);
  if (!worksheet) {
    worksheet = workbook.addWorksheet(pagename);
  }
  const headerRow = Object.keys(data[0]);
  if (worksheet.getRow(1).values.length === 0) {
    worksheet.addRow(headerRow);
  }
  data.forEach((object) => {
    const dataRow = headerRow.map((key) => object[key]);
    worksheet.addRow(dataRow);
  });
  await workbook.xlsx.writeFile(filePath);

}



// const { app, BrowserView, BrowserWindow } = require('electron')

// app.whenReady().then(() => {
//   const win = new BrowserWindow({ width: 800, height: 600 })

//   const view = new BrowserView()
//   win.setBrowserView(view)
//   view.webContents.on("did-finish-load", () =>view.setBounds({ x: 0, y: 0, width: 300, height: 300 }))
//   view.webContents.loadURL('https://electronjs.org')
// })



