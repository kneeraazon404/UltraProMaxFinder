const {google }=require('googleapis');
const {auth}=require('google-auth-library')
const path=require('path');
const { readFileSync } = require('fs');

let credentials = JSON.parse(readFileSync(__dirname+"/credentials.json", "utf8"));

// const sheets = google.sheets('v4');

async function authorize() {
    const authClient = await auth.fromJSON(credentials);
    authClient.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  
    return authClient;
  }



  async function isSheetEmpty(sheets, spreadsheetId, sheetName) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName,
      });
  
      const values = response.data.values;
      return !values || values.length === 0;
    } catch (error) {
      console.error('Error checking if sheet is empty:', error);
      return true; // Assume empty if there's an error
    }
  }




async function writeDataToGoogleSheet(data,pagename,app) {
    const userDataPath = app.getPath('userData');
    let authTokenFilePath = path.join(userDataPath,'excelUrl.txt')
    let pattern=/\/d\/([A-Za-z0-9_-]+)/;
    let sheetUrl=readFileSync(authTokenFilePath);
    let id=pattern.exec(sheetUrl)[1];
    

    const header = Object.keys(data[0]);

    const authClient = await authorize();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
  
    // Specify the spreadsheet ID and range
    const spreadsheetId = id;
    const sheetName = pagename; // Replace with your desired range
  
    // Data to write
    // const header = ['Header 1', 'Header 2', 'Header 3'];

    // const values = [
    //   ['Value 1', 'Value 2', 'Value 3'],
    //   ['Value 4', 'Value 5', 'Value 6'],
    // ];
    const dataToWrite=[];
    data.forEach((object) => {
      dataToWrite.push(header.map((key) => object[key]));
     
    });
    console.log(dataToWrite)
let isCreated=await createSheetIfNotExists(sheets,authClient,spreadsheetId,sheetName)
if(isCreated)
    try {

    const isEmpty = await isSheetEmpty(sheets, spreadsheetId, sheetName);
    if(isEmpty){
        const response1 = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: sheetName,
            valueInputOption: 'RAW',
            resource: {
              values:[header],
            },
          });
    }
    const nextRow = isEmpty ? 2 : (dataToWrite.length + 1);
    const newRange = `${sheetName}!A${nextRow}`;

       const response2 = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: newRange,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',

        resource: {
          values:dataToWrite,
        },
      });
  
      console.log('Data written to Google Sheets:');
    } catch (error) {
      console.error('Error writing data:', error);
    }
  }



  async function createSheetIfNotExists(sheets,authClient,spreadsheetId,sheetName) {
    try {
      // Check if the sheet already exists
      const sheetsResponse = await sheets.spreadsheets.get({
        spreadsheetId,
      });
  
      const sheetExists = sheetsResponse.data.sheets.some(
        (sheet) => sheet.properties.title === sheetName
      );
  
      if (!sheetExists) {
        // If the sheet doesn't exist, create it
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          },
        });
  
        console.log(`Sheet '${sheetName}' created.`);
        return true;
      } else {
        console.log(`Sheet '${sheetName}' already exists.`);
        return true;
      }
    } catch (error) {
      console.error('Error creating or checking sheet:', error);
      return true;
    }
  }



  async function readDataFromGoogleSheet(event,pagename, app) {
    const userDataPath = app.getPath('userData');
    let authTokenFilePath = path.join(userDataPath,'excelUrl.txt')
    let pattern=/\/d\/([A-Za-z0-9_-]+)/;
    let sheetUrl=readFileSync(authTokenFilePath);
    let id=pattern.exec(sheetUrl)[1];
  

    const authClient = await authorize();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
  
    const spreadsheetId = id;
    const sheetName = pagename;
  
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName,
      });
  
      const values = response.data.values;
  
      if (!values || values.length === 0) {
        console.log('The sheet is empty.');
        return [];
      }
  
      // Assuming the first row contains headers
      const headers = values[0];
      const rowData = values.slice(1); // Exclude the header row
  
      // Convert the data to an array of objects
      const data = rowData.map((row) => {
        const rowDataObject = {};
        row.forEach((value, index) => {
          rowDataObject[headers[index]] = value;
        });
        return rowDataObject;
      });
  
      return data;
    } catch (error) {
      console.log(error)
      console.error('Error reading data:', error.response?.status);
      return error.response?.status;
    }
  }


  async function downloadGoogleSheetAsExcel(event,mainWindow,pagename, app) {
    const data = await readDataFromGoogleSheet(pagename, app);
  
    if (data.length === 0) {
      console.log('No data to export.');
      return;
    }
  
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(pagename);
  
    // Add headers to the Excel sheet
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
  
    data.forEach((row) => {
      const values = headers.map((header) => row[header]);
      worksheet.addRow(values);
    });
  
    const filePath = path.join(app.getPath('userData'), `${pagename}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
  
    console.log(`Data downloaded and saved as ${pagename}.xlsx`);

    dialog.showSaveDialog(mainWindow, {
      defaultPath: path.join(app.getPath('downloads'), `${pagename}.xlsx`),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    }).then((result) => {
      if (!result.canceled) {
        const downloadPath = result.filePath;
        const sourceFilePath =  path.join(app.getPath('userData'), `${pagename}.xlsx`);
        fssync.copyFileSync(sourceFilePath, downloadPath);
  
        mainWindow.webContents.send('download-complete', downloadPath);
      }
    }).catch((error) => {
      console.error('Error in file dialog:', error);
    });
  }




  module.exports={
    writeDataToGoogleSheet,
    readDataFromGoogleSheet,
    downloadGoogleSheetAsExcel
  }

