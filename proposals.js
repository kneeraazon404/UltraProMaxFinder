// const {saveToExcel}=require('./excelFunctions')
const {getSavedTemplate}=require('./templateFunctions')
const {writeDataToGoogleSheet}=require('./googleDocsConnections');

function extractProposals(data,username,page,linkedInSession,headers,app,mainWindow){

 
    const proposalsArr=[];
    const proposals=data.included.filter((item)=>item.$type=='com.linkedin.voyager.dash.marketplaces.projects.MarketplaceProject')
    // const filter=(proposals,property)=>proposals[property]
    proposals.forEach(proposal => {
      let jobTitle=proposal.detailViewSectionsResolutionResults.filter((item)=>item.header?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.title.text
      let jobCreatedDate=proposal.detailViewSectionsResolutionResults.filter((item)=>item.header?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.insight?.text

      jobCreatedDate=parseRelativeTime(jobCreatedDate)

  
      let jobProvider=proposal.detailViewSectionsResolutionResults.filter((item)=>item.creatorInformation?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup.title?.text;
      let jobProviderDesignation=proposal.detailViewSectionsResolutionResults.filter((item)=>item.creatorInformation?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup.subtitle?.text;
      let jobProviderLinkedIn=proposal.detailViewSectionsResolutionResults.filter((item)=>item.creatorInformation?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.serviceRequesterEntityLockup?.navigationUrl;
      let mutualConnectionUrl=proposal.detailViewSectionsResolutionResults.filter((item)=>item.creatorInformation?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation?.mutualConnectionsInsightUrl;
      let totalMutualConnections=proposal.detailViewSectionsResolutionResults.filter((item)=>item.creatorInformation?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsCreator')[0].creatorInformation.mutualConnectionsInsight?.text?.text;
      let questions=proposal.detailViewSectionsResolutionResults.filter((item)=>item.description?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsDescription')[0].description.questionnaireQuestions;
      let projectDetails=questions.map((question)=>`${question.question}\n${question.answer.textualAnswer}\n`).join('\n')
      proposalsArr.push({jobProvider,jobTitle,jobCreatedDate,jobProviderDesignation,jobProviderLinkedIn,mutualConnectionUrl,totalMutualConnections,projectDetails})
    });
    mainWindow.webContents.send('rfpCurrent',username);
    if(proposals.length){
      writeDataToGoogleSheet(proposalsArr,username,app).catch((err) => {
        console.error('Error inserting data into Excel:', err);
      });
      submitProposals(proposals,linkedInSession,headers,app,data);
      // reload the window here
      page.webContents.on('did-finish-load',()=>{
        if(proposals)page.reload();
      })
    }
    
    
  
  }
  
  
  async function submitProposals(proposals,session,headers,app,data){
    const { accept, 'accept-language': acceptLanguage, 'csrf-token': csrfToken, 'x-li-lang': xlilang, 'x-li-page-instance': xlipageinstance,
    'x-li-pem-metadata': xlipenmetadata, 'x-li-track': xlitrack, } = { ...headers }
  
  
  
  
    proposals.forEach(async proposal => {
  
      let urn=proposal.entityUrn;
      // console.log(urn)
  
      try {
        const res=await session.fetch('https://www.linkedin.com/voyager/api/voyagerMarketplacesDashProposalSubmissionForm?action=submitProposal&decorationId=com.linkedin.voyager.dash.deco.marketplaces.MarketplaceProject-46',{
        headers:{ accept, 'accept-language': acceptLanguage,
        'Content-Type':'application/json; charset=UTF-8',
         'csrf-token': csrfToken, 'x-li-lang': xlilang, 'x-li-page-instance': xlipageinstance,'x-li-pem-metadata':'Voyager - Services Marketplace=service-request-proposal-submission-form-submit' },
        method:'POST',
        'body':JSON.stringify({
          proposalDetailsAnswers: [
            {
              formElementUrn: `urn:li:fsd_marketplaceProposalSubmissionFormElementV2:(PROPOSAL_DETAILS,${urn})`,
              formElementInputValues: [
                {
                  textInputValue: getSavedTemplate(app,) // get this value from saved file....
                }
              ]
            },
            {
              formElementUrn: `urn:li:fsd_marketplaceProposalSubmissionFormElementV2:(INCLUDE_FREE_CONSULTATION,${urn})`,
              formElementInputValues: [
                // {
                //   entityInputValue: {
                //     inputEntityName: "INCLUDE_FREE_CONSULTATION"
                //   }
                // }
              ]
            }
          ],
          marketplaceProjectProposalUrn: proposal.detailViewSectionsResolutionResults.filter((item)=>item.header?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.serviceProviderInsight.providerProjectActions['*marketplaceProjectProposal']
        })
      })
      if(res.ok){
        const body = await res.json()
      }
        
      } catch (error) {
        console.log(error);
        
      }
      
    });

    // after submitting proposal we need to send immediate message here
    sendImmediateMessage(session,data,app)

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
  


  

  async function sendImmediateMessage(session,data,app){

    session.webRequest.onBeforeSendHeaders({ urls: ['https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerConversations.*'], types: ['xhr'] }, async (details, callback) => {
      const { accept, 'Accept-Language': acceptLanguage,
      'Accept-Encoding':acceptEncoding,
       'Csrf-Token': csrfToken, 'X-LI-Lang': xlilang, 'X-li-page-instance': xlipageinstance,'x-restli-protocol-version':xrestiliprotocolversion,
      'x-li-pem-metadata': xlipenmetadata,} = { ...details.requestHeaders };
      delete details.requestHeaders['X-LI-Track']
      // console.log(details.requestHeaders)
      try {
        const res = await session.fetch(details.url, {
          headers: { accept, 'Accept-Language': acceptLanguage, 
          'Accept-Encoding':acceptEncoding,
          'Csrf-Token': csrfToken, 'x-li-lang': xlilang, 'X-li-page-instance': xlipageinstance}
        })

        if (res.ok) {
          const body = await res.json()
          var messengerProfiles=body.data.messengerConversationsBySyncToken.elements;
          const profiles=data.included.filter((item)=>item.$type=='com.linkedin.voyager.dash.identity.profile.Profile');
          profiles.forEach(async (profile)=>{
            // entityurn for the profile
            const entityUrn=profile.entityUrn;
            const requiredMessengerProfile=messengerProfiles.filter(item=>item.creator.hostIdentityUrn===entityUrn)[0];
            console.log(requiredMessengerProfile.messages)
            let messageRequestPayload={
              message: {
                body: {
                  attributes: [],
                  text: getSavedTemplate(app,'messageTemplate.txt')
                },
                renderContentUnions: [],
                conversationUrn: requiredMessengerProfile.entityUrn,
                originToken: requiredMessengerProfile.messages.elements[0].originToken
              },
              mailboxUrn: requiredMessengerProfile.conversationParticipants.filter(item=>item.participantType.member.distance==='SELF')[0].hostIdentityUrn,
              trackingId: "ûem\u008a^\u007fGU\u0086\b¹?qrxg",
              dedupeByClientGeneratedToken: false
            }
            console.log(messageRequestPayload)
            let res=await session.fetch("https://www.linkedin.com/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage",{
              method:'POST',
              headers:{
                accept:'application/json',
                'csrf-token':csrfToken,
                'x-li-page-instance':'urn:li:page:d_flagship3_messaging_conversation_detail;tIV/G7Y8S5yI4zr6e+78/w==',
                'x-li-lang':'en_US'

              },
              body:JSON.stringify(messageRequestPayload)
            });

            console.log(res)
            console.log(res.data)
          });
        }

        
      } catch (error) {
        console.log("Here is your error",error)
        
      }

      // console.log(details)
      callback({ cancel: false, requestHeaders: details.requestHeaders })
    })

  }


  module.exports={
    extractProposals
  }