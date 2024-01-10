// const { ipcRenderer } = require('electron');





const accountLink = document.getElementById('account_page');
const accountListPage = document.getElementById('accountList_page');
const messagesLink = document.getElementById('messages-link');
const contentContainer = document.getElementById('mainBody');
const proposalPage=document.getElementById('proposal_page');
// const settingsPage=document.getElementById('settings_page');




// this is for rendering template

document.addEventListener('DOMContentLoaded', getAccountList)
accountLink.addEventListener('click', async () => {
  const accountTemplate = await window.electronAPI.readTemplate('templates/account.html');
  contentContainer.innerHTML = accountTemplate;
});
// settingsPage.addEventListener('click', async () => {
//   const settingsTemplate = await window.electronAPI.readTemplate('templates/settings.html');
//   contentContainer.innerHTML = settingsTemplate;
// });

proposalPage.addEventListener('click', async () => {
  const proposalTemplate = await window.electronAPI.readTemplate('templates/proposal.html');
  contentContainer.innerHTML = proposalTemplate;
  let  templateInput=document.querySelector('#savedTemplateText');
  let  excelInputURL=document.querySelector('#savedExcelUrl');
  let messageTemplateInput=document.querySelector('#savedMessageContent')

  
  let textArr=await window.electronAPI.readTemplateText();
  console.log(textArr);
  let excelURL=await window.electronAPI.readTemplateText('excelUrl.txt');
  let textMessage=await window.electronAPI.readTemplateText('messageTemplate.txt');
  let selectElement=document.querySelector('#savedTemplate');
  let subDropdown = document.querySelector('#subDropdown');


  subDropdown.addEventListener('change',(event)=>{
    templateInput.textContent=event.target.value;
  })
  selectElement.addEventListener('change',(event)=>{
    if (typeof textArr[event.target.value] === 'object') {
      subDropdown.style.display = 'block';
      populateSubDropdown(textArr[event.target.value]);
  } else {
      subDropdown.style.display = 'none';
      templateInput.textContent=event.target.value;
  }
  })
  if(Object.keys(textArr).length !== 0){
    Object.keys(textArr).forEach((templateTitle,index)=>{
    const optionElement = document.createElement('option');
    optionElement.text = templateTitle;
    if (typeof textArr[templateTitle] === 'object'){

      optionElement.value = templateTitle.toLowerCase();
    }else
    optionElement.value = textArr[templateTitle];
    selectElement.add(optionElement);
 
    if(index===0)
    templateInput.innerHTML=textArr[templateTitle];
    })
  }
  if(excelURL?.length){
    excelInputURL.innerHTML=excelURL;
  }
  if(textMessage?.length){
    messageTemplateInput.innerHTML=textMessage;

  }
});



function populateSubDropdown(data) {
  subDropdown.innerHTML = ''; // Clear existing options
console.log('this is fucking data',data)
  for (const key in data) {
      let option = document.createElement('option');
      option.value = data[key];
      option.textContent = key;
      subDropdown.appendChild(option);
  }
}

accountListPage.addEventListener('click', getAccountList);




//   const linkedInForm=document.getElementById()
document.addEventListener('submit',async (event) => {
  if (event.target.id == 'linkedInForm') {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    window.electronAPI.sendCredentials({ username, password })
  }
  console.log(event)

  if (event.target.id == 'textInputForm') {
    event.preventDefault();
    let templateTitle=document.getElementById('templateTitle').value;
    let templateSubTitle=document.getElementById('templateSubtitle')?.value??'';
    console.log('this is subtitlel',templateSubTitle);
    let data = document.getElementById('templatetext').value;
    isSuccessful=await window.electronAPI.saveTemplate({title:templateTitle,content:{subtitle:templateSubTitle,data}})
    if(isSuccessful){
      alert("Template Saved Successfully");
      proposalPage.click();
    }
    else alert("Something went wrong")
  }
  if (event.target.id == 'ExcelUrlInput') {
    event.preventDefault();
    let data = document.getElementById('excelUrlToSave').value;
    isSuccessful=await window.electronAPI.saveTemplate(data,'excelUrl.txt')
    if(isSuccessful){
      alert("Url Saved Successfully");
      proposalPage.click();
    }
    else alert("Something went wrong")
  }
  if (event.target.id == 'messageInputForm') {
    event.preventDefault();
    let data = document.getElementById('messageToSave').value;
    isSuccessful=await window.electronAPI.saveTemplate(data,'messageTemplate.txt')
    if(isSuccessful){
      alert("Url Saved Successfully");
      proposalPage.click();
    }
    else alert("Something went wrong")
  }

});

document.addEventListener('click', async (event) => {

  if ([...event.target.classList].includes('schedule-button')) {
    console.log("getting proposals");
    let proposalList = await window.electronAPI.getProposals(event.target.dataset.username)
  }
  if ((event.target.tagName === 'td') && (event.target.dataset.hasOwnProperty('username'))) {
    rpfData = await window.electronAPI.readExcelFile(originalData[0]?.username);
    createRFPTable(rpfData);
  }

  if ([...event.target.classList].includes('settingButton')||event.target.closest('.settingButton')) {
    console.log("getting proposals");
    let settingButton=event.target.closest('.settingButton');
    // console.log(settingButton.getAttribute('data-username'))
    // console.log(event.target.dataset.username===undefined?settingButton.getAttribute('data-username'):event.target.dataset.username)
   await window.electronAPI.scheduleSetting(event.target.dataset.username===undefined?settingButton.getAttribute('data-username'):event.target.dataset.username)
  }
  if ([...event.target.classList].includes('removeAccountButton')||event.target.closest('.removeAccountButton')) {
    console.log("Removing Account");
    let deleteButton=event.target.closest('.removeAccountButton');
    if(confirm("Are you sure you want to remove this account?")){
      await window.electronAPI.removeAccount(event.target.dataset.username===undefined?deleteButton.getAttribute('data-username'):event.target.dataset.username)

    }
    // console.log(settingButton.getAttribute('data-username'))
    // console.log(event.target.dataset.username===undefined?settingButton.getAttribute('data-username'):event.target.dataset.username)
   
  }
  if(event.target.id==='updateTemplate'){
    let selectElement=document.querySelector('#savedTemplate');
    document.getElementById('templateSubtitle').value='';
    let textArr=await window.electronAPI.readTemplateText();
    if(selectElement.options.length===0){
      alert("No Saved Template Found");
      return;
    }
    document.getElementById('templateTitle').disabled=true;
    document.getElementById('templateSubtitle').disabled=true;
    document.getElementById('templateTitle').value=selectElement.options[selectElement.selectedIndex].text;
    if (typeof textArr[selectElement.value] === 'object') {

      document.getElementById('templatetext').value=subDropdown.value;
      document.getElementById('templateSubtitle').value=subDropdown.options[subDropdown.selectedIndex].text;
    }else
    document.getElementById('templatetext').value=selectElement.value==selectElement.options[selectElement.selectedIndex].text?textArr[selectElement.value]:selectElement.value;
  }
  if(event.target.id==='updateMessageTemplate'){
    let message=document.querySelector('#savedMessageContent');
    if(message.textContent===''){
      alert("No Saved Template Found");
      return;
    }
    document.getElementById('messageToSave').value=message.textContent;
  }
  if(event.target.id=='deleteMessageTemplate'){
    let selectElement=document.querySelector('#savedMessageContent');
    if(selectElement.textContent.length===0){
      alert("No Saved Template Found");
      return;
    }
    var result = confirm(`Are you sure to delete message?`);
    if(result){
     let isSuccessful= await window.electronAPI.saveTemplate('','messageTemplate.txt');
     if(isSuccessful){
      proposalPage.click();
      alert("Deleted Successfully.")
     }
    }
  }
  if(event.target.id=='deleteTemplate'){
    let selectElement=document.querySelector('#savedTemplate');
    let textArr=await window.electronAPI.readTemplateText();
    if(selectElement.options.length===0){
      alert("No Saved Template Found");
      return;
    }
    if ((typeof textArr[selectElement.value] === 'object')&& Object.keys(textArr[selectElement.value]).length > 0) {
      var selectedOption = subDropdown.options[subDropdown.selectedIndex].text;
      // document.getElementById('templatetext').value=subDropdown.value;
      // document.getElementById('templateSubtitle').value=subDropdown.options[subDropdown.selectedIndex].text;
    }
    else
    var selectedOption = selectElement.options[selectElement.selectedIndex].text;
    var result = confirm(`Are you sure to delete ${selectedOption} ?`);
    if(result){
     let isSuccessful= await window.electronAPI.deleteTemplateKey(selectedOption);
     if(isSuccessful){
      proposalPage.click();
      alert("Deleted Successfully.")
     }
    }
  }
});

document.addEventListener('click', async (event) => {
  if (event.target.id == 'download-excel') {
    window.electronAPI.downloadExcelFile('testuser')
  }

  
});

window.electronAPI.fileDownloaded((_event, downloadpath) => {
  window.electronShell.openExternal(downloadpath);

})
window.electronAPI.sendRFPtoClient(async (_event, username) => {
  // insert to the table 
  let data = await window.electronAPI.readExcelFile(username)
  createRFPTable(data);

})


function createRFPTable(data) {
  const table = document.getElementById('proposaltable');
  table.innerHTML = null;
  // clear everything inside table

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const tbody = document.createElement('tbody');
  tbody.textContent = "Saved Records Not Found";
  table.appendChild(tbody);
  console.log('fuck', !data.length);
  if (!data.length) return;
  tbody.textContent = '';
  const headers = Object.keys(data[0]);
  console.log(headers)
  headers.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    if (headerText === 'projectDetails') {
      th.style.width = '300px';
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  data.forEach(item => {
    const row = document.createElement('tr');
    Object.values(item).forEach(value => {
      const cell = document.createElement('td');
      if (item.projectDetails === value) {
        cell.style.whiteSpace = 'nowrap';
      }
      cell.textContent = value;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
}

// 
// document.addEventListener



async function getAccountList() {
  const accountTemplate = await window.electronAPI.readTemplate('templates/accountList.html');
  const parser = new DOMParser();

  let body = parser.parseFromString(accountTemplate, 'text/html');
  console.log(body)

  let tableBody = body.querySelector('tbody');
 

  originalData = await window.electronAPI.readUsersData();
  if (!originalData.length) {
    body.querySelector('#accountLists thead').innerHTML = 'No Accounts added';
  }
  
  data = originalData.map(user => `<tr>
  <td data-username=${user.username}>${user.username}</td>
  <td><button data-username=${user.username} class="${user.isScheduled ? 'scheduled schedule-button' : 'notScheduled schedule-button'} btn btn-primary">${user.isScheduled ? 'Test Now' : 'Not Scheduled'}</button></td>
  <td><button class='settingButton btn btn-primary' data-username=${user.username}><i class="material-icons">
  settings
  </i></button>
  <button class='removeAccountButton btn btn-danger' style="text-align:center;" data-username=${user.username}><i class="material-icons" style="vertical-align: middle;">
  delete
  </i></button>
  </td>
  </tr>`);
  data = data.join('\n');
 let rpfData=null;
try {
  rpfData = await window.electronAPI.readExcelFile(originalData[0]?.username);

  
} catch (error) {
  console.log('File not found')
  
}

  if(rpfData===403){
    alert("You don't have permission to access the google sheet.\n Please give the right permission or change to the right URL");
  }
  // if (!rpfData.length) {
  //   body.querySelector('#download-excel').style.display = 'none';
  // }
  tableBody.innerHTML = data;
  contentContainer.innerHTML = body.documentElement.outerHTML;

  createRFPTable(rpfData)


}


