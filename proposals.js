// const {saveToExcel}=require('./excelFunctions')
const { getSavedTemplate } = require('./templateFunctions')
const { writeDataToGoogleSheet } = require('./googleDocsConnections');
const { BrowserWindow } = require('electron');
const { chromium } = require('playwright');

const { parse, formatDistanceToNow } = require('date-fns');

const puppeteer = require('puppeteer');
const os = require('os');



async function extractProposals(data, username, page, linkedInSession, headers, app, mainWindow, linkedInSessionPartitionName, browser) {


  const proposalsArr = [];
  const proposals = data.included.filter((item) => item.$type == 'com.linkedin.voyager.dash.marketplaces.projects.MarketplaceProject')
  // const filter=(proposals,property)=>proposals[property]
  proposals.forEach(proposal => {
    let locationUrn = proposal.detailViewSectionsResolutionResults.filter((item) => item.header?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header['*locationResolutionResult'];
    let location = data.included.filter(item => item.entityUrn == locationUrn)[0].defaultLocalizedNameWithoutCountryName
    let projectUrl = `https://www.linkedin.com/service-marketplace/projects/${proposal.entityUrn.match(/\((\d+),/)[1]}`;
    let Title = proposal.detailViewSectionsResolutionResults.filter((item) => item.header?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.title.text
    let jobCreatedDate = proposal.detailViewSectionsResolutionResults.filter((item) => item.header?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.insight?.text
    jobCreatedDate = parseRelativeTime(jobCreatedDate)
    let clientName = proposal.detailViewSectionsResolutionResults.filter((item) => item.creatorInformation?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup.title?.text;
    let jobType = proposal.detailViewSectionsResolutionResults.filter((item) => item.header?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.title.text;
    let jobProviderDesignation = proposal.detailViewSectionsResolutionResults.filter((item) => item.creatorInformation?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup.subtitle?.text;
    let jobProviderLinkedIn = proposal.detailViewSectionsResolutionResults.filter((item) => item.creatorInformation?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup?.navigationUrl;
    let mutualConnectionUrl = proposal.detailViewSectionsResolutionResults.filter((item) => item.creatorInformation?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation?.mutualConnectionsInsightUrl;
    let totalMutualConnections = proposal.detailViewSectionsResolutionResults.filter((item) => item.creatorInformation?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.mutualConnectionsInsight?.text?.text;
    let questions = proposal.detailViewSectionsResolutionResults.filter((item) => item.description?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsDescription')[0].description.questionnaireQuestions;
    let projectDetails = questions.map((question) => `${question.question}\n${question.answer.textualAnswer}\n`).join('\n')

    const spaceIndexInName = clientName.indexOf(' ');
    let timenow = new Date();
    proposalsArr.push({
      'Title': jobProviderDesignation, 'Job Type': jobType, 'Proposal URL': projectUrl, 'Proposal Date': `${jobCreatedDate?.getFullYear() ?? timenow.getFullYear()}-${(jobCreatedDate?.getMonth() ?? timenow.getMonth() + 1).toString().padStart(2, '0')}-${jobCreatedDate.getDate().toString().padStart(2, '0')}`, 'Proposal Time': `${jobCreatedDate.getHours().toString().padStart(2, '0')}:${jobCreatedDate.getMinutes().toString().padStart(2, '0')}`, 'Client First Name': clientName.slice(0, spaceIndexInName), 'Client Last Name': clientName.slice(spaceIndexInName + 1), 'Client Location': location, "Client Profile": jobProviderLinkedIn, "First Followup": ""
    })
  });
  mainWindow.webContents.send('rfpCurrent', username);
  if (proposals.length) {
    console.log(proposals.length)
    submitProposals(proposals, linkedInSession, headers, app, data, page, browser);
    writeDataToGoogleSheet(proposalsArr, username, app).catch((err) => {
      console.error('Error inserting data into Excel:', err);
    });
  }
  else {
  }



}


async function submitProposals(proposals, session, headers, app, data, page, _) {
  let browser;
  let context;
  browser = await chromium.launch({ headless: false });
  context = await browser.newContext();

  try {



   let cookies = await session.cookies.get({});
  cookies = cookies.map(cookie => { return { ...cookie, sameSite: 'None' } })

  for (const proposal of proposals) {
    let urn = proposal.entityUrn;
    // console.log(urn);dispatchEventw;
    let jobType = proposal.detailViewSectionsResolutionResults.filter((item) => item.header?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.title.text;
    let creatorName = proposal.detailViewSectionsResolutionResults.filter((item) => item.creatorInformation?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup.title.text;
    // write the case for the subcases
    let isResumeProposal = proposal.detailViewSectionsResolutionResults.filter((item) => item.description?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsDescription')[0].description.questionnaireQuestions.find(item => item.question === 'Where are you in your career?');
      let regex = /\d+/;
      let urnId = urn.match(regex);
      const { screen } = require('electron')
      const primaryDisplay = screen.getPrimaryDisplay()
      width = primaryDisplay.workAreaSize.width;
      height = primaryDisplay.workAreaSize.height;
      let messagePage = await context.newPage();
      await messagePage.setViewportSize({ width: width, height: height });
      await context.addCookies(cookies)
      await messagePage.goto(`https://www.linkedin.com/service-marketplace/projects/${urnId}`, { timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 10000));
      let regexBoth = /Late career|Mid career/i;
      
      if (isResumeProposal && !regexBoth.test(isResumeProposal?.answer?.textualAnswer)) {
        const element = messagePage.locator('css=li-icon[type="chevron-down"]');
        if (element) {
          await element.click();
        }
        await messagePage.getByRole('button', { name: "No thanks" }).click();
        await messagePage.getByRole('button', { name: "Decline" }).click();
      } else {
         await submitMessageAndProposal(browser, context, messagePage, app, jobType, urnId, creatorName, session, page);
      }
      // messagePage.waitForEvent('close');

  };
} catch (error) {
  console.log(error)
  
}

finally{

  page.loadURL('https://www.linkedin.com/service-marketplace/provider/requests')
  page.webContents.on('did-finish-load',()=>{
    session.cookies.flushStore()
  })
  if(page.isClosable())
  page.close()
  if (browser) {
    setTimeout(async() => {
      await context.close();
      await browser.close();
    },10000);
    console.log('Browser closed.');
  }
}





 



  // after submitting proposal we need to send immediate message here
}


async function submitMessageAndProposal(browser, context, messagePage, app, jobType, urnId, creatorName, session,page) {


try {
  const element = await messagePage.waitForSelector('css=li-icon[type="chevron-down"]',{
    timeout:10000,
  });
  if (element) {
    await element.click();
  }
} catch (error) {
  console.log("Error:",error.message)
  
}
  await messagePage.getByRole('button', { name: "Submit proposal" }).click();




  setTimeout(async () => {
  }, 5000)

  // await messagePage.waitForSelector('li-icon[type="chevron-down"]');
  // await messagePage.click('::-p-xpath(.//button//span[text()="Submit proposal"])');
  let textToType = getSavedTemplate(app, 'template.json')[jobType.toLowerCase()] ?? getSavedTemplate(app,)['default'];


  textToType = textToType.replace(/<first_name>|\(first_name\)/g, creatorName.split(' ')[0] ?? creatorName)

  // try {
  let textArea = await messagePage.locator('textarea');
  await textArea.waitFor({ state: "attached" })

  textArea.fill(textToType)
  setTimeout(() => { }, 5000);

  let submitButton = await messagePage.locator("button[data-test-proposal-submission-modal__submit-button]");
  await submitButton.waitFor();
  await submitButton.click();
  setTimeout(() => { }, 5000);
  await messagePage.getByRole('button', { name: "Message" }).click()
  let savedMessage = getSavedTemplate(app, 'messageTemplate.txt');

  let messageBox = await messagePage.locator('.msg-form__contenteditable')
  messageBox.waitFor({ state: "attached" })
  // setTimeout(() => { }, 5000);

  if (savedMessage != null || savedMessage != '') {
    savedMessage = savedMessage.replace(/<first_name>|\(first_name\)/g, creatorName.split(' ')[0] ?? creatorName)
    await messageBox.fill(savedMessage)
  }
  let sendButton=  messagePage.getByRole('button', { name: "Send", exact: true });
  await sendButton.scrollIntoViewIfNeeded();
  await sendButton.click()

  // let updatedCookies=await context.cookies();
 

  // updateCookiesPlaytoElectron(session,updatedCookies)
  await messagePage.close()
  
}




function parseRelativeTime(relativeTime) {
  const match = relativeTime.match(/(\d+)\s*(\w+)\s+ago/);
  if (relativeTime.includes('less than one minute ago')) {
    return new Date();
  }

  if (!match) {
    return null;
  }

  const amount = parseInt(match[1]);
  const unit = match[2];

  const now = new Date();
  let pastDate = new Date(now);

  if (unit === 'm') {
    pastDate.setMinutes(now.getMinutes() - amount);
  } else if (unit === 'h') {
    pastDate.setHours(now.getHours() - amount);
  } else if (unit === 'd') {
    pastDate.setDate(now.getDate() - amount);
  } else if (unit === 'w') {
    pastDate.setDate(now.getDate() - amount * 7);
  } else if (unit === 'M') {
    pastDate.setMonth(now.getMonth() - amount);
  } else if (unit === 'y') {
    pastDate.setFullYear(now.getFullYear() - amount);
  } else {
    return null; // Unsupported unit
  }

  return pastDate;
}


async function updateCookiesPlaytoElectron(session, cookies) {
  let sessionCookies = await session.cookies.get({})
  const electronCookies = cookies.map((cookie) => {
    let { size, sameSite, sameParty, sourceScheme, sourcePort, domain, expires, ...rest } = cookie;
    return { ...rest, url: cookie.domain.replace(/^\.+/, ''), expirationDate: expires, sameSite: cookie.sameSite == 'Lax' ? 'unspecified' : 'no_restriction', hostOnly: false, session: false };
  });
  electronCookies.forEach(cookie => {
    console.log(cookie)
    session.cookies.set(cookie)

  });

}




async function sendImmediateMessage(session, data, app, page) {




  session.webRequest.onBeforeSendHeaders({ urls: ['https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerConversations.*'], types: ['xhr'] }, async (details, callback) => {
    const { accept, 'Accept-Language': acceptLanguage,
      'Accept-Encoding': acceptEncoding,
      'Csrf-Token': csrfToken, 'X-LI-Lang': xlilang, 'X-li-page-instance': xlipageinstance, 'x-restli-protocol-version': xrestiliprotocolversion,
      'x-li-pem-metadata': xlipenmetadata, } = { ...details.requestHeaders };
    delete details.requestHeaders['X-LI-Track']
    // console.log(details.requestHeaders)
    try {
      const res = await session.fetch(details.url, {
        headers: {
          accept, 'Accept-Language': acceptLanguage,
          'Accept-Encoding': acceptEncoding,
          'Csrf-Token': csrfToken, 'x-li-lang': xlilang, 'X-li-page-instance': xlipageinstance
        }
      })
      if (res.ok) {
        const body = await res.json()
        var messengerProfiles = body.data.messengerConversationsBySyncToken.elements;
        const profiles = data.included.filter((item) => item.$type == 'com.linkedin.voyager.dash.identity.profile.Profile');
        profiles.forEach(async (profile) => {
          // entityurn for the profile
          const entityUrn = profile.entityUrn;
          const requiredMessengerProfile = messengerProfiles.filter(item => {
            let filteredId = item.conversationParticipants.filter(innerItem => innerItem.participantType?.member?.distance !== 'SELF')[0]?.hostIdentityUrn;
            return filteredId === entityUrn;
          })[0];
          // let originToken = requiredMessengerProfile.messages.elements[0].originToken;

          let cookies = await session.cookies.get({})

          let browser = await puppeteer.launch({ headless: false });
          let messagePage = await browser.newPage();
          await messagePage.setCookie(...cookies)
          await messagePage.goto(requiredMessengerProfile.conversationUrl);
          let divSelector = '.msg-form__contenteditable';
          await messagePage.waitForSelector(divSelector);
          await messagePage.click(divSelector);
          let textToType = getSavedTemplate(app, 'messageTemplate.txt')
          await messagePage.keyboard.type(textToType)
          setTimeout(() => { }, 2000)
          await messagePage.click('.msg-form__send-button')
          messagePage.close()
          // if (originToken === null) {
          //   page.loadURL(requiredMessengerProfile.conversationUrl)
          //   page.webContents.on('did-finish-load', () => {

          //   })
          //   session.webRequest.onBeforeSendHeaders({ urls: ['https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerMessages.*'], types: ['xhr'] }, async (details, callback) => {
          //     const { accept, 'Accept-Language': acceptLanguage,
          //       'Accept-Encoding': acceptEncoding,
          //       'Csrf-Token': csrfToken, 'X-LI-Lang': xlilang, 'X-li-page-instance': xlipageinstance, 'x-restli-protocol-version': xrestiliprotocolversion,
          //       'x-li-pem-metadata': xlipenmetadata, } = { ...details.requestHeaders };
          //     delete details.requestHeaders['X-LI-Track'];
          //     try {
          //       const res = await session.fetch(details.url, {
          //         headers: {
          //           accept, 'Accept-Language': acceptLanguage,
          //           'Accept-Encoding': acceptEncoding,
          //           'Csrf-Token': csrfToken, 'x-li-lang': xlilang, 'X-li-page-instance': xlipageinstance
          //         }
          //       })
          //       if (res.ok) {
          //         const body = await res.json()
          //         originToken = body.data.messengerMessagesBySyncToken.elements.filter(e => e.originToken)[0].originToken;
          //         if (originToken === null) {
          //           originToken = generateUUID();
          //         }
          //         let messageRequestPayload = {
          //           message: {
          //             body: {
          //               attributes: [],
          //               text: getSavedTemplate(app, 'messageTemplate.txt')
          //             },
          //             renderContentUnions: [],
          //             conversationUrn: requiredMessengerProfile.entityUrn,
          //             originToken: originToken
          //           },
          //           mailboxUrn: requiredMessengerProfile.conversationParticipants.filter(item => item.participantType.member.distance === 'SELF')[0].hostIdentityUrn,
          //           trackingId: "ûem\u008a^\u007fGU\u0086\b¹?qrxg",
          //           dedupeByClientGeneratedToken: false
          //         }
          //         try {
          //           let res = await session.fetch("https://www.linkedin.com/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage", {
          //             method: 'POST',
          //             headers: {
          //               accept: 'application/json',
          //               'csrf-token': csrfToken,
          //               'x-li-page-instance': 'urn:li:page:d_flagship3_messaging_conversation_detail;tIV/G7Y8S5yI4zr6e+78/w==',
          //               'x-li-lang': 'en_US'

          //             },
          //             body: JSON.stringify(messageRequestPayload)
          //           });

          //         } catch (error) {
          //           console.log(error)

          //         }
          //       }
          //     }
          //     catch (e) {
          //       console.log(e)
          //     }

          //     callback({ cancel: false, requestHeaders: details.requestHeaders })

          //   })

          // }
        });
      }


    } catch (error) {
      console.log("Here is your error", error)

    }



    // console.log(details)
    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })

}


function sendMessage() {

}


function generateUUID() {
  // Generate a random 8-character hexadecimal string for each segment
  function generateSegment() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  // Format the UUID segments and concatenate them with dashes
  const uuid = `${generateSegment()}${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}${generateSegment()}${generateSegment()}`;

  return uuid;
}




module.exports = {
  sendMessage,
  extractProposals
}
//```javascript
//const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
//const fs = require('fs').promises;
//const { ToadScheduler, SimpleIntervalJob, AsyncTask } = require('toad-scheduler')
//const schedule = require('node-schedule');
//const puppeteer = require('puppeteer');
//
//const chokidar = require('chokidar');
//
//
//
//const fssync = require('fs');
//const path = require('path');
//const readline = require('readline');
//const { getSavedTemplate, saveTemplateToFile, deleteTemplateKey } = require('./templateFunctions')
//const { getCredentials, deleteObjectsWithValue } = require('./getCredentials')
//const { readDataFromGoogleSheet } =