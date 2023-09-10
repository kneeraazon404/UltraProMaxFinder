const fssync = require('fs');
const fs = require('fs').promises;
const path = require('path');



function getSavedTemplate(app){
    let data;
   const filePath = path.join(app.getPath('userData'), 'template.txt');
   try {
     data = fssync.readFileSync(filePath,'utf-8');
   } catch (error) {
     console.log("File not found")
     
   }
   return data;
 }
 
 
 async function saveTemplateToFile(event,data,app){
   const filePath = path.join(app.getPath('userData'), 'template.txt');
   let success=true;
   try {
     await fs.writeFile(filePath, data);
   } catch (error) {
     console.log(error);
     success=false;
     
   }
   return success;
 }

  
 module.exports={
    getSavedTemplate,
    saveTemplateToFile
 }