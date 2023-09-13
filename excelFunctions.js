
const fssync = require('fs');
const XLSX = require("xlsx");
const ExcelJS = require('exceljs');
const path = require('path');

async function readExcelFile(event,username,app){
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
  
  
  
  
  async function saveToExcel(data,pagename,app){

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
    if (worksheet.actualRowCount === 0) {
      worksheet.addRow(headerRow);
    }
    data.forEach((object) => {
      const dataRow = headerRow.map((key) => object[key]);
      worksheet.addRow(dataRow);
    });
    await workbook.xlsx.writeFile(filePath);
  
  }


  module.exports={
    saveToExcel,readExcelFile
  }