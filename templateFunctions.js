const fssync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const os=require('os');



function getSavedTemplate(app,filename='template.json'){
  let data;
  const filePath = path.join(app.getPath('userData'), filename);
  try {
    data = fssync.readFileSync(filePath,'utf-8');
  } catch (error) {
    console.log(error.message)
    console.log(error)

  }
  if(filename==='template.json'){
    return JSON.parse(data);

  }
   return data;
 }
 
 
 async function saveTemplateToFile(event,data,app,filename='template.json'){
  if (filename === 'template.json') {
    const filePath = path.join(app.getPath('userData'), filename);
    
    // Ensure the file exists
    if (!fssync.existsSync(filePath)) {
      fssync.writeFileSync(filePath, '{}', 'utf-8');
    }

    let jsonFile = await fs.readFile(filePath);
    var templates = JSON.parse(jsonFile) || {};

    const titleKey = data.title.toLowerCase();

    if (data.content.subtitle != '') {
      if (typeof templates[titleKey] === 'string') {
        templates[titleKey] = { default: templates[titleKey] };
      }
      if (!templates[titleKey][data.content.subtitle]) {
        templates[titleKey][data.content.subtitle] = {};
      }
      templates[titleKey][data.content.subtitle] = data.content.data;
    } else {
      if (typeof templates[titleKey] === 'object' && templates[titleKey].default) {
        templates[titleKey] = data.content.data;
      } 
    }
    let success = true;
    try {
      await fs.writeFile(filePath, JSON.stringify(templates, null, 2));
    } catch (error) {
      console.log(error);
      success = false;
    }
    
    return success;
  }else{
   const filePath = path.join(app.getPath('userData'), filename);
   let success=true;
   try {
    data = data.split(os.EOL).join('\n')
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
    if (templates.hasOwnProperty(keyName)) {
      delete templates[keyName];
  } else {
      for (let prop in templates) {
          if (typeof templates[prop] === 'object' && templates[prop].hasOwnProperty(keyName)) {
              delete templates[prop][keyName];
          }
      }
  }
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