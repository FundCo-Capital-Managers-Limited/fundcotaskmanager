import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/userModel.js';
import Goal from './models/goalModel.js';

const FORCE = process.argv.includes('--force');

const CREATED_BY_EMAIL = 'aoni@fundco.ng';

const GOALS = [
  {
    "intendedOwner": "CEF Team",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "fallback_to_cef_lead",
    "routingNote": "CEF Team routed to Ade Alli, Deputy CIO / CEF.",
    "title": "Establish weekly CEF portfolio monitoring",
    "timeframe": "weekly",
    "type": "personal",
    "startDate": "2026-05-04T00:00:00.000Z",
    "endDate": "2026-05-10T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Hold structured weekly CEF meetings",
        "completed": false
      },
      {
        "title": "Use agendas and action trackers",
        "completed": false
      },
      {
        "title": "Monitor portfolio health and next-week activities",
        "completed": false
      },
      {
        "title": "Escalate gaps quickly",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Leadership and Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "fallback_to_portfolio_lead",
    "routingNote": "Portfolio Management Team routed to Oluseyi Olayinka, Head of Risk.",
    "title": "Strengthen management of the ₦15 billion CEF portfolio",
    "timeframe": "monthly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-05-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Monitor internal assets",
        "completed": false
      },
      {
        "title": "Monitor legacy and newly onboarded clients",
        "completed": false
      },
      {
        "title": "Track troubled assets",
        "completed": false
      },
      {
        "title": "Improve reporting discipline",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Portfolio Team and GroSolar Team",
    "ownerEmail": "cosuji@grosolar.co",
    "routingStatus": "fallback_to_grosolar_ceo",
    "routingNote": "GroSolar Team routed to Charles Osuji, CEO / GroSolar.",
    "title": "Unlock GroSolar portfolio value",
    "timeframe": "monthly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-05-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Improve GroSolar commercial performance",
        "completed": false
      },
      {
        "title": "Strengthen proposal generation",
        "completed": false
      },
      {
        "title": "Correct financial model errors",
        "completed": false
      },
      {
        "title": "Automate modeling for priority proposals",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Portfolio Team and EML Management",
    "ownerEmail": "jngene@fundco.ng",
    "routingStatus": "fallback_to_eml_ceo",
    "routingNote": "EML Management routed to Jojololami Ngene, CEO / EML.",
    "title": "Complete EML project and recover CEF funding",
    "timeframe": "monthly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-06-30T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Complete EML project milestones",
        "completed": false
      },
      {
        "title": "Meet grant requirements",
        "completed": false
      },
      {
        "title": "Secure grant release",
        "completed": false
      },
      {
        "title": "Recover or liquidate CEF funding exposure",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "fallback_to_portfolio_lead",
    "routingNote": "Portfolio Management Team routed to Oluseyi Olayinka, Head of Risk.",
    "title": "Stabilize troubled CEF assets",
    "timeframe": "weekly",
    "type": "personal",
    "startDate": "2026-05-04T00:00:00.000Z",
    "endDate": "2026-05-10T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Track Hotspot performance",
        "completed": false
      },
      {
        "title": "Track Pirano performance",
        "completed": false
      },
      {
        "title": "Review legal and commercial recovery options",
        "completed": false
      },
      {
        "title": "Escalate risks early",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Oluwaseyi Olayinka and Portfolio Management Team",
    "ownerEmail": "oolayinka@fundco.ng",
    "routingStatus": "direct_name_variant",
    "routingNote": "Transcript says Oluwaseyi Olayinka; platform lists Oluseyi Olayinka.",
    "title": "Improve AssetCo facility performance",
    "timeframe": "weekly",
    "type": "personal",
    "startDate": "2026-05-04T00:00:00.000Z",
    "endDate": "2026-05-10T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Track AssetCo facility obligations",
        "completed": false
      },
      {
        "title": "Monitor performance under CEF facilities",
        "completed": false
      },
      {
        "title": "Support AssetCos where needed",
        "completed": false
      },
      {
        "title": "Report progress weekly",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "FundCoAI / negAI Product Team and CEF Team",
    "ownerEmail": "oluwaseun.odufisan@gmail.com",
    "routingStatus": "fallback_to_platform_admin",
    "routingNote": "Product/platform work routed to Oluwaseun Odufisan, System Administrator/admin.",
    "title": "Build FundCoAI as CEF portfolio operating system",
    "timeframe": "monthly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-05-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Assign meeting tasks on the platform",
        "completed": false
      },
      {
        "title": "Add assets after contract signing",
        "completed": false
      },
      {
        "title": "Track performance, funding, and interest inflows",
        "completed": false
      },
      {
        "title": "Support weekly portfolio reporting",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Finance Team / Treasury Manager",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_finance_lead",
    "routingNote": "Finance/Treasury routed to Vivian Umeaku, Finance Team Lead.",
    "title": "Improve CEF liquidity management",
    "timeframe": "monthly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-05-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Hire or appoint treasury manager",
        "completed": false
      },
      {
        "title": "Sell identified treasury instruments",
        "completed": false
      },
      {
        "title": "Track liquidity sources and uses",
        "completed": false
      },
      {
        "title": "Recover liquidity through bridge refinancing",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Leadership and Finance Team",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "fallback_to_cef_lead",
    "routingNote": "CEF Leadership routed to Ade Alli, Deputy CIO / CEF.",
    "title": "Prepare CEF for Series 3 issuance",
    "timeframe": "quarterly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-07-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Constitute advisory board",
        "completed": false
      },
      {
        "title": "Improve investor engagement",
        "completed": false
      },
      {
        "title": "Pilot ARM micro-pension process",
        "completed": false
      },
      {
        "title": "Demonstrate portfolio performance and liquidity recycling",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ade Alli, Matthew Osagiede, GroSolar Team, and Relevant AssetCos",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "partial_direct_missing_coowner",
    "routingNote": "Ade Alli exists and is assigned as coordinating owner; Matthew Osagiede was not found.",
    "title": "Launch ARM micro-pension pilot",
    "timeframe": "monthly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-05-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Retrieve existing documentation and forms",
        "completed": false
      },
      {
        "title": "Onboard one or two GroSolar customers",
        "completed": false
      },
      {
        "title": "Onboard one or two Agronomy customers",
        "completed": false
      },
      {
        "title": "Document pilot completion evidence",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ade Alli, Matthew Osagiede, Investor Relations Team",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "partial_direct_missing_coowner",
    "routingNote": "Ade Alli exists. Matthew Osagiede and a separate Investor Relations user/team were not found; routed to Ade as CEF lead.",
    "title": "Improve CEF investor engagement",
    "timeframe": "monthly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-05-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Create investor engagement calendar",
        "completed": false
      },
      {
        "title": "Use management accounts while audit is pending",
        "completed": false
      },
      {
        "title": "Activate investor portal",
        "completed": false
      },
      {
        "title": "Share portfolio performance information",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Abiodun Oni and Legal Team",
    "ownerEmail": "aoni@fundco.ng",
    "routingStatus": "direct_primary_with_support",
    "routingNote": "Abiodun Oni is the named owner; Legal Team support is handled through Funmi Abraham on related task.",
    "title": "Constitute CEF advisory board",
    "timeframe": "monthly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-05-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Compile CEO contacts",
        "completed": false
      },
      {
        "title": "Request advisory board nominations",
        "completed": false
      },
      {
        "title": "Provide information to Legal",
        "completed": false
      },
      {
        "title": "Confirm advisory board setup progress",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "CEF Strategy Team",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "fallback_to_cef_lead",
    "routingNote": "CEF Strategy Team routed to Ade Alli, Deputy CIO / CEF.",
    "title": "Develop Transion clean mobility opportunity",
    "timeframe": "quarterly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-07-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Obtain vehicle quotes",
        "completed": false
      },
      {
        "title": "Determine pilot vehicle volume",
        "completed": false
      },
      {
        "title": "Confirm ESG qualification",
        "completed": false
      },
      {
        "title": "Decide whether to include in Series 3",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Matthew Osagiede / CEF Team",
    "ownerEmail": "aalli@cleanenergyfund.ng",
    "routingStatus": "fallback_to_assigning_cef_lead",
    "routingNote": "Matthew Osagiede was not found; routed to Ade Alli as Deputy CIO / CEF.",
    "title": "Improve weekly CEF reporting decks",
    "timeframe": "weekly",
    "type": "personal",
    "startDate": "2026-05-04T00:00:00.000Z",
    "endDate": "2026-05-10T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Show current task status",
        "completed": false
      },
      {
        "title": "Compare previous week and current week",
        "completed": false
      },
      {
        "title": "Identify gaps and escalations",
        "completed": false
      },
      {
        "title": "Track follow-up actions",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Ade Alli, Matthew Osagiede, and FundCoAI Product Team",
    "ownerEmail": "oluwaseun.odufisan@gmail.com",
    "routingStatus": "fallback_to_product_admin",
    "routingNote": "Product automation routed to Oluwaseun Odufisan as System Administrator/admin; Matthew Osagiede was not found.",
    "title": "Improve financial modeling automation",
    "timeframe": "monthly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-05-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Test model tool scenarios",
        "completed": false
      },
      {
        "title": "Identify gaps and errors",
        "completed": false
      },
      {
        "title": "Fix automation issues",
        "completed": false
      },
      {
        "title": "Support GroSolar proposal automation",
        "completed": false
      }
    ]
  },
  {
    "intendedOwner": "Matthew Osagiede and Finance Team",
    "ownerEmail": "vumeaku@fundco.ng",
    "routingStatus": "fallback_to_finance_lead",
    "routingNote": "Matthew Osagiede was not found; routed to Vivian Umeaku as Finance Team Lead.",
    "title": "Improve InfraCredit reporting",
    "timeframe": "monthly",
    "type": "personal",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-05-31T23:59:59.000Z",
    "scope": "individual",
    "subGoals": [
      {
        "title": "Submit monthly financed transaction reports",
        "completed": false
      },
      {
        "title": "Separate Series 1 and Series 2 reporting",
        "completed": false
      },
      {
        "title": "Break down cash and placements by series",
        "completed": false
      },
      {
        "title": "Update accounting tool where needed",
        "completed": false
      }
    ]
  }
];

const requireForce = () => {
  if (FORCE) return;
  console.log('Dry run only. Add --force to write goals to the database.');
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

  const createdBy = await resolveUserByEmail(CREATED_BY_EMAIL);
  if (!createdBy) throw new Error(`Created-by user not found for email: ${CREATED_BY_EMAIL}`);

  let created = 0;
  let skippedExisting = 0;
  let skippedUnresolved = 0;
  let skippedMissingConfiguredOwner = 0;

  for (const goal of GOALS) {
    if (!goal.ownerEmail) {
      skippedUnresolved += 1;
      console.warn(`[UNRESOLVED GOAL] ${goal.title} | intended owner: ${goal.intendedOwner || 'Unknown'} | note: ${goal.routingNote || 'No routing note provided'}`);
      continue;
    }

    const owner = await resolveUserByEmail(goal.ownerEmail);
    if (!owner) {
      skippedMissingConfiguredOwner += 1;
      console.warn(`[OWNER EMAIL NOT FOUND] ${goal.title} | configured email: ${goal.ownerEmail} | intended owner: ${goal.intendedOwner || 'Unknown'} | note: ${goal.routingNote || 'No routing note provided'}`);
      continue;
    }

    if (goal.routingStatus && !['direct', 'direct_name_match'].includes(goal.routingStatus)) {
      console.log(`[ROUTED] ${goal.title} | intended: ${goal.intendedOwner || 'Unknown'} -> ${displayUser(owner)} | ${goal.routingNote || goal.routingStatus}`);
    }

    const existing = await Goal.findOne({
      owner: owner._id,
      title: goal.title,
      timeframe: goal.timeframe,
    }).select('_id');

    if (existing) {
      skippedExisting += 1;
      console.log(`Skipping existing goal: ${goal.title} -> ${owner.email}`);
      continue;
    }

    await Goal.create({
      title: goal.title,
      timeframe: goal.timeframe,
      type: goal.type || 'personal',
      startDate: new Date(goal.startDate),
      endDate: new Date(goal.endDate),
      owner: owner._id,
      createdBy: createdBy._id,
      scope: goal.scope || 'individual',
      subGoals: Array.isArray(goal.subGoals) ? goal.subGoals : [],
    });

    created += 1;
    console.log(`Created goal: ${goal.title} -> ${owner.email}`);
  }

  console.log(`Done. Created ${created} goal(s). Skipped existing: ${skippedExisting}. Unresolved: ${skippedUnresolved}. Missing configured owners: ${skippedMissingConfiguredOwner}.`);
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('seed-goals failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
