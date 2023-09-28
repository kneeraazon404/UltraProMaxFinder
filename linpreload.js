const { contextBridge, ipcRenderer } = require('electron')

// console.log("EHY THERE BITHC");
// console.log(window);

let credentials;
// contextBridge.exposeInMainWorld('exposeVaribleHere', {
//   'hey':()=>console.log("FUCK YOU")
// });
ipcRenderer.on('expose-variable', (event, variable) => {
  credentials=variable;
  });

window.addEventListener('DOMContentLoaded', () => {

  scrollToCenter();
  const usernameInputField=document.querySelector('input[autocomplete="username"]');
  const passwordInputField=document.querySelector('input[autocomplete="current-password"]');
  const submitButton=document.querySelector('button[data-id="sign-in-form__submit-btn"]')
  if(usernameInputField)  
    usernameInputField.value=credentials.username;
  if(passwordInputField)  
    passwordInputField.value=credentials.password;
  // click on submit button
  if(submitButton)
    submitButton.click()
});


function scrollToCenter() {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  // Scroll to the center of the page
  window.scrollTo(centerX, centerY);
}
