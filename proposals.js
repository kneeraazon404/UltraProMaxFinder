const {saveToExcel}=require('./excelFunctions')
const {getSavedTemplate}=require('./templateFunctions')


function extractProposals(data,username,page,linkedInSession,headers,app,mainWindow){

 
    const proposalsArr=[];
    const proposals=data.included.filter((item)=>item.$type=='com.linkedin.voyager.dash.marketplaces.projects.MarketplaceProject')
    // const filter=(proposals,property)=>proposals[property]
    proposals.forEach(proposal => {
      let jobTitle=proposal.detailViewSectionsResolutionResults.filter((item)=>item.header?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.title.text
      let jobCreatedDate=proposal.detailViewSectionsResolutionResults.filter((item)=>item.header?.$type=='com.linkedin.voyager.dash.marketplaces.projectdetailsview.MarketplaceProjectDetailsViewSectionsHeader')[0].header.insight?.text
  
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
      saveToExcel(proposalsArr,username,app).catch((err) => {
        console.error('Error inserting data into Excel:', err);
      });
      submitProposals(proposals,linkedInSession,headers,app);
      // reload the window here
    //   page.webContents.on('did-finish-load',()=>{
    //     if(proposals)page.reload();
    //   })
    }
    
    
  
  }
  
  
  async function submitProposals(proposals,session,headers,app){
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
                  textInputValue: getSavedTemplate(app) // get this value from saved file....
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
        console.log(body)
      }
        
      } catch (error) {
        console.log(error);
        
      }
      
    });
  }


  module.exports={
    extractProposals
  }