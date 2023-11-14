// const {saveToExcel}=require('./excelFunctions')
const { getSavedTemplate } = require('./templateFunctions')
const { writeDataToGoogleSheet } = require('./googleDocsConnections');
const { BrowserWindow } = require('electron');
const puppeteer = require('puppeteer');
const os=require('os');



async function extractProposals(data, username, page, linkedInSession, headers, app, mainWindow,linkedInSessionPartitionName,browser) {


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
      'Title': jobProviderDesignation, 'Job Type': jobType, 'Proposal URL': projectUrl, 'Proposal Date': `${jobCreatedDate?.getFullYear() ?? timenow.getFullYear()}-${(jobCreatedDate.getMonth()??timenow.getMonth() + 1).toString().padStart(2, '0')}-${jobCreatedDate.getDate().toString().padStart(2, '0')}`, 'Proposal Time': `${jobCreatedDate.getHours().toString().padStart(2, '0')}:${jobCreatedDate.getMinutes().toString().padStart(2, '0')}`, 'Client First Name': clientName.slice(0, spaceIndexInName), 'Client Last Name': clientName.slice(spaceIndexInName + 1), 'Client Location': location, "Client Profile": jobProviderLinkedIn, "First Followup": ""
    })
  });
  mainWindow.webContents.send('rfpCurrent', username);
  if (proposals.length) {
    console.log(proposals.length)
    submitProposals(proposals, linkedInSession, headers, app, data, page,browser);
    writeDataToGoogleSheet(proposalsArr, username, app).catch((err) => {
      console.error('Error inserting data into Excel:', err);
    });
  }
  else {
    // setTimeout(() => {
    //   page.close()
    // }, 10000);
  }



}


async function submitProposals(proposals, session, headers, app, data, page,_) {
  // const { accept, 'accept-language': acceptLanguage, 'csrf-token': csrfToken, 'x-li-lang': xlilang, 'x-li-page-instance': xlipageinstance,
  //   'x-li-pem-metadata': xlipenmetadata, 'x-li-track': xlitrack, } = { ...headers }


  let browser;
  browser = await puppeteer.launch({ headless: false });



  proposals.forEach(async proposal => {

    let urn = proposal.entityUrn;
    // console.log(urn);dispatchEventw;
    let jobType = proposal.detailViewSectionsResolutionResults.filter((item) => item.header?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.title.text;
    let creatorName= proposal.detailViewSectionsResolutionResults.filter((item) => item.creatorInformation?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup.title.text;
    // write the case for the subcases
    let isResumeProposal = proposal.detailViewSectionsResolutionResults.filter((item) => item.description?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsDescription')[0].description.questionnaireQuestions.find(item => item.question === 'Where are you in your career?');

    // console.log(isResumeProposal);



    try {
      let regex = /\d+/;
      let urnId = urn.match(regex);
      let cookies = await session.cookies.get({});

      let messagePage = await browser.newPage();

      await messagePage.setCookie(...cookies)
      await messagePage.goto(`https://www.linkedin.com/service-marketplace/projects/${urnId}`, { timeout: 10000 });
      setTimeout(() => { }, 5000);
      let regexBoth = /Late career|Mid career/i;

      if (isResumeProposal&&(!(regexBoth.test(isResumeProposal?.answer?.textualAnswer)))) {
        // let regexLinkedIn=/Linkedin/i;
        // let regexTraditional=/traditional/i;
      
          try {

            await messagePage.waitForSelector('::-p-xpath(.//button//span[text()="Submit proposal"])');
            const element = await messagePage.$('li-icon[type="chevron-down"]');
            if(element){
              await messagePage.click('li-icon[type="chevron-down"]');
    
            }
            // await messagePage.waitForSelector('li-icon[type="chevron-down"]');

            // await messagePage.click('li-icon[type="chevron-down"]');
            await messagePage.click('::-p-xpath(.//button//span[text()="No thanks"])');
            await messagePage.waitForSelector('::-p-xpath(.//button/span[text()="Decline"])');

            const element2 = await messagePage.$('li-icon[type="chevron-down"]');
            if(element2){
              await messagePage.click('::-p-xpath(.//button/span[text()="Decline"])');
    
            }





          } catch (error) {

            console.log(error)
            await messagePage.goto(`https://www.linkedin.com/service-marketplace/projects/${urnId}`);
            await messagePage.waitForSelector('::-p-xpath(.//button//span[text()="Submit proposal"])');
            // await messagePage.waitForSelector('li-icon[type="chevron-down"]');
            // await messagePage.click('li-icon[type="chevron-down"]');
            const element = await messagePage.$('li-icon[type="chevron-down"]');
            if(element){
              await messagePage.click('li-icon[type="chevron-down"]');
            }
            await messagePage.waitForSelector('::-p-xpath(.//button//span[text()="No thanks"])');

            await messagePage.click('::-p-xpath(.//button//span[text()="No thanks"])');
            setTimeout(() => { }, 5000);            
            const element2 = await messagePage.$('li-icon[type="chevron-down"]');
            if(element2){
              await messagePage.click('::-p-xpath(.//button/span[text()="Decline"])');
    
            }


            

          }
          setTimeout(async () => {
            // await messagePage.close();
            // await browser.close();
          }, 5000);
      
        // else if(regexLinkedIn.test(isResumeProposal.answer.textualAnswer)){
        //   jobType='resume review linkedin';
        // }
        // else if(regexTraditional.test(isResumeProposal.answer.textualAnswer)){
        //   jobType='resume review traditional';
        // }
      }
      else if(regexBoth.test(isResumeProposal?.answer?.textualAnswer) ) {
        submitMessageAndProposal(browser,messagePage,app,jobType,urnId,creatorName);
      }
      else{
        submitMessageAndProposal(browser,messagePage,app,jobType,urnId,creatorName);
      }
    } catch (error) {
      console.log(error)

    }


    // DeviceOrientationEvedfjsdnfkjd;


    // try {
    //   const res = await session.fetch('https://www.linkedin.com/voyager/api/voyagerMarketplacesDashProposalSubmissionForm?action=submitProposal&decorationId=com.linkedin.voyager.dash.deco.marketplaces.MarketplaceProject-46', {
    //     headers: {
    //       accept, 'accept-language': acceptLanguage,
    //       'Content-Type': 'application/json; charset=UTF-8',
    //       'csrf-token': csrfToken, 'x-li-lang': xlilang, 'x-li-page-instance': xlipageinstance, 'x-li-pem-metadata': 'Voyager - Services Marketplace=service-request-proposal-submission-form-submit'
    //     },
    //     method: 'POST',
    //     'body': JSON.stringify({
    //       proposalDetailsAnswers: [
    //         {
    //           formElementUrn: `urn:li:fsd_marketplaceProposalSubmissionFormElementV2:(PROPOSAL_DETAILS,${urn})`,
    //           formElementInputValues: [
    //             {
    //               textInputValue: getSavedTemplate(app,)[jobType.toLowerCase()]??getSavedTemplate(app,)['default'] // get this value from saved file....
    //             }
    //           ]
    //         },
    //         {
    //           formElementUrn: `urn:li:fsd_marketplaceProposalSubmissionFormElementV2:(INCLUDE_FREE_CONSULTATION,${urn})`,
    //           formElementInputValues: [
    //             // {
    //             //   entityInputValue: {
    //             //     inputEntityName: "INCLUDE_FREE_CONSULTATION"
    //             //   }
    //             // }
    //           ]
    //         }
    //       ],
    //       marketplaceProjectProposalUrn: proposal.detailViewSectionsResolutionResults.filter((item) => item.header?.$type == 'com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.serviceProviderInsight.providerProjectActions['*marketplaceProjectProposal']
    //     })
    //   })
    //   if (res.ok) {
    //     const body = await res.json()
    //     sendImmediateMessage(session, data, app, page)
    //     if(page instanceof BrowserWindow){
    //       setTimeout(() => {
    //        page.close()
    //      }, 10000);
    //     }
    //   }

    // } catch (error) {
    //   console.log(error);

    // }
    // if (browser && browser.isConnected()) {
    //   await browser.close();
    // }

  });
  


  // after submitting proposal we need to send immediate message here
}


async function submitMessageAndProposal(browser,messagePage,app,jobType,urnId,creatorName){
  await messagePage.waitForSelector('::-p-xpath(.//button//span[text()="Submit proposal"])');

        const element = await messagePage.$('li-icon[type="chevron-down"]');
        if(element){
          await messagePage.click('li-icon[type="chevron-down"]');

        }

        // await messagePage.waitForSelector('li-icon[type="chevron-down"]');

        await messagePage.click('::-p-xpath(.//button//span[text()="Submit proposal"])');
        let textToType = getSavedTemplate(app,'template.json')[jobType.toLowerCase()] ?? getSavedTemplate(app,)['default'];


        textToType=textToType.replace(/<first_name>|\(first_name\)/g,creatorName.split(' ')[0]??creatorName)
        let overAllHTML = textToType.split('\n').map(line => `<p>${line}</p>`).join('');
      
        try {
          await messagePage.waitForSelector('textarea');
        } catch (error) {
          console.log(error);
          // if(error instanceof puppeteer.PuppeteerErrors.TimeoutError){
          await messagePage.goto(`https://www.linkedin.com/service-marketplace/projects/${urnId}`);
          await messagePage.waitForSelector('::-p-xpath(.//button//span[text()="Submit proposal"])');
          const element = await messagePage.$('li-icon[type="chevron-down"]');
          if(element){
            await messagePage.click('li-icon[type="chevron-down"]');
  
          }
          await messagePage.click('::-p-xpath(.//button//span[text()="Submit proposal"]/..)')
          // }
          await messagePage.waitForSelector('textarea');


        }
        await messagePage.click('textarea');
        await messagePage.keyboard.type(overAllHTML);
        setTimeout(() => { }, 5000);

        let elementToScrollTo = await messagePage.waitForSelector("button[data-test-proposal-submission-modal__submit-button]");
        if (elementToScrollTo !== null) {

          // Scroll the element into view

          await messagePage.evaluate(element => {
            element.scrollIntoView();
          }, elementToScrollTo);
        } else {
          console.log('Element not found.');
        }
        await messagePage.waitForSelector("::-p-xpath(.//button//span[text()='Submit'])");
        await messagePage.click("::-p-xpath(.//button//span[text()='Submit'])");
        setTimeout(() => { }, 5000);
        await messagePage.waitForSelector("::-p-xpath(.//button//span[text()='Message'])");
        await messagePage.click("::-p-xpath(.//button//span[text()='Message'])");
        setTimeout(() => { }, 5000);
        let savedMessage = getSavedTemplate(app, 'messageTemplate.txt');
     

        if(savedMessage != null || savedMessage !=''){
          savedMessage=savedMessage.replace(/<first_name>|\(first_name\)/g,creatorName.split(' ')[0]??creatorName)
          let lines = savedMessage.split(os.EOL);
          let paragraphs = lines.map(line => `<p>${line}</p>`);
          let resultHTML = paragraphs.join('');
          await messagePage.evaluate((selector) => {
            document.querySelector(selector).innerHTML = resultHTML;
          }, '.msg-form__contenteditable');

        }
      

        await messagePage.waitForSelector("::-p-xpath(.//button[@type='submit'][text()='Send'])");
        await messagePage.click("::-p-xpath(.//button[@type='submit'][text()='Send'])")
        setTimeout(async () => {
          await messagePage.close();
          await browser.close();
        }, 5000);
}






function parseRelativeTime(relativeTime) {
  const match = relativeTime.match(/(\d+)\s*(\w+)\s+ago/);

  if (!match) {
    return null; // Invalid format
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
          setTimeout(() => {
            browser.close()
          }, 5000)
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