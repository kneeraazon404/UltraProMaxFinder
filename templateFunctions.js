const fssync = require('fs');
const fs = require('fs').promises;
const path = require('path');



function getSavedTemplate(app,filename='template.json'){
  let data;
  const filePath = path.join(app.getPath('userData'), filename);
  try {
    data = fssync.readFileSync(filePath,'utf-8');
  } catch (error) {
    console.log("File not found")
  }
  if(filename==='template.json'){
    return JSON.parse(data);

  }
   return data;
 }
 
 
 async function saveTemplateToFile(event,data,app,filename='template.json'){
  if(filename==='template.json'){
    const filePath = path.join(app.getPath('userData'), filename);
    if (!fssync.existsSync(filePath)) {
      fssync.writeFileSync(filePath, '{}', 'utf-8');
    }
    let jsonFile=await fs.readFile(filePath);
    var templates = JSON.parse(jsonFile)??{};
    templates[data.title.toLowerCase()]=data.data;
    let success=true;
    try {
      await fs.writeFile(filePath, JSON.stringify(templates));
    } catch (error) {
      console.log(error);
      success=false; 
    }
    return success;
  }else{
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
 }

 async function deleteTemplateKey(event,keyName,app){
  filename='template.json';
  if(filename==='template.json'){
    const filePath = path.join(app.getPath('userData'), filename);
    if (!fssync.existsSync(filePath)) {
      fssync.writeFileSync(filePath, '{}', 'utf-8');
    }
    let jsonFile=await fs.readFile(filePath);
    var templates = JSON.parse(jsonFile)??{};
    delete templates[keyName];
    let success=true;
    try {
      await fs.writeFile(filePath, JSON.stringify(templates));
    } catch (error) {
      console.log(error);
      success=false; 
    }
    return success;
  }

 }







  
 module.exports={
  deleteTemplateKey,
    getSavedTemplate,
    saveTemplateToFile
 }