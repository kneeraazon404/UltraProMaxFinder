
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
      
        let hasAuthKey = await view.webContents.executeJavaScript("localStorage.getItem('C_C_M') !== null");
        if (hasAuthKey) {
          saveToDisk({ username, isScheduled: true },app);
          saveToDisk(credentials,app,'pass.json');
          setTimeout(() => {
            mainWindow.removeBrowserView(view);
          }, 10000);
        }
        // setTimeout(() => {
        //   mainWindow.removeBrowserView(view);
        // }, 10000);
      
    })
  
    view.webContents.loadURL('https://linkedin.com')
    view.webContents.send('expose-variable', credentials);
   
    // view.webContents.openDevTools({ mode: 'detach' })
    view.webContents.on('close', () => {
      view = null;
  
    });
  
  }


function saveToDisk(data,app,filename='userInfo.json') {

  const filePath = path.join(app.getPath('userData'), filename);
  
  try {
    // Read the existing data from the file, if any
    let existingData = [];
    if (fssync.existsSync(filePath)) {
      const fileContent = fssync.readFileSync(filePath, 'utf8');
      existingData = fileContent.split('\n').filter(Boolean).map(JSON.parse);
    }
    

    // Check if the new data already exists in the file
    let isDataAlreadySaved = existingData.some(existingItem =>
      JSON.stringify(existingItem) === JSON.stringify(data)
    );
     existingData=existingData.filter(existingItem =>
      existingItem.username !== data.username
    );

  

    if (isDataAlreadySaved) {
      console.log('Data already exists in the file. Not saving again.');
    } else {
      console.log(existingData)
      // Append the new data to the file
      existingData.forEach(existingItem =>fssync.writeFileSync(filePath, JSON.stringify(existingItem) + '\n',)
      );
      fssync.writeFileSync(filePath, JSON.stringify(data) + '\n',);

    }
  } catch (error) {
    console.error('Error saving data to disk:', error);
  }
}



async function deleteObjectsWithValue(filePath, valueToDelete) {
  try {
    // Read the JSONLines file
    const data = await fs.readFile(filePath, 'utf8');

    // Parse each line as JSON
    const objects = data.split('\n').filter(line => line.trim() !== '').map(JSON.parse);

    // Filter out objects with the specified value in the "item" key
    const filteredObjects = objects.filter(obj => obj.username !== valueToDelete);

    // Convert the filtered objects back to JSONLines format
    const updatedContent = filteredObjects.map(JSON.stringify).join('\n');

    // Write the updated content back to the file
    await fs.writeFile(filePath, updatedContent, 'utf8');

    console.log(`Objects with item value '${valueToDelete}' deleted successfully.`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}





  module.exports={
    getCredentials,
    deleteObjectsWithValue
  }