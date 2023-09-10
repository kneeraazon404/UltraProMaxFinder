// const { ipcRenderer } = require('electron');




const accountLink = document.getElementById('account_page');
const accountListPage = document.getElementById('accountList_page');
const messagesLink = document.getElementById('messages-link');
const contentContainer = document.getElementById('mainBody');




// this is for rendering template

document.addEventListener('DOMContentLoaded', getAccountList)
accountLink.addEventListener('click', async () => {
  const accountTemplate = await window.electronAPI.readTemplate('templates/account.html');
  contentContainer.innerHTML = accountTemplate;
});

accountListPage.addEventListener('click', getAccountList);


//   const linkedInForm=document.getElementById()
document.addEventListener('submit',async (event) => {
  if (event.target.id == 'linkedInForm') {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    window.electronAPI.sendCredentials({ username, password })
  }

  if (event.target.id == 'textInputForm') {
    event.preventDefault();
    const data = document.getElementById('templatetext').value;
    isSuccessful=await window.electronAPI.saveTemplate(data)
    isSuccessful?alert("Template Saved Successfully"):alert("Something went wrong")
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
  let  proposalTemplate=body.querySelector('#templatetext');
  
  let text=await window.electronAPI.readTemplateText();
  if(text.length){
    console.log(proposalTemplate)
    proposalTemplate.innerHTML=text;
  }
 

  originalData = await window.electronAPI.readUsersData();
  if (!originalData.length) {
    body.querySelector('#accountLists thead').innerHTML = 'No Accounts added';
  }
  
  data = originalData.map(user => `<tr>
  <td data-username=${user.username}>${user.username}</td>
  <td><button data-username=${user.username} class="${user.isScheduled ? 'scheduled schedule-button' : 'notScheduled schedule-button'}">${user.isScheduled ? 'scheduled' : 'Not Scheduled'}</button></td>
  <td><button class='settingButton' data-username=${user.username}><i class="material-icons small">
  settings
  </i></button></td>
  </tr>`);
  data = data.join('\n');


  rpfData = await window.electronAPI.readExcelFile(originalData[0]?.username);
  if (!rpfData.length) {
    body.querySelector('#download-excel').style.display = 'none';
  }
  tableBody.innerHTML = data;
  contentContainer.innerHTML = body.documentElement.outerHTML;

  createRFPTable(rpfData)


}


