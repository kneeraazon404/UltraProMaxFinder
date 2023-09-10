
const path = require('path');
const fs = require('fs').promises;

const { BrowserView, session,} = require('electron');

function getCredentials(event, credentials,mainWindow,app) {
    const { username, password } = credentials;
    // we need to render sub
    const userDataPath = app.getPath('userData');
    console.log(userDataPath)
    const linkedInSessionPartitionName = `persist:${username}`;
    const linkedInSession = session.fromPartition(linkedInSessionPartitionName, {
      cache: path.join(userDataPath, username),
    });

    const { screen } = require('electron')
    const primaryDisplay = screen.getPrimaryDisplay()
    width = primaryDisplay.workAreaSize.width;
    height = primaryDisplay.workAreaSize.height;
  
    let view = new BrowserView({
      webPreferences: {
        nodeIntegration: true,
        preload: path.join(__dirname, 'linpreload.js'),
        partition: linkedInSessionPartitionName
      }
    })
    mainWindow.setBrowserView(view)
    view.webContents.on("did-finish-load", () => view.setBounds({ x: 0, y: (height / 3) | 0, width: width, height: height }))
  
    view.webContents.on('did-start-loading', () => {
      // give a loading message here
  
      
    });
    view.setAutoResize({ height: true, width: true })
    // =view.webContents.session.from;
    // Intercept and inspect requests  
  
  
    view.webContents.on("did-navigate", async (event, url) => {
      console.log(url)
      
        let hasAuthKey = await view.webContents.executeJavaScript("localStorage.getItem('C_C_M') !== null");
        if (hasAuthKey) {
          console.log(username);
          saveToDisk({ username, isScheduled: true },app);
          setTimeout(() => {
            mainWindow.removeBrowserView(view);
          }, 10000);
        }
      
    })
  
    view.webContents.loadURL('https://linkedin.com')
    view.webContents.send('expose-variable', credentials);
    view.webContents.openDevTools({ mode: 'detach' })
    view.webContents.on('close', () => {
      view = null;
  
    });
  
  }

  function saveToDisk(data,app) {
    console.log(data);
    const filePath = path.join(app.getPath('userData'), 'userInfo.json');
    // will call this upon successful login in linkedin account
    try {
      let jsonData = JSON.stringify(data);
      fs.appendFile(filePath, jsonData + '\n');
    }
    catch (error) {
      console.log(error)
  
    }
  }


  module.exports={
    getCredentials
  }