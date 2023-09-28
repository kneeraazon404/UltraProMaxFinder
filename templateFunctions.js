const fssync = require('fs');
const fs = require('fs').promises;
const path = require('path');



function getSavedTemplate(app,filename='template.txt'){
    let data;
   const filePath = path.join(app.getPath('userData'), filename);
   try {
     data = fssync.readFileSync(filePath,'utf-8');
   } catch (error) {
     console.log("File not found")
     
   }
   return data;
 }
 
 
 async function saveTemplateToFile(event,data,app,filename='template.txt'){
   const filePath = path.join(app.getPath('userData'), filename);
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