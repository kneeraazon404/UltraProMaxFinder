
const path = require('path');
const fs = require('fs').promises;
const fssync = require('fs');


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
    // view.webContents.openDevTools({ mode: 'detach' })
    view.webContents.on('close', () => {
      view = null;
  
    });
  
  }


function saveToDisk(data, app) {

  const filePath = path.join(app.getPath('userData'), 'userInfo.json');
  
  try {
    // Read the existing data from the file, if any
    let existingData = [];
    if (fssync.existsSync(filePath)) {
      const fileContent = fssync.readFileSync(filePath, 'utf8');
      existingData = fileContent.split('\n').filter(Boolean).map(JSON.parse);
    }

    // Check if the new data already exists in the file
    const isDataAlreadySaved = existingData.some(existingItem =>
      JSON.stringify(existingItem) === JSON.stringify(data)
    );

    if (isDataAlreadySaved) {
      console.log('Data already exists in the file. Not saving again.');
    } else {
      // Append the new data to the file
      fssync.appendFile(filePath, JSON.stringify(data) + '\n', (err) => {
        if (err) {
          console.error('Error saving data to disk:', err);
        } else {
          console.log('Data saved to disk successfully.');
        }
      });
    }
  } catch (error) {
    console.error('Error saving data to disk:', error);
  }
}




  module.exports={
    getCredentials
  }