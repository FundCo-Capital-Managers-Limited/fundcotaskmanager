import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/userModel.js';
import Task from './models/taskModel.js';

const FORCE = process.argv.includes('--force');

const ASSIGNED_BY_EMAIL = 'aoni@fundco.ng';

const TASKS = [
  {
    "intendedOwner": "Angel Shodeke",
    "ownerEmail": "ashodeke@fundco.ng",
    "routingStatus": "direct",
    "routingNote": "Angel Shodeke exists on the platform as Transaction Legal / Legal Fundco.",
    "title": "Manage CEF weekly meeting secretariat",
    "description": "Manage the secretariat function for the Clean Energy Fund weekly portfolio meeting. Ensure each meeting has an agenda, clear minutes, an action tracker, weekly status updates, and follow-up reminders so portfolio monitoring remains structured and progressive.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Prepare the weekly CEF meeting agenda",
        "completed": false
      },
      {
        "text": "Prepare meeting minutes after each session",
        "completed": false
      },
      {
        "text": "Maintain the weekly action tracker",
        "completed": false
      },
      {
        "text": "Send follow-up reminders to responsible parties",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ridwan / Raheem Ridwan",
    "ownerEmail": "rraheem@fundco.ng",
    "routingStatus": "direct",
    "routingNote": "Transcript's Ridwan matches RAHEEM RIDWAN on the platform.",
    "title": "Forward CEF meeting recording to Angel",
    "description": "Send the full CEF weekly meeting recording directly to Angel Shodeke so she has complete context for secretariat duties and follow-up task tracking.",
    "priority": "High",
    "dueDate": "2026-05-04T09:00:00.000Z",
    "checklist": [
      {
        "text": "Obtain the meeting recording",
        "completed": false
      },
      {
        "text": "Forward the recording to Angel Shodeke",
        "completed": false
      },
      {
        "text": "Confirm that Angel received the recording",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ridwan / Raheem Ridwan",
    "ownerEmail": "rraheem@fundco.ng",
    "routingStatus": "direct",
    "routingNote": "Transcript's Ridwan matches RAHEEM RIDWAN on the platform.",
    "title": "Send CEF meeting minutes to Angel",
    "description": "Prepare and send the CEF meeting minutes to Angel Shodeke so she can identify next steps, assign responsibilities, and maintain the meeting action register.",
    "priority": "High",
    "dueDate": "2026-05-04T09:00:00.000Z",
    "checklist": [
      {
        "text": "Prepare clean meeting minutes",
        "completed": false
      },
      {
        "text": "Highlight all next steps and assigned actions",
        "completed": false
      },
      {
        "text": "Send minutes to Angel Shodeke",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Angel Shodeke, supported by Ridwan and Platform Administrator",
    "ownerEmail": "ashodeke@fundco.ng",
    "routingStatus": "direct_primary_with_support",
    "routingNote": "Angel is the secretariat and primary owner. Ridwan and platform administration are support roles.",
    "title": "Upload CEF meeting tasks to FundCoAI",
    "description": "Convert all CEF meeting outcomes into actionable tasks on the FundCoAI/negAI task platform so responsible parties receive email and in-app notifications and can track execution.",
    "priority": "High",
    "dueDate": "2026-05-04T12:00:00.000Z",
    "checklist": [
      {
        "text": "Create all meeting tasks on the platform",
        "completed": false
      },
      {
        "text": "Assign task owners",
        "completed": false
      },
      {
        "text": "Confirm email and in-app notifications are triggered",
        "completed": false
      },
      {
        "text": "Enable status tracking for all tasks",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Angel Shodeke / Ridwan",
    "ownerEmail": "ashodeke@fundco.ng",
    "routingStatus": "direct_primary_with_support",
    "routingNote": "Angel is secretariat; Ridwan is supporting with minutes and recording.",
    "title": "Share CEF meeting summary with Oluseyi Olayinka",
    "description": "Send a concise summary of the CEF meeting to Oluseyi Olayinka, highlighting all portfolio management responsibilities assigned to him and his team because he was not present at the meeting.",
    "priority": "High",
    "dueDate": "2026-05-04T12:00:00.000Z",
    "checklist": [
      {
        "text": "Prepare summary of portfolio management responsibilities",
        "completed": false
      },
      {
        "text": "Send the summary to Oluseyi Olayinka",
        "completed": false
      },
      {
        "text": "Confirm receipt and understanding",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ade Alli",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "direct",
    "routingNote": "Ade Alli exists on the platform as Deputy CIO / CEF.",
    "title": "Reallocate unassigned CEF meeting tasks",
    "description": "Review all CEF meeting tasks without clear owners and assign them to the appropriate team members so every action item has a responsible person on the platform.",
    "priority": "High",
    "dueDate": "2026-05-04T17:00:00.000Z",
    "checklist": [
      {
        "text": "Review all extracted tasks",
        "completed": false
      },
      {
        "text": "Identify tasks without clear owners",
        "completed": false
      },
      {
        "text": "Assign each task to the correct responsible person",
        "completed": false
      },
      {
        "text": "Update the FundCoAI task tracker",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Platform Administrator / FundCoAI Administrator",
    "ownerEmail": "oluwaseun.odufisan@gmail.com",
    "routingStatus": "fallback_to_platform_admin",
    "routingNote": "Generic platform administrator role routed to Oluwaseun Odufisan, listed as System Administrator/admin.",
    "title": "Enable task assignment rights for Ade Alli",
    "description": "Ensure Ade Alli has the required permission to assign, reassign, and manage tasks on the FundCoAI platform so he can distribute unassigned CEF meeting actions effectively.",
    "priority": "High",
    "dueDate": "2026-05-04T12:00:00.000Z",
    "checklist": [
      {
        "text": "Check Ade Alli's current platform permissions",
        "completed": false
      },
      {
        "text": "Enable task assignment and reassignment rights",
        "completed": false
      },
      {
        "text": "Test that Ade can assign tasks",
        "completed": false
      },
      {
        "text": "Confirm access with Ade",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Oluwaseyi Olayinka and Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "direct_name_variant",
    "routingNote": "Transcript says Oluwaseyi Olayinka; platform lists Oluseyi Olayinka, Head of Risk.",
    "title": "Complete full CEF portfolio review",
    "description": "Conduct a full review of the Clean Energy Fund portfolio to assess asset performance, risk exposure, and whether any change in management approach is required.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Review all CEF portfolio assets",
        "completed": false
      },
      {
        "text": "Identify performing and underperforming assets",
        "completed": false
      },
      {
        "text": "Recommend changes in approach where needed",
        "completed": false
      },
      {
        "text": "Prepare update for the next weekly CEF meeting",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Oluwaseyi Olayinka and Legal Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "direct_name_variant",
    "routingNote": "Portfolio owner assigned to Oluseyi Olayinka; Legal support is assigned separately to the Legal Team Lead.",
    "title": "Engage Legal on portfolio loan documents",
    "description": "Coordinate with Legal to review original loan documents, current addenda, and available commercial or legal options for encouraging client performance across monitored or troubled assets.",
    "priority": "High",
    "dueDate": "2026-05-06T17:00:00.000Z",
    "checklist": [
      {
        "text": "Identify relevant loan documents and addenda",
        "completed": false
      },
      {
        "text": "Share documents with Legal",
        "completed": false
      },
      {
        "text": "Request legal advice on performance obligations",
        "completed": false
      },
      {
        "text": "Summarize recommendations for management",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Legal Team",
    "ownerEmail": "oabraham@fundco.ng",
    "routingStatus": "fallback_to_team_lead",
    "routingNote": "Legal Team routed to Funmi Abraham, Team Lead for Legal, Compliance & HR.",
    "title": "Review loan documents and addenda for portfolio recovery",
    "description": "Review portfolio loan documents and addenda provided by the portfolio management team and advise on enforceable obligations, remedial options, and client performance actions.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Review original loan agreements",
        "completed": false
      },
      {
        "text": "Review current addenda and amendments",
        "completed": false
      },
      {
        "text": "Identify enforceable obligations",
        "completed": false
      },
      {
        "text": "Provide legal recommendations to portfolio management",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Oluwaseyi Olayinka and Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "direct_name_variant",
    "routingNote": "Transcript says Oluwaseyi Olayinka; platform lists Oluseyi Olayinka.",
    "title": "Monitor Magnificent REA grant performance triggers",
    "description": "Track Magnificent's performance against REA grant agreement commitments and validate that the company remains aligned with all grant performance triggers.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Obtain Magnificent grant commitments",
        "completed": false
      },
      {
        "text": "Create performance trigger checklist",
        "completed": false
      },
      {
        "text": "Collect evidence of compliance",
        "completed": false
      },
      {
        "text": "Escalate any risk of non-compliance",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Oluwaseyi Olayinka and Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "direct_name_variant",
    "routingNote": "Transcript says Oluwaseyi Olayinka; platform lists Oluseyi Olayinka.",
    "title": "Monitor Hotspot performance and cash-flow contribution",
    "description": "Closely monitor Hotspot as a troubled asset and track its ability to contribute positively to cash flows under the InfraCredit bond structure.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Review Hotspot operational and financial status",
        "completed": false
      },
      {
        "text": "Track expected cash-flow contribution",
        "completed": false
      },
      {
        "text": "Identify performance risks",
        "completed": false
      },
      {
        "text": "Report weekly status",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Oluwaseyi Olayinka and Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "direct_name_variant",
    "routingNote": "Transcript says Oluwaseyi Olayinka; platform lists Oluseyi Olayinka.",
    "title": "Monitor Pirano performance and risk position",
    "description": "Maintain close monitoring of Pirano as a troubled asset and determine whether commercial or legal intervention is required to improve performance.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Review Pirano's current status",
        "completed": false
      },
      {
        "text": "Identify key risk areas",
        "completed": false
      },
      {
        "text": "Determine required intervention",
        "completed": false
      },
      {
        "text": "Report weekly status",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Abiodun Oni",
    "ownerEmail": "aoni@fundco.ng",
    "routingStatus": "direct",
    "routingNote": "Abiodun Oni exists on the platform as Executive Director / CEF.",
    "title": "Follow up with Hotspot CEO on MOU and PPA documents",
    "description": "Engage the CEO of Hotspot to retrieve and confirm the MOU and Power Purchase Agreement documentation for the operational site currently in use.",
    "priority": "High",
    "dueDate": "2026-05-06T17:00:00.000Z",
    "checklist": [
      {
        "text": "Contact the CEO of Hotspot",
        "completed": false
      },
      {
        "text": "Retrieve the MOU document",
        "completed": false
      },
      {
        "text": "Retrieve or confirm the PPA document",
        "completed": false
      },
      {
        "text": "Drive execution if the PPA is not yet signed",
        "completed": false
      },
      {
        "text": "Share final documents with the portfolio team",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "fallback_to_team_lead",
    "routingNote": "Portfolio Management Team routed to Oluseyi Olayinka, Head of Risk.",
    "title": "Implement Hotspot fee and OPEX capture strategy",
    "description": "Develop and track the strategy for ensuring CEF loan fees from Hotspot are captured under OPEX within the relevant facility and reflected in cash-flow monitoring.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Confirm the relevant facility structure",
        "completed": false
      },
      {
        "text": "Identify CEF fees due on the loan",
        "completed": false
      },
      {
        "text": "Confirm OPEX treatment",
        "completed": false
      },
      {
        "text": "Track actual cash-flow contribution",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Oluwaseyi Olayinka and Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "direct_name_variant",
    "routingNote": "Transcript says Oluwaseyi Olayinka; platform lists Oluseyi Olayinka.",
    "title": "Optimize AssetCo facility performance",
    "description": "Work with each AssetCo to improve performance under CEF-supported facilities and ensure CEF's investments are justified by measurable portfolio outcomes.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Identify all active AssetCos",
        "completed": false
      },
      {
        "text": "Review facility obligations for each AssetCo",
        "completed": false
      },
      {
        "text": "Define required support or intervention",
        "completed": false
      },
      {
        "text": "Provide weekly progress update",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "fallback_to_team_lead",
    "routingNote": "Portfolio Management Team routed to Oluseyi Olayinka, Head of Risk.",
    "title": "Add new portfolio assets to CEF tracker",
    "description": "Add newly onboarded portfolio companies and assets to the CEF monitoring framework immediately after onboarding or contract execution.",
    "priority": "Medium",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Identify new portfolio additions",
        "completed": false
      },
      {
        "text": "Capture key contract and asset details",
        "completed": false
      },
      {
        "text": "Assign an internal monitoring owner",
        "completed": false
      },
      {
        "text": "Include new assets in weekly reporting",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "fallback_to_team_lead",
    "routingNote": "Portfolio Management Team routed to Oluseyi Olayinka, Head of Risk.",
    "title": "Prepare oversight plan for incoming AssetCo disbursement",
    "description": "Prepare oversight and disbursement plans for the incoming AssetCo expected to come on board after InfraCredit credit approval, including visibility over the initial portfolio of assets.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Confirm InfraCredit credit approval status",
        "completed": false
      },
      {
        "text": "Review the proposed initial asset portfolio",
        "completed": false
      },
      {
        "text": "Define CEF disbursement requirements",
        "completed": false
      },
      {
        "text": "Set monitoring requirements before disbursement",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Vivian Umeaku, Abiodun Oni, and Finance Team",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "direct_primary_with_support",
    "routingNote": "Vivian Umeaku exists as Finance Team Lead and is the closest lead for treasury recruitment execution.",
    "title": "Restart treasury manager recruitment",
    "description": "Restart the process for hiring a Treasury Manager to manage CEF liquidity and coordinate interim arrangements while the recruitment process is ongoing.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Confirm treasury manager role requirements",
        "completed": false
      },
      {
        "text": "Continue candidate search",
        "completed": false
      },
      {
        "text": "Prepare candidate shortlist",
        "completed": false
      },
      {
        "text": "Confirm interim treasury arrangement",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Finance Team",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_team_lead",
    "routingNote": "Finance Team routed to Vivian Umeaku, Finance Team Lead.",
    "title": "Review interim treasury capacity within Finance",
    "description": "Assess whether anyone within Finance has the expertise and experience to act as interim treasury lead until a dedicated Treasury Manager is hired.",
    "priority": "High",
    "dueDate": "2026-05-06T17:00:00.000Z",
    "checklist": [
      {
        "text": "Review Finance team capacity",
        "completed": false
      },
      {
        "text": "Identify possible interim treasury lead",
        "completed": false
      },
      {
        "text": "Define interim responsibilities",
        "completed": false
      },
      {
        "text": "Report recommendation to leadership",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Treasury Manager / Interim Treasury Lead",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_finance_lead",
    "routingNote": "Treasury Manager is not yet appointed; routed to Vivian Umeaku as Finance Team Lead.",
    "title": "Manage CEF liquidity position",
    "description": "Manage CEF liquidity by tracking available funds, expected inflows, expected outflows, coupon proceeds, bridge refinancing, and urgent client funding requirements.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Prepare current liquidity report",
        "completed": false
      },
      {
        "text": "Track expected inflows and outflows",
        "completed": false
      },
      {
        "text": "Monitor coupon, repayment, and refinancing proceeds",
        "completed": false
      },
      {
        "text": "Flag liquidity risks to leadership",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Finance / Treasury Team",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_team_lead",
    "routingNote": "Finance / Treasury Team routed to Vivian Umeaku, Finance Team Lead.",
    "title": "Complete sale process for ₦1.3 billion treasury instruments",
    "description": "Continue the sale of two non-clean-energy treasury instruments totaling ₦1.3 billion to an asset manager, and track how coupon proceeds will support urgent client work.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Confirm the two treasury instruments",
        "completed": false
      },
      {
        "text": "Track asset manager sale process",
        "completed": false
      },
      {
        "text": "Confirm expected coupon proceeds",
        "completed": false
      },
      {
        "text": "Report liquidity impact",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ridwan / Raheem Ridwan",
    "ownerEmail": "rraheem@fundco.ng",
    "routingStatus": "direct",
    "routingNote": "Transcript's Ridwan matches RAHEEM RIDWAN on the platform.",
    "title": "Engage Oluwaseun on FundCoAI portfolio management module",
    "description": "Engage Oluwaseun on adding a portfolio management module to FundCoAI for logging CEF assets, capturing key information, and tracking funding and interest inflows.",
    "priority": "High",
    "dueDate": "2026-05-06T17:00:00.000Z",
    "checklist": [
      {
        "text": "Contact Oluwaseun",
        "completed": false
      },
      {
        "text": "Share CEF portfolio tracking requirements",
        "completed": false
      },
      {
        "text": "Agree initial product scope",
        "completed": false
      },
      {
        "text": "Report implementation feedback to CEF leadership",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Oluwaseun / negAI Product Team",
    "ownerEmail": "oluwaseun.odufisan@gmail.com",
    "routingStatus": "direct_name_match",
    "routingNote": "Oluwaseun Odufisan exists on the platform as System Administrator/admin; assigned as product/platform owner.",
    "title": "Build FundCoAI portfolio management module",
    "description": "Build a portfolio management feature in FundCoAI that allows CEF assets to be added after contract signing, captures key asset information, creates trackers, and shows expected funding and interest inflows for liquidity planning.",
    "priority": "High",
    "dueDate": "2026-05-15T17:00:00.000Z",
    "checklist": [
      {
        "text": "Define asset onboarding fields",
        "completed": false
      },
      {
        "text": "Build asset tracker functionality",
        "completed": false
      },
      {
        "text": "Add funding and interest inflow tracking",
        "completed": false
      },
      {
        "text": "Create portfolio dashboard view",
        "completed": false
      },
      {
        "text": "Support weekly reporting output",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Finance Team and Portfolio Management Team",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_finance_lead",
    "routingNote": "Bridge refinancing is primarily liquidity/finance-led; routed to Vivian Umeaku as Finance Team Lead.",
    "title": "Review bridge refinancing opportunities",
    "description": "Identify and structure opportunities to refinance bridge facilities given to Magnificent, EML, and any other soon-to-be-disbursed assets so liquidity can be clawed back into the pool.",
    "priority": "High",
    "dueDate": "2026-05-15T17:00:00.000Z",
    "checklist": [
      {
        "text": "List all outstanding bridge facilities",
        "completed": false
      },
      {
        "text": "Include Magnificent and EML in the review",
        "completed": false
      },
      {
        "text": "Clarify the asset name captured as 'ship' in the transcript",
        "completed": false
      },
      {
        "text": "Estimate recoverable amount, targeting approximately ₦3 billion",
        "completed": false
      },
      {
        "text": "Prepare refinancing execution plan",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Leadership and Finance Team",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "fallback_to_cef_lead",
    "routingNote": "CEF Leadership routed to Ade Alli, Deputy CIO / CEF, for operational coordination.",
    "title": "Prepare CEF Series 3 readiness plan",
    "description": "Prepare CEF for Series 3 by coordinating liquidity recycling, portfolio performance evidence, investor engagement, advisory board setup, and supporting documentation.",
    "priority": "High",
    "dueDate": "2026-05-29T17:00:00.000Z",
    "checklist": [
      {
        "text": "Prepare Series 3 readiness checklist",
        "completed": false
      },
      {
        "text": "Compile portfolio performance evidence",
        "completed": false
      },
      {
        "text": "Track liquidity recycling items",
        "completed": false
      },
      {
        "text": "Coordinate advisory board and investor engagement dependencies",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ade Alli and Matthew Osagiede",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "partial_direct_missing_coowner",
    "routingNote": "Ade Alli exists on the platform. Matthew Osagiede was not found; task remains assigned to Ade as the available named CEF lead.",
    "title": "Create investor engagement calendar",
    "description": "Create and maintain a structured investor engagement calendar to improve consistency, discipline, and follow-through in investor communications.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "List key investors and stakeholder groups",
        "completed": false
      },
      {
        "text": "Define engagement frequency",
        "completed": false
      },
      {
        "text": "Prepare communication calendar",
        "completed": false
      },
      {
        "text": "Track completed engagements and follow-ups",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Investor Relations / Finance Team",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_finance_lead",
    "routingNote": "Management accounts are Finance-led; routed to Vivian Umeaku, Finance Team Lead.",
    "title": "Prepare management accounts for investor reporting",
    "description": "Prepare management accounts for investor engagement while audit completion is pending, clearly identifying the information as management accounts and updating it once audited numbers become available.",
    "priority": "Medium",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Prepare management accounts",
        "completed": false
      },
      {
        "text": "Clearly label accounts as management accounts",
        "completed": false
      },
      {
        "text": "Create investor-ready reporting pack",
        "completed": false
      },
      {
        "text": "Update pack once audited information is available",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Investor Relations / Website Team",
    "ownerEmail": "oluwaseun.odufisan@gmail.com",
    "routingStatus": "fallback_to_platform_admin",
    "routingNote": "No Investor Relations or Website Team user was found; routed to Oluwaseun Odufisan as System Administrator/admin.",
    "title": "Activate investor portal access on website",
    "description": "Create or activate investor login access on the website so investors can view approved CEF portfolio performance information through the investor relations window.",
    "priority": "High",
    "dueDate": "2026-05-15T17:00:00.000Z",
    "checklist": [
      {
        "text": "Review current investor relations website window",
        "completed": false
      },
      {
        "text": "Set up investor login access",
        "completed": false
      },
      {
        "text": "Configure access control",
        "completed": false
      },
      {
        "text": "Test portal access",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Leadership / Investor Relations Team",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "fallback_to_cef_lead",
    "routingNote": "Investor Relations Team was not separately found; routed to Ade Alli as Deputy CIO / CEF.",
    "title": "Define investor portal content framework",
    "description": "Define the portfolio information, performance metrics, reporting frequency, and confidentiality limits for content to be published in the investor portal.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Define investor-facing performance metrics",
        "completed": false
      },
      {
        "text": "Agree reporting frequency",
        "completed": false
      },
      {
        "text": "Identify confidential information to exclude",
        "completed": false
      },
      {
        "text": "Approve content upload plan",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Abiodun Oni",
    "ownerEmail": "aoni@fundco.ng",
    "routingStatus": "direct",
    "routingNote": "Abiodun Oni exists on the platform as Executive Director / CEF.",
    "title": "Compile CEO contacts for advisory board nominations",
    "description": "Compile email addresses and contact details for all relevant CEOs and request nominations of team members to serve on the CEF advisory board.",
    "priority": "High",
    "dueDate": "2026-05-04T17:00:00.000Z",
    "checklist": [
      {
        "text": "Compile relevant CEO names",
        "completed": false
      },
      {
        "text": "Collect CEO email addresses and contact details",
        "completed": false
      },
      {
        "text": "Prepare advisory board nomination request",
        "completed": false
      },
      {
        "text": "Share information with Legal",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Legal Team",
    "ownerEmail": "oabraham@fundco.ng",
    "routingStatus": "fallback_to_team_lead",
    "routingNote": "Legal Team routed to Funmi Abraham, Team Lead for Legal, Compliance & HR.",
    "title": "Complete legal setup for CEF advisory board",
    "description": "Support the formal constitution of the CEF advisory board after receiving CEO contacts and nomination details from Abiodun Oni.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Review advisory board setup requirements",
        "completed": false
      },
      {
        "text": "Prepare legal or governance documentation",
        "completed": false
      },
      {
        "text": "Support nomination communication",
        "completed": false
      },
      {
        "text": "Confirm completion of legal setup",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ade Alli / CEF Team",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "direct_primary_with_support",
    "routingNote": "Ade Alli exists as Deputy CIO / CEF and was part of the vehicle pilot discussion.",
    "title": "Obtain ItalColven or Transion vehicle quotes",
    "description": "Obtain updated vehicle invoices or quotes from ItalColven/Transion and recommend the appropriate pilot quantity based on expected usage and idle-time risk.",
    "priority": "Medium",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Request updated vehicle quotes or invoices",
        "completed": false
      },
      {
        "text": "Compare pilot options and vehicle types",
        "completed": false
      },
      {
        "text": "Assess likely utilization",
        "completed": false
      },
      {
        "text": "Recommend initial pilot volume",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Team / InfraCredit ESG Team",
    "ownerEmail": "ookunubi@fundco.ng",
    "routingStatus": "fallback_to_esg_responsible_user",
    "routingNote": "No ESG team lead was found; routed to Omolola Okunubi, listed as ESG.",
    "title": "Confirm Transion or ItalColven ESG qualification",
    "description": "Confirm whether Transion/ItalColven qualifies under InfraCredit ESGD requirements for OEMs before any major partnership or Series 3 allocation commitment.",
    "priority": "High",
    "dueDate": "2026-05-15T17:00:00.000Z",
    "checklist": [
      {
        "text": "Obtain InfraCredit ESGD OEM criteria",
        "completed": false
      },
      {
        "text": "Assess Transion or ItalColven against criteria",
        "completed": false
      },
      {
        "text": "Gather required qualification documents",
        "completed": false
      },
      {
        "text": "Report qualification decision",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Strategy Team",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "fallback_to_cef_lead",
    "routingNote": "CEF Strategy Team routed to Ade Alli, Deputy CIO / CEF.",
    "title": "Develop Series 3 clean mobility strategy",
    "description": "Develop the clean mobility and OEM financing angle for Series 3, including the potential Transion/ItalColven partnership and relevant local currency financing structure.",
    "priority": "Medium",
    "dueDate": "2026-05-29T17:00:00.000Z",
    "checklist": [
      {
        "text": "Define potential clean mobility portfolio",
        "completed": false
      },
      {
        "text": "Assess OEM support and servicing advantage",
        "completed": false
      },
      {
        "text": "Evaluate financing opportunity",
        "completed": false
      },
      {
        "text": "Recommend whether to include in Series 3",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "EML Management / CEF Portfolio Team",
    "ownerEmail": "jngene@fundco.ng",
    "routingStatus": "fallback_to_eml_ceo",
    "routingNote": "EML Management routed to Jojololami Ngene, CEO / EML, who is on the platform.",
    "title": "Complete EML project and unlock grant funding",
    "description": "Support EML to complete its project before the end of June and unlock grant funding so CEF can recover or liquidate its funding exposure early.",
    "priority": "High",
    "dueDate": "2026-06-30T17:00:00.000Z",
    "checklist": [
      {
        "text": "Confirm EML project completion milestones",
        "completed": false
      },
      {
        "text": "Track grant readiness requirements",
        "completed": false
      },
      {
        "text": "Resolve completion blockers",
        "completed": false
      },
      {
        "text": "Track funding recovery or liquidation",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Charles in GroSolar / GroSolar Team / CEF Team",
    "ownerEmail": "cosuji@grosolar.co",
    "routingStatus": "direct_name_match",
    "routingNote": "Charles in GroSolar mapped to Charles Osuji, CEO / GroSolar.",
    "title": "Document ARM micro-pension forms",
    "description": "Document the ARM micro-pension forms generated by Charles and prepare them for standardized use across GroSolar and other relevant entities.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Retrieve existing ARM micro-pension forms",
        "completed": false
      },
      {
        "text": "Review forms for completeness",
        "completed": false
      },
      {
        "text": "Create standardized documentation",
        "completed": false
      },
      {
        "text": "Share documents with relevant entities",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ade Alli, Matthew Osagiede, GroSolar Team, and Agronomy",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "partial_direct_missing_coowner",
    "routingNote": "Ade Alli exists and is assigned as coordinating owner. Matthew Osagiede is not on the platform; Agronomy user Joy Akhigbe may support but was not directly assigned in the transcript.",
    "title": "Run ARM micro-pension pilot",
    "description": "Run a small ARM micro-pension onboarding pilot using one or two customers from GroSolar and Agronomy, documenting the process as evidence for Series 3 readiness.",
    "priority": "High",
    "dueDate": "2026-05-15T17:00:00.000Z",
    "checklist": [
      {
        "text": "Retrieve ARM micro-pension strategy documentation",
        "completed": false
      },
      {
        "text": "Identify one or two GroSolar customers",
        "completed": false
      },
      {
        "text": "Identify one or two Agronomy customers",
        "completed": false
      },
      {
        "text": "Complete the pilot onboarding process",
        "completed": false
      },
      {
        "text": "Document pilot evidence and lessons",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Matthew Osagiede",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "fallback_to_assigning_cef_lead",
    "routingNote": "Matthew Osagiede was not found on the platform; routed to Ade Alli as Deputy CIO / CEF and the person assigning the presentation workstream.",
    "title": "Create weekly CEF tracking presentation",
    "description": "Create a simple weekly CEF meeting presentation showing task status, current progress, gaps, escalations, and next steps. The deck should be operational and direct, not a polished third-party presentation.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Create weekly CEF tracking deck",
        "completed": false
      },
      {
        "text": "Include task status summary",
        "completed": false
      },
      {
        "text": "Show previous week versus current week status",
        "completed": false
      },
      {
        "text": "Highlight gaps and escalations",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Matthew Osagiede and Ridwan",
    "ownerEmail": "rraheem@fundco.ng",
    "routingStatus": "partial_direct_missing_coowner",
    "routingNote": "Ridwan is on the platform; Matthew Osagiede was not found. Assigned to Ridwan as available named co-owner.",
    "title": "Test FundCoAI deck-generation tool",
    "description": "Test the FundCoAI deck-generation tool by converting the CEF meeting transcript or minutes into a simple operational presentation for future weekly meetings.",
    "priority": "Medium",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Access the deck-generation tool",
        "completed": false
      },
      {
        "text": "Generate a draft presentation from meeting content",
        "completed": false
      },
      {
        "text": "Review output quality",
        "completed": false
      },
      {
        "text": "Document functionality gaps",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ade Alli and Matthew Osagiede",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "partial_direct_missing_coowner",
    "routingNote": "Ade Alli exists on the platform. Matthew Osagiede was not found; assigned to Ade as available named co-owner.",
    "title": "Test FundCoAI model tool scenarios",
    "description": "Test the FundCoAI model tool by running multiple scenarios, identifying gaps, and documenting required fixes for more reliable automated financial modeling.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Run multiple model scenarios",
        "completed": false
      },
      {
        "text": "Document tool outputs",
        "completed": false
      },
      {
        "text": "Identify gaps or errors",
        "completed": false
      },
      {
        "text": "Share improvement requirements with product team",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ade Alli, Matthew Osagiede, and FundCoAI Product Team",
    "ownerEmail": "oluwaseun.odufisan@gmail.com",
    "routingStatus": "fallback_to_product_admin",
    "routingNote": "Product/team implementation routed to Oluwaseun Odufisan as System Administrator/admin. Matthew Osagiede was not found.",
    "title": "Improve automated modeling for GroSolar proposals",
    "description": "Improve the automated modeling workflow for GroSolar so analysts can quickly generate Energy-as-a-Service and asset finance proposal models without waiting for specialist modelers.",
    "priority": "High",
    "dueDate": "2026-05-15T17:00:00.000Z",
    "checklist": [
      {
        "text": "Identify common GroSolar proposal types",
        "completed": false
      },
      {
        "text": "Support Energy-as-a-Service scenarios",
        "completed": false
      },
      {
        "text": "Support asset finance scenarios",
        "completed": false
      },
      {
        "text": "Test with real GroSolar pipeline cases",
        "completed": false
      },
      {
        "text": "Document required automation improvements",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Matthew Osagiede, Ade Alli, and Abiodun Oni",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "partial_direct_missing_coowner",
    "routingNote": "Ade Alli and Abiodun Oni are on the platform. Matthew Osagiede was not found; assigned to Ade as CEF lead and available named co-owner.",
    "title": "Correct GroSolar financial model",
    "description": "Review and correct the GroSolar financial model, especially cost of sale treatment and the revenue breakdown across sales, Energy-as-a-Service, and asset lease.",
    "priority": "High",
    "dueDate": "2026-05-06T17:00:00.000Z",
    "checklist": [
      {
        "text": "Review current GroSolar model",
        "completed": false
      },
      {
        "text": "Correct cost of sale treatment",
        "completed": false
      },
      {
        "text": "Break revenue into sales, Energy-as-a-Service, and asset lease",
        "completed": false
      },
      {
        "text": "Recompute updated pipeline numbers",
        "completed": false
      },
      {
        "text": "Prepare corrected model for InfraCredit sharing",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ade Alli",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "direct",
    "routingNote": "Ade Alli exists on the platform as Deputy CIO / CEF.",
    "title": "Forward CapEx accounting email to Matthew fallback owner",
    "description": "Forward the email concerning CapEx treatment of solar asset investments for review and response preparation. Because Matthew Osagiede is not on the platform, coordinate internally and ensure the issue is still actioned.",
    "priority": "Medium",
    "dueDate": "2026-05-04T17:00:00.000Z",
    "checklist": [
      {
        "text": "Locate the CapEx accounting email",
        "completed": false
      },
      {
        "text": "Forward or share the email with the appropriate reviewer",
        "completed": false
      },
      {
        "text": "Provide context for the required response",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Matthew Osagiede and Ade Alli",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "partial_direct_missing_coowner",
    "routingNote": "Ade Alli exists; Matthew Osagiede was not found. Assigned to Ade as available named co-owner.",
    "title": "Prepare CapEx balance sheet treatment response",
    "description": "Prepare a clear response explaining the accounting treatment of CapEx investments into solar assets and whether they qualify for balance sheet treatment.",
    "priority": "Medium",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Review the accounting question",
        "completed": false
      },
      {
        "text": "Clarify accountant's position",
        "completed": false
      },
      {
        "text": "Prepare response",
        "completed": false
      },
      {
        "text": "Align with Finance if required",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Matthew Osagiede / CEF Team",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_finance_lead",
    "routingNote": "Matthew Osagiede was not found; monthly transaction reporting routed to Vivian Umeaku as Finance Team Lead.",
    "title": "Prepare monthly InfraCredit transaction report",
    "description": "Prepare and submit monthly reports to InfraCredit covering transactions financed under the approved Delegation of Authority.",
    "priority": "High",
    "dueDate": "2026-05-29T17:00:00.000Z",
    "checklist": [
      {
        "text": "Define monthly reporting template",
        "completed": false
      },
      {
        "text": "List transactions financed during the month",
        "completed": false
      },
      {
        "text": "Include portfolio disbursement summary",
        "completed": false
      },
      {
        "text": "Submit report to InfraCredit",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Matthew Osagiede and Finance Team",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_finance_lead",
    "routingNote": "Matthew Osagiede was not found; routed to Vivian Umeaku as Finance Team Lead.",
    "title": "Separate Series 1 and Series 2 portfolio reporting",
    "description": "Separate Series 1 and Series 2 portfolio reporting so IC presentations and summary sheets do not commingle the two portfolios.",
    "priority": "High",
    "dueDate": "2026-05-15T17:00:00.000Z",
    "checklist": [
      {
        "text": "Identify Series 1 portfolio items",
        "completed": false
      },
      {
        "text": "Identify Series 2 portfolio items",
        "completed": false
      },
      {
        "text": "Create separate summary sheets",
        "completed": false
      },
      {
        "text": "Update InfraCredit presentation",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Matthew Osagiede and Finance Team",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_finance_lead",
    "routingNote": "Matthew Osagiede was not found; routed to Vivian Umeaku as Finance Team Lead.",
    "title": "Break down placements and cash by series",
    "description": "Work with Finance to determine which placements and cash balances belong to Series 1 and Series 2 and reflect the verified figures in IC reporting.",
    "priority": "High",
    "dueDate": "2026-05-15T17:00:00.000Z",
    "checklist": [
      {
        "text": "Review placement records",
        "completed": false
      },
      {
        "text": "Determine Series 1 placement and cash balances",
        "completed": false
      },
      {
        "text": "Determine Series 2 placement and cash balances",
        "completed": false
      },
      {
        "text": "Verify figures with Finance",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Finance Team and Matthew Osagiede",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_finance_lead",
    "routingNote": "Finance Team routed to Vivian Umeaku. Matthew Osagiede was not found.",
    "title": "Update accounting tool for series-based reporting",
    "description": "Update or configure the accounting tool to support proper separation of Series 1 and Series 2 reporting for accurate IC presentations and portfolio summaries.",
    "priority": "High",
    "dueDate": "2026-05-22T17:00:00.000Z",
    "checklist": [
      {
        "text": "Review current accounting tool limitations",
        "completed": false
      },
      {
        "text": "Define required series-based reporting outputs",
        "completed": false
      },
      {
        "text": "Configure or request tool update",
        "completed": false
      },
      {
        "text": "Test Series 1 and Series 2 reporting output",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Abiodun Oni",
    "ownerEmail": "aoni@fundco.ng",
    "routingStatus": "direct",
    "routingNote": "Abiodun Oni exists on the platform as Executive Director / CEF.",
    "title": "Send Little Room model and business plan files",
    "description": "Locate and send the financial model and business plan for the project referred to as Little Room to the relevant reviewer. The transcript indicates the financial model was found but the business plan still needs to be located.",
    "priority": "Medium",
    "dueDate": "2026-05-06T17:00:00.000Z",
    "checklist": [
      {
        "text": "Search laptop files for the Little Room materials",
        "completed": false
      },
      {
        "text": "Send the financial model",
        "completed": false
      },
      {
        "text": "Locate and send the business plan if available",
        "completed": false
      },
      {
        "text": "Confirm receipt",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Portfolio Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "fallback_to_team_lead",
    "routingNote": "CEF Portfolio Team routed to Oluseyi Olayinka, Head of Risk.",
    "title": "Create formal EML performance tracker",
    "description": "Create a formal tracking process for EML's project progress, asset performance, grant readiness, and expected funding recovery.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Create EML performance tracker",
        "completed": false
      },
      {
        "text": "Track project completion milestones",
        "completed": false
      },
      {
        "text": "Track grant readiness",
        "completed": false
      },
      {
        "text": "Track expected funding recovery",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Portfolio Team / GroSolar Team",
    "ownerEmail": "cosuji@grosolar.co",
    "routingStatus": "fallback_to_grosolar_ceo",
    "routingNote": "GroSolar Team routed to Charles Osuji, CEO / GroSolar.",
    "title": "Drive GroSolar performance improvement",
    "description": "Drive GroSolar's performance improvement as a priority internal asset with significant untapped value, including commercial pipeline, proposal generation, and operational performance tracking.",
    "priority": "High",
    "dueDate": "2026-05-08T16:00:00.000Z",
    "checklist": [
      {
        "text": "Identify GroSolar performance gaps",
        "completed": false
      },
      {
        "text": "Track commercial opportunity pipeline",
        "completed": false
      },
      {
        "text": "Support improved proposal generation",
        "completed": false
      },
      {
        "text": "Provide weekly performance update",
        "completed": false
      }
    ]
  }
];

const requireForce = () => {
  if (FORCE) return;
  console.log('Dry run only. Add --force to write tasks to the database.');
  process.exit(0);
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const resolveUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return User.findOne({ email: normalizedEmail }).select('_id email fullName firstName lastName role position unitSector');
};

const displayUser = (user) => {
  if (!user) return 'UNRESOLVED';
  const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  return `${name} <${user.email}>`;
};

const main = async () => {
  requireForce();
  await connectDB();

  const assignedBy = await resolveUserByEmail(ASSIGNED_BY_EMAIL);
  if (!assignedBy) throw new Error(`Assigned-by user not found for email: ${ASSIGNED_BY_EMAIL}`);

  let created = 0;
  let skippedExisting = 0;
  let skippedUnresolved = 0;
  let skippedMissingConfiguredOwner = 0;

  for (const task of TASKS) {
    if (!task.ownerEmail) {
      skippedUnresolved += 1;
      console.warn(`[UNRESOLVED TASK] ${task.title} | intended owner: ${task.intendedOwner || 'Unknown'} | note: ${task.routingNote || 'No routing note provided'}`);
      continue;
    }

    const owner = await resolveUserByEmail(task.ownerEmail);
    if (!owner) {
      skippedMissingConfiguredOwner += 1;
      console.warn(`[OWNER EMAIL NOT FOUND] ${task.title} | configured email: ${task.ownerEmail} | intended owner: ${task.intendedOwner || 'Unknown'} | note: ${task.routingNote || 'No routing note provided'}`);
      continue;
    }

    if (task.routingStatus && !['direct', 'direct_name_match'].includes(task.routingStatus)) {
      console.log(`[ROUTED] ${task.title} | intended: ${task.intendedOwner || 'Unknown'} -> ${displayUser(owner)} | ${task.routingNote || task.routingStatus}`);
    }

    const dueDate = task.dueDate ? new Date(task.dueDate) : undefined;
    const existing = await Task.findOne({
      owner: owner._id,
      title: task.title,
      ...(dueDate ? { dueDate } : {}),
    }).select('_id');

    if (existing) {
      skippedExisting += 1;
      console.log(`Skipping existing task: ${task.title} -> ${owner.email}`);
      continue;
    }

    await Task.create({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'Low',
      dueDate,
      owner: owner._id,
      checklist: Array.isArray(task.checklist) ? task.checklist : [],
      createdByAdmin: true,
      assignedBy: assignedBy._id,
    });

    created += 1;
    console.log(`Created task: ${task.title} -> ${owner.email}`);
  }

  console.log(`Done. Created ${created} task(s). Skipped existing: ${skippedExisting}. Unresolved: ${skippedUnresolved}. Missing configured owners: ${skippedMissingConfiguredOwner}.`);
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('seed-tasks failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
