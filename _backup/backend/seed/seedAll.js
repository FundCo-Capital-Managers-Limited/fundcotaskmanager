// backend/seed/learningSeed.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';
import { LearningCourse } from '../models/learningMaterialModel.js';
import { connectDB } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: `${__dirname}/../.env` });

console.log('MONGO_URI:', process.env.MONGO_URI ? 'Loaded' : 'Undefined');

// ─── Helper: build full-course exam from module quiz pools ────────────────────
// Shuffles all module quizzes together and picks up to targetCount questions.
function buildExam(modules, targetCount = 30) {
  const pool = [];
  modules.forEach(m => {
    (m.quiz || []).forEach(q => pool.push({ ...q, moduleRef: m.title }));
  });
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(targetCount, pool.length));
}

// =============================================================================
// COURSE DEFINITIONS
// =============================================================================


// =============================================================================
// COURSES 1-3 (Beginner — General)
// =============================================================================
const course1 = {
  title: 'FundCo Capital Managers – Company Overview',
  description: 'A comprehensive introduction to FundCo Capital Managers, its mission, funds, subsidiaries, leadership, and strategic direction. Required for ALL staff.',
  level: 'beginner',
  assetco: 'General',
  required: true,
  tags: ['company', 'overview', 'onboarding', 'fundco', 'CEF', 'HSF'],
  passingScore: 75,
  modules: [
    {
      title: 'Who is FundCo Capital Managers?',
      order: 1,
      estimatedMinutes: 20,
      objectives: [
        'Understand FundCo\'s SEC registration and mandate',
        'Explain what alternative asset management means',
        'Identify FundCo\'s two main funds and four subsidiaries',
      ],
      content: `FUNDCO CAPITAL MANAGERS — WHO WE ARE

FundCo Capital Managers is authorized and registered by the Nigeria Securities and Exchange Commission (SEC) to conduct the business of a fund/portfolio manager.

OUR MISSION
To innovatively unlock domestic finance for small and medium-sized infrastructure in unserved or under-served key sectors that:
• Provide essential services to society
• Are recession-resilient
• Demonstrate long-term viability with predictable cashflows
• Reduce the impact of climate change

WHAT IS ALTERNATIVE ASSET MANAGEMENT?
Alternative assets are investments beyond traditional stocks and bonds — they include infrastructure, real estate, private equity, and clean energy projects. FundCo specializes in unlocking DOMESTIC finance (capital from within Nigeria) for these infrastructure investments.

OUR STRATEGIC POSITION
As demands for asset allocation to alternatives continue to increase, FundCo sees a market where alternatives are becoming more valuable relative to conventional assets, and supply remains insufficient. We address this gap.

OUR RANGE OF ACTIVITIES
FundCo currently has its Portfolio Management and advisory businesses with:
• N5.5BN assets under management (AUM)
• Up to N90 billion of advisory mandates and pipeline
• 7 mandates under management
• N6BN mandate executed

ACTIVITIES OVERVIEW
1. Deal Origination: 500,000 potential new connections; 8 off-grid companies lined up for funding
2. Structuring: Blended Finance, Project Finance, Asset Finance (N90BN pipeline)
3. Advisory: N200BN Private Capital Bond (PCB) Program
4. Portfolio Management: AUM N3.3B (CEF) + AUM N2.3B (HSF)

CORPORATE STRUCTURE
FundCo manages TWO funds:
1. Housing Solution Fund (HSF) — AUM N2.3BN
2. Clean Energy Local Currency Fund (CEF) — AUM N3.3BN

Under CEF, FundCo has FOUR operating subsidiaries (AssetCos):
• Electrify MicroGrid Limited (EML)
• GroSolar AssetCo Limited (GroSolar)
• Agronomie
• Swap Station Mobility Limited (SSM)

OUR INVESTMENT APPROACH
FundCo's investment approach holds great potential to deliver the three pillars of the SDGs:
• Economic sustainability
• Environmental sustainability
• Social sustainability

We do this sustainably in partnership with development partners, thought-leaders in blended finance, infrastructure, technology, and development finance.

STRATEGIC PARTNERSHIPS
• LCY Guarantor: InfraCredit Nigeria
• Equity Partner: All-On
• Pension Fund Investors: NLPC PFA, FCMB Pensions, Access-ARM Pensions, Leadway Pensure, Oak Pensions, Radix Pension
• Fund Adviser: Renaissance Securities Nigeria Limited (RenCap)

CONTACT INFORMATION
6th Floor Landmark Towers, 5B Water Corporation Way, Oniru, Victoria Island, Lagos
www.fundco.ng | +234 01-4545361 | info@fundco.ng`,
      terms: [
        { term: 'Alternative Asset Management', definition: 'Investment management focusing on non-traditional assets like infrastructure, private equity, and real estate rather than stocks and bonds.' },
        { term: 'AUM (Assets Under Management)', definition: 'The total market value of assets that an investment manager handles on behalf of clients.' },
        { term: 'ESG', definition: 'Environmental, Social and Governance — a framework for evaluating a company\'s ethical impact and sustainability practices.' },
        { term: 'SEC', definition: 'Securities and Exchange Commission — the Nigerian government body that regulates capital markets and fund managers.' },
        { term: 'Blended Finance', definition: 'Strategic use of development finance and philanthropic funds to mobilize private capital for sustainable development.' },
        { term: 'DFI', definition: 'Development Finance Institution — government-backed financiers like InfraCredit and World Bank that support development projects.' },
        { term: 'NDC', definition: 'Nationally Determined Contribution — Nigeria\'s commitment under the Paris Agreement to reduce greenhouse gas emissions.' },
        { term: 'AssetCo', definition: 'Asset Company — a subsidiary that directly owns and manages physical assets like solar equipment or EV infrastructure.' },
      ],
      quiz: [
        { question: 'Which body authorized FundCo Capital Managers as a fund/portfolio manager?', options: ['Central Bank of Nigeria', 'Nigeria Securities and Exchange Commission', 'Federal Ministry of Finance', 'National Pension Commission'], answer: 'Nigeria Securities and Exchange Commission', explanation: 'FundCo is SEC-registered as a fund/portfolio manager in Nigeria.', difficulty: 'easy' },
        { question: 'What does FundCo primarily unlock for infrastructure projects?', options: ['Foreign currency loans', 'Domestic finance', 'Government grants only', 'International equity'], answer: 'Domestic finance', explanation: 'FundCo innovatively unlocks DOMESTIC finance — capital from within Nigeria.', difficulty: 'easy' },
        { question: 'How many funds does FundCo currently manage?', options: ['One', 'Two', 'Three', 'Four'], answer: 'Two', explanation: 'FundCo manages the Housing Solution Fund (HSF) and the Clean Energy Local Currency Fund (CEF).', difficulty: 'easy' },
        { question: 'What is FundCo\'s total current AUM across both funds?', options: ['N2.3BN', 'N3.3BN', 'N5.5BN', 'N90BN'], answer: 'N5.5BN', explanation: 'HSF (N2.3BN) + CEF (N3.3BN) = N5.5BN total AUM.', difficulty: 'medium' },
        { question: 'Which of these is NOT a FundCo subsidiary/AssetCo?', options: ['Electrify MicroGrid Limited', 'GroSolar AssetCo Limited', 'InfraCredit Nigeria', 'Agronomie'], answer: 'InfraCredit Nigeria', explanation: 'InfraCredit is a strategic partner (LCY Guarantor), not a FundCo subsidiary.', difficulty: 'medium' },
        { question: 'FundCo\'s investment approach aims to deliver which three pillars of the SDGs?', options: ['Energy, Housing, Agriculture', 'Economic, Environmental, Social sustainability', 'Equity, Debt, Mezzanine', 'Origination, Structuring, Management'], answer: 'Economic, Environmental, Social sustainability', explanation: 'FundCo\'s approach delivers economic, environmental, and social sustainability.', difficulty: 'medium' },
        { question: 'What is InfraCredit\'s role in FundCo\'s partnership structure?', options: ['Equity investor', 'LCY Guarantor', 'Fund manager', 'Regulator'], answer: 'LCY Guarantor', explanation: 'InfraCredit serves as the Local Currency (LCY) Guarantor in FundCo\'s partnership structure.', difficulty: 'hard' },
        { question: 'How many off-grid companies are lined up for funding through FundCo\'s deal origination?', options: ['4', '6', '8', '10'], answer: '8', explanation: 'FundCo has 8 off-grid companies lined up for funding in its deal origination pipeline.', difficulty: 'hard' },
      ],
    },
    {
      title: 'Housing Solution Fund (HSF)',
      order: 2,
      estimatedMinutes: 15,
      objectives: [
        'Describe the HSF mandate and investment objective',
        'Explain how HSF stimulates housing demand using local currency',
        'Identify HSF\'s SDG alignment areas',
      ],
      content: `HOUSING SOLUTION FUND (HSF)

The Housing Solution Fund is a local currency real estate investment, trusted and conceptualised alongside its development partners, to provide innovative market-based solutions to stimulate housing demand and scale housing supply.

HOW HSF WORKS
HSF provides affordable and accessible long-dated home loans to eligible homebuyers in partnership with:
• Participating lending institutions (mortgage banks)
• Housing developers

KEY STATISTICS
• AUM: N2.3BN
• Structure: Blended fund

INVESTMENT OBJECTIVE
To deliver inflation-protected income and capital growth over the medium term for investors by funding a diversified portfolio of affordable home loan assets across Nigeria, which will provide good quality accommodation to homeowners.

WHY LOCAL CURRENCY?
By providing loans in Nigerian Naira (NGN) rather than foreign currencies, HSF:
• Eliminates foreign exchange (FX) risk for both borrowers and developers
• Makes repayments predictable and stable
• Supports the development of Nigeria's domestic capital markets

THE HOUSING OPPORTUNITY
The housing sector holds great potential to deliver the three pillars of the SDGs:
• Economic sustainability
• Environmental sustainability
• Social sustainability

FOUR THEMATIC FOCUS AREAS (SDG Aligned)
HSF focuses on four thematic areas strongly aligned with the UN Sustainable Development Goals:
1. Affordable Housing Access — SDG 11 (Sustainable Cities and Communities)
2. Financial Inclusion — SDG 1 (No Poverty) and SDG 8 (Decent Work)
3. Climate-Resilient Construction — SDG 13 (Climate Action)
4. Women and Youth Housing Support — SDG 5 (Gender Equality) and SDG 10 (Reduced Inequalities)

HOW HSF STIMULATES THE ECONOMY
• Creates demand for housing construction → drives employment
• Enables mortgage access for underserved Nigerians
• Partners with mortgage lending banks to reach eligible homebuyers
• Long-dated loans (longer repayment periods) → affordable monthly payments
• Builds a diversified portfolio across multiple states and income segments`,
      terms: [
        { term: 'Long-dated Loans', definition: 'Loans with extended repayment periods (e.g., 10-25 years), making monthly payments more affordable for homebuyers.' },
        { term: 'Inflation-Protected Income', definition: 'Returns that maintain their real value even as inflation rises — achieved through structured interest rates.' },
        { term: 'Diversified Portfolio', definition: 'Spreading investments across multiple loan assets, geographies, or borrowers to reduce risk.' },
        { term: 'Blended Fund', definition: 'A fund that combines different types of capital (e.g., grants, concessional loans, commercial finance) to achieve specific development goals.' },
      ],
      quiz: [
        { question: 'What type of investment is HSF?', options: ['Foreign currency real estate fund', 'Local currency real estate investment', 'Stock market fund', 'Cryptocurrency fund'], answer: 'Local currency real estate investment', explanation: 'HSF is explicitly a local currency real estate investment.', difficulty: 'easy' },
        { question: 'What is HSF\'s AUM?', options: ['N2.3BN', 'N3.3BN', 'N5.5BN', 'N90BN'], answer: 'N2.3BN', explanation: 'The Housing Solution Fund has N2.3BN in Assets Under Management.', difficulty: 'easy' },
        { question: 'Who does HSF partner with to deliver home loans?', options: ['Only government agencies', 'Participating lending institutions and housing developers', 'Only commercial banks', 'International donors'], answer: 'Participating lending institutions and housing developers', explanation: 'HSF works in partnership with participating lending institutions and housing developers.', difficulty: 'medium' },
        { question: 'Why does HSF use local currency (Naira) financing?', options: ['It is cheaper than foreign currency', 'It eliminates foreign exchange risk for borrowers and developers', 'It is required by the government', 'It earns more interest'], answer: 'It eliminates foreign exchange risk for borrowers and developers', explanation: 'Naira-denominated loans remove currency risk that could destabilize both borrowers\' and developers\' finances.', difficulty: 'medium' },
        { question: 'HSF\'s investment objective includes delivering what type of income?', options: ['Fixed income only', 'Inflation-protected income and capital growth', 'Only equity dividends', 'Dollar-denominated returns'], answer: 'Inflation-protected income and capital growth', explanation: 'HSF aims to deliver inflation-protected income AND capital growth over the medium term.', difficulty: 'medium' },
      ],
    },
    {
      title: 'Clean Energy Fund (CEF) & Its Subsidiaries',
      order: 3,
      estimatedMinutes: 25,
      objectives: [
        'Explain CEF\'s mandate and its historic green certification',
        'Describe CEF Series 1 and Series 2',
        'Identify and describe each of CEF\'s four subsidiaries',
      ],
      content: `CLEAN ENERGY LOCAL CURRENCY FUND (CEF)

CEF is authorized/registered by the Securities & Exchange Commission to provide local currency funding from domestic institutional investors to small and medium-sized climate-aligned, sustainable, and inclusive clean energy infrastructure.

WEBSITE: www.cleanenergyfund.ng

HISTORIC GREEN CERTIFICATION
CEF has been awarded a dedicated climate-aligned green certification by the Climate Bonds Initiative (CBI) — making it the FIRST AND ONLY green fund in Nigeria. The certification was granted by the Climate Bonds Standard Board (CBSB) on behalf of CBI.

AUM: N3.3BN

CEF SERIES 1 & 2
• Series 1 closed in May 2024 with ₦3.32 billion in subscriptions
• Series 2 of up to ₦30 billion proposes to invest in 16 clean energy projects

SERIES 2 PORTFOLIO (Key investments)
• ₦800M: Mezzanine Facility — Solar and Battery Energy Solutions
• ₦360M: Bridge Finance — Purchase of EVs and EV Infrastructure development
• ₦750M: Mezzanine Facility — Procurement of solar equipment/assets
• ₦200M: Bridge Finance — Development of Solar Mini Grids
• ₦200M: Mezzanine Facility — Solar and Battery Energy Solutions

CEF FUND INVESTORS
CEF is backed by major Nigerian pension funds and institutional investors:
• NLPC PFA (15%)
• FCMB Pensions (9%)
• Access-ARM Pensions (15%)
• Leadway Pensure (15%)
• Oak Pensions — largest at ₦530M (16%)
• Radix Pension (6%)
• All-On equity partner (5%)
• FundCo co-investment (15%)
• ARM (4%)

CEF CORE OBJECTIVES
1. Provide domestic capital to support climate mitigation and energy transition
2. Support small-scale clean energy generation
3. Support alternative clean energy infrastructure
4. Reduce FX exposure by providing local currency financing
5. Create a diversified portfolio across multiple value chains
6. Support low-carbon energy infrastructure

CEF INVESTMENT COMMITTEE
• David Humphrey (Chairman) — CFO Hive Energy; ex-Standard Bank Global Head Power & Infrastructure; ex-Babcock & Brown
• Welela Dawit — ex-CFO Microsoft South Africa; ex-CFO GE Africa
• Obinna Ihedioha — ex-Deputy MD UKNIAF; ex-VP & Senior Portfolio Manager NSIA; ex-Special Adviser to Minister of Power Nigeria
• Abiodun Oni (CIO) — FundCo Capital Managers; ex-InfraCredit; ex-Tesla West Africa; ex-Stanbic IBTC

CEF DEVELOPMENT IMPACT (Projected)
• 1.6 million households supported
• 175,000 SMEs supported
• 40,000 jobs created
• 1.37 million tonnes CO₂ equivalent avoided

CEF SUBSIDIARIES (AssetCos)

1. ELECTRIFY MICROGRID LIMITED (EML)
Specializes in designing and developing customized microgrid solutions for rural communities and off-grid businesses. Uses the Design, Finance, Build, and Operate (DFBO) model. Currently manages a 50 kWp mini-grid on Umon Island, Cross River State, serving 200+ customers.

2. GROSOLAR ASSETCO LIMITED (GroSolar)
A solar asset holding platform that invests in and owns solar equipment, providing Solar as a Service (SaaS) to residential and commercial customers. Allows customers to switch from diesel generators to solar without high upfront costs.

3. AGRONOMIE
A specialized agro-tech company aggregating and accelerating access to finance for agro-productive use of clean energy from solar mini-grids, using a Hub & Spoke business model.

4. SWAP STATION MOBILITY LIMITED (SSM)
An electric vehicle and battery swapping infrastructure company enabling access to low-cost, clean mobility alternatives to Internal Combustion Engine (ICE) vehicles.`,
      terms: [
        { term: 'CBI', definition: 'Climate Bonds Initiative — an international organization that sets standards for green bonds and certifies climate-aligned financial products.' },
        { term: 'CBSB', definition: 'Climate Bonds Standard Board — the governing body that approves green certifications under the Climate Bonds Initiative.' },
        { term: 'Mezzanine Finance', definition: 'A hybrid of debt and equity financing that sits between senior debt and equity in the capital structure — higher risk than debt, lower risk than equity.' },
        { term: 'Bridge Finance', definition: 'Short-term funding used to cover expenses while longer-term financing is being arranged.' },
        { term: 'PFA', definition: 'Pension Fund Administrator — organizations that manage workers\' retirement savings and can invest in infrastructure funds like CEF.' },
        { term: 'DFBO', definition: 'Design, Finance, Build, and Operate — EML\'s integrated project delivery model.' },
        { term: 'SaaS (Solar)', definition: 'Solar as a Service — GroSolar\'s subscription model where customers use solar without upfront equipment costs.' },
      ],
      quiz: [
        { question: 'CEF is the first and only what in Nigeria?', options: ['Local currency fund', 'Green-certified fund', 'Pension-backed fund', 'Mini-grid fund'], answer: 'Green-certified fund', explanation: 'CEF received a dedicated climate-aligned green certification from CBI — the first and only green fund in Nigeria.', difficulty: 'easy' },
        { question: 'Who certified CEF\'s green credentials?', options: ['Nigeria SEC', 'World Bank', 'Climate Bonds Standard Board on behalf of CBI', 'Central Bank of Nigeria'], answer: 'Climate Bonds Standard Board on behalf of CBI', explanation: 'CBSB granted CEF its green certification on behalf of the Climate Bonds Initiative.', difficulty: 'medium' },
        { question: 'How much did CEF Series 1 raise in subscriptions?', options: ['₦3.32 billion', '₦30 billion', '₦5.5 billion', '₦2.3 billion'], answer: '₦3.32 billion', explanation: 'CEF Series 1 closed in May 2024 with ₦3.32 billion in subscriptions.', difficulty: 'medium' },
        { question: 'How many clean energy projects does CEF Series 2 propose to invest in?', options: ['8', '12', '16', '20'], answer: '16', explanation: 'CEF Series 2 of up to ₦30 billion proposes to invest in 16 clean energy projects.', difficulty: 'medium' },
        { question: 'Which is NOT a CEF subsidiary?', options: ['Electrify MicroGrid Limited', 'GroSolar AssetCo Limited', 'Housing Solution Fund', 'Swap Station Mobility Limited'], answer: 'Housing Solution Fund', explanation: 'HSF is a separate fund under FundCo. CEF subsidiaries are EML, GroSolar, Agronomie, and SSM.', difficulty: 'easy' },
        { question: 'What is CEF\'s projected job creation impact?', options: ['10,000 jobs', '25,000 jobs', '40,000 jobs', '100,000 jobs'], answer: '40,000 jobs', explanation: 'CEF\'s development impact includes creating 40,000 jobs.', difficulty: 'medium' },
        { question: 'Who chairs the CEF Investment Committee?', options: ['Abiodun Oni', 'David Humphrey', 'Welela Dawit', 'Obinna Ihedioha'], answer: 'David Humphrey', explanation: 'David Humphrey is the CEF Investment Committee Chairman, also CFO of Hive Energy.', difficulty: 'hard' },
        { question: 'Which pension fund is the largest single investor in CEF?', options: ['NLPC PFA', 'FCMB Pensions', 'Oak Pensions', 'Leadway Pensure'], answer: 'Oak Pensions', explanation: 'Oak Pensions is the largest individual investor in CEF at ₦530M (16%).', difficulty: 'hard' },
      ],
    },
    {
      title: 'FundCo Leadership & Key Team Profiles',
      order: 4,
      estimatedMinutes: 20,
      objectives: [
        'Identify key leadership figures at FundCo and their roles',
        'Understand the professional backgrounds of senior management',
        'Know the CEF organizational structure',
      ],
      content: `FUNDCO LEADERSHIP — KEY PROFILES

ABIODUN ONI — Chief Investment Officer (CIO), FundCo Capital Managers
• 18+ years of energy and infrastructure finance experience
• Clean Energy Team Lead at InfraCredit (consultancy)
• West Africa Business Development Lead for Tesla Incorporation
• Head of Power & Infrastructure at Stanbic IBTC (Standard Bank)
• Head Oil and Gas Downstream Finance, Guaranty Trust Bank
• Education: MSc, University of Cape Town (2015); BSc Statistics, University of Ilorin (2000)

ADESOLA ALLI — Deputy CIO, FundCo Capital Managers

OLUMIDE FATOKI — Senior Adviser, FundCo; Chairman, Electrify MicroGrid Limited (EML)
• 15+ years in energy access, decarbonization, and climate change
• Led EU-funded program that electrified 138,000 lives
• Country Manager, GIZ NESP — managed $25M in solar micro-grid installations
• Fellow of Acumen West Africa
• Education: Executive MBA; MSc Engineering Management

MAURICE OKOLI — CEO, AFREAL
• Former Executive Director, Abbey Mortgage Bank Plc
• Deutsche Bank — Head, Fixed Income Total Return Swaps (New York); Head CMBS settlements (London)
• Citigroup International and ABN Amro NV, London — Portfolio Manager for Syndicated Loans
• Education: MSc International Business, University of London (2004); MBA, ESADE Business School, Barcelona (2010); BSc, London Guildhall University (2000)

YEWANDE SENBORE — Partner, Olaniwun Ajayi LP
• 20 years' experience in groundbreaking transactions across Nigeria (Telecoms, Banking, Finance)
• Executive Member, Capital Market Solicitors Association of Nigeria (2017-2019)
• Education: LLB, University of Lagos (2002); BL, Nigerian Law School (2003); Masters in Finance & Financial Law, SOAS, University of London (2014)

FIONA ROBERTSON-ETET — Independent Development Impact Consultant
• 10 years in development sector (Nigeria, UK, Zambia, Malawi)
• InfraCredit Nigeria: Independent Development Impact Consultant
• The One Campaign: Development Finance Policy Consultant
• Education: BA Economic and International Development (First Class), University of Sussex; MSc Development Economics (Distinction)

OLUFUNMILOLA ABRAHAM — Head Legal / Company Secretariat
• 12+ years advising private and international clientele
• Expert in Employment Law and Industrial dispute resolution
• Corporate governance, contract drafting, corporate finance, company secretarial
• Education: LLB, Olabisi Onabanjo University (2008); BL, Nigerian Law School (2009)

JOJOLOLAMI (JOJO) NGENE — CEO, EML; Director, Agronomie; Senior Technical Analyst, CEF
• 11+ years engineering consulting (London firms: Cundall Limited, Norman Disney & Young)
• Notable projects: Google DeepMind HQ, Facebook Data Centre Lulea (first in Europe)
• Led 18+ agro-energy PuE assessments at Agronomie
• Education: First Class MEng & BEng Electrical Engineering; MSc Electrical Engineering, University of Southampton (2010)
• Member: Institution of Engineering and Technology (IET)

CHIZOBA ONOH — Finance Specialist
• 10 years in Finance and Impact Investing
• Previously at IFC (International Finance Corporation) as private sector specialist
• Previously at ECOWAS as finance and private sector analyst
• Education: BSc Economics, University of Leicester (2012); MSc Development, London School of Economics (2013)

VIVIAN UMEAKU — Finance Specialist
• 8+ years in finance, auditing, and accounting
• Proven track record of driving financial excellence and strategic growth

OLUSEYI OLAYINKA — Credit Risk Manager

CEF ORGANIZATIONAL STRUCTURE
• CIO: Abiodun Oni
• Deputy CIO: Adesola Alli
• Senior Technical Analyst: Jojo Ngene
• Technical Adviser: Vacant (secondment)
• Senior Adviser: Olumide Fatoki
• Senior Analyst: Seyi Omidiora
• Portfolio Manager: Moses Ekure
• ESG Adviser: Omolola Okunubi
• Credit Risk Manager: Oluseyi Olayinka
• Legal: Funmi Abraham, Angel Shodeke
• Project Engineers: Oluwabusayo Akinrelere, Fegha Amodu, Ismail Yakub, Abdulbasit Abdulkareem
• Analyst Pool: Ayobami Akinwonmi, Muhammed Abiodun, Onyioza Raji, Wale Abdulazeez, Ridwan Abdulraheem`,
      terms: [
        { term: 'CIO', definition: 'Chief Investment Officer — the senior executive responsible for overseeing the investment activities and strategy of a fund.' },
        { term: 'NESP', definition: 'Nigeria Energy Support Programme — a GIZ program that supported Nigeria\'s energy sector development.' },
        { term: 'CMBS', definition: 'Commercial Mortgage-Backed Securities — financial instruments backed by commercial real estate loans.' },
        { term: 'IET', definition: 'Institution of Engineering and Technology — a professional engineering body for electrical engineers.' },
      ],
      quiz: [
        { question: 'Who is the CIO of FundCo Capital Managers?', options: ['Maurice Okoli', 'Olumide Fatoki', 'Abiodun Oni', 'Jojo Ngene'], answer: 'Abiodun Oni', explanation: 'Abiodun Oni is the Chief Investment Officer of FundCo.', difficulty: 'easy' },
        { question: 'What role does Olumide Fatoki hold at EML?', options: ['CEO', 'Chairman of the Board', 'CIO', 'Project Manager'], answer: 'Chairman of the Board', explanation: 'Olumide Fatoki is the Chairman of the Board at EML.', difficulty: 'easy' },
        { question: 'Abiodun Oni previously held which role at Tesla?', options: ['Product Engineering Lead', 'West Africa Business Development Lead', 'Manufacturing Director', 'Finance Director'], answer: 'West Africa Business Development Lead', explanation: 'Abiodun Oni was West Africa Business Development Lead for Tesla Incorporation.', difficulty: 'medium' },
        { question: 'Which university did Jojo Ngene complete her MSc at?', options: ['University of Lagos', 'University of Southampton', 'University of Cape Town', 'University of Ibadan'], answer: 'University of Southampton', explanation: 'Jojo Ngene has an MSc in Electrical Engineering from the University of Southampton (2010).', difficulty: 'medium' },
        { question: 'What notable project is Jojo Ngene associated with from her London career?', options: ['Abuja Airport Expansion', 'Google DeepMind HQ', 'Lagos Light Rail', 'Dangote Refinery'], answer: 'Google DeepMind HQ', explanation: 'Jojo Ngene made notable contributions to the Google DeepMind HQ project while at Cundall and Norman Disney & Young.', difficulty: 'medium' },
        { question: 'Who is the Head Legal and Company Secretariat at FundCo?', options: ['Yewande Senbore', 'Chizoba Onoh', 'Olufunmilola Abraham', 'Fiona Robertson-Etet'], answer: 'Olufunmilola Abraham', explanation: 'Olufunmilola Abraham is the Head Legal/Company Secretariat at FundCo.', difficulty: 'medium' },
        { question: 'Who is the Credit Risk Manager at FundCo?', options: ['Vivian Umeaku', 'Oluseyi Olayinka', 'Moses Ekure', 'Seyi Omidiora'], answer: 'Oluseyi Olayinka', explanation: 'Oluseyi Olayinka is the Credit Risk Manager at FundCo/CEF.', difficulty: 'hard' },
        { question: 'What is the Portfolio Manager role at CEF held by?', options: ['Jojo Ngene', 'Seyi Omidiora', 'Moses Ekure', 'Omolola Okunubi'], answer: 'Moses Ekure', explanation: 'Moses Ekure is the Portfolio Manager at CEF.', difficulty: 'hard' },
      ],
    },
  ],
};
course1.exam = buildExam(course1.modules, 30);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 2: Key Terms & Acronyms
// ─────────────────────────────────────────────────────────────────────────────
const course2 = {
  title: 'Key Terms, Acronyms & Technical Definitions',
  description: 'Master all essential financial, technical, and operational terms used across FundCo and its subsidiaries. Required for all staff.',
  level: 'beginner',
  assetco: 'General',
  required: true,
  tags: ['terms', 'definitions', 'finance', 'technical', 'acronyms', 'onboarding'],
  passingScore: 80,
  modules: [
    {
      title: 'Financial & Investment Terms',
      order: 1,
      estimatedMinutes: 30,
      objectives: ['Define all key financial terms used at FundCo', 'Apply financial concepts to clean energy context'],
      content: `FINANCIAL TERMS USED AT FUNDCO

1. CAPEX (Capital Expenditure)
Funds used to ACQUIRE, BUILD, or UPGRADE physical assets.
In clean energy: solar panels, inverters, batteries, mini-grid poles, distribution cables, EV infrastructure.
Example: "The CAPEX for the Umon Island mini-grid included solar panels, inverters, and the energy cabin."

2. OPEX (Operational Expenditure)
Day-to-day RUNNING COSTS of an energy system:
- Fuel and maintenance
- Staff salaries and monitoring costs
- Site security
Example: "OPEX for a mini-grid includes the engineer's monthly salary and spare parts."

3. PPA (Power Purchase Agreement)
A long-term CONTRACT where a buyer agrees to purchase power from a clean energy provider at an agreed rate.
Key features: Fixed price, long duration (often 10-20 years), reduces revenue risk for operators.

4. Tariff Rate
The price per kWh charged to customers for electricity supply.
Mini-grids must set tariffs that: cover OPEX, repay debt, remain affordable for customers, and allow profit margin.

5. LCOE (Levelized Cost of Energy)
The AVERAGE COST per unit of electricity generated over the LIFETIME of a clean-energy system.
Formula: LCOE = Total Lifecycle Cost ÷ Total Lifetime Energy Production
Lower LCOE = More competitive/efficient system.

6. Debt Financing
Borrowing funds from banks or investors to fund energy projects, REPAYABLE WITH INTEREST.
Example: CEF provides debt financing (loan notes) to mini-grid developers.

7. Equity Financing
Raising capital by SELLING OWNERSHIP STAKE to investors.
Example: All-On provides equity investment to clean energy companies.

8. ROI (Return on Investment)
Measures how PROFITABLE an energy project is relative to its cost.
Formula: ROI = (Net Profit ÷ Cost of Investment) × 100%

9. Payback Period
Time it takes for an energy project to RECOVER ITS INITIAL INVESTMENT from net cash flows.
Shorter payback = less risky project.

10. Green Bonds
Fixed-income instruments used to finance ENVIRONMENTALLY SUSTAINABLE projects.
CEF is green-bond certified — the first and only in Nigeria.

11. Carbon Credits
Tradable permits earned from REDUCING CARBON EMISSIONS.
Each credit = 1 tonne CO₂ avoided. Can be sold on carbon markets for additional revenue.

12. Working Capital
Funds available for DAY-TO-DAY OPERATIONS like fuel, maintenance, and staff payments.
Formula: Working Capital = Current Assets - Current Liabilities

13. Depreciation
Gradual reduction in the VALUE of clean-energy assets over time:
- Inverters: typically 5-10 years
- Batteries: 5-7 years
- Solar panels: 25+ years

14. Amortization
Gradual repayment of INTANGIBLE ASSETS or LOAN PRINCIPAL over time.
Example: A 10-year loan is amortized through monthly payments of principal plus interest.

15. Energy Yield
Total amount of ELECTRICITY GENERATED by a system — used to calculate revenue.
Revenue = kWh generated × tariff rate

16. Revenue Assurance
Processes to ensure accurate billing, correct metering, and FULL REVENUE COLLECTION.
Includes smart metering, customer database management, and collection enforcement.

17. Cost-Benefit Analysis (CBA)
Comparison of all project costs vs. expected benefits BEFORE INVESTMENT.
CEF requires CBA for every project in its portfolio.

18. NPL (Non-Performing Loans)
Loans where customers are NOT REPAYING on time. CEF monitors NPLs to assess portfolio risk.

19. Asset Leasing
Renting or leasing solar equipment or mini-grid assets to customers or partners.
GroSolar's SaaS model is a form of asset leasing.

20. BoQ (Bill of Quantities)
Detailed document listing MATERIALS, COMPONENTS, LABOUR, and COSTS required for a project.
Used in engineering, construction, and solar installations.

21. BEES (Building for Environmental and Economic Sustainability)
Rating and assessment tool developed to evaluate buildings or projects based on:
- Energy Efficiency
- Economic Feasibility
- Environmental Impact

22. kWh (kilowatt-hour)
Unit of ENERGY measuring how much electricity is used or generated over time.
1 kWh = using 1,000 watts of power for 1 hour.

23. kWp (kilowatt-peak)
The MAXIMUM CAPACITY OUTPUT a solar PV system can produce under Standard Test Conditions:
- Full sunlight (1,000 W/m²)
- Panel temperature 25°C
Example: "EML manages a 50 kWp mini-grid on Umon Island."`,
      terms: [
        { term: 'CAPEX', definition: 'Capital Expenditure — funds used to acquire, build, or upgrade physical assets like solar panels, mini-grid equipment, or batteries.' },
        { term: 'OPEX', definition: 'Operational Expenditure — day-to-day running costs of an energy system including fuel, maintenance, staff, and monitoring.' },
        { term: 'PPA', definition: 'Power Purchase Agreement — a long-term contract where a buyer agrees to purchase power from a clean energy provider at an agreed rate.' },
        { term: 'Tariff Rate', definition: 'The price per kWh charged to customers for electricity supply.' },
        { term: 'LCOE', definition: 'Levelized Cost of Energy — the average cost per unit of electricity generated over the lifetime of a clean-energy system.' },
        { term: 'ROI', definition: 'Return on Investment — measures how profitable a project is relative to its cost. Formula: (Net Profit ÷ Cost) × 100%.' },
        { term: 'Green Bonds', definition: 'Fixed-income instruments used to finance environmentally sustainable projects.' },
        { term: 'Carbon Credits', definition: 'Tradable permits earned from reducing carbon emissions — each credit = 1 tonne CO₂ avoided.' },
        { term: 'Energy Yield', definition: 'Total amount of electricity generated by a system — used to calculate revenue.' },
        { term: 'NPL', definition: 'Non-Performing Loans — loans where customers are not repaying on schedule.' },
        { term: 'BoQ', definition: 'Bill of Quantities — detailed document listing materials, components, labour, and costs for a project.' },
        { term: 'BEES', definition: 'Building for Environmental and Economic Sustainability — a rating tool for buildings based on energy efficiency, economic feasibility, and environmental impact.' },
        { term: 'kWh', definition: 'Kilowatt-hour — unit of energy measuring electricity used or generated over time.' },
        { term: 'kWp', definition: 'Kilowatt-peak — maximum capacity a solar PV system produces under Standard Test Conditions (1000 W/m², 25°C).' },
      ],
      quiz: [
        { question: 'What does CAPEX stand for?', options: ['Capital Expenditure', 'Capacity Extension', 'Capital Exchange', 'Cost Approximation'], answer: 'Capital Expenditure', explanation: 'CAPEX = Capital Expenditure — funds used to acquire, build, or upgrade physical assets.', difficulty: 'easy' },
        { question: 'Which best describes OPEX?', options: ['One-time purchase of equipment', 'Day-to-day running costs', 'Long-term debt repayment', 'Revenue from operations'], answer: 'Day-to-day running costs', explanation: 'OPEX = Operational Expenditure — the ongoing costs of running a system.', difficulty: 'easy' },
        { question: 'What is a PPA?', options: ['Project Planning Agreement', 'Power Purchase Agreement', 'Production Performance Assessment', 'Portfolio Performance Analysis'], answer: 'Power Purchase Agreement', explanation: 'PPA = Power Purchase Agreement — a long-term contract to buy electricity at an agreed rate.', difficulty: 'easy' },
        { question: 'LCOE helps compare the cost of energy over what period?', options: ['One year', 'Five years', 'The system\'s lifetime', 'Ten years only'], answer: 'The system\'s lifetime', explanation: 'LCOE = average cost per unit of electricity generated over the LIFETIME of the system.', difficulty: 'medium' },
        { question: 'Each carbon credit represents how much CO₂ avoided?', options: ['1 kg per credit', '1 tonne per credit', '1 ton per 10 credits', '100 kg per credit'], answer: '1 tonne per credit', explanation: 'Each carbon credit = 1 tonne of CO₂ emissions avoided or reduced.', difficulty: 'medium' },
        { question: 'ROI formula is:', options: ['Revenue divided by Cost', '(Net Profit ÷ Investment Cost) × 100%', 'Total Assets minus Liabilities', 'Revenue minus Expenses'], answer: '(Net Profit ÷ Investment Cost) × 100%', explanation: 'ROI = (Net Profit ÷ Cost of Investment) × 100%.', difficulty: 'medium' },
        { question: 'NPLs represent loans where customers are:', options: ['Overpaying', 'Not repaying on schedule', 'Paying ahead of schedule', 'Requesting refinancing'], answer: 'Not repaying on schedule', explanation: 'NPL = Non-Performing Loans — borrowers who have stopped or are behind on repayments.', difficulty: 'easy' },
        { question: 'What does a BoQ contain?', options: ['Business objectives and quarterly results', 'Materials, components, labour, and costs for a project', 'Bank account and balance summary', 'Budget overview and quality requirements'], answer: 'Materials, components, labour, and costs for a project', explanation: 'A Bill of Quantities lists all materials, components, labour, and costs for a project.', difficulty: 'easy' },
        { question: 'kWp measures:', options: ['Energy consumed over time', 'Maximum capacity output of a solar PV system under standard test conditions', 'The cost per unit of energy', 'Battery depth of discharge'], answer: 'Maximum capacity output of a solar PV system under standard test conditions', explanation: 'kWp = kilowatt-peak — the maximum power a solar panel produces under ideal conditions (1000 W/m², 25°C).', difficulty: 'medium' },
        { question: 'BEES evaluates buildings on which three criteria?', options: ['Energy, Economy, Engineering', 'Energy Efficiency, Economic Feasibility, Environmental Impact', 'Build quality, Environmental standards, Economic cost', 'Electrical, Mechanical, Structural'], answer: 'Energy Efficiency, Economic Feasibility, Environmental Impact', explanation: 'BEES rates buildings based on Energy Efficiency, Economic Feasibility, and Environmental Impact.', difficulty: 'medium' },
      ],
    },
    {
      title: 'Technical & Energy Terms',
      order: 2,
      estimatedMinutes: 25,
      objectives: ['Define key technical terms in solar and clean energy', 'Understand energy measurement units and system components'],
      content: `TECHNICAL TERMS IN CLEAN ENERGY

PV (PHOTOVOLTAIC)
Technology that converts SUNLIGHT directly into ELECTRICITY using semiconductor materials (usually silicon).
This is the basis of solar panels. When photons hit the semiconductor, electrons are released, creating direct current (DC).

MPPT (Maximum Power Point Tracking)
Controller technology that OPTIMIZES the voltage/current from solar panels to extract maximum power.
EML requires output voltage from PV strings to MATCH MPPT specifications.

BESS (Battery Energy Storage System)
A complete battery storage system including: batteries + BMS + enclosure + thermal management.
Stores solar energy for use when the sun is not shining.
International standards: IEC 62619, IEC 63485-1, IEC 62485-2, IEC 62509
Operating temperature: 10–30°C | Maximum Depth of Discharge (DoD): 90%

BMS (Battery Management System)
Electronic system that MONITORS and MANAGES battery packs.
Controls: charging cycles, temperature, depth of discharge (DoD).
SSM uses BMS to monitor battery health in EV battery swapping.

DoD (Depth of Discharge)
How much of a battery's total capacity has been used.
A DoD of 90% means 90% of battery capacity was discharged.
EML sets maximum DoD at 90% to protect battery longevity.

MINI-GRID
A localized power system with its own generation (solar), storage (BESS), and distribution network.
Serves a community or cluster of communities.
EML specializes in developing and operating mini-grids.

ISOLATED MINI-GRID (OFF-GRID)
Not connected to the national grid — completely self-sufficient.
Used in remote communities where grid extension is not viable.

PuE (Productive Use of Energy)
Using electricity for INCOME-GENERATING activities beyond just lighting and phone charging.
Examples: grain milling, cassava processing, cold storage, irrigation, rice milling, oil palm processing.
PuE provides reliable revenue base for mini-grid business models.

EPC Contract (Engineering, Procurement, and Construction)
A contract where a single contractor designs, procures materials, and constructs the project.
External installers at EML must sign EPC contracts.

NEMSA (Nigerian Electricity Management Services Agency)
Regulates electrical installations in Nigeria.
All distribution poles must be NEMSA certified.
NEMSA inspection is conducted after all internal quality checks.

COREN (Council for the Regulation of Engineering in Nigeria)
Professional body that regulates engineering practice in Nigeria.
All EPC contractors must be COREN certified.

KEY INSTALLATION SPECIFICATIONS (EML Standards)
- 16 sqmm cables: Standard for customer drop-down connections
- 35 sqmm minimum: For battery-to-inverter connections
- 0.5m minimum: Height clearance for PV mounting from ground
- 1.5m minimum: Depth of PV structure foundation
- 150mm: Required thickness for gravelling around PV structures
- 0-2 Ohms: Required earthing resistance
- 10-15 degrees facing south: Required PV panel installation slope
- Max DoD: 90% for BESS
- Max voltage drop: 3% at farthest distribution line end
- Max pole tilt: 5 degrees from normal plane
- Earthing: Every 5 span intervals on distribution lines

CAT I / CAT II Protection
Overvoltage protection categories for electrical equipment.
CAT II is the MINIMUM standard for mini-grid connections.

ICE (Internal Combustion Engine)
Traditional fossil fuel-powered vehicle engine — the type SSM aims to replace with EVs.

EV (Electric Vehicle)
Vehicle powered by an electric motor using energy stored in batteries.
SSM provides EVs and battery-swapping infrastructure.`,
      terms: [
        { term: 'PV (Photovoltaic)', definition: 'Technology that converts sunlight directly into electricity using semiconductor materials — the basis of solar panels.' },
        { term: 'MPPT', definition: 'Maximum Power Point Tracking — controller technology that optimizes power extraction from solar panels.' },
        { term: 'BESS', definition: 'Battery Energy Storage System — complete battery storage system including batteries, BMS, and enclosure.' },
        { term: 'BMS', definition: 'Battery Management System — electronic system that monitors and manages battery packs.' },
        { term: 'DoD', definition: 'Depth of Discharge — the percentage of a battery\'s total capacity that has been used.' },
        { term: 'Mini-Grid', definition: 'A localized power system with its own generation, storage, and distribution network serving a community.' },
        { term: 'PuE', definition: 'Productive Use of Energy — using electricity for income-generating activities like milling, processing, or cold storage.' },
        { term: 'EPC Contract', definition: 'Engineering, Procurement, and Construction contract — one contractor handles design, procurement, and construction.' },
        { term: 'NEMSA', definition: 'Nigerian Electricity Management Services Agency — regulates electrical installations; certifies distribution poles.' },
        { term: 'COREN', definition: 'Council for the Regulation of Engineering in Nigeria — professional body that certifies engineers and EPC contractors.' },
        { term: 'ICE', definition: 'Internal Combustion Engine — traditional fossil fuel-powered vehicle engine that SSM aims to replace.' },
      ],
      quiz: [
        { question: 'What does PV stand for in solar energy?', options: ['Power Voltage', 'Photovoltaic', 'Panel Voltage', 'Photon Value'], answer: 'Photovoltaic', explanation: 'PV = Photovoltaic — technology that converts sunlight into electricity.', difficulty: 'easy' },
        { question: 'What is the maximum Depth of Discharge (DoD) set by EML for BESS?', options: ['50%', '70%', '90%', '100%'], answer: '90%', explanation: 'EML sets maximum DoD at 90% to protect battery longevity and health.', difficulty: 'medium' },
        { question: 'What does PuE stand for?', options: ['Power Use Efficiency', 'Productive Use of Energy', 'Permanent Usage Equipment', 'Plant Unit Energy'], answer: 'Productive Use of Energy', explanation: 'PuE = Productive Use of Energy — using electricity for income-generating activities.', difficulty: 'easy' },
        { question: 'What is the required PV panel installation slope at EML?', options: ['0-5 degrees north', '10-15 degrees south', '20-25 degrees east', '30-45 degrees west'], answer: '10-15 degrees south', explanation: 'EML\'s SOP requires panels at 10-15 degrees facing SOUTH for optimal energy capture.', difficulty: 'medium' },
        { question: 'COREN is responsible for:', options: ['Certifying solar panels', 'Regulating engineering practice in Nigeria', 'Setting electricity tariffs', 'Financing energy projects'], answer: 'Regulating engineering practice in Nigeria', explanation: 'COREN = Council for the Regulation of Engineering in Nigeria — certifies engineers and EPC contractors.', difficulty: 'medium' },
        { question: 'Minimum cable size for connecting batteries to inverters is:', options: ['10 sqmm', '16 sqmm', '25 sqmm', '35 sqmm'], answer: '35 sqmm', explanation: 'EML\'s SOP requires cables of minimum 35 sqmm to connect batteries and inverters.', difficulty: 'hard' },
        { question: 'BESS operating temperature must be within:', options: ['0-15°C', '5-25°C', '10-30°C', '15-40°C'], answer: '10-30°C', explanation: 'BESS must operate within 10-30°C to maintain battery health and safety.', difficulty: 'medium' },
        { question: 'What does NEMSA do?', options: ['Finances energy projects', 'Regulates electrical installations and certifies distribution poles', 'Manages pension funds', 'Issues green bonds'], answer: 'Regulates electrical installations and certifies distribution poles', explanation: 'NEMSA = Nigerian Electricity Management Services Agency — regulates electrical installations; all poles must be NEMSA certified.', difficulty: 'medium' },
      ],
    },
    {
      title: 'FundCo Acronyms & Abbreviations — Complete Reference',
      order: 3,
      estimatedMinutes: 15,
      objectives: ['Recognize all FundCo-specific acronyms', 'Use correct terminology in communications and reports'],
      content: `FUNDCO ACRONYMS — COMPLETE LIST

FUND & FINANCE
CEF      — Clean Energy Fund
HSF      — Housing Solution Fund
CBI      — Climate Bonds Initiative
CBSB     — Climate Bonds Standard Board
FX       — Foreign Exchange
EoI      — Expression of Interest
AUM      — Assets Under Management
PFA      — Pension Fund Administrators
RSA      — Retirement Savings Account
NPV      — Net Present Value
IRR      — Internal Rate of Return
DFI      — Development Finance Institution
NDC      — Nationally Determined Contribution

OPERATIONAL
SOP      — Standard Operating Procedure
CMS      — Client Management System
E&S DD   — Environmental and Social Due Diligence
ESG      — Environmental, Social, and Governance
ESMS     — Environmental and Social Management System
KYC      — Know Your Customer
BVN      — Bank Verification Number (Nigerian bank account identifier)
CAM      — Credit Approval Memo
CRO      — Customer Relations Officer
BoQ      — Bill of Quantities
EPC      — Engineering, Procurement, and Construction
O&M      — Operations and Maintenance
LOTO     — Lock-Out Tag-Out (safety procedure before maintenance)
PPE      — Personal Protective Equipment
RACI     — Responsible, Accountable, Consulted, Informed
OME      — Operations and Maintenance Engineer
EOM      — Engineering Operations Manager
RMC      — Remote Monitoring and Control

ENERGY TECHNICAL
PV       — Photovoltaic
kWh      — Kilowatt-hour
kWp      — Kilowatt-peak
BESS     — Battery Energy Storage System
BMS      — Battery Management System
DoD      — Depth of Discharge
MPPT     — Maximum Power Point Tracking
PuE      — Productive Use of Energy
PPA      — Power Purchase Agreement
LCOE     — Levelized Cost of Energy
CAPEX    — Capital Expenditure
OPEX     — Operational Expenditure
BEES     — Building for Environmental and Economic Sustainability
SAS      — Stand-Alone Solar Systems
SaaS     — Solar as a Service (GroSolar model)
C&I      — Commercial and Industrial
ICE      — Internal Combustion Engine
EV       — Electric Vehicle
DFBO     — Design, Finance, Build, and Operate (EML model)
RES      — Renewable Energy Service
RESCO    — Renewable Energy Service Company

REGULATORY & INSTITUTIONAL
SEC      — Securities & Exchange Commission (Nigeria)
NEMSA    — Nigerian Electricity Management Services Agency
COREN    — Council for the Regulation of Engineering in Nigeria
REA      — Rural Electrification Agency
IFC      — International Finance Corporation
ILO      — International Labour Organisation
NCC      — Nigerian Communications Commission
DAREs    — Development of Affordable and Rural Electrification (World Bank program)`,
      terms: [
        { term: 'CEF', definition: 'Clean Energy Fund' },
        { term: 'HSF', definition: 'Housing Solution Fund' },
        { term: 'CBI', definition: 'Climate Bonds Initiative' },
        { term: 'CBSB', definition: 'Climate Bonds Standard Board' },
        { term: 'SOP', definition: 'Standard Operating Procedure' },
        { term: 'LOTO', definition: 'Lock-Out Tag-Out — critical safety procedure before maintenance to prevent accidental energization' },
        { term: 'RACI', definition: 'Responsible, Accountable, Consulted, Informed — a responsibility assignment matrix used in project management' },
        { term: 'SaaS (GroSolar)', definition: 'Solar as a Service — GroSolar\'s subscription model for solar energy access without upfront costs' },
        { term: 'DFBO', definition: 'Design, Finance, Build, and Operate — EML\'s integrated project delivery model' },
        { term: 'REA', definition: 'Rural Electrification Agency — Nigerian government body overseeing rural electrification' },
        { term: 'DAREs', definition: 'Development of Affordable and Rural Electrification — World Bank program under which EML submitted 142 mini-grid projects' },
        { term: 'E&S DD', definition: 'Environmental and Social Due Diligence — assessing environmental and social risks before investments' },
      ],
      quiz: [
        { question: 'What does CEF stand for?', options: ['Central Energy Finance', 'Clean Energy Fund', 'Carbon Emission Factor', 'Capital Energy Framework'], answer: 'Clean Energy Fund', explanation: 'CEF = Clean Energy Fund — one of FundCo\'s two main investment vehicles.', difficulty: 'easy' },
        { question: 'What does REA stand for?', options: ['Renewable Energy Authority', 'Rural Electrification Agency', 'Resource Efficiency Assessment', 'Regional Energy Allocation'], answer: 'Rural Electrification Agency', explanation: 'REA = Rural Electrification Agency — the Nigerian government body overseeing rural electrification.', difficulty: 'easy' },
        { question: 'LOTO stands for:', options: ['Local Operations Training Outline', 'Lock-Out Tag-Out', 'Logistics Output Tracking Order', 'Load Output Timing Operation'], answer: 'Lock-Out Tag-Out', explanation: 'LOTO = Lock-Out Tag-Out — a critical safety procedure to prevent accidental energization during maintenance.', difficulty: 'medium' },
        { question: 'RACI stands for:', options: ['Risk and Compliance Index', 'Responsible, Accountable, Consulted, Informed', 'Resource Allocation and Cost Inventory', 'Revenue, Assets, Capital, Investment'], answer: 'Responsible, Accountable, Consulted, Informed', explanation: 'RACI is a responsibility matrix clarifying roles in project management.', difficulty: 'medium' },
        { question: 'SaaS in GroSolar\'s context means:', options: ['Software as a Service', 'Solar as a Service', 'Subscription and Asset Service', 'Sustainable Asset Strategy'], answer: 'Solar as a Service', explanation: 'In GroSolar\'s context, SaaS = Solar as a Service — customers subscribe to solar without upfront costs.', difficulty: 'easy' },
        { question: 'E&S DD means:', options: ['Energy and Supply Due Diligence', 'Environmental and Social Due Diligence', 'Economic and Structural Development', 'Efficiency and Safety Design Draft'], answer: 'Environmental and Social Due Diligence', explanation: 'E&S DD = Environmental and Social Due Diligence — assessing E&S risks before investments.', difficulty: 'medium' },
        { question: 'DAREs is a program under which organization?', options: ['Federal Government of Nigeria', 'World Bank', 'African Development Bank', 'USAID'], answer: 'World Bank', explanation: 'DAREs = Development of Affordable and Rural Electrification — a World Bank program under which EML submitted 142 mini-grid projects.', difficulty: 'hard' },
        { question: 'DFBO is EML\'s project model meaning:', options: ['Deploy, Fund, Build, Operate', 'Design, Finance, Build, and Operate', 'Develop, Finance, Build, Oversee', 'Direct, Fund, Build, Optimize'], answer: 'Design, Finance, Build, and Operate', explanation: 'DFBO = Design, Finance, Build, and Operate — EML\'s integrated project delivery model.', difficulty: 'medium' },
      ],
    },
  ],
};
course2.exam = buildExam(course2.modules, 25);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 3: Department Responsibilities
// ─────────────────────────────────────────────────────────────────────────────
const course3 = {
  title: 'Department Responsibilities & Organizational Structure',
  description: 'Understand every department\'s role, responsibilities, and how teams collaborate across FundCo. Required for all staff.',
  level: 'beginner',
  assetco: 'General',
  required: true,
  tags: ['departments', 'responsibilities', 'HR', 'structure', 'onboarding'],
  passingScore: 75,
  modules: [
    {
      title: 'Executive Management & HR/Legal',
      order: 1,
      estimatedMinutes: 20,
      objectives: ['List all Executive Management responsibilities', 'Describe HR and Legal unit functions and key personnel'],
      content: `EXECUTIVE MANAGEMENT

Responsibilities:
● Provide strategic direction and long-term vision for the organization
● Approve major policies, budgets, and operational initiatives
● Oversee overall performance and ensure departmental alignment
● Ensure regulatory compliance and corporate governance
● Evaluate performance of department heads
● Manage day-to-day operations across all business units
● Coordinate activities across technical, commercial, and administrative teams
● Identify new project opportunities and maintain stakeholder relationships

Key Leadership:
- CIO (Abiodun Oni): Investment strategy and deal origination
- Deputy CIO (Adesola Alli): Supports CIO in investment activities
- Senior Adviser (Olumide Fatoki): Strategic guidance, especially on energy projects

HUMAN RESOURCES AND LEGAL UNIT

HR Responsibilities:
● Manage recruitment and onboarding for technical, field, admin, and other roles
● Maintain employee records and enforce HR policies
● Oversee performance evaluations and appraisal cycles
● Implement learning and development programs, especially technical upskilling
● Manage payroll, compensation, and benefits

Legal Responsibilities:
● Draft and review contracts:
  - EPC Contracts (Engineering, Procurement, Construction)
  - SLA (Service Level Agreements)
  - PFA Agreements (Pension Fund)
  - Vendor contracts
  - Community agreements
● Ensure compliance with energy regulations and local laws
● Handle legal disputes, arbitration, and regulatory filings
● Maintain corporate legal documentation and confidentiality

Head Legal / Company Secretariat: OLUFUNMILOLA ABRAHAM
- 12+ years legal experience
- Expertise in corporate governance, contract drafting, employment law
- LLB (Olabisi Onabanjo University, 2008); BL (Nigerian Law School, 2009)

Why this unit matters:
HR ensures we have the right people in the right roles and that they continue to grow. Legal ensures everything we do is properly documented, compliant, and protected.`,
      quiz: [
        { question: 'Who is responsible for evaluating department heads?', options: ['HR Unit', 'The department heads themselves', 'Executive Management', 'Risk & Compliance'], answer: 'Executive Management', explanation: 'Executive Management evaluates the performance of all department heads.', difficulty: 'easy' },
        { question: 'Which unit drafts EPC contracts?', options: ['Finance & Accounts', 'Procurement & Supply Chain', 'HR and Legal Unit', 'Technical Team'], answer: 'HR and Legal Unit', explanation: 'The Legal component of the HR/Legal unit drafts and reviews EPC contracts.', difficulty: 'medium' },
        { question: 'Who is FundCo\'s Head Legal / Company Secretariat?', options: ['Vivian Umeaku', 'Olufunmilola Abraham', 'Adesola Alli', 'Chizoba Onoh'], answer: 'Olufunmilola Abraham', explanation: 'Olufunmilola Abraham is the Head Legal and Company Secretariat at FundCo.', difficulty: 'easy' },
        { question: 'What type of contracts does the Legal unit review for community projects?', options: ['Community agreements', 'Share purchase agreements', 'International trade contracts', 'Real estate title deeds'], answer: 'Community agreements', explanation: 'The Legal unit reviews community agreements, among other contract types.', difficulty: 'medium' },
        { question: 'HR is responsible for implementing:', options: ['Financial reports', 'Learning and development programs', 'Technical solar installations', 'Marketing campaigns'], answer: 'Learning and development programs', explanation: 'HR implements learning and development programs, especially technical upskilling.', difficulty: 'easy' },
      ],
    },
    {
      title: 'Finance, Risk, IT & Administration',
      order: 2,
      estimatedMinutes: 20,
      objectives: ['List responsibilities of Finance, Risk, IT, and Admin units', 'Understand internal controls and compliance processes'],
      content: `FINANCE & ACCOUNTS

Responsibilities:
● Prepare budgets, forecasts, and financial statements
● Manage invoicing, payments, reconciliations, and cashflow
● Track expenditures and optimize cost efficiency
● Ensure compliance with accounting standards, taxes, and audits
● Provide financial reporting to management
● Manage payroll, compensation, and benefits

Finance Specialist: VIVIAN UMEAKU
- 8+ years in finance, auditing, and accounting
- Drives financial excellence and strategic growth across corporate environments

RISK & COMPLIANCE

Responsibilities:
● Ensure compliance with clean energy regulations and safety standards
● Conduct internal audits and enforce control frameworks
● Maintain documentation for regulatory bodies and project certifications
● Perform comprehensive credit risk and fraud detection analysis

Credit Risk Manager: OLUSEYI OLAYINKA

Key Activities:
- Monthly portfolio stress tests
- NPL monitoring and early warning systems
- Regulatory reporting to SEC and other bodies
- Credit approval memos (CAM)

IT & SYSTEMS UNIT

Responsibilities:
● Support digital systems, applications, and integrations
● Ensure data protection and secure user access
● Manage internal software (including the new AI Task platform)
● Provide technical support to all units
● Maintain timely integration of IoT hardware into workflow
● Serve as liaison between internal teams and external IT contractors

Key Focus Areas:
- Cybersecurity and data protection
- IoT sensor integration for mini-grid remote monitoring
- Remote Monitoring and Control (RMC) systems
- The company AI Task Manager platform

ADMINISTRATION

Responsibilities:
● Oversee facilities, logistics, and office operations
● Handle procurement of office supplies and field equipment support
● Manage documentation, scheduling, and vendor coordination
● Support communication between management and staff
● Support executives with tasks (itinerary, appointments, travel booking)

Why Administration Matters:
Administration ensures the organization runs smoothly by handling the behind-the-scenes logistics that allow all other departments to focus on their core work.`,
      quiz: [
        { question: 'Who is the Credit Risk Manager at FundCo?', options: ['Vivian Umeaku', 'Oluseyi Olayinka', 'Abiodun Oni', 'Moses Ekure'], answer: 'Oluseyi Olayinka', explanation: 'Oluseyi Olayinka serves as the Credit Risk Manager at FundCo.', difficulty: 'medium' },
        { question: 'Which unit manages the company\'s AI Task platform?', options: ['HR Unit', 'Finance & Accounts', 'IT & Systems Unit', 'Administration'], answer: 'IT & Systems Unit', explanation: 'The IT & Systems Unit manages internal software including the new AI Task platform.', difficulty: 'easy' },
        { question: 'Finance & Accounts is responsible for:', options: ['Hiring new staff', 'Managing invoicing, payments, and cashflow', 'Installing solar panels', 'Drafting legal contracts'], answer: 'Managing invoicing, payments, and cashflow', explanation: 'Finance & Accounts manages all financial transactions including invoicing, payments, and cashflow.', difficulty: 'easy' },
        { question: 'Risk & Compliance conducts what type of tests monthly?', options: ['Customer satisfaction surveys', 'Monthly portfolio stress tests', 'Annual financial audits only', 'Weekly team meetings'], answer: 'Monthly portfolio stress tests', explanation: 'Risk & Compliance conducts monthly portfolio stress tests as part of early warning systems.', difficulty: 'medium' },
        { question: 'Administration supports executives with:', options: ['Writing financial reports', 'Itinerary, appointments, and travel booking', 'Technical solar system design', 'Legal contract drafting'], answer: 'Itinerary, appointments, and travel booking', explanation: 'Administration handles executive support tasks like itinerary management, appointments, and trip booking.', difficulty: 'easy' },
      ],
    },
    {
      title: 'Procurement, Sales, Customer Service & Technical Teams',
      order: 3,
      estimatedMinutes: 25,
      objectives: ['Describe procurement and sales team functions', 'Explain the technical team\'s five key responsibility areas'],
      content: `PROCUREMENT & SUPPLY CHAIN

Responsibilities:
● Source and acquire technical equipment:
  - Solar panels, inverters, batteries
  - Meters, BOS (Balance of System) materials
  - Distribution cables, poles
● Negotiate with vendors and maintain supplier performance records
● Manage inventory and ensure availability of components for mini-grid projects
● Oversee logistics, warehousing, and delivery planning
● Track procurement KPIs and compliance with quality standards

Key KPIs:
- Supplier performance rating
- On-time delivery rate
- Inventory turnover ratio
- Logistics cost per unit

SALES & MARKETING

Responsibilities:
● Prepare proposals, feasibility studies, and client documentation
● Track revenue performance and customer acquisition metrics
● Manage brand visibility, digital engagement, and public relations
● Develop materials showcasing clean energy impact and sustainability
● Run customer acquisition campaigns for GroSolar

CUSTOMER SERVICE / CLIENT SUPPORT

Responsibilities:
● Handle customer inquiries, complaints, and technical escalations
● Ensure proper onboarding of GroSolar customers and tariff awareness
● Track customer satisfaction and retention rate
● Coordinate with technical team for field troubleshooting and maintenance

TECHNICAL TEAM (Clean Energy, EML & GroSolar)
The Technical Team has FIVE key responsibility areas:

A. SYSTEM DESIGN & ENGINEERING
● Conduct load assessments, site surveys, and energy audits
● Design mini-grid layouts, solar PV arrays, battery systems, and distribution networks
● Perform sizing calculations for solar panels, inverters, controllers, and storage
● Develop engineering drawings, schematics, and technical documentation

B. INSTALLATION & COMMISSIONING
● Execute field installation of solar PV systems, distribution lines, and metering
● Install and configure inverters, batteries, charge controllers, and BoQ components
● Conduct system testing, commissioning, and performance verification
● Ensure installations adhere to engineering standards and safety regulations

C. TECHNICAL OPERATIONS & MAINTENANCE
● Monitor system performance using dashboards, simulation, or monitoring tools
● Perform routine and preventive maintenance on solar PV, inverters, and mini-grid components
● Respond to system faults, outages, and customer technical complaints
● Maintain technical logs, downtime records, and fault-analysis documentation

D. ENVIRONMENTAL, SOCIAL & GOVERNANCE (ESG)
● Enforce strict safety protocols for electrical installations
● Conduct Environmental and Social Due Diligence (E&S DD) and risk assessments
● Ensure compliance with environmental standards and clean energy regulations
● Document incident reports and lead corrective actions

E. TECHNICAL RESEARCH & OPTIMIZATION
● Test new technologies (smart meters, lithium batteries, hybrid systems)
● Recommend system upgrades to increase efficiency and reduce losses
● Contribute to continuous improvement of installation and maintenance processes
● Collaborate with R&D/Product teams to enhance monitoring and automation tools
● Supervise field technicians, contractors, and subcontractors
● Allocate resources for site work and ensure timely project execution`,
      quiz: [
        { question: 'BOS in procurement refers to:', options: ['Battery Operating System', 'Balance of System materials', 'Business Operations Software', 'Budget Optimization Schedule'], answer: 'Balance of System materials', explanation: 'BOS = Balance of System — components other than panels/batteries needed for a solar installation (cables, connectors, mounting, etc.).', difficulty: 'medium' },
        { question: 'Which Technical Team area includes Environmental and Social Due Diligence?', options: ['System Design & Engineering', 'Installation & Commissioning', 'Technical Operations & Maintenance', 'Environmental, Social & Governance (ESG)'], answer: 'Environmental, Social & Governance (ESG)', explanation: 'E&S DD falls under the Technical Team\'s ESG responsibility area.', difficulty: 'medium' },
        { question: 'How many key responsibility areas does the Technical Team have?', options: ['Three', 'Four', 'Five', 'Six'], answer: 'Five', explanation: 'The Technical Team has five areas: System Design, Installation, Operations & Maintenance, ESG, and Technical Research.', difficulty: 'easy' },
        { question: 'Customer Service must ensure awareness of what with GroSolar customers?', options: ['Company stock prices', 'Tariff rates charged for electricity', 'Procurement timelines', 'Investment returns'], answer: 'Tariff rates charged for electricity', explanation: 'Customer Service ensures TARIFF AWARENESS — customers must understand what they are paying per kWh.', difficulty: 'medium' },
        { question: 'Which metric is tracked by the Procurement team?', options: ['Customer satisfaction score', 'On-time delivery rate', 'Employee retention rate', 'Carbon credits earned'], answer: 'On-time delivery rate', explanation: 'On-time delivery rate is one of the key KPIs tracked by the Procurement & Supply Chain team.', difficulty: 'easy' },
        { question: 'Technical Research & Optimization tests which technologies?', options: ['Mobile payment systems only', 'Smart meters, lithium batteries, hybrid systems', 'Building construction methods', 'HR software platforms'], answer: 'Smart meters, lithium batteries, hybrid systems', explanation: 'The Technical Research team tests smart meters, lithium batteries, and hybrid energy systems.', difficulty: 'medium' },
      ],
    },
  ],
};
course3.exam = buildExam(course3.modules, 20);

// =============================================================================
// MAIN SEED FUNCTION — will be extended with remaining courses
// =============================================================================

// =============================================================================
// COURSES 4-7 (Intermediate/Expert — EML, GroSolar, SSM, Agronomie)
// =============================================================================
const course4 = {
  title: 'EML – Isolated Solar Mini-Grid Installation SOP',
  description: 'Complete Standard Operating Procedure for Electrify MicroGrid Limited: site survey, design, installation specifications, O&M, contractor management, and safety. Required for all EML technical staff.',
  level: 'expert',
  assetco: 'EML',
  required: true,
  tags: ['EML', 'SOP', 'installation', 'mini-grid', 'technical', 'solar', 'safety'],
  passingScore: 80,
  modules: [
    {
      title: 'Purpose, Scope, Authorization & Responsibilities',
      order: 1,
      estimatedMinutes: 15,
      objectives: ['State the purpose of the EML SOP', 'List EML and EPC contractor responsibilities'],
      content: `SOP AUTHORIZATION

This procedure is established to ensure that all operations related to the installation of Isolated Solar Mini-Grid power systems in the technical department comply with the outlined requirements. The procedure must be followed consistently and systematically to achieve:
• The company's quality policy
• Departmental objectives
• Expectations of all interested parties, including clients and external contractors

Compliance with this SOP is MANDATORY for:
• All staff within the technical department
• Any externally contracted EPC Companies

Any deviation from specified procedures WITHOUT prior authorization from management will result in DISCIPLINARY ACTION as determined by company policies.

SOP DETAILS
• Issued by: Electrify Microgrid Limited
• Review Cycle: Annual (or as required)

PURPOSE
This SOP defines the process for installing isolated solar mini-grid power systems, including:

GENERATION ASSETS
• Solar panels, inverter, battery backup (BESS)
• Mounting racks, protection devices
• Earthing and wiring systems

DISTRIBUTION ASSETS
• Electric poles
• Distribution cables and aluminum conductors

CUSTOMER CONNECTION
• Meter installation (single-phase / three-phase)
• House wiring and drop-down cables

SCOPE
Applies to ALL isolated solar mini-grid installations by EML and external installers — from pre-installation assessments through to post-installation inspection and handover.

EML RESPONSIBILITIES
• Provide all required equipment (Solar panels, inverters, batteries, cables, poles, etc.)
• Ensure selection of qualified installers based on certifications, experience, and past performance
• Provide clear project documentation and specifications
• Conduct periodic quality control checks
• Handle project management and final inspections

EPC CONTRACTED INSTALLER RESPONSIBILITIES
• Complete installations according to technical designs, project scope, and industry standards
• Maintain high-quality standards and ensure safety during installation
• Correct any deficiencies or non-compliance with EML's quality expectations AT NO ADDITIONAL COST upon inspection`,
      quiz: [
        { question: 'Who must comply with the EML mini-grid installation SOP?', options: ['Only EML technical staff', 'Only external contractors', 'All technical department staff AND externally contracted EPC companies', 'Only project managers'], answer: 'All technical department staff AND externally contracted EPC companies', explanation: 'The SOP is mandatory for both internal technical staff and externally contracted EPC Companies.', difficulty: 'easy' },
        { question: 'What happens if an EPC contractor deviates from the SOP without authorization?', options: ['They receive a warning letter only', 'Disciplinary action is taken', 'Nothing happens the first time', 'They must attend training'], answer: 'Disciplinary action is taken', explanation: 'Any unauthorized deviation results in disciplinary action per company policies.', difficulty: 'easy' },
        { question: 'Distribution assets include:', options: ['Solar panels and inverters', 'Electric poles and distribution cables', 'Meters and house wiring', 'Batteries and mounting racks'], answer: 'Electric poles and distribution cables', explanation: 'Distribution assets = electric poles and distribution cables that carry power to customers.', difficulty: 'medium' },
        { question: 'If a contractor finds a deficiency during inspection, who pays to fix it?', options: ['EML pays', 'The customer pays', 'The EPC contractor pays (no additional cost to EML)', 'Cost is shared 50/50'], answer: 'The EPC contractor pays (no additional cost to EML)', explanation: 'EPC contractors must correct deficiencies AT NO ADDITIONAL COST to EML or customers.', difficulty: 'medium' },
        { question: 'How often is the EML SOP reviewed?', options: ['Monthly', 'Every 6 months', 'Annually or as required', 'Every 3 years'], answer: 'Annually or as required', explanation: 'The SOP is reviewed annually, or sooner if regulations or best practices change.', difficulty: 'easy' },
      ],
    },
    {
      title: 'Pre-Installation: Site Survey, Acquisition & Design',
      order: 2,
      estimatedMinutes: 25,
      objectives: ['Conduct proper site surveys per EML standard', 'Understand site acquisition documentation requirements', 'Describe design specifications for all system components'],
      content: `4. PRE-INSTALLATION PROCEDURE

4.1 SITE SURVEY
A thorough site survey must be conducted to assess suitability:
✓ Adequate SPACE for solar panels and energy cabin
✓ Good SUNLIGHT EXPOSURE — minimal shading ALL DAY LONG
✓ Assessment of current community LOAD DEMAND
✓ Identification of potential HAZARDS and environmental issues
✓ Provision of MITIGATION MEASURES for identified risks

4.2 SITE ACQUISITION
Desktop Research:
• Verify community demographics and GPS coordinates
• Research land ownership and usage rights

Required Documentation (ALL must be submitted and validated):
• Executed exclusivity and commercial contract
• Land agreement
• Community engagement reports WITH attendance lists
• Contacts of key community representatives
• Executed grant agreement (if applicable)

Process:
1. Desktop research and verification of community demographics and coordinates
2. Request all required documentation
3. Validate all submitted documents
4. Introduction of EML to the community BY THE DEVELOPER

4.3 DESIGN AND SPECIFICATIONS
EML provides a detailed design covering all components:

SOLAR PANELS
• Number, wattage, and arrangement
• Ensures adequate kWp for community load

INVERTER
• Sizing based on system capacity
• MPPT compatibility verification

BATTERY BACKUP (BESS)
• Storage capacity calculation
• Optimal placement for temperature management (10-30°C required)

MOUNTING RACKS
• Type and installation method
• Consideration of ground/roof material

PROTECTION DEVICES
• Surge protectors
• Circuit breakers and disconnect switches

WIRING
• Cable routing plan
• Management system for efficient energy transfer

EARTHING & GROUNDING SYSTEM
• Design ensures safe discharge of excess electrical energy to ground
• Includes materials specification and placement of grounding rods
• Required earthing resistance: 0-2 Ohms

All technical specifications and materials must MEET OR EXCEED EML standards.

4.4 PROJECT FINANCING
• Only VERIFIED cost items eligible for financing
• Financing blend: Equity + Debt from EML + Banks + Venture Capitals + Angel Investors + Government + PFAs
• EML manages acquisition and distribution of all project financing

4.5 CONTRACTUAL AGREEMENT WITH INSTALLERS
External installers MUST sign an EPC Contract covering:
✓ Scope of work and specific deliverables
✓ Adherence to safety protocols and electrical standards
✓ Use of high-quality, certified materials as specified by EML
✓ Commitment to complete within specified timeframe
✓ Warranty on workmanship: MINIMUM 18 MONTHS against defects`,
      quiz: [
        { question: 'Solar panels must be sited with minimal shading:', options: ['Only in the morning', 'Only at midday', 'All day long', 'Only in the afternoon'], answer: 'All day long', explanation: 'Modules must be installed in open space FREE FROM SHADING ALL DAY LONG.', difficulty: 'easy' },
        { question: 'Community engagement reports must include:', options: ['Only meeting minutes', 'Attendance lists', 'Only the agenda', 'Financial projections'], answer: 'Attendance lists', explanation: 'Community engagement reports must include ATTENDANCE LISTS as proof of consultation.', difficulty: 'medium' },
        { question: 'Who introduces EML to a new community?', options: ['EML\'s CEO directly', 'Community representative', 'The mini-grid developer', 'Local government authority'], answer: 'The mini-grid developer', explanation: 'EML is introduced to the community BY THE DEVELOPER who typically has the existing community relationship.', difficulty: 'hard' },
        { question: 'The minimum workmanship warranty required from EPC contractors is:', options: ['6 months', '12 months', '18 months', '24 months'], answer: '18 months', explanation: 'EPC contracts must include a minimum 18-month warranty on workmanship against defects.', difficulty: 'medium' },
        { question: 'Project financing at EML includes which sources?', options: ['Only government grants', 'Only EML equity', 'Blend of equity, debt from EML, banks, VCs, PFAs, government', 'Only bank loans'], answer: 'Blend of equity, debt from EML, banks, VCs, PFAs, government', explanation: 'EML uses a blend: Equity + Debt from EML + Banks + VCs + Angel Investors + Government + PFAs.', difficulty: 'medium' },
      ],
    },
    {
      title: 'Installation: PV Mounting, Inverter, BESS & Protection',
      order: 3,
      estimatedMinutes: 30,
      objectives: ['Apply correct PV mounting specifications', 'Follow BESS installation standards and safety requirements', 'Install protection and earthing systems properly'],
      content: `5. INSTALLATION PROCEDURE

5.1 PV (SOLAR PANEL) MOUNTING — Critical Specifications
• Installation SLOPE: 10 to 15 degrees facing SOUTH
• Minimum HEIGHT CLEARANCE from ground: 0.5m
• Modules installed in OPEN SPACE, free from shading ALL DAY
• Depth of PV structure foundation: NOT LESS THAN 1.5m
• Use GALVANIZED IRON shear bolts and nuts (NOT regular bolts)
• Metal parts in-ground and near-ground: protected against corrosion for MINIMUM 20 YEARS
• Gravelling: 150mm thick
• PV structure must withstand EXTREME WIND SPEED at location
• Output voltage from PV strings must MATCH MPPT specification
• Modules must be fixed on EVEN surface — no more than 20mm difference from ideal plane

5.3 INVERTER AND ELECTRICAL SYSTEMS
• Install inverters, isolators, and electrical components in ENERGY CABIN or power house
  - Must be EASILY ACCESSIBLE
  - Must be WELL-VENTILATED
• All connections must be: SECURE, properly GROUNDED, minimum CAT II protection systems
• TESTING required before commissioning (with DOCUMENTED EVIDENCE of test)
• Ensure CORRECT POLARITY for battery, PV, AC inputs and outputs

5.4 BESS INSTALLATION
Location: Designated, COOL, and SECURE area, away from hazards

Wiring:
• ONLY COPPER cables and lugs for battery-inverter connections
• Battery support structure properly INSULATED
• Cable size: MINIMUM 35 sqmm for battery-inverter connections

Standards Compliance (all must be met):
• IEC 62619
• IEC 63485-1
• IEC 62485-2
• IEC 62509

Operating Parameters:
• Temperature: 10°C to 30°C (maintained by energy cabin AC)
• Maximum DoD: 90%
• Paralleling of batteries: Must conform to OEM specifications

5.5 PROTECTION DEVICES INSTALLATION
Required devices:
• Surge protectors
• Circuit breakers
• Disconnect switches

Purpose: Safeguard system from electrical faults and surges.
ALL devices must be TESTED after installation to confirm correct functioning.

5.6 EARTHING AND GROUNDING
Earthing (safely discharge excess energy to ground):
• Install grounding rod at designated location
• Connect grounding rod to inverter, battery backup, and all electrical components
• Use ONLY CAT I or CAT II earth protection systems

Grounding (protect against electrical hazards):
• All major components must be grounded:
  - Solar panels, Inverter, Battery backup, Mounting racks
• Protects against: short circuits, overvoltage, lightning strikes
• Test earthing resistance: Required 0 to 2 OHMS

5.7 WIRING AND ELECTRICAL CONNECTIONS
• Wires must be: properly INSULATED, properly LABELED, properly ROUTED
• All connections must be GROUNDED to prevent electrical shock

5.8 DISTRIBUTION NETWORK INSTALLATION
• Poles installed ERECT and at RIGHT DEPTH
• All poles MUST be NEMSA standard certified
• Aluminum conductors used (unless otherwise specified)
• Cable sag and pole tilting: NO MORE THAN 5 DEGREES from normal plane
• Voltage drop at farthest line end: NO MORE THAN 3% of plant output voltage
• Distribution lines earthed at every 5 SPAN INTERVALS
• Protection devices on FIRST POLES from power plant

5.9 ENERGY CABIN (Power House)
• Fitted with REINFORCED BASE (to support battery and inverter weight)
• Must be EARTHED
• FIRE SUPPRESSION SYSTEM with ALARM installed
• AIR CONDITIONING units fitted (maintains 10-30°C for BESS)
• PREFABRICATED and fitted with necessary insulation (heat, electrical, fire suppression)
• FREE FROM RUST AND CORROSION
• Mounted on PLINTH at least 0.5m above ground level (protection from flooding)

5.12 CUSTOMER CONNECTION
• All meters installed per OEM recommended standards WITH protection devices
• Meter type by load:
  - Single phase: Customers with LESS THAN 2,000W load
  - Three phase: Customers with MORE THAN 2,000W load
• ALL information DOCUMENTED for onboarding to metering platform:
  - Meter ID, Customer details, Location
• Cable size for drop-down connections: 16 sqmm (unless otherwise specified)`,
      quiz: [
        { question: 'What is the required installation slope for PV panels?', options: ['0-5 degrees north', '10-15 degrees south', '20-25 degrees east', '30-45 degrees west'], answer: '10-15 degrees south', explanation: 'EML\'s SOP requires panels at 10-15 degrees facing SOUTH to maximize solar energy capture.', difficulty: 'easy' },
        { question: 'Minimum depth of PV structure foundations is:', options: ['0.5m', '1.0m', '1.5m', '2.0m'], answer: '1.5m', explanation: 'PV structure foundation depth must NOT be less than 1.5m for stability.', difficulty: 'medium' },
        { question: 'Gravelling thickness around PV structures must be:', options: ['50mm', '100mm', '150mm', '200mm'], answer: '150mm', explanation: 'Gravelling must be 150mm thick around PV structures.', difficulty: 'medium' },
        { question: 'What type of cables MUST connect batteries to inverters?', options: ['Aluminum cables only', 'Copper cables and lugs only', 'Any standard electrical cable', 'PVC-insulated cables only'], answer: 'Copper cables and lugs only', explanation: 'ONLY copper cables and lugs may connect batteries and inverters — aluminum is not permitted.', difficulty: 'medium' },
        { question: 'Required earthing system resistance is:', options: ['0-1 Ohms', '0-2 Ohms', '2-5 Ohms', '5-10 Ohms'], answer: '0-2 Ohms', explanation: 'Earthing resistance must be 0-2 Ohms to comply with safety standards.', difficulty: 'medium' },
        { question: 'Maximum voltage drop at the end of distribution lines is:', options: ['1%', '3%', '5%', '10%'], answer: '3%', explanation: 'Voltage drop must not exceed 3% of the solar plant\'s output voltage.', difficulty: 'medium' },
        { question: 'The energy cabin plinth must be at least:', options: ['0.3m above ground', '0.5m above ground', '1.0m above ground', '1.5m above ground'], answer: '0.5m above ground', explanation: 'The energy cabin must be on a plinth at least 0.5m above ground to protect from flooding.', difficulty: 'medium' },
        { question: 'A customer with 2,500W load requires:', options: ['Single phase meter', 'Three phase meter', 'Either type', 'No meter required'], answer: 'Three phase meter', explanation: 'Three-phase meters are required for customers with MORE THAN 2,000W load.', difficulty: 'medium' },
        { question: 'Distribution lines must be earthed at what interval?', options: ['Every pole', 'Every 3 span intervals', 'Every 5 span intervals', 'Every 10 span intervals'], answer: 'Every 5 span intervals', explanation: 'Distribution lines must be earthed at 5 span intervals to limit fault current travel distance.', difficulty: 'hard' },
        { question: 'Maximum pole tilting from normal plane is:', options: ['2 degrees', '5 degrees', '10 degrees', '15 degrees'], answer: '5 degrees', explanation: 'Cable sag and pole tilting must not exceed 5 degrees from the normal plane.', difficulty: 'hard' },
      ],
    },
    {
      title: 'Operations, Maintenance, LOTO & Quality Control',
      order: 4,
      estimatedMinutes: 30,
      objectives: ['Apply daily, weekly, and monthly O&M procedures', 'Execute correct LOTO procedures', 'Conduct quality control inspections at key stages'],
      content: `6. OPERATION AND MAINTENANCE

6.1 DAILY OPERATIONS
System Monitoring (every day):
• Check solar panel OUTPUT, battery STATUS, inverter PERFORMANCE, and load CONSUMPTION
• Record in daily log: voltage, current, energy generation figures

Load Management:
• Ensure loads do not EXCEED system capacity
• Implement demand response strategies to manage PEAK LOADS

6.2 ENERGY GENERATION AND CONSUMPTION MONITORING
• Monitor solar IRRADIANCE levels
• Ensure panels are positioned OPTIMALLY
• CLEAN panels regularly — dirt reduces efficiency
• Record daily generation and consumption from solar plant

6.3 ROUTINE MAINTENANCE SCHEDULE

MONTHLY INSPECTIONS
• Inspect solar panels for DAMAGE or DIRT
• Check connections and wiring for WEAR or CORROSION
• Test battery health and electrolyte levels (for lead-acid batteries)

QUARTERLY MAINTENANCE
• Thorough CLEANING of solar panels
• Inspect and clean INVERTER and electronic components
• Test all system ALARMS and indicators

6.4 PREVENTIVE MAINTENANCE
• Replace worn or damaged components PROACTIVELY (before failure)
• Schedule battery maintenance (equalization if applicable) to PROLONG LIFE

6.5 CORRECTIVE MAINTENANCE
• Address issues identified in inspections or reported by operators IMMEDIATELY
• Document ALL repairs: parts replaced, work performed, date and time

6.8 REPORTING PROCEDURES

Daily Logs: Operations data, generation, maintenance performed, anomalies
• Physical notebook kept ON SITE
• Uploaded to online system by OME

Incident Reports: All incidents or system failures with responses and resolutions

Monthly Reports: Compiled performance data and maintenance logs for management review

LOCK-OUT TAG-OUT (LOTO) PROCEDURE
Required BEFORE any maintenance that de-energizes equipment:

1. NOTIFICATION (24 HOURS BEFORE scheduled maintenance)
   • Notify OME, RMC, and Customer Care
   • Customers must be informed BEFORE power goes down

2. SHUT DOWN: Controlled shutdown of equipment

3. ISOLATE: Open all energy isolating devices per LOTO procedure

4. TEST: Verify equipment is COMPLETELY DE-ENERGIZED using voltmeter

5. REPORT: Log date, duration, and purpose of LOTO

LOTO RACI:
• RESPONSIBLE: Site Operator
• ACCOUNTABLE: OME (Operations and Maintenance Engineer)
• CONSULTED: EOM (Engineering Operations Manager)
• INFORMED: COO, CEO

WEEKLY MAINTENANCE CHECKLIST
i. Clean PV array (clean water only — NO soap or detergent, done at NIGHT)
ii. Inspect inverter — remove dust, check wiring, look for excessive heating
iii. Inspect battery set — loose connections, heating, leakage (flooded batteries)
iv. Inspect distribution lines — check for bridging or cuts
v. Inspect customer meter connections — loose terminals, energy loss
vi. Inspect all terminals for corrosion and loosened cable connections
vii. Check for rust and cracks on welding joints
viii. Sweep power house and remove cobwebs

MONTHLY MAINTENANCE CHECKLIST
i. Remove weeds around the power house
ii. Clean vents in the power house
iii. Check indoor and outdoor air conditioning units
iv. Check state of meters — ensure working effectively
v. Escalate all issues to relevant party

8. QUALITY CONTROL AND INSPECTION
EML conducts on-site inspections at KEY STAGES:
• After mounting
• After panel installation
• After electrical completion

Final Inspection confirms:
• System is FULLY OPERATIONAL
• Earthing and grounding systems are EFFECTIVE
• Safety standards are MET

External contractors: RECTIFY any inspection issues AT THEIR OWN COST
NEMSA inspection: Conducted AFTER all internal standard checks

10. CUSTOMER HANDOVER DOCUMENTATION
Upon successful installation, EPC provides:
✓ System USER MANUAL (solar system, inverter, battery, protection devices)
✓ Maintenance SCHEDULE and service contact details
✓ Warranty INFORMATION for equipment and installation
✓ COMPLETION CERTIFICATE
✓ Final HANDOVER INSPECTION — both installer and customer sign off

11. HEALTH AND SAFETY GUIDELINES
All installers MUST:
• Wear appropriate PPE: Helmets, Harnesses (heights), Gloves (electrical)
• Follow safety regulations for working at heights and with electrical systems
• Maintain CLEAN and ORGANIZED workspace
• Be issued PERMIT TO WORK before starting`,
      quiz: [
        { question: 'What data must be recorded in the daily log?', options: ['Weather forecast only', 'Voltage, current, and energy generation figures', 'Customer complaints only', 'Financial transactions'], answer: 'Voltage, current, and energy generation figures', explanation: 'Daily logs must include voltage, current, and energy generation figures.', difficulty: 'easy' },
        { question: 'How far in advance must customers be notified of planned maintenance (LOTO)?', options: ['1 hour', '12 hours', '24 hours', '48 hours'], answer: '24 hours', explanation: 'LOTO procedure requires notification to OME, RMC, and Customer Care 24 HOURS BEFORE.', difficulty: 'medium' },
        { question: 'Correct order of LOTO steps is:', options: ['Test, Isolate, Notify, Shut Down', 'Notify, Shut Down, Isolate, Test', 'Shut Down, Notify, Test, Isolate', 'Isolate, Test, Notify, Shut Down'], answer: 'Notify, Shut Down, Isolate, Test', explanation: 'LOTO = 1) Notify, 2) Shut Down, 3) Isolate, 4) Test (confirm de-energized), 5) Report.', difficulty: 'hard' },
        { question: 'Panel cleaning must use:', options: ['Soap and water', 'Detergent and water', 'Clean water only', 'Bleach solution'], answer: 'Clean water only', explanation: 'Solar panels must be cleaned with CLEAN WATER ONLY — no soaps or detergents.', difficulty: 'medium' },
        { question: 'Panel cleaning should be done at:', options: ['Midday when sun is strongest', 'Early morning', 'Night when system is not generating', 'Any time of day'], answer: 'Night when system is not generating', explanation: 'Panel cleaning MUST be done at NIGHT to avoid thermal shock and for safety.', difficulty: 'medium' },
        { question: 'Who is ACCOUNTABLE for the LOTO process?', options: ['Site Operator', 'CEO', 'OME (Operations and Maintenance Engineer)', 'COO'], answer: 'OME (Operations and Maintenance Engineer)', explanation: 'The OME is ACCOUNTABLE — they oversee and are answerable for correct execution.', difficulty: 'medium' },
        { question: 'NEMSA inspection occurs:', options: ['Before any installation begins', 'During mid-installation', 'After all internal standard checks', 'At the same time as EML inspection'], answer: 'After all internal standard checks', explanation: 'NEMSA inspection is conducted AFTER all internal standard checks have been completed.', difficulty: 'medium' },
        { question: 'Corrective maintenance issues must be addressed:', options: ['During the next scheduled visit', 'Within 30 days', 'IMMEDIATELY', 'At end of month'], answer: 'IMMEDIATELY', explanation: 'Issues identified in inspections or reported by operators must be addressed IMMEDIATELY.', difficulty: 'easy' },
      ],
    },
    {
      title: 'Contractor Management, Liability & EML Team Profiles',
      order: 5,
      estimatedMinutes: 25,
      objectives: ['Apply contractor qualification criteria', 'Understand liability, warranty, and non-compliance clauses', 'Identify key EML team members and their roles'],
      content: `9. ENGAGEMENT WITH EXTERNAL CONTRACTORS

9.1 CONTRACTOR QUALIFICATIONS
Required Certifications:
• Certifications in solar system installations and electrical systems
• Specific experience with: inverters, BESS, protection devices, earthing, grounding, meters, pole installation and stringing
• References from PREVIOUS SIMILAR INSTALLATIONS required during selection
• Must be COREN certified
• Must be NEMSA certified

9.2 PERFORMANCE AND LIABILITY CLAUSES
Contractors are LIABLE for damage from poor installation of:
Solar panels, inverters, BESS, mounting racks, protection devices, wiring, earthing and grounding, meter installation, pole installation and stringing.

Substandard Work Consequences:
• Rectify the job at NO ADDITIONAL COST
• Pay PENALTIES or face WITHHELD PAYMENTS until issue is resolved

9.3 WARRANTY AND MAINTENANCE
• Minimum 18-month workmanship warranty covering all components
• Any maintenance due to poor installation within warranty: carried out by installer AT NO COST to EML or customer

9.4 NON-COMPLIANCE
• EML reserves the right to TERMINATE the contract
• AND BLACKLIST the installer from future engagements

PROTECTIVE CLAUSES IN EPC CONTRACTS
1. Performance Penalties: Penalized for delays, substandard work, improper installation
2. Workmanship Warranty: 18 months minimum
3. Inspection-Based Payments: Payment ONLY released after successful stage inspections
4. Material Standards: Only certified, pre-approved materials (non-compliant = rejected, EPC bears replacement cost)
5. Legal Recourse: EML may take legal action for gross negligence causing significant failure or damage

EML KEY TEAM MEMBERS

1. OLUMIDE FATOKI — Chairman, EML Board
   - 15+ years energy access, decarbonization, climate change
   - EU-funded program electrifying 138,000 lives
   - GIZ NESP Country Manager ($25M solar micro-grid installations)
   - Fellow, Acumen West Africa | Education: Executive MBA; MSc Engineering Management

2. JOJOLOLAMI (JOJO) NGENE — CEO, EML
   - 13+ years engineering consulting (electrical and power systems)
   - Google DeepMind HQ, Facebook Data Centre Lulea
   - 18+ agro-energy PuE assessments at Agronomie
   - Education: First Class MEng & BEng Electrical Engineering; MSc, University of Southampton
   - Member: Institution of Engineering and Technology (IET)

3. EMMANUEL OGWUCHE — Project Engineer
   - Solar system design and installation specialist
   - Experience: Husk Power, Privida Power (mini-grids and standalone systems)
   - Tools: PVsyst, Homer | Education: BSc Industrial Physics

4. OLUWABUSAYO AKINRELERE — Acting Project Manager
   - COREN registered engineer
   - 1MW+ commercial solar; mini-grids for 70,000+ Nigerians
   - Certified Project Management Professional (PMP)
   - Education: BEng Electrical Electronics Engineering

5. VIVIAN UMEAKU — Finance Specialist
   - 8+ years finance, auditing, and accounting

6. ISMAIL YAKUBU — Project Engineering and Design
   - 9+ years designing rooftop solar and electrical systems (ex-Husk Power)
   - Certified Electrical Power Systems Installation Engineer
   - Corporate Member, NIEEE | Education: BEng Electrical Electronic Engineering

7. ISRAEL AKOMODESEGBE — Regional Manager, Community Engagement
   - 25+ site assessment and acquisition projects at EML
   - Skills: SQL, Python, R, Tableau, Power BI
   - Education: B.Agric Agricultural Economics

8. OCHE JOSHUA — Agro Technician
   - Managed cassava and rice farms; production manager for rice mill
   - Best Graduating Student 2021 | Education: BEng Agricultural Engineering
   - Responsible for agro PuE assessments

9. TAIWO POPOOLA — Regional Manager, Community Engagement (Oyo, Kwara)
   - 30+ site assessment projects at EML
   - Education: HND and ND Electronics and Telecommunications

10. ADEKUNLE ANJORIN — Regional Manager, Community Engagement
    - 65+ site assessment projects (highest in EML team)
    - Education: BEng Agricultural Engineering

11. TIMOTHY YUSUF — Project Technician
    - Certified Professional Engineer (PE) | Background: electrical engineering`,
      quiz: [
        { question: 'EPC contractors must hold which two regulatory certifications?', options: ['ISO and IEC', 'COREN and NEMSA', 'NAFDAC and SON', 'NESREA and DPR'], answer: 'COREN and NEMSA', explanation: 'EPC contractors must be both COREN and NEMSA certified.', difficulty: 'medium' },
        { question: 'Inspection-Based Payments means:', options: ['EPC is paid upfront', 'Payment released only after successful stage inspections', 'Monthly retainer regardless of progress', 'Final payment after project completion only'], answer: 'Payment released only after successful stage inspections', explanation: 'Payments to EPC are released based on successful inspections at each key stage.', difficulty: 'medium' },
        { question: 'Who has completed the most site assessment projects at EML?', options: ['Israel Akomodesegbe (25+)', 'Taiwo Popoola (30+)', 'Adekunle Anjorin (65+)', 'Oche Joshua'], answer: 'Adekunle Anjorin (65+)', explanation: 'Adekunle Anjorin has completed 65+ site assessment and acquisition projects — the highest in EML.', difficulty: 'hard' },
        { question: 'A non-compliant EPC contractor faces:', options: ['Training only', 'Contract termination AND blacklisting', 'A small fine only', 'Always get a second chance'], answer: 'Contract termination AND blacklisting', explanation: 'Non-compliant EPC contractors face contract termination AND blacklisting from future EML engagements.', difficulty: 'medium' },
        { question: 'Emmanuel Ogwuche uses which solar design tools?', options: ['AutoCAD and Excel', 'PVsyst and Homer', 'Revit and SketchUp', 'MATLAB and Simulink'], answer: 'PVsyst and Homer', explanation: 'Emmanuel Ogwuche uses PVsyst and Homer for solar system design and simulation.', difficulty: 'medium' },
      ],
    },
  ],
};
course4.exam = buildExam(course4.modules, 35);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 5: GroSolar Client Onboarding SOP
// ─────────────────────────────────────────────────────────────────────────────
const course5 = {
  title: 'GroSolar AssetCo – Client Onboarding & Operations SOP',
  description: 'Complete Standard Operating Procedure for GroSolar: client onboarding, KYC, credit assessment, technical evaluation, financial structuring, installation, and portfolio monitoring.',
  level: 'intermediate',
  assetco: 'GroSolar',
  required: false,
  tags: ['GroSolar', 'SOP', 'onboarding', 'solar', 'SaaS', 'client', 'credit'],
  passingScore: 75,
  modules: [
    {
      title: 'GroSolar Overview, SaaS Model & Onboarding',
      order: 1,
      estimatedMinutes: 20,
      objectives: ['Explain the GroSolar SaaS model', 'Complete the client onboarding process correctly', 'Describe KYC requirements and timelines'],
      content: `GROSOLAR ASSETCO LIMITED — OVERVIEW

Document: GSA-SOP-001 | Version 1.0 | Effective Date: March 12, 2025
Prepared by: Oluwabusayo Akinrelere, Chimezie Obirieze | Approved by: Abiodun Oni

WHAT IS GROSOLAR?
GroSolar AssetCo is a solar asset holding platform that:
• Invests in and OWNS solar equipment
• Equipment installed and operated by renewable energy service companies
• Provides Solar as a Service (SaaS) for RESIDENTIAL HOMES and BUSINESSES
• Allows customers to switch from diesel/fossil fuel generators to solar WITHOUT HIGH UPFRONT COSTS

THE SAAS MODEL
• Scales distribution of Stand-Alone Solar Systems (SAS) through SUBSCRIPTION arrangements
• Eliminates high initial costs that deter commercial and industrial (C&I) users
• Leverages LONG-TERM DOMESTIC FINANCING
• Partners with local solar energy service providers
• Focus: Residential customers AND SME users

DEPARTMENTS INVOLVED
Customer Relations | Credit & Risk | Engineering & Procurement | Finance | Legal | Sales & Customer Acquisition

RESPONSIBILITIES
• Project Manager: Oversees entire project lifecycle
• Site Assessor: Evaluates site suitability for solar installation
• Design Engineer: Creates the solar PV system design
• Installation Team: Installs solar equipment
• QA Officer: Verifies adherence to quality and safety standards
• Customer Support: Provides ongoing post-installation support

SCOPE
Covers: client engagement → credit assessment → technical evaluation → financial structuring → legal documentation → installation → monitoring

OBJECTIVES
• Standardize operational processes across all departments
• Ensure regulatory and internal policy compliance
• Enhance customer satisfaction through efficient service delivery
• Mitigate risks associated with asset financing and project execution

CLIENT ONBOARDING PROCESS (STEP 1)

Phase Input: Client interest via GroSolar website (www.grosolar.co)

CRO Tasks:
• Create client PROFILE
• Initiate direct contact via EMAIL or PHONE CALL within 24 HOURS
• Create DEDICATED CLIENT FOLDER (all documents and communications)

Proof: Email confirmation sent to client
Timeline: Initial contact within 24 HOURS of profile creation

KYC ASSESSMENT (STEP 2)

System auto-sends KYC documents to client upon profile creation.

Client Must Submit:
• Completed KYC form
• Identification documents
• Proof of address
• Financial statements
• BVN (Bank Verification Number)

CRO monitors progress and shares completed KYC with Credit & Risk team.
Timeline: KYC documents submitted within 7 DAYS of receipt

KEY DEFINITIONS
CRO — Customer Relations Officer
KYC — Know Your Customer
C/R — Credit and Risk
BoQ — Bill of Quantities
MD  — Managing Director
OEM — Original Equipment Manufacturer
BVN — Bank Verification Number
CAM — Credit Approval Memo`,
      terms: [
        { term: 'SaaS (Solar as a Service)', definition: 'GroSolar\'s subscription model allowing customers to use solar energy without upfront equipment costs.' },
        { term: 'SAS', definition: 'Stand-Alone Solar Systems — solar systems that operate independently without grid connection.' },
        { term: 'CRO', definition: 'Customer Relations Officer — the first point of contact for GroSolar clients.' },
        { term: 'KYC', definition: 'Know Your Customer — regulatory process to verify client identity and assess risk.' },
        { term: 'CAM', definition: 'Credit Approval Memo — document recording credit assessment outcome and decision.' },
        { term: 'BVN', definition: 'Bank Verification Number — unique identifier for Nigerian bank account holders.' },
      ],
      quiz: [
        { question: 'GroSolar\'s SaaS model allows customers to:', options: ['Buy solar panels at full price', 'Use solar energy through subscription without high upfront costs', 'Rent diesel generators', 'Buy shares in solar companies'], answer: 'Use solar energy through subscription without high upfront costs', explanation: 'GroSolar\'s SaaS model eliminates high upfront costs through subscription arrangements.', difficulty: 'easy' },
        { question: 'Initial client contact must be made within:', options: ['12 hours', '24 hours', '48 hours', '72 hours'], answer: '24 hours', explanation: 'The CRO must make initial contact within 24 HOURS of profile creation.', difficulty: 'easy' },
        { question: 'KYC documents must be submitted within:', options: ['3 days', '5 days', '7 days', '14 days'], answer: '7 days', explanation: 'Clients must submit KYC documents within 7 DAYS of receiving them.', difficulty: 'medium' },
        { question: 'The GroSolar SOP was approved by:', options: ['Jojo Ngene', 'Olumide Fatoki', 'Abiodun Oni', 'Vivian Umeaku'], answer: 'Abiodun Oni', explanation: 'GSA-SOP-001 was approved by Abiodun Oni (CIO).', difficulty: 'hard' },
        { question: 'What does BVN stand for?', options: ['Bank Verification Note', 'Bank Verification Number', 'Business Validation Number', 'Balance Verification Notice'], answer: 'Bank Verification Number', explanation: 'BVN = Bank Verification Number — Nigeria\'s unique bank account holder identifier.', difficulty: 'easy' },
      ],
    },
    {
      title: 'Credit Assessment, Technical Evaluation & Financial Structuring',
      order: 2,
      estimatedMinutes: 25,
      objectives: ['Conduct credit assessments within prescribed timelines', 'Understand the technical site assessment process', 'Structure financial proposals correctly'],
      content: `CREDIT ASSESSMENT PROCESS (STEP 3)

Phase Input: Credit & Risk team receives completed KYC

Credit Check Process:
• Use CREDIT BUREAU reports
• Evaluate: financial history, income level, debt burden

Output Documents:
• Detailed credit report (creditworthiness and risk factors)
• Credit/Risk APPROVAL DOCUMENT: Pre-qualified → proceed | Declined → reject

Timeline: Credit assessment within 5 BUSINESS DAYS of KYC receipt
Responsible: Credit & Risk Officer

FINAL APPROVAL PROCESSING (STEP 4)

For pre-qualified clients:
• Detailed AFFORDABILITY ANALYSIS
• Risk profiling
• Credit Evaluation Summary (financing recommendations + risk factors)
• Reviewed and approved by EXECUTIVE MANAGEMENT
• Recorded in Approved/Declined Applications Log
• Communicated to Sales, Legal, and Engineering teams

Timeline: Final approval within 3 BUSINESS DAYS of completing credit evaluation

TECHNICAL ASSESSMENT PROCESS (STEP 5)

Phase Input: Credit approved → Engineering team initiates technical assessment

Site Visit Includes:
• Evaluate ENERGY CONSUMPTION patterns
• Recommend appropriate solar system
• Detailed site assessment report with: energy consumption data + proposed specs

Responsible: Engineering Team
Timeline: Site assessment completed within 7 BUSINESS DAYS of credit approval

ENGINEERING COSTINGS (STEP 6)

Based on site assessment:
• Generate BILL OF QUANTITIES (BoQ)
• Create TERM SHEET (energy requirements, system specs, financing tenor)

Review: Engineering Manager approves
Timeline: BoQ term sheet within 3 BUSINESS DAYS of site assessment

FINANCIAL STRUCTURING (STEP 7)

Finance team generates:
• Monthly payment plans
• Upfront fees
• Lease structures

Responsible: Account Officer
Timeline: Financial proposals within 5 BUSINESS DAYS of BoQ receipt

MANAGEMENT ASSESSMENT (STEP 8)

Internal vetting:
• Credit & Risk Officer
• Managing Director (MD) — MUST SIGN OFF

Timeline: Internal vetting within 3 BUSINESS DAYS

PROPOSAL SENDING (STEP 9)

• CRO forwards proposal to client via EMAIL or in-person meeting
• CRO follows up on any questions
• Timeline: Proposal sent within 24 HOURS of internal approval

CUSTOMER CONSENT (STEP 10)

• Client selects preferred terms
• CRO shares with Legal team for contract drafting
• Legal drafts contract within 5 BUSINESS DAYS of client consent
• Client receives contract for signing

INSTALLATION & COMMISSIONING (STEP 11)

After contract signing:
• Engineering team schedules and executes installation
• Installs: solar panels, inverters, and batteries
• Produces: installation report and commissioning certificate
• Client receives: system DEMONSTRATION and MAINTENANCE GUIDELINES
• System must be FULLY OPERATIONAL before handover
• Timeline: Installation within 14 DAYS of contract signing

PORTFOLIO MONITORING & RISK MANAGEMENT (ONGOING)

• Monthly repayment tracking
• Monthly portfolio stress tests
• Flagging high-risk accounts (early warning)
• Risk dashboard maintained for management
• Customer Support works with Risk team on default prevention

ONBOARDING PROCESS SUMMARY
Phase 1: Client Inquiry → Profile Creation → 24hr Contact
Phase 2: KYC Documents → 7 days
Phase 3: Credit Assessment → 5 days
Phase 4: Final Approval → 3 days
Phase 5: Technical Assessment → 7 days
Phase 6: Engineering Costings → 3 days
Phase 7: Financial Structuring → 5 days
Phase 8: Management Assessment → 3 days
Phase 9: Proposal Sending → 24 hours
Phase 10: Customer Consent → Contract Drafting 5 days
Phase 11: Installation → 14 days`,
      quiz: [
        { question: 'Credit assessment must be completed within:', options: ['2 days', '5 days', '7 days', '10 days'], answer: '5 days', explanation: 'Credit assessment must be completed within 5 BUSINESS DAYS of KYC receipt.', difficulty: 'easy' },
        { question: 'Who must sign off on the final credit approval?', options: ['CRO only', 'Credit & Risk Officer only', 'Executive management', 'The client'], answer: 'Executive management', explanation: 'The Credit Evaluation Summary is reviewed and approved by EXECUTIVE MANAGEMENT.', difficulty: 'medium' },
        { question: 'Site assessment must be completed within how many days of credit approval?', options: ['3 days', '5 days', '7 days', '14 days'], answer: '7 days', explanation: 'Technical site assessment must be completed within 7 BUSINESS DAYS of credit approval.', difficulty: 'medium' },
        { question: 'Installation must be completed within how many days of contract signing?', options: ['7 days', '10 days', '14 days', '21 days'], answer: '14 days', explanation: 'Installation must be completed within 14 DAYS of contract signing.', difficulty: 'medium' },
        { question: 'Portfolio monitoring is conducted:', options: ['Once at project start', 'Quarterly only', 'Monthly throughout the loan tenure', 'Annually'], answer: 'Monthly throughout the loan tenure', explanation: 'Monthly monitoring throughout the loan tenure tracks repayment and flags risks.', difficulty: 'easy' },
        { question: 'The BoQ term sheet is prepared by:', options: ['Finance team', 'Credit & Risk team', 'Engineering team', 'Legal team'], answer: 'Engineering team', explanation: 'The Engineering team uses the site assessment to generate the BoQ and term sheet.', difficulty: 'medium' },
      ],
    },
  ],
};
course5.exam = buildExam(course5.modules, 20);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 6: SSM Swap Station SOP
// ─────────────────────────────────────────────────────────────────────────────
const course6 = {
  title: 'Swap Station Mobility (SSM) – Operations SOP',
  description: 'Complete Standard Operating Procedure for Swap Station Mobility Limited: station setup, battery charging/swapping, EV bike management, safety, and customer service.',
  level: 'intermediate',
  assetco: 'SSM',
  required: false,
  tags: ['SSM', 'EV', 'battery', 'swap', 'operations', 'SOP', 'electric vehicle'],
  passingScore: 75,
  modules: [
    {
      title: 'SSM Introduction, Responsibilities & Station Setup',
      order: 1,
      estimatedMinutes: 15,
      objectives: ['State the SSM SOP objective and scope', 'List staff responsibilities', 'Follow daily station setup procedures'],
      content: `SWAP STATION MOBILITY LIMITED (SSM) — SOP

Document: Version 1.0 | Last Update: January 13, 2025

WHAT IS SSM?
Swap Station Mobility Limited is an electric vehicle and battery swapping infrastructure company that:
• Enables access to LOW-COST, CLEAN mobility alternatives to ICE (Internal Combustion Engine) vehicles
• Provides EVs and battery-swapping infrastructure
• Aims to REPLACE ICE vehicles with cleaner alternatives

COMPLIANCE & STANDARDS
SSM has a robust Environmental and Social Management System (ESMS) complying with:
• IFC Performance Standards
• AfDB Integrated Safeguards
• ISO 14001 (Environmental Management)
• UN Guiding Principles on Business and Human Rights
• International Labour Organisation (ILO) guidelines
• Relevant EV and battery-swapping industry guidelines

SOP OBJECTIVE
Provide clear guidelines for SSM swap station operations to ensure:
• UNIFORMITY across all locations
• EFFICIENCY in service delivery
• SAFETY in all operations

SCOPE: Battery handling, customer service, maintenance, and data management

STAFF RESPONSIBILITIES

1. STATION PROJECT MANAGER
• Oversee all station operations
• Ensure staff adherence to SOP
• Manage inventory of charged batteries
• Weekly review of station performance metrics

2. TECHNICIANS
• Perform maintenance on EV bikes and batteries
• Ensure functionality of swapping stations
• Conduct scheduled maintenance per maintenance plan

3. CUSTOMER SERVICE REPRESENTATIVES (CSRs)
• Handle customer inquiries
• Manage subscription accounts
• Provide assistance during the swapping process

STATION SETUP AND MAINTENANCE

DAILY OPENING ROUTINE
✓ Ensure station is CLEAN and ORGANIZED
✓ Check ALL EQUIPMENT for functionality
✓ Confirm sufficient inventory of CHARGED BATTERIES

REGULAR MAINTENANCE
• Weekly INSPECTIONS of swapping equipment
• Monthly MAINTENANCE for all EV bikes
• Replace or repair faulty equipment PROMPTLY`,
      quiz: [
        { question: 'What is SSM\'s primary purpose?', options: ['Manufacture solar panels', 'Provide EV and battery swapping infrastructure to replace ICE vehicles', 'Finance housing projects', 'Install mini-grids'], answer: 'Provide EV and battery swapping infrastructure to replace ICE vehicles', explanation: 'SSM provides electric vehicles and battery-swapping infrastructure to replace ICE vehicles with clean alternatives.', difficulty: 'easy' },
        { question: 'Who oversees station operations at SSM?', options: ['Technicians', 'CSRs', 'Station Project Manager', 'CEO'], answer: 'Station Project Manager', explanation: 'The Station Project Manager oversees all station operations and ensures SOP adherence.', difficulty: 'easy' },
        { question: 'EV bikes receive scheduled maintenance:', options: ['Weekly', 'Monthly', 'Quarterly', 'Annually'], answer: 'Monthly', explanation: 'EV bikes are scheduled for monthly maintenance.', difficulty: 'easy' },
        { question: 'SSM complies with which ISO standard for environmental management?', options: ['ISO 9001', 'ISO 14001', 'ISO 27001', 'ISO 45001'], answer: 'ISO 14001', explanation: 'SSM complies with ISO 14001 — the international standard for Environmental Management Systems.', difficulty: 'medium' },
        { question: 'What does ICE stand for in SSM\'s context?', options: ['Intelligent Charging Equipment', 'Internal Combustion Engine', 'International Clean Energy', 'Integrated Charging Exchange'], answer: 'Internal Combustion Engine', explanation: 'ICE = Internal Combustion Engine — the traditional fossil fuel-powered vehicle engine SSM replaces.', difficulty: 'easy' },
      ],
    },
    {
      title: 'Battery Operations, EV Management & Safety Procedures',
      order: 2,
      estimatedMinutes: 25,
      objectives: ['Follow correct battery charging and swapping procedures', 'Manage EV fleet properly using both models', 'Apply emergency response protocols correctly'],
      content: `BATTERY CHARGING PROTOCOL

Step 1: INSPECT batteries before charging (check status)
Step 2: Connect used batteries to charging station SAFELY (ensure proper connection)
Step 3: MONITOR charging status regularly (avoid overcharging)
Step 4: Once fully charged, DISCONNECT from charger
Step 5: Store properly in SECURE, TEMPERATURE-CONTROLLED environment

Key Rules:
• Use APPROVED CHARGERS ONLY
• Monitor to avoid OVERCHARGING (damages battery life)
• Monitor via Battery Management System (BMS)

BATTERY SWAPPING PROCESS

STEP 1 — CUSTOMER CHECK-IN
• Verify customer IDENTITY
• Verify customer SUBSCRIPTION STATUS
• Guide customer to appropriate swapping station

STEP 2 — SWAPPING PROCEDURE
• Ensure EV bike is POWERED OFF before swapping (prevent electrical hazard)
• Check COMPATIBILITY of customer's battery with available stock
• Inspect battery for any DAMAGE or issues
• Remove DEPLETED battery
• Replace with FULLY CHARGED battery
• Confirm new battery is SECURELY INSTALLED

STEP 3 — CUSTOMER CHECK-OUT
• Record battery swap in the SYSTEM
• Provide customer with RECEIPT
• Confirm next swap date (if applicable)

EV BIKE AND BATTERY MANAGEMENT

LEASE-TO-OWN MODEL MANAGEMENT
• All riders must sign LEASE AGREEMENT outlining terms
• Conduct QUARTERLY REVIEWS of rider adherence:
  - Maintenance responsibilities
  - Payment schedules
• At lease end: Verify ALL CONDITIONS met before transferring OWNERSHIP

RENTAL MODEL MANAGEMENT — Fleet Inspection
• Daily checks for VISIBLE DAMAGE
• Scheduled maintenance per lease agreement
• Log ALL repairs and maintenance activities

Fleet Management:
• Maintain up-to-date list: status, location, maintenance history
• Plan maintenance based on USAGE DATA
• Ensure bikes are CLEANED and SANITIZED (rental use)

Battery Management:
• Monitor BMS for charging cycles
• Charge in SAFE, CONTROLLED environment
• Adhere to all safety protocols

STATION AUDIT (Weekly)
Review station performance metrics:
• Swap times
• Downtime
• User satisfaction

DATA LOGGING AND ANALYTICS
• Maintain records: battery performance, swap frequency, bike usage
• Use analytics to ANTICIPATE maintenance needs
• Schedule PROACTIVE servicing

SAFETY AND EMERGENCY PROCEDURES

SAFETY PROTOCOL
• All staff trained in handling batteries SAFELY
• Maintain SAFE DISTANCE between charging stations and FLAMMABLE materials
• All staff wear appropriate PPE

EMERGENCY RESPONSE

Fire or Chemical Spill:
1. Follow EMERGENCY EVACUATION plan
2. Contact EMERGENCY SERVICES immediately
3. Provide FIRST AID as necessary
4. Report incident to STATION MANAGER

Battery Malfunction:
1. ISOLATE affected battery
2. EVACUATE if necessary
3. Expert handling of malfunction
4. Report to Station Manager

CUSTOMER SERVICE GUIDELINES
• Greet customers WARMLY and assist PROMPTLY
• Address complaints with PROFESSIONALISM
• Encourage FEEDBACK
• Use feedback for CONTINUOUS IMPROVEMENTS

DOCUMENTATION & COMPLIANCE
• Record ALL transactions and maintenance
• Compile: station performance, battery lifecycle, user statistics, incidents
• Adhere to ALL local and national EV regulations
• Review SOP ANNUALLY — update based on operational needs and regulatory changes`,
      quiz: [
        { question: 'Before swapping a battery, the EV bike must be:', options: ['Fully charged', 'Powered off', 'Inspected by manager', 'Cleaned first'], answer: 'Powered off', explanation: 'The EV bike must be POWERED OFF before swapping to prevent electrical hazard.', difficulty: 'easy' },
        { question: 'During customer check-in for battery swap, staff verify:', options: ['Customer\'s home address', 'Customer identity AND subscription status', 'Customer\'s employment', 'Customer\'s vehicle registration only'], answer: 'Customer identity AND subscription status', explanation: 'Both IDENTITY and SUBSCRIPTION STATUS must be verified during check-in.', difficulty: 'easy' },
        { question: 'Batteries must be stored in:', options: ['Any convenient location', 'Secure, temperature-controlled environment', 'Outdoor storage areas', 'The swap station lobby'], answer: 'Secure, temperature-controlled environment', explanation: 'Charged batteries must be stored in a SECURE, TEMPERATURE-CONTROLLED environment.', difficulty: 'medium' },
        { question: 'In a battery malfunction, the FIRST action is to:', options: ['Call the CEO', 'Wait for it to stabilize', 'Isolate the affected battery', 'Continue operations normally'], answer: 'Isolate the affected battery', explanation: 'In battery malfunction, the battery must be ISOLATED first.', difficulty: 'medium' },
        { question: 'Weekly station audits review:', options: ['Staff salaries', 'Swap times, downtime, and user satisfaction', 'Monthly financial reports', 'Equipment purchase costs'], answer: 'Swap times, downtime, and user satisfaction', explanation: 'Weekly audits review swap times, downtime, and user satisfaction as key metrics.', difficulty: 'medium' },
        { question: 'The SSM SOP must be reviewed how often?', options: ['Monthly', 'Quarterly', 'Annually', 'Every 3 years'], answer: 'Annually', explanation: 'The SSM SOP must be reviewed annually and updated based on operational needs and regulatory changes.', difficulty: 'easy' },
      ],
    },
  ],
};
course6.exam = buildExam(course6.modules, 15);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 7: Agronomie – Agro-Tech, PuE & Black Soldier Fly
// ─────────────────────────────────────────────────────────────────────────────
const course7 = {
  title: 'Agronomie – Agro-Tech, PuE Projects & Black Soldier Fly Model',
  description: 'Understand Agronomie\'s mandate, Hub & Spoke model, portfolio of projects, BSF sustainable business model, partner network, and key lessons from field deployments.',
  level: 'expert',
  assetco: 'Agronomie',
  required: false,
  tags: ['Agronomie', 'PuE', 'agro', 'BSF', 'sustainability', 'rural', 'Hub & Spoke'],
  passingScore: 70,
  modules: [
    {
      title: 'Agronomie Overview, Mission & Business Model',
      order: 1,
      estimatedMinutes: 20,
      objectives: ['Describe Agronomie\'s mandate and mission', 'Explain the Hub & Spoke model', 'List Agronomie\'s core competencies and target sectors'],
      content: `AGRONOMIE — WHO WE ARE

Agronomie is a SPECIALISED AGRO-TECH COMPANY that:
• Aggregates and accelerates access to finance for agro-productive use of clean energy from solar mini-grids
• Uses an innovative mix of productive asset financing, training, and technology-based asset management
• Expands rural economies in Nigeria at scale

MANDATE
Origination and management of Productive Use of Energy (PuE) infrastructure, deal structuring, and portfolio management.

MISSION
To innovatively unlock domestic finance for small and medium-sized infrastructure in unserved and under-served sectors that:
• Provide essential services to society
• Are recession-resilient
• Demonstrate long-term viability with predictable cashflows
• Reduce the impact of climate change

WHAT AGRONOMIE PROVIDES (End-to-End Solutions)
1. Procurement of productive use agro-processing equipment
2. Operation of equipment
3. Maintenance of equipment

THE HUB & SPOKE BUSINESS MODEL

HUB (Centralized):
• Remote ASSET CONTROL of all productive use assets
• Remote MONITORING via tech platform
• IoT-enabled management

SPOKE (Localized):
• OPERATIONS of productive assets in communities
• MAINTENANCE teams on the ground
• Community engagement and farmer training

Why Hub & Spoke Works:
• Enables large-scale portfolio management across Nigeria
• Remote monitoring reduces travel costs
• Local teams maintain community relationships
• Scalable: Hub stays the same; add more Spokes

CORE COMPETENCIES

1. PROJECT MANAGEMENT
Strategic planning, team collaboration, resource optimization, risk management, quality assurance, communication excellence, compliance. Partners with Farm Warehouse for effective O&M.

2. NEEDS ASSESSMENT
• Comprehensive feasibility analysis for PuE solutions
• Engaging local stakeholders for tailored solutions
• Assessing local resources, energy demands, infrastructure, economic viability
• Environmental impact analysis
• Training needs identification
• Government and NGO collaboration
• COMPLETED: 20 needs assessments across Abia, Benue, Cross River, Edo, Plateau, and Ondo

3. PROCUREMENT
• Robust network of local and international OEM suppliers
• High-quality materials for reliability and longevity
• Streamlined procurement to meet timelines and budgets

4. OPERATION & MAINTENANCE (with Farm Warehouse)
• Comprehensive O&M services
• Latest diagnostic tools
• Preventive maintenance protocols to minimize downtime

5. GEOGRAPHICAL REACH
• Projects across multiple Nigerian states
• Navigates diverse landscapes and regulatory environments

TARGET AGRICULTURAL SECTORS
• Crop processing (cassava, rice, oil palm, flour)
• Cold storage
• Milling (grain, flour)

OUR ACTIVITIES FLOW
Investment into Agronomie SPV →
SPV enters strategic partnership with OEMs & O&M providers →
Agro assets availed under Asset-as-a-Service (AaS) lease →
Long-term asset lease contracts with off-takers →
Power Purchase Agreement with mini-grid operators →
Credit enhancement through guarantees →
Debt financing raised to grow portfolio`,
      quiz: [
        { question: 'Agronomie\'s Hub & Spoke model has a centralized hub for:', options: ['Community meetings', 'Remote asset control and monitoring', 'Equipment manufacturing', 'Customer service only'], answer: 'Remote asset control and monitoring', explanation: 'The Hub is the centralized tech hub for REMOTE ASSET CONTROL and MONITORING via IoT.', difficulty: 'easy' },
        { question: 'Agronomie has completed how many needs assessments?', options: ['10', '15', '20', '25'], answer: '20', explanation: 'Agronomie has completed 20 needs assessments across six Nigerian states.', difficulty: 'medium' },
        { question: 'Agronomie\'s mandate includes:', options: ['Manufacturing equipment', 'PuE infrastructure origination, deal structuring, portfolio management', 'Writing government policy', 'Providing housing finance'], answer: 'PuE infrastructure origination, deal structuring, portfolio management', explanation: 'Agronomie\'s mandate explicitly includes PuE infrastructure origination, deal structuring, and portfolio management.', difficulty: 'medium' },
        { question: 'Which company is Agronomie\'s O&M implementation partner?', options: ['GVE', 'Darway Coast', 'Farm Warehouse', 'AquaEarth'], answer: 'Farm Warehouse', explanation: 'Farm Warehouse is Agronomie\'s O&M partner responsible for field implementation and maintenance.', difficulty: 'medium' },
        { question: 'Agronomie\'s target agricultural sectors include:', options: ['Livestock farming only', 'Crop processing, cold storage, and milling', 'Fisheries and aquaculture only', 'Floriculture and horticulture'], answer: 'Crop processing, cold storage, and milling', explanation: 'Agronomie targets crop processing, cold storage, and milling as primary agricultural sectors.', difficulty: 'easy' },
      ],
    },
    {
      title: 'Agronomie Portfolio Projects & Partner Network',
      order: 2,
      estimatedMinutes: 20,
      objectives: ['Describe key Agronomie portfolio projects', 'Identify Agronomie\'s partners', 'List local and international OEMs'],
      content: `AGRONOMIE PORTFOLIO PROJECTS

1. ANGWAN RINA, PLATEAU STATE
a) Needs Assessment for electrification viability and PuE feasibility
b) PuE Agro-Processing PILOT project commissioned
c) Supply, installation, commissioning, and management of Milling Processing Plant
d) Partnership with Mini-Grid Developer: GVE
Key outcomes: Tested MoU with mini-grid; assessed and onboarded agro-processors for lease; managed procurement, implementation, and O&M

2. CALABAR (DARWAY COAST), CROSS RIVER
• Needs assessment of 4 unserved/unelectrified communities
• Synchronized with Darway Coast Mini-Grid operations
• Status: Assessment and procurement planning complete — awaiting mini-grid readiness to deploy PuE assets
• MoU signed with Darway Coast

3. ABIA, BENUE, EDO, ONDO & RIVERS (AQUAEARTH/INFRACREDIT)
• Collaboration with AquaEarth for Infracredit
• 9 unserved/unelectrified communities assessed
• Three mini-grid developer partners: Darway Coast, ACOB, Prado
• Activities: needs assessment, agro-processor onboarding, procurement planning

4. ONDO STATE — GREEN KIOSK PROJECT
• Collaboration with Hotspot Network Limited
• Power Utilization Efficiency (PUE) Green Kiosk pilot
• Combines sustainable electrification with advanced telecommunications
• Financial services provided by Agronomie to support Hotspot Network

MINI-GRID DEVELOPER PARTNERS
• GVE — Renewable energy solutions for unserved/underserved communities
• Darway Coast — Sustainable, cost-effective energy for businesses and households
• ACOB Lighting — Clean, affordable, sustainable power through renewable solutions

ESG CONSULTANT
• AquaEarth — Environmental and social advisory services

RURAL TELEPHONY
• Hotspot Network Limited — Wireless communication and broadcast network

LOCAL OEMs
• Bennie Agro Ltd (Nigeria) — Renowned agro machinery manufacturer
• Niji LuKas Group (Nigeria) — Value-driven conglomerate; end-to-end agriculture solutions
• Nova Technologies (Nigeria) — High-quality agricultural and cottage industrial machinery
• Okeke Casmir Enterprise (Nigeria) — Global brand; agro manufacturing and industrial equipment
• Best Royal Agro (Nigeria) — Food production, processing, agricultural equipment
• Zebra Milling (Nigeria) — Sustainable technology for rural agricultural tasks
• Alayan Metal Fabrication (Nigeria) — Agricultural machine fabrication (Lagos)
• Dominion Industrial Services (Nigeria) — Agricultural machine fabrication (Lagos)

INTERNATIONAL OEMs
• DOINGS Group (China) — Cassava processing and starch/flour processing equipment; warehouse in Nigeria
• Farm Warehouse (Canada) — Indigenous highly efficient, cost-effective agro machines
• Zhengzhou Maosu Machinery Co., Ltd (China) — Development, design, manufacture of food machinery
• China Impact Sourcing (China) — End-to-end supply chain for off-grid market
• ECOM Group / Micromec — Integrated business in 40+ major producing countries

SYSTEMS SPECIALIST PARTNERS
• UnoTelos — Multi-systems integrator; customized networks and VAS solutions
• PowerTech Nigeria Limited — Design, build, manage networks and software solutions
• Transilient Technologies Limited — Electro-mechanical engineering; manufacturing, telecoms, industrial`,
      quiz: [
        { question: 'What was the key lesson from the Angwan Rina project?', options: ['Mini-grids are too expensive', 'The imperative of synergy among key stakeholders', 'Community engagement is optional', 'Foreign equipment is better'], answer: 'The imperative of synergy among key stakeholders', explanation: 'Angwan Rina taught Agronomie the vital necessity for synergy among all key stakeholders.', difficulty: 'medium' },
        { question: 'The Calabar project is in partnership with which mini-grid developer?', options: ['GVE', 'ACOB', 'Darway Coast', 'Prado'], answer: 'Darway Coast', explanation: 'The Calabar project is synchronized with Mini-Grid operations in partnership with Darway Coast.', difficulty: 'medium' },
        { question: 'Farm Warehouse is based in:', options: ['Nigeria', 'China', 'Canada', 'United Kingdom'], answer: 'Canada', explanation: 'Farm Warehouse is a Canadian company renowned for designing and constructing indigenous agro machines.', difficulty: 'medium' },
        { question: 'DOINGS Group specializes in:', options: ['Electric vehicles', 'Cassava processing and starch/flour processing equipment', 'Solar panels', 'Battery storage systems'], answer: 'Cassava processing and starch/flour processing equipment', explanation: 'DOINGS Group (China) specializes in comprehensive starch and flour processing including cassava processing equipment.', difficulty: 'medium' },
        { question: 'The Ondo State project involves collaboration with:', options: ['GVE', 'Darway Coast', 'Hotspot Network Limited', 'AquaEarth'], answer: 'Hotspot Network Limited', explanation: 'The Ondo State PUE Green Kiosk Project is a collaboration with Hotspot Network Limited.', difficulty: 'easy' },
      ],
    },
    {
      title: 'Black Soldier Fly (BSF) Sustainable Business Model',
      order: 3,
      estimatedMinutes: 20,
      objectives: ['Explain the BSF business model and why it was developed', 'List BSF social and environmental benefits', 'Describe the BSF implementation process from waste to product'],
      content: `BLACK SOLDIER FLY (BSF) — A SUSTAINABLE JOB REPLACEMENT SOLUTION

WHY BSF?
Under Agronomie's ESG component, job creation is critical. However, assessment across 20 communities showed that electrification and mechanization could lead to JOB LOSS for existing manual laborers at agro-processing locations.

The challenge: Introduce labor-saving machines WITHOUT displacing communities.
The solution: BSF farming — because it:
• Requires NO SPECIAL SKILLS
• Can be implemented in EVERY COMMUNITY
• Is SUSTAINABLE as an income source
• ADDS VALUE to the SDGs
• Is COMPLEMENTARY (not competitive) to mechanized agro-processing

THE BSF BUSINESS MODEL — 5 COMPONENTS

1. WASTE COLLECTION AND SEGREGATION
Sources of organic waste:
• Farms (crop residues, animal waste)
• Markets (vegetable waste, food scraps)
• Agro-processing plants (processing residue)

2. BSF BREEDING AND REARING

Breeding Facility:
• Established where adult BSFs can lay eggs
• Provides optimal conditions:
  - Controlled TEMPERATURE
  - Controlled HUMIDITY
  - Adequate SHELTER

Larvae Rearing:
• Eggs hatch → larvae reared in CONTROLLED ENVIRONMENTS
• Larvae FEED ON collected organic waste
• Convert waste into PROTEIN-RICH BIOMASS

3. HARVESTING AND PROCESSING

Harvesting Maggots:
• Larvae harvested at PEAK NUTRITIONAL VALUE
• Processed into: dried maggot meal OR fresh maggots
• Use: HIGH-QUALITY ANIMAL FEED for livestock

Residual Waste Processing:
• After larvae consume organic waste, residue → HIGH-QUALITY ORGANIC FERTILIZER

4. TRAINING AND CAPACITY BUILDING
Training programs for local communities covering:
• BSF farming techniques
• Waste management practices
• Business skills development

5. QUALITY CONTROL AND ASSURANCE
• STRICT quality control for animal feed safety and nutritional value
• REGULAR testing of organic fertilizer:
  - Nutrient content verification
  - Pathogen level testing
• Guarantee effectiveness and safety

SOCIAL AND ENVIRONMENTAL BENEFITS

JOB CREATION
• Direct: BSF breeding, rearing, processing, facility maintenance
• Indirect: Waste collection, transport, marketing, distribution

WASTE MANAGEMENT
• Significant REDUCTION in organic waste
• Mitigates environmental pollution and greenhouse gas emissions
• Resource Recovery: waste → valuable resources (CIRCULAR ECONOMY)

FOOD SECURITY
• Sustainable Animal Feed: affordable, high-quality feed for livestock
• Enhanced livestock PRODUCTIVITY
• Improved FOOD SECURITY
• Soil Health: organic fertilizer improves soil fertility → increased crop yields

COMMUNITY EMPOWERMENT
• Capacity Building through training in BSF farming and waste management
• Economic Development: stimulates local economies
• Creates NEW MARKETS and business opportunities
• Ideal for WOMEN AND YOUTH (no special skills required)

SDG ALIGNMENT
• SDG 1 (No Poverty): income generation
• SDG 2 (Zero Hunger): improved food security
• SDG 8 (Decent Work): job creation
• SDG 12 (Responsible Consumption): waste reduction, circular economy
• SDG 13 (Climate Action): reduced emissions

CURRENT STATUS
Agronomie is conducting a PILOT of the BSF business model with plans to adopt across the entire portfolio.`,
      quiz: [
        { question: 'Why did Agronomie develop the BSF business model?', options: ['To replace solar energy', 'To address job losses from electrification at agro-processing sites', 'To compete with existing animal feed producers', 'To expand into fisheries'], answer: 'To address job losses from electrification at agro-processing sites', explanation: 'BSF was identified to prevent job losses that could result from introducing mechanized agro-processing equipment.', difficulty: 'medium' },
        { question: 'BSF larvae are harvested at:', options: ['Any size', 'Peak nutritional value', 'Maximum weight only', 'Two weeks old specifically'], answer: 'Peak nutritional value', explanation: 'Larvae are harvested specifically at their PEAK NUTRITIONAL VALUE to maximize animal feed quality.', difficulty: 'medium' },
        { question: 'Organic waste for BSF comes from:', options: ['Factories only', 'Farms, markets, and agro-processing plants', 'Hospitals only', 'Households only'], answer: 'Farms, markets, and agro-processing plants', explanation: 'Organic waste is sourced from FARMS, MARKETS, and AGRO-PROCESSING PLANTS.', difficulty: 'easy' },
        { question: 'After larvae consume organic waste, the residue becomes:', options: ['More organic waste', 'High-quality organic fertilizer', 'Animal feed directly', 'Biodiesel'], answer: 'High-quality organic fertilizer', explanation: 'The residual material after larvae processing = HIGH-QUALITY ORGANIC FERTILIZER.', difficulty: 'easy' },
        { question: 'The BSF business model supports which circular economy principle?', options: ['Linear production', 'Waste as a resource (waste → protein + fertilizer)', 'Reducing production volume only', 'Eliminating agriculture'], answer: 'Waste as a resource (waste → protein + fertilizer)', explanation: 'BSF embodies circular economy by transforming waste into valuable resources.', difficulty: 'medium' },
        { question: 'BSF breeding facilities must maintain which conditions?', options: ['Hot and dry only', 'Controlled temperature, humidity, and shelter', 'Cold and wet only', 'High light exposure only'], answer: 'Controlled temperature, humidity, and shelter', explanation: 'Breeding facilities must maintain controlled temperature, humidity, and adequate shelter.', difficulty: 'medium' },
      ],
    },
    {
      title: 'Lessons Learnt: Synergy & the Angwan Rina Fabrication Challenge',
      order: 4,
      estimatedMinutes: 10,
      objectives: ['Apply synergy principles from the Angwan Rina experience', 'Prevent fabrication errors through mandatory collaboration'],
      content: `LESSONS LEARNT FROM ANGWAN RINA, PLATEAU STATE

CONTEXT
Agronomie's journey in Angwan Rina, Plateau State, stands as a pivotal chapter that propelled Agronomie to new heights in service delivery. Among the valuable lessons learned, one has emerged as the catalyst for Agronomie's commitment to excellence: the IMPERATIVE OF SYNERGY AMONG KEY STAKEHOLDERS.

THE CORE LESSON — 100% SYNERGY
In Angwan Rina, Agronomie witnessed the TRANSFORMATIVE POWER OF COLLABORATION.

The vital necessity for SEAMLESS SYNERGY among all key parties:
1. Mini-Grid Developers
2. Agricultural Experts
3. Engineering/Fabricators/OEMs
4. Energy Experts

This realization became the CORNERSTONE of Agronomie's approach to ensuring efficient and effective installation and commissioning of Agro Productive Use Energy projects.

THE FABRICATION CHALLENGE — STARTUP LOAD MISMATCH

What happened:
• An Engineer, WITHOUT aligning with the Energy Expert and Mini-Grid Developer
• UNILATERALLY altered the agreed horsepower of an engine from 3hp to 5hp
• This deviation seemed minor at the time

Post-installation revelation:
• The STARTUP LOAD surpassed the Mini-Grid's capacity
• This led to FREQUENT TRIPPING of the mini-grid
• The system could not function properly for the community

Could this have been prevented? YES — had synergy been a guiding principle:
• The change would have been IDENTIFIED collaboratively
• DISCUSSED during planning phase
• MITIGATED BEFORE installation

The Cost of Poor Synergy:
• Community suffered power disruptions
• Retrofit costs incurred
• Trust with community damaged
• Project delays

INCORPORATING SYNERGY FROM ONSET — THE BEDROCK

Current approach:
• Mini-Grid Developers and Energy Experts included from PROJECT ONSET
• Potential challenges DISCUSSED, FORESEEN, and MITIGATED collectively
• Perspectives aligned from the BEGINNING
• Continuous improvement enabled
• Culture of SHARED RESPONSIBILITY fostered

This lesson has become the BEDROCK of Agronomie's commitment to exceptional service delivery.

"Through fostering collaboration, we not only address challenges before they arise but also create an environment where collective expertise converges for the success of each project."

The Angwan Rina experience transformed into a GUIDING BEACON — propelling Agronomie toward an era of service delivery excellence.`,
      quiz: [
        { question: 'In the Angwan Rina incident, what did the engineer change without consultation?', options: ['The type of solar panels', 'The horsepower from 3hp to 5hp', 'The battery capacity', 'The number of distribution poles'], answer: 'The horsepower from 3hp to 5hp', explanation: 'The engineer unilaterally changed the engine from 3hp to 5hp without consulting the Energy Expert or Mini-Grid Developer.', difficulty: 'medium' },
        { question: 'What was the direct consequence of the fabrication error?', options: ['Panels stopped generating power', 'Startup load exceeded mini-grid capacity causing frequent tripping', 'Batteries overcharged', 'Community refused to use the system'], answer: 'Startup load exceeded mini-grid capacity causing frequent tripping', explanation: 'The 5hp motor\'s startup load surpassed the mini-grid\'s capacity, causing frequent tripping.', difficulty: 'medium' },
        { question: 'Agronomie\'s lesson states stakeholders must be involved:', options: ['Only at the end for sign-off', 'From project onset', 'Only when problems arise', 'Once per quarter'], answer: 'From project onset', explanation: 'The key lesson: all stakeholders must be incorporated FROM PROJECT ONSET.', difficulty: 'easy' },
        { question: 'Which four stakeholders must collaborate for effective PuE installations?', options: ['Only engineers', 'Mini-Grid Developers, Agricultural Experts, Engineering/Fabricators/OEMs, Energy Experts', 'Only the community leaders', 'Only financiers'], answer: 'Mini-Grid Developers, Agricultural Experts, Engineering/Fabricators/OEMs, Energy Experts', explanation: 'All four groups must collaborate: Mini-Grid Developers, Agricultural Experts, Engineering/Fabricators/OEMs, and Energy Experts.', difficulty: 'medium' },
      ],
    },
  ],
};
course7.exam = buildExam(course7.modules, 25);

// =============================================================================
// SEED FUNCTION
// =============================================================================

// =============================================================================
// COURSES 8-12 (All levels — GreenKiosk, Office, Finance, Procurement, EML Field)
// =============================================================================
const course8 = {
  title: 'GreenKiosk – Accelerating Rural Energy Access',
  description: 'Understand the GreenKiosk concept note: rationale, SDG alignment, implementation strategy, business model, financial plan, scalability, and risk mitigation for rural energy access in Nigeria.',
  level: 'expert',
  assetco: 'General',
  required: false,
  tags: ['green kiosk', 'rural', 'energy', 'PuE', 'SDGs', 'women', 'empowerment', 'Nigeria'],
  passingScore: 70,
  modules: [
    {
      title: 'Executive Summary, Problem Statement & Rationale',
      order: 1,
      estimatedMinutes: 20,
      objectives: ['Explain Nigeria\'s energy access gap and the 2030 target', 'Describe the GreenKiosk solution', 'State the rationale for standalone kiosks vs mini-grids'],
      content: `ACCELERATING ACCESS TO ENERGY IN NIGERIA

EXECUTIVE SUMMARY
Nigeria aspires to close the energy access gap in rural communities from the current 40% with no access to electricity to LESS THAN 20% BY 2030.

To achieve this:
• Over 200,000 mini-grids needed across remote locations
• Many locations are NOT VIABLE for standard mini-grid development
• These communities still need electricity

THE GREENKIOSK SOLUTION
A standalone solar-powered energy kiosk that provides:
• ELECTRICITY for productive use (PUE) activities
• TELECOMMUNICATION CONNECTION
• Centralized hub for community energy services

PROBLEM STATEMENT

Scale of Challenge:
• Over 80 MILLION Nigerians lack reliable electricity
• Predominantly rural, remote, underserved areas
• Energy deficit limits: education, healthcare, income opportunities

Current Energy Sources (harmful):
• Costly kerosene lamps
• Petrol/diesel generators
• Environmentally harmful → continuous GHG emissions
• Exacerbates poverty cycles and underdevelopment

Why Mini-Grids Can't Solve Everything:
• DISPERSED, LOW-DENSITY settlements → hard to aggregate demand
• HIGH UPFRONT COSTS for infrastructure
• Limited ability of rural communities to PAY
• Result: Significant UNMET DEMAND for affordable, clean, reliable energy

RATIONALE FOR STANDALONE SOLAR-POWERED KIOSKS

Where mini-grids are NOT viable:
• Low population density
• Dispersed households
• Limited commercial energy demand

Standalone kiosks offer:
• Serve as CENTRALIZED HUBS for energy services
• Enable: lighting, mobile charging, refrigeration, powering small businesses
• Serve multiple communities within 5-10 km RADIUS
• COST-EFFECTIVE and FAST alternative for remote electrification
• Promotes economic growth and community resilience

MOBILE PHONES — THE ANCHOR PUE
According to NCC (Nigerian Communications Commission):
• Over 205 MILLION active mobile phone connections in Nigeria
• 99% of people aged 16-64 have a mobile phone
• Phone charging = the ANCHOR productive use activity for GreenKiosk

SERVICES PROVIDED BY GREENKIOSK (6 categories)
1. Phone and battery charging
2. Cold storage for beverages and perishables
3. Business Centres — Internet access and administrative tasks
4. Retail outlet (grocery, essentials)
5. Barbing Salon / Hair styling
6. Entertainment viewing centre

REVENUE GENERATION

Primary Revenue:
• Sale of POWER AS A SERVICE for PUE activities

Additional Revenue Sources:
1. Sale of rechargeable household appliances (lamps, fans, home entertainment)
2. Sale of Solar Home Systems (SHS)

TARGET AUDIENCE — WOMEN AND YOUTH
Women:
• Disproportionately affected by energy poverty
• Leverage kiosks to power small businesses
• Reduce household energy costs
• Advance empowerment and gender equality

Youth:
• Build entrepreneurial skills
• Create sustainable livelihoods
• Drive community innovation`,
      quiz: [
        { question: 'Nigeria\'s energy access gap target by 2030 is:', options: ['Full 100% access', 'Less than 20% without access', 'Less than 40% without access', '50% access'], answer: 'Less than 20% without access', explanation: 'Nigeria aims to reduce the proportion with no electricity from 40% to LESS THAN 20% by 2030.', difficulty: 'easy' },
        { question: 'How many Nigerians currently lack reliable electricity?', options: ['40 million', '60 million', '80 million', '120 million'], answer: '80 million', explanation: 'Over 80 MILLION Nigerians, predominantly in rural areas, lack reliable electricity.', difficulty: 'easy' },
        { question: 'GreenKiosk serves communities within what radius?', options: ['1-2 km', '2-5 km', '5-10 km', '10-20 km'], answer: '5-10 km', explanation: 'Energy kiosks serve multiple small communities within a 5-10 km radius.', difficulty: 'medium' },
        { question: 'What percentage of Nigerians aged 16-64 have a mobile phone?', options: ['75%', '85%', '90%', '99%'], answer: '99%', explanation: 'According to NCC, 99% of people aged 16-64 in Nigeria have a mobile phone.', difficulty: 'medium' },
        { question: 'GreenKiosk\'s primary revenue source is:', options: ['Government subsidies', 'Sale of power as a service for PUE activities', 'Equipment sales only', 'Telecommunication fees'], answer: 'Sale of power as a service for PUE activities', explanation: 'Primary revenue = SELLING POWER AS A SERVICE for various PUE activities at the kiosk.', difficulty: 'easy' },
        { question: 'Why are women the primary target audience?', options: ['They have more money', 'Disproportionately affected by energy poverty; kiosks help power their businesses', 'Government policy mandates it', 'They manage kiosks better'], answer: 'Disproportionately affected by energy poverty; kiosks help power their businesses', explanation: 'Women are disproportionately affected by energy poverty; kiosks provide them business opportunities.', difficulty: 'medium' },
      ],
    },
    {
      title: 'SDG Alignment, Implementation, Financial Plan & Risk Management',
      order: 2,
      estimatedMinutes: 20,
      objectives: ['Map GreenKiosk to specific SDGs', 'Describe implementation strategy and ownership models', 'Apply risk mitigation measures'],
      content: `SDG ALIGNMENT

SDG 1 — NO POVERTY
• Facilitates income generation through productive energy use and entrepreneurship
• Reduces reliance on expensive polluting energy sources (saving household expenses)

SDG 5 — GENDER EQUALITY
• Empowers women by prioritizing them as kiosk operators and entrepreneurs
• Promotes women-led businesses through access to affordable, reliable energy

SDG 7 — AFFORDABLE AND CLEAN ENERGY
• Expands access to affordable, sustainable, and reliable energy for underserved communities

SDG 8 — DECENT WORK AND ECONOMIC GROWTH
• Stimulates local economies by enabling small businesses and value-added activities
• Provides employment in kiosk management, maintenance, and related services

SDG 13 — CLIMATE ACTION
• Reduces reliance on fossil fuels and lowers greenhouse gas emissions
• Promotes climate resilience through sustainable energy solutions

IMPLEMENTATION STRATEGY

COMMUNITY ENGAGEMENT (Phase 1)

Stakeholder Meetings:
• Engage community leaders, women's groups, cooperatives
• Understand local needs and SECURE BUY-IN

Needs Assessment:
• Surveys and focus group discussions
• Determine energy demands and productive use potential

Awareness Campaigns:
• Workshops, local events, radio programs
• Educate on clean energy benefits and kiosk operations

Partnership Development:
• Collaborate with local NGOs, schools, health centers

KEY ENGAGEMENT QUESTIONS
Energy Needs: What are primary energy needs? Current energy costs?
Community Dynamics: How many households? Main economic activities?
Financial: Affordable price? Open to lease-to-own? Payment methods?
Gender & Youth: How do women and youth participate in the economy?
Operational: Preferred kiosk locations? Logistical challenges?
Sustainability: Additional services? Women-led groups interested in managing?

OWNERSHIP MODELS
• Women-led cooperatives OR community-based organizations

LEASE-TO-OWN MODEL
• Operators LEASE kiosks with option to OWN after defined payment period
• Creates long-term ASSET OWNERSHIP opportunities for women
• Payment schedules TAILORED to match revenue cycles of local businesses

TRAINING
• Provide technical AND entrepreneurial training for kiosk operators

MAINTENANCE AND OPERATIONS
• Establish LOCAL TEAMS for kiosk maintenance and support

FINANCIAL PLAN

CAPEX (Capital Expenditure):
• Solar panels, batteries, inverters, and kiosk structure
• Initial training and marketing costs

OPEX (Operational Expenditure):
• Maintenance and replacement parts
• Employee remuneration

SCALABILITY AND REPLICATION
• Pilot Phase: 2-3 communities to refine operations
• Expansion Plan: Scale to 50+ communities within 5 years
• Priority: Regions with HIGH UNMET electricity demand
• Partnerships: NGOs, government programs, private investors

RISK ASSESSMENT AND MITIGATION

Operational Risk: Equipment failure or downtime
→ Mitigation: Establish local maintenance teams + operator training

Community Risk: Low adoption or trust
→ Mitigation: Robust community engagement + awareness campaigns

Market Risk: Insufficient revenue from services
→ Mitigation: Diversify offerings (e.g., water purification, appliance sales) + flexible pricing

Environmental Risk: Adverse weather → reduced solar production
→ Mitigation: Sufficient battery storage + hybrid energy solutions

FLOW DIAGRAM — KEY PLAYERS
1. Funding Partners → Provide funding and technical assistance
2. Local Operators (Primarily Women) → Manage day-to-day kiosk operations
3. Community Leaders → Facilitate buy-in and ensure community support
4. Community Engagement Officers → Stakeholder engagement + needs assessment surveys
5. Technical Teams (GroSolar) → Installation, maintenance, troubleshooting
6. End-Users → Access energy services + provide revenue streams`,
      quiz: [
        { question: 'GreenKiosk\'s SDG 5 contribution focuses on:', options: ['Reducing poverty', 'Empowering women as kiosk operators and entrepreneurs', 'Climate action', 'Economic growth'], answer: 'Empowering women as kiosk operators and entrepreneurs', explanation: 'SDG 5 (Gender Equality) is addressed by prioritizing WOMEN as kiosk operators and entrepreneurs.', difficulty: 'easy' },
        { question: 'Which team handles technical installation for GreenKiosk?', options: ['Agronomie technical team', 'GroSolar technical team', 'EML team', 'External contractors only'], answer: 'GroSolar technical team', explanation: 'The GreenKiosk flow diagram shows GROSOLAR technical teams handle installation, maintenance, and troubleshooting.', difficulty: 'medium' },
        { question: 'Market risk mitigation for GreenKiosk involves:', options: ['Closing the kiosk', 'Diversifying offerings and adopting flexible pricing', 'Increasing upfront fees', 'Reducing operating hours'], answer: 'Diversifying offerings and adopting flexible pricing', explanation: 'Market risk is mitigated by diversifying offerings (e.g., water purification, appliance sales) and flexible pricing.', difficulty: 'medium' },
        { question: 'Pilot phase plans to deploy kiosks in:', options: ['1 community', '2-3 communities', '5 communities', '10 communities'], answer: '2-3 communities', explanation: 'The pilot phase deploys kiosks in 2-3 communities to refine operations before scaling.', difficulty: 'easy' },
        { question: 'The Lease-to-Own model creates:', options: ['Permanent rental arrangements', 'Long-term asset ownership opportunities for women', 'Government ownership of kiosks', 'Community cooperative ownership only'], answer: 'Long-term asset ownership opportunities for women', explanation: 'The Lease-to-Own model specifically creates long-term ASSET OWNERSHIP opportunities for WOMEN operators.', difficulty: 'easy' },
        { question: 'Environmental risk is mitigated by:', options: ['Close kiosk on cloudy days', 'Sufficient battery storage plus hybrid energy solutions', 'Moving kiosk to sunnier location', 'Reducing services offered'], answer: 'Sufficient battery storage plus hybrid energy solutions', explanation: 'Environmental risk from adverse weather is mitigated by sufficient battery storage and hybrid energy solutions.', difficulty: 'medium' },
      ],
    },
  ],
};
course8.exam = buildExam(course8.modules, 20);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 9: Microsoft Office Tools
// ─────────────────────────────────────────────────────────────────────────────
const course9 = {
  title: 'Microsoft Office Tools – Word, Excel & PowerPoint',
  description: 'Comprehensive beginner-to-intermediate Microsoft Office training for all FundCo staff, covering Word, Excel, and PowerPoint with recommended video resources and practical applications.',
  level: 'beginner',
  assetco: 'General',
  required: true,
  tags: ['Microsoft', 'Word', 'Excel', 'PowerPoint', 'Office', 'productivity', 'tools'],
  passingScore: 70,
  modules: [
    {
      title: 'Microsoft Word for Professional Document Creation',
      order: 1,
      estimatedMinutes: 60,
      objectives: ['Create professional documents in Word', 'Use styles, formatting, tables, and mail merge', 'Apply formatting best practices for FundCo documents'],
      videoUrl: 'https://www.youtube.com/playlist?list=PLaQP8BdJip_XeRAWm7ccTcewEo2KEsymx',
      content: `MICROSOFT WORD — PROFESSIONAL DOCUMENT CREATION

RECOMMENDED COURSE
Microsoft Word for Beginners (Complete Course — FREE)
By: Technology for Teachers and Students
Link: https://www.youtube.com/playlist?list=PLaQP8BdJip_XeRAWm7ccTcewEo2KEsymx

WHY THIS COURSE?
This course offers clear, parallel narration with screen recordings and provides comprehensive coverage of professional document creation, including formatting, styles, tables, and mail merge.

KEY SKILLS YOU WILL LEARN

1. DOCUMENT CREATION AND FORMATTING
• Page setup: margins, orientation, paper size
• Font formatting: size, style, color, bold, italic
• Paragraph formatting: alignment, spacing, indentation
• Consistent document appearance

2. STYLES IN WORD
What are styles? Predefined formatting applied consistently throughout a document.
Benefits:
• Consistent formatting across the entire document
• Easy table of contents generation (critical for SOPs and reports)
• Professional appearance

3. TABLES
• Insert and format tables
• Merge and split cells
• Table borders and shading
• Using tables for structured data (e.g., RACI tables, maintenance checklists)

4. MAIL MERGE
What is mail merge? Creating personalized letters/documents for multiple recipients from a data source.
Process:
1. Create main document
2. Connect to data source (e.g., Excel spreadsheet)
3. Insert merge fields
4. Preview and complete merge
Use case at FundCo: Community engagement letters, client notification letters

PRACTICAL APPLICATIONS AT FUNDCO
• Writing professional emails and memos
• Creating management reports
• Drafting community engagement letters
• Preparing client proposals (Sales team)
• Formatting SOPs and policy documents
• Drafting contract templates (Legal team)

TIPS FOR PROFESSIONAL DOCUMENTS
✓ Use consistent fonts (company-standard)
✓ Maintain consistent heading styles
✓ Use spell check and grammar check before sharing
✓ Use headers and footers for multi-page documents
✓ Save as .docx for editing, .pdf for sharing
✓ Use Track Changes when reviewing others' documents

WORD KEYBOARD SHORTCUTS
• Ctrl+B: Bold | Ctrl+I: Italic | Ctrl+U: Underline
• Ctrl+S: Save | Ctrl+P: Print | Ctrl+Z: Undo
• Ctrl+F: Find | Ctrl+H: Find & Replace
• Ctrl+A: Select all | F7: Spell check`,
      quiz: [
        { question: 'What is the main function of Microsoft Word?', options: ['Data analysis and calculation', 'Professional document creation', 'Database management', 'Presentation design'], answer: 'Professional document creation', explanation: 'Microsoft Word is primarily used for creating, formatting, and editing text documents.', difficulty: 'easy' },
        { question: 'What does "mail merge" allow you to do?', options: ['Send emails faster', 'Create personalized documents for multiple recipients from a data source', 'Merge two Word documents', 'Format letters uniformly'], answer: 'Create personalized documents for multiple recipients from a data source', explanation: 'Mail merge combines a main document with a data source to create personalized documents for multiple recipients.', difficulty: 'medium' },
        { question: 'Styles in Word help with:', options: ['Calculating totals', 'Consistent formatting and easy table of contents generation', 'Drawing shapes', 'Creating charts'], answer: 'Consistent formatting and easy table of contents generation', explanation: 'Styles ensure consistent formatting and make generating a table of contents effortless.', difficulty: 'medium' },
        { question: 'For sharing a Word document that others should not edit easily, save as:', options: ['.docx', '.xlsx', '.pdf', '.pptx'], answer: '.pdf', explanation: 'PDF format preserves formatting and prevents easy editing — ideal for sharing finalized documents.', difficulty: 'easy' },
        { question: 'The keyboard shortcut for Find & Replace in Word is:', options: ['Ctrl+F', 'Ctrl+H', 'Ctrl+R', 'Ctrl+G'], answer: 'Ctrl+H', explanation: 'Ctrl+H opens the Find & Replace dialog (Ctrl+F is just Find).', difficulty: 'medium' },
      ],
    },
    {
      title: 'Microsoft Excel – Data Analysis & Financial Modeling',
      order: 2,
      estimatedMinutes: 90,
      objectives: ['Perform data analysis in Excel', 'Use key functions (SUM, VLOOKUP, IF, PIVOT)', 'Build basic financial models for clean energy projects'],
      videoUrl: 'https://www.youtube.com/watch?v=IInFoJxxPPA&list=PLrRPvpgDmw0k7ocn_EnBaSJ6RwLDOZdfo',
      content: `MICROSOFT EXCEL — FROM BASICS TO ADVANCED

RECOMMENDED COURSE
Excel Basics to Advanced Series
By: excelisfun (highly recommended by analysts on Reddit and finance forums)
Link: https://www.youtube.com/watch?v=IInFoJxxPPA&list=PLrRPvpgDmw0k7ocn_EnBaSJ6RwLDOZdfo

EXCEL AT FUNDCO
Excel is used extensively for:
• Financial modeling and analysis
• Portfolio tracking and monitoring
• Budget preparation
• Data management for mini-grid projects
• Procurement tracking
• Reporting to management and investors

ESSENTIAL EXCEL SKILLS

1. BASIC OPERATIONS
• Cell referencing: absolute $A$1 vs relative A1
• Basic arithmetic: +, -, *, /
• Data entry and formatting

2. KEY FUNCTIONS

SUM: =SUM(A1:A10)
→ Adds a range of cells
→ FundCo use: Adding up monthly energy revenues

AVERAGE: =AVERAGE(A1:A10)
→ Calculates mean of a range
→ FundCo use: Average tariff rate across customer base

IF: =IF(condition, value_if_true, value_if_false)
→ Logical test returning different values
→ FundCo use: =IF(repayment>=minimum, "Current", "Overdue")

VLOOKUP: =VLOOKUP(lookup_value, table_array, col_index, [FALSE])
→ Searches first column of range, returns value from specified column
→ FundCo use: Looking up customer tariff rates by customer ID

COUNTIF: =COUNTIF(range, criteria)
→ Counts cells meeting criteria
→ FundCo use: Counting number of NPLs in loan portfolio

PMT: =PMT(rate, nper, pv)
→ Calculates periodic loan payment amounts
→ FundCo use: Structuring GroSolar subscription payments

NPV: =NPV(rate, values)
→ Net Present Value of a series of future cash flows
→ FundCo use: Evaluating mini-grid project viability

IRR: =IRR(values)
→ Internal Rate of Return
→ FundCo use: Project return threshold assessment

3. DATA TOOLS
• Conditional Formatting: Highlight cells based on their values
• PivotTables: Summarize and analyze large datasets quickly
• Charts: Visualize data (bar, line, pie, waterfall)
• Data Validation: Control what users can enter in cells
• Sort & Filter: Organize and find specific data

4. PRACTICAL EXCEL TASKS AT FUNDCO

Finance Team:
• Cash flow projections for CEF portfolio
• CAPEX vs OPEX tracking
• Loan repayment schedules
• Budget vs actual reports

Technical Team:
• Track energy generation (kWh) per mini-grid site
• Monitor tariff collection rates
• Calculate LCOE for new projects

Procurement:
• Vendor comparison spreadsheets
• Inventory tracking
• Purchase order management

KEYBOARD SHORTCUTS
• Ctrl+C / Ctrl+V: Copy/Paste
• Ctrl+Z: Undo | Ctrl+Y: Redo
• F2: Edit cell | F4: Toggle absolute/relative reference
• Ctrl+Arrow: Jump to edge of data range
• Alt+Enter: New line within a cell
• Ctrl+Shift+$: Currency format
• Ctrl+T: Create table`,
      quiz: [
        { question: 'Which Excel function calculates the average of a range?', options: ['SUM', 'COUNT', 'AVERAGE', 'MEDIAN'], answer: 'AVERAGE', explanation: '=AVERAGE(range) calculates the arithmetic mean of all values in the range.', difficulty: 'easy' },
        { question: 'What is a PivotTable used for?', options: ['Creating charts only', 'Summarizing and analyzing large datasets', 'Writing formulas', 'Formatting cells'], answer: 'Summarizing and analyzing large datasets', explanation: 'PivotTables allow you to quickly summarize, reorganize, and analyze large amounts of data.', difficulty: 'medium' },
        { question: 'VLOOKUP searches for a value in:', options: ['Any column', 'The last column of a range', 'The FIRST column of a range', 'The middle column'], answer: 'The FIRST column of a range', explanation: 'VLOOKUP searches for the lookup value in the FIRST column of the specified table range.', difficulty: 'medium' },
        { question: 'Which function calculates loan payment amounts at FundCo?', options: ['SUM', 'PMT', 'VLOOKUP', 'COUNTIF'], answer: 'PMT', explanation: 'PMT(rate, nper, pv) calculates periodic payment amounts for loans — useful for GroSolar subscription structuring.', difficulty: 'medium' },
        { question: 'The keyboard shortcut to toggle between absolute and relative cell references is:', options: ['F2', 'F4', 'F7', 'F9'], answer: 'F4', explanation: 'F4 toggles between absolute ($A$1), mixed ($A1, A$1), and relative (A1) cell references.', difficulty: 'hard' },
        { question: 'NPV in Excel calculates:', options: ['Net Product Volume', 'Net Present Value of future cash flows', 'Number of Payment Variations', 'Net Portfolio Value'], answer: 'Net Present Value of future cash flows', explanation: '=NPV(rate, values) calculates the Net Present Value — used at FundCo for project viability assessment.', difficulty: 'medium' },
      ],
    },
    {
      title: 'Microsoft PowerPoint – Professional Presentations',
      order: 3,
      estimatedMinutes: 45,
      objectives: ['Create professional presentations in PowerPoint', 'Use themes, animations, and transitions appropriately', 'Design investor and management presentations for FundCo'],
      videoUrl: 'https://www.youtube.com/playlist?list=PLoyECfvEFOjaM9Jeg34ehXqFttZ37uTei',
      content: `MICROSOFT POWERPOINT — PROFESSIONAL PRESENTATIONS

RECOMMENDED COURSE
PowerPoint Full Course (Free)
Link: https://www.youtube.com/playlist?list=PLoyECfvEFOjaM9Jeg34ehXqFttZ37uTei

POWERPOINT AT FUNDCO
Presentations are used for:
• Investor presentations (CEF, HSF fundraising)
• Board and management reports
• Community engagement presentations
• Training materials
• Project proposals (mini-grids, PuE projects)
• ESG impact reports

KEY SKILLS

1. PRESENTATION STRUCTURE
A strong FundCo presentation follows:
• Title slide (with FundCo/CEF logo)
• Agenda/Table of contents
• Problem / Opportunity
• Solution / Approach
• Data and evidence
• Team and credentials
• Call to action / Next steps
• Appendix (supporting data)

2. THEMES AND DESIGN
• Apply consistent themes — use company colors and fonts
• Maintain visual hierarchy: title > subtitle > body text
• Limit text per slide — presentations SUPPORT, not replace, the speaker

3. SLIDE MASTER
What is Slide Master? A template that controls formatting for ALL slides.
Benefits:
• Change one master → changes ALL slides
• Maintains consistency throughout
• Saves significant time on large presentations

4. ANIMATIONS AND TRANSITIONS
Professional rule: LESS IS MORE
• Use sparingly and purposefully
• Good use: reveal bullet points one by one
• Bad use: spinning text and excessive effects
• Never use animations that distract from content

5. CHARTS AND DATA VISUALIZATION
• Link Excel charts to PowerPoint (live updates when data changes)
• Use appropriate chart types:
  - Bar chart: Compare categories (e.g., projects by region)
  - Line chart: Show trends over time (e.g., kWh generation trends)
  - Pie chart: Show proportions (e.g., investor breakdown)
  - Waterfall chart: Show how values change (e.g., revenue buildup)

6. PRESENTER VIEW
• Practice in Presenter View to see notes and upcoming slides
• Separate display for audience vs presenter

FUNDCO PRESENTATION CHECKLIST
✓ Use company color palette
✓ Include the FundCo/CEF logo
✓ Maximum 6 bullet points per slide
✓ Use visuals and charts over long text blocks
✓ Include data source for all statistics
✓ End with clear next steps or call to action
✓ Save final version as PDF for distribution

COMMON MISTAKES TO AVOID
✗ Overcrowding slides with text
✗ Using too many different fonts
✗ Inconsistent formatting across slides
✗ Reading directly from slides during presentation
✗ Poor contrast (light text on light background)`,
      quiz: [
        { question: 'What is a Slide Master in PowerPoint?', options: ['The most important slide', 'A template controlling formatting for all slides', 'A special presenter mode', 'A slide with all data'], answer: 'A template controlling formatting for all slides', explanation: 'Slide Master is a template that controls formatting, layout, and design for ALL slides.', difficulty: 'medium' },
        { question: 'For showing trends over time, which chart type is best?', options: ['Pie chart', 'Bar chart', 'Line chart', 'Scatter chart'], answer: 'Line chart', explanation: 'Line charts are best for showing how values change over TIME — they clearly show trends.', difficulty: 'medium' },
        { question: 'The professional rule for animations in business presentations is:', options: ['Use as many as possible', 'Less is more — use sparingly', 'Only use spinning effects', 'Never use any animations'], answer: 'Less is more — use sparingly', explanation: 'In professional settings, animations should be used sparingly and purposefully.', difficulty: 'easy' },
        { question: 'When sharing a final PowerPoint with investors, best format is:', options: ['Keep as .pptx', 'Convert to .pdf', 'Share original .ppt', 'Export as .jpg images'], answer: 'Convert to .pdf', explanation: 'PDF preserves formatting, prevents easy editing, and ensures consistent viewing across devices.', difficulty: 'easy' },
        { question: 'Maximum bullet points per slide for professional presentations:', options: ['As many as needed', '6 bullet points', 'Exactly 10 words per slide', 'Only 1 bullet per slide'], answer: '6 bullet points', explanation: 'Professional presentations keep slides concise — maximum 6 bullet points per slide maintains audience engagement.', difficulty: 'easy' },
      ],
    },
  ],
};
course9.exam = buildExam(course9.modules, 18);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 10: Finance for Clean Energy Professionals (CFI)
// ─────────────────────────────────────────────────────────────────────────────
const course10 = {
  title: 'Finance for Clean Energy Professionals (CFI)',
  description: 'Practical, job-ready finance skills for FundCo staff. Covers financial modeling, forecasting, NPV/IRR, Excel proficiency, and data-driven decision-making using Corporate Finance Institute (CFI) resources.',
  level: 'intermediate',
  assetco: 'General',
  required: false,
  tags: ['finance', 'CFI', 'financial modeling', 'Excel', 'forecasting', 'NPV', 'IRR'],
  passingScore: 70,
  modules: [
    {
      title: 'Career in Finance, CFI Resources & Financial Modeling',
      order: 1,
      estimatedMinutes: 45,
      objectives: ['Access and use CFI free courses', 'Understand financial modeling principles', 'Apply finance skills to clean energy projects at FundCo'],
      videoUrl: 'https://help.corporatefinanceinstitute.com/article/307-free-courses-and-resources',
      content: `CAREER IN FINANCE — CFI RESOURCES

RECOMMENDED RESOURCE
Corporate Finance Institute (CFI) — Free Courses
Link: https://help.corporatefinanceinstitute.com/article/307-free-courses-and-resources

WHY CFI?
CFI focuses on PRACTICAL, JOB-READY finance skills emphasizing:
• Excel proficiency
• Financial modeling
• Forecasting
• Data-driven decision-making

Rather than theoretical concepts alone, CFI teaches HOW TO APPLY finance in real business settings — exactly what FundCo needs.

RECOMMENDED FREE CFI COURSES

1. Excel Crash Course — Learn Excel fundamentals for finance; create financial models
2. Introduction to Corporate Finance — Time Value of Money, capital budgeting (NPV, IRR), cost of capital
3. Financial Modeling Fundamentals — 3-statement model, forecasting, scenario analysis
4. Accounting Fundamentals — Reading financial statements, key accounting principles
5. Introduction to Financial Statement Analysis — Ratio analysis, profitability, liquidity, solvency

FINANCE AT FUNDCO — KEY CONCEPTS

TIME VALUE OF MONEY
Core principle: A naira today is worth MORE than a naira tomorrow.
Why? Money today can be invested to earn returns.
Applications at FundCo:
• NPV calculations for mini-grid projects
• Discounting future cash flows from solar energy systems
• Evaluating whether a project meets return thresholds

NET PRESENT VALUE (NPV)
NPV = Sum of all discounted future cash flows minus initial investment
• Positive NPV → project creates value → INVEST
• Negative NPV → project destroys value → DO NOT INVEST
FundCo uses NPV to evaluate CEF portfolio investments.

INTERNAL RATE OF RETURN (IRR)
The discount rate that makes NPV = 0.
FundCo requires projects to meet a minimum IRR threshold before investing.
Higher IRR = more attractive investment.

PAYBACK PERIOD
Time to recover initial investment from cash flows.
Used to assess project risk (shorter payback = less risk).
Important for mini-grid projects where capital recovery timeline matters.

FINANCIAL MODELING FOR MINI-GRIDS
A typical EML mini-grid financial model includes:
• Energy yield projections (kWh generated per day/month/year)
• Revenue projections: kWh × tariff rate = monthly revenue
• CAPEX schedule (upfront investment breakdown)
• OPEX budget (monthly running costs)
• Debt service schedule (loan repayments to CEF)
• Free cash flow projections
• NPV and IRR calculations
• Sensitivity analysis (what if tariffs drop? what if CAPEX increases?)

SENSITIVITY ANALYSIS
Tests how changes in key assumptions affect results.
Examples at FundCo:
• "What if tariff collections drop by 20%?"
• "What if CAPEX increases by 15%?"
• "What if OPEX increases due to fuel prices?"

Sensitivity analysis is critical for CEF's risk assessment of portfolio companies.

DEBT-TO-EQUITY RATIO
Measures financial leverage.
For CEF projects: balance of debt (from InfraCredit/banks) and equity (from investors).

KEY FINANCIAL RATIOS
• Current Ratio = Current Assets / Current Liabilities (liquidity)
• Debt-to-Equity = Total Debt / Total Equity (leverage)
• Gross Margin = (Revenue - COGS) / Revenue × 100 (profitability)
• DSCR (Debt Service Coverage Ratio) = Net Operating Income / Total Debt Service
  - DSCR > 1.0 means the project generates enough cash to cover debt payments
  - CEF requires adequate DSCR from portfolio companies

DSCR AT FUNDCO
Debt Service Coverage Ratio is critical for CEF's lending decisions:
• DSCR > 1.25 is typically required for mini-grid projects
• Shows project can comfortably service its debt
• Lower DSCR = higher risk for CEF as lender`,
      terms: [
        { term: 'NPV', definition: 'Net Present Value — the sum of discounted future cash flows minus initial investment; positive NPV = creates value.' },
        { term: 'IRR', definition: 'Internal Rate of Return — the discount rate that makes NPV equal zero; used to compare project attractiveness.' },
        { term: 'Payback Period', definition: 'Time required to recover the initial investment from project cash flows.' },
        { term: 'DSCR', definition: 'Debt Service Coverage Ratio — Net Operating Income divided by Total Debt Service; must be > 1.0 to cover debt payments.' },
        { term: 'Sensitivity Analysis', definition: 'Testing how changes in key assumptions (tariffs, CAPEX, OPEX) affect financial model outputs.' },
        { term: 'Time Value of Money', definition: 'The principle that money available today is worth more than the same amount in the future due to its earning potential.' },
      ],
      quiz: [
        { question: 'CFI focuses primarily on:', options: ['Theoretical finance concepts', 'Practical, job-ready finance skills', 'Accounting history', 'Government finance regulations'], answer: 'Practical, job-ready finance skills', explanation: 'CFI emphasizes practical, job-ready finance skills — Excel proficiency, financial modeling, forecasting, and data-driven decision-making.', difficulty: 'easy' },
        { question: 'A POSITIVE Net Present Value (NPV) means:', options: ['The project loses money', 'The project creates value and should be considered', 'The project breaks even exactly', 'The project is too risky'], answer: 'The project creates value and should be considered', explanation: 'A positive NPV means the project\'s discounted cash flows EXCEED the initial investment — it creates value.', difficulty: 'medium' },
        { question: 'IRR is the discount rate that makes NPV equal to:', options: ['100', '1', '0', '-1'], answer: '0', explanation: 'IRR = the specific discount rate at which the Net Present Value equals ZERO.', difficulty: 'medium' },
        { question: 'DSCR must be greater than what value for a project to cover its debt payments?', options: ['0.5', '0.75', '1.0', '2.0'], answer: '1.0', explanation: 'DSCR > 1.0 means the project generates enough cash to cover all debt payments. CEF typically requires DSCR > 1.25.', difficulty: 'medium' },
        { question: 'Sensitivity analysis tests:', options: ['How quickly calculations run in Excel', 'How changes in assumptions affect financial results', 'Data accuracy and formatting', 'Security of financial data'], answer: 'How changes in assumptions affect financial results', explanation: 'Sensitivity analysis shows how the model\'s output changes when key input assumptions are varied.', difficulty: 'medium' },
        { question: 'A shorter payback period indicates:', options: ['Higher project cost', 'Lower risk project', 'Higher revenue', 'More debt'], answer: 'Lower risk project', explanation: 'Shorter payback period = less time to recover investment = less risk for investors and lenders.', difficulty: 'medium' },
      ],
    },
  ],
};
course10.exam = buildExam(course10.modules, 15);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 11: Procurement & Logistics SOP
// ─────────────────────────────────────────────────────────────────────────────
const course11 = {
  title: 'Procurement & Logistics SOP – GroSolar / FundCo',
  description: 'Standard Operating Procedure for all procurement and logistics activities at GroSolar and FundCo. Covers supplier management, RFQ/RFP processes, purchase order approval, inventory, and delivery verification.',
  level: 'intermediate',
  assetco: 'General',
  required: false,
  tags: ['procurement', 'logistics', 'SOP', 'supply chain', 'vendors', 'GroSolar', 'RFQ'],
  passingScore: 75,
  modules: [
    {
      title: 'Procurement Framework, Supplier Management & RFQ/RFP Process',
      order: 1,
      estimatedMinutes: 30,
      objectives: ['Explain procurement objectives and expected outcomes', 'Follow supplier identification and evaluation process', 'Conduct RFQ/RFP processes correctly with proper authorization'],
      content: `PROCUREMENT & LOGISTICS SOP — OVERVIEW

PURPOSE
Establishes a framework for efficient and consistent procurement and logistics operations across GroSolar AssetCo Limited and FundCo Capital Managers.

OBJECTIVES
1. Streamline procurement to minimize costs and maximize efficiency
2. Ensure goods and services are procured and delivered TIMELY and COST-EFFECTIVELY
3. Adhere to all relevant laws, regulations, and company policies
4. Maintain TRANSPARENCY AND ACCOUNTABILITY in all procurement
5. Identify and mitigate procurement/logistics risks
6. Ensure all goods and services meet QUALITY STANDARDS

EXPECTED OUTCOMES
• Timely procurement of high-quality materials and equipment
• Efficient, cost-effective logistics operations
• Minimized procurement risks
• Strong supplier relationships
• Regulatory compliance

KEY RISKS
1. Supplier performance issues (delays, quality problems, financial difficulties)
2. Supply chain disruptions (natural disasters, geopolitical events)
3. Logistics challenges (transportation delays, customs, transit damage)
4. Cost overruns (unexpected material/transportation cost increases)

KEY CONTROLS
• Supplier qualification and evaluation
• Purchase order approval process
• Inventory management
• Detailed logistics planning
• Performance monitoring with KPIs
• Regular SOP review and updates

STEP 1: SUPPLIER IDENTIFICATION AND SELECTION

Identify Potential Suppliers (via):
• Online research and industry directories
• Colleague and industry peer recommendations

Evaluate Suppliers On 5 Criteria:
1. Quality: Can they meet specifications and certifications?
2. Reliability: Consistent delivery performance and timeline adherence?
3. Cost-effectiveness: Competitive pricing and cost-saving strategies?
4. Financial stability: Strong financial health for long-term viability?
5. Technical expertise: Knowledge of solar energy products and services?

Create Supplier Database:
• Updated database: contact info, performance history, certifications

Conduct Supplier Audits:
• Periodically audit: performance, quality compliance, contractual obligations

STEP 2: REQUEST FOR QUOTATION (RFQ) / REQUEST FOR PROPOSAL (RFP)

Prepare RFQs/RFPs specifying:
• Project requirements and technical specifications
• Timelines and evaluation criteria

Distribute to shortlisted suppliers via email, social media, or online portals.

CRITICAL RULES (mandatory compliance):
• ALL procurements must be APPROVED BY THE DEPARTMENT HEAD before issuing any RFP
• Evaluation committees must comprise AT LEAST THREE MEMBERS
• Committee members must have: relevant technical expertise, financial acumen, and other relevant expertise
• The RFP must be shared with the review team BEFORE evaluation for input and alignment

Evaluate Proposals On:
1. Price: Cost-effectiveness and competitive pricing
2. Quality: Adherence to quality standards and certifications
3. Delivery timeline: Ability to meet project timelines
4. Technical capabilities: Understanding and proposed solutions
5. Financial stability: Strong financial health

STEP 3: PURCHASE ORDER GENERATION AND APPROVAL

Prepare POs specifying:
• Product descriptions, quantities, prices
• Delivery terms, payment terms, other conditions

Approval Process:
• Seek approval from authorized personnel (procurement managers, project managers)
• Issue approved POs to suppliers
• Track PO status: order confirmation, delivery schedules, payment terms

STEP 4: SUPPLIER PERFORMANCE EVALUATION

Track KPIs:
• Delivery timeliness
• Quality of goods
• Adherence to specifications
• Responsiveness to inquiries

Performance Reviews:
• Regular reviews with suppliers
• Identify improvement areas
• Provide constructive feedback

Corrective Action (if needed):
• Warnings for underperformance
• Reduced order volumes
• Contract termination

STEP 5: INVENTORY MANAGEMENT
• Maintain accurate inventory records (software)
• Regular physical inventory audits
• Monitor inventory turnover rates

STEP 6: LOGISTICS PLANNING AND EXECUTION
• Create detailed logistics plans (transportation, routing, scheduling)
• Select reliable logistics providers
• Track shipments using real-time tracking systems
• Manage customs clearance efficiently

STEP 7: DELIVERY AND RECEIPT VERIFICATION
• Inspect incoming shipments: quantity, quality, and damage
• Verify documentation against purchase orders
• Update inventory records
• Resolve delivery issues promptly

KEY PERFORMANCE INDICATORS (KPIs)
• Supplier performance rating
• On-time delivery rate
• Inventory turnover ratio
• Logistics cost per unit

SOP ENFORCEMENT
• Annual review and update
• Training for all relevant staff
• Monitoring for deviations
• Corrective action for any deviations`,
      quiz: [
        { question: 'How many members must form a procurement evaluation committee?', options: ['At least 2', 'At least 3', 'Exactly 5', 'At least 7'], answer: 'At least 3', explanation: 'Evaluation committees must comprise AT LEAST THREE MEMBERS with relevant technical, financial, and subject matter expertise.', difficulty: 'medium' },
        { question: 'Who must approve a procurement before an RFP is issued?', options: ['Any senior staff', 'The CEO only', 'The Department Head', 'The CFO only'], answer: 'The Department Head', explanation: 'ALL procurements must be approved by the DEPARTMENT HEAD prior to issuing any RFP.', difficulty: 'medium' },
        { question: 'Supplier evaluation is based on how many criteria?', options: ['3', '4', '5', '6'], answer: '5', explanation: 'Suppliers are evaluated on five criteria: Quality, Reliability, Cost-effectiveness, Financial Stability, and Technical Expertise.', difficulty: 'medium' },
        { question: 'What does RFQ stand for?', options: ['Request for Qualification', 'Request for Quotation', 'Report for Quality', 'Request for Quick delivery'], answer: 'Request for Quotation', explanation: 'RFQ = Request for Quotation — a document sent to suppliers asking for price quotes.', difficulty: 'easy' },
        { question: 'What happens to an underperforming supplier?', options: ['Automatic contract renewal', 'Warnings, reduced orders, or contract termination', 'Immediate payment increase', 'No action needed'], answer: 'Warnings, reduced orders, or contract termination', explanation: 'Underperforming suppliers may receive warnings, have order volumes reduced, or face contract termination.', difficulty: 'medium' },
        { question: 'Which KPI measures supply chain timeliness?', options: ['Inventory turnover ratio', 'On-time delivery rate', 'Supplier performance rating', 'Logistics cost per unit'], answer: 'On-time delivery rate', explanation: 'On-time delivery rate specifically measures whether suppliers are delivering on schedule.', difficulty: 'easy' },
      ],
    },
  ],
};
course11.exam = buildExam(course11.modules, 15);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 12: EML Field Operations & Maintenance Engineering
// ─────────────────────────────────────────────────────────────────────────────
const course12 = {
  title: 'EML – Field Operations & Maintenance Engineering (O&M)',
  description: 'Detailed field operations training for EML site operators and O&M engineers: LOTO procedures, shutdown and isolation, emergency shutdown, corrective/preventive maintenance, generator maintenance, and RACI responsibilities.',
  level: 'expert',
  assetco: 'EML',
  required: true,
  tags: ['EML', 'O&M', 'operations', 'maintenance', 'LOTO', 'field', 'safety', 'engineering'],
  passingScore: 80,
  modules: [
    {
      title: 'Introduction, Glossary, LOTO & Shutdown Procedures',
      order: 1,
      estimatedMinutes: 30,
      objectives: ['Execute LOTO procedures correctly and safely', 'Follow shutdown and isolation steps for different equipment', 'Apply RACI for all O&M processes'],
      content: `EML FIELD OPERATIONS SOP — INTRODUCTION

SCOPE
This SOP covers processes and procedures to be followed by Operations and Maintenance Engineers while carrying out tasks and activities assigned to their role.

CONFIDENTIALITY
No part of this document may be disclosed verbally or in writing to any third party without prior written consent of Electrify Microgrid Ltd.

GLOSSARY OF TERMS
• CEO  — Chief Executive Officer
• COO  — Chief Operating Officer
• EOM  — Engineering Operations Manager
• OME  — Operation and Maintenance Engineer
• RACI — Responsible, Accountable, Consulted, Informed
• RMC  — Remote Monitoring and Control

LIST OF PROCESSES
1. Lock-Out Tag-Out (LOTO) — safe working practices before maintenance
2. Shutdown and Isolation Procedures — steps to shut down equipment safely
3. Emergency Shutdown Procedures — isolate equipment in emergencies
4. Corrective Maintenance and Troubleshooting — resolve network faults
5. Weekly Preventive Maintenance — weekly maintenance activities
6. Monthly Preventive Maintenance — monthly maintenance activities
7. Generator Maintenance — ensure generators are in good working condition

2.1 LOCK-OUT TAG-OUT (LOTO) PROCESS

Purpose: Ensure SAFE WORKING PRACTICES for planned maintenance.
Must be followed STRICTLY whenever systems are de-energized before maintenance.

LOTO STEPS AND RACI:
Step 1 — NOTIFICATION (24 HOURS BEFORE maintenance)
• Notify OME, RMC, Customer Care (so customers are informed)
• Responsible: Site Operator | Timeline: 24 HRS BEFORE

Step 2 — SHUT DOWN
• Perform controlled shutdown of equipment
• Responsible: Site Operator | See Shutdown and Isolation Process

Step 3 — ISOLATE
• Open all energy isolating devices per equipment-specific LOTO procedure
• Responsible: Site Operator | See Shutdown and Isolation Process

Step 4 — TEST
• Verify equipment is COMPLETELY DE-ENERGIZED
• Test for voltage using a VOLTMETER
• Responsible: Site Operator

Step 5 — REPORT
• Log Date, Duration, and Purpose of LOTO
• Site Operator: Physical notebook (kept on site)
• OME: Online system

LOTO RACI:
• RESPONSIBLE: Site Operator
• ACCOUNTABLE: OME (Operations and Maintenance Engineer)
• CONSULTED: EOM (Engineering Operations Manager)
• INFORMED: COO, CEO

2.2 SHUTDOWN AND ISOLATION PROCEDURES

2.2.1 Inverter Pad Equipment Isolation:
1. SHUT DOWN: Controlled shutdown of inverters
2. ISOLATE: Turn off ALL DC and AC disconnects feeding the pad
3. TEST: Test voltages with properly rated meters to CONFIRM complete isolation

2.2.2 Combiner Box Isolation:
1. Shut down inverters (as above)
2. Operate combiner box switch → OFF position
3. Use DC clamp-on meter to confirm NO CURRENT through underground conductors; then open all fuses
4. Further isolation: Use string diagrams to locate homeruns (end connectors of PV strings)
5. Use DC clamp-on current meter to confirm homerun has NO current; disconnect string; put caps on source circuit connectors
6. Confirm isolation: Go back to combiner box and use voltmeter to confirm each string is successfully disconnected

2.2.3 PV Modules and String Wiring Isolation:
(After turning off inverter, switches, and combiner boxes)
1. TEST: Use DC clamp-on meter to confirm NO CURRENT through string
2. ISOLATE: Use appropriate connector unlocking tool to disengage module connectors (repeat for each module)
3. CHECK: If modules removed temporarily, ensure equipment grounding remains intact for remaining modules

2.3 EMERGENCY SHUTDOWN PROCEDURE

Step 1 — NOTIFY: Call and inform the OME immediately
• OME may have additional instructions
Step 2 — EMERGENCY STOP: Push emergency stop buttons on EACH inverter (if available)
Step 3 — ISOLATE: Turn each inverter to OFF position manually
• Immediately opens internal AC and DC contactors inside inverter

Emergency RACI: Same as LOTO — Site Operator (Responsible), OME (Accountable), EOM (Consulted), COO/CEO (Informed)

WHY LOTO MATTERS
LOTO prevents UNEXPECTED ENERGIZATION during maintenance which can cause:
• Electrocution of maintenance personnel
• Equipment damage
• Fire hazards
• System failures

Even "de-energized" equipment can have stored energy in capacitors or receive unexpected backfeed.`,
      quiz: [
        { question: 'What does LOTO stand for?', options: ['Lock Out Take Over', 'Lock-Out Tag-Out', 'Line Off Turn Off', 'Lockdown Temporary Operations'], answer: 'Lock-Out Tag-Out', explanation: 'LOTO = Lock-Out Tag-Out — a critical safety procedure to prevent accidental energization during maintenance.', difficulty: 'easy' },
        { question: 'Who is RESPONSIBLE for executing the LOTO procedure?', options: ['OME', 'Site Operator', 'EOM', 'COO'], answer: 'Site Operator', explanation: 'The Site Operator is RESPONSIBLE for executing LOTO steps.', difficulty: 'easy' },
        { question: 'Who is ACCOUNTABLE for the LOTO process?', options: ['Site Operator', 'CEO', 'OME (Operations and Maintenance Engineer)', 'COO'], answer: 'OME (Operations and Maintenance Engineer)', explanation: 'The OME is ACCOUNTABLE — they oversee and are answerable for correct LOTO execution.', difficulty: 'medium' },
        { question: 'To verify equipment is de-energized after LOTO isolation, use:', options: ['Your hand to feel for heat', 'A voltmeter', 'A current clamp only', 'Visual inspection only'], answer: 'A voltmeter', explanation: 'After isolation, use a VOLTMETER to test and VERIFY equipment is completely de-energized.', difficulty: 'medium' },
        { question: 'In emergency shutdown, if inverters have emergency stop buttons, you must:', options: ['Wait for OME approval first', 'Push them on EACH inverter', 'Push only the main inverter button', 'Only notify OME without stopping'], answer: 'Push them on EACH inverter', explanation: 'Push emergency stop buttons on EACH inverter — not just one.', difficulty: 'medium' },
        { question: 'When isolating PV modules that are temporarily removed, you must:', options: ['Disconnect all other modules too', 'Ensure grounding remains intact for remaining modules', 'Turn off all equipment and wait', 'Only document the removal'], answer: 'Ensure grounding remains intact for remaining modules', explanation: 'Even if modules are temporarily removed, the equipment grounding system must REMAIN INTACT for all remaining modules.', difficulty: 'hard' },
      ],
    },
    {
      title: 'Corrective, Preventive & Generator Maintenance',
      order: 2,
      estimatedMinutes: 25,
      objectives: ['Execute corrective maintenance process with correct escalation', 'Complete weekly and monthly maintenance checklists', 'Maintain generators per the maintenance checklist'],
      content: `2.4 CORRECTIVE MAINTENANCE AND TROUBLESHOOTING

Purpose: Resolve faults that occur within the network and in the power house.

PROCESS:
Step 1 — NOTIFY: Inform OME about details of the fault
• Responsible: Site Operator | Timeline: As it occurs

Step 2 — DO: Follow OME instructions for fault resolution
• Responsible: Site Operator | Timeline: As it occurs

Decision Point: CAN THE SITE OPERATOR RESOLVE THE FAULT?
• YES → Go to Step 4 (Report)
• NO → Go to Step 3 (Escalate)

Step 3 — ESCALATE: Escalate and follow up on fault resolution
• Technical faults → Resolved by OME
• Commercial faults → Resolved by Sales Manager
• Responsible: Site Operator + OME + Sales Manager

Step 4 — REPORT: Document fault details and resolution
• Site Operator: Physical notebook (kept on site)
• OME and Sales Associate: Online system
• Timeline: As it occurs

CORRECTIVE MAINTENANCE RACI:
• RESPONSIBLE: Site Operator
• ACCOUNTABLE: OME
• CONSULTED: EOM, Sales Manager, Sales Associate
• INFORMED: COO, CEO

2.5 WEEKLY PREVENTIVE MAINTENANCE

WEEKLY MAINTENANCE CHECKLIST:
i.   Clean PV array from dust and bird droppings
     • Use CLEAN WATER ONLY — no soaps or detergents
     • MUST be done at NIGHT (system not generating)
ii.  Inspect inverter system:
     • Remove dust or dirt
     • Inspect wiring for poor connections
     • Look for signs of EXCESSIVE HEATING
     • Inspect controller for proper operation
iii. Inspect battery set:
     • Look for loose connections
     • Signs of EXCESSIVE HEATING
     • Flooded batteries: CHECK FOR LEAKAGE
iv.  Inspect distribution lines:
     • Check for BRIDGING or CUTS in cables
v.   Inspect customer meter connections:
     • Check for loose TERMINALS
     • Energy LOSS signs
vi.  Inspect all terminals for CORROSION and loosened cable connections
vii. Check for RUST and CRACKS on welding joints
viii.SWEEP power house and remove COBWEBS

Weekly Maintenance RACI:
• RESPONSIBLE: Site Operator
• ACCOUNTABLE: OME
• CONSULTED: EOM, Sales Manager, Sales Associate
• INFORMED: COO, CEO

2.7 MONTHLY PREVENTIVE MAINTENANCE

MONTHLY MAINTENANCE CHECKLIST:
i.   REMOVE WEEDS around the power house
ii.  CLEAN the vents in the power house
iii. Check state of INDOOR and OUTDOOR air conditioning units
iv.  Check state of METERS — ensure working effectively
v.   ESCALATE all issues to relevant party

2.8 GENERATOR MAINTENANCE CHECKLIST
(Note: Not all mini-grids have generators)

DAILY CHECKS:
• Check coolant heater
• Check coolant level
• Check oil level
• Check fuel level
• Check charge-air piping
• Check battery charger

WEEKLY CHECKS:
• Drain fuel filter
• Drain water from fuel tank

MONTHLY CHECKS:
• Check coolant concentration
• Check drive belt tension

Generator Maintenance RACI: Same as weekly maintenance

WHY PREVENTIVE MAINTENANCE MATTERS
A problem caught during weekly inspection costs almost nothing to fix.
The same problem discovered after equipment failure costs 10-100x more.

Example:
• Cleaning dirty solar panel weekly: FREE
• Replacing damaged inverter due to overheating: ₦500,000+

PERFORMANCE BENCHMARKS
• System efficiency: Should be ≥ 95% of designed capacity
• Battery charge/discharge cycles: Monitor for decline in capacity
• Energy generation vs. expectation: Compare actual to modeled kWh/day
• Tariff collection rate: Target ≥ 95% of billed amount collected`,
      quiz: [
        { question: 'When cleaning solar panels, the cleaning agent must be:', options: ['Soap and water', 'Detergent and water', 'Clean water only', 'Bleach solution'], answer: 'Clean water only', explanation: 'Solar panels must be cleaned with CLEAN WATER ONLY — no soaps or detergents.', difficulty: 'medium' },
        { question: 'Panel cleaning must be done at:', options: ['Midday when sun is strongest', 'Early morning before panels heat up', 'Night when system is not generating', 'Any time of day'], answer: 'Night when system is not generating', explanation: 'Panel cleaning MUST be done at NIGHT to avoid thermal shock and for safety.', difficulty: 'medium' },
        { question: 'Commercial faults at mini-grid sites are escalated to:', options: ['OME', 'Site Operator', 'Sales Manager', 'COO'], answer: 'Sales Manager', explanation: 'Commercial issues are resolved by the SALES MANAGER, while technical issues go to the OME.', difficulty: 'medium' },
        { question: 'For flooded batteries, the weekly inspection specifically checks for:', options: ['Corrosion only', 'Temperature only', 'Leakage', 'Connection tightness only'], answer: 'Leakage', explanation: 'For flooded (lead-acid) batteries, the weekly check specifically includes checking for LEAKAGE.', difficulty: 'hard' },
        { question: 'The monthly maintenance task NOT in the weekly checklist is:', options: ['Cleaning panels', 'Removing weeds around power house', 'Inspecting meters', 'Checking distribution lines'], answer: 'Removing weeds around power house', explanation: 'Removing weeds around the power house is a MONTHLY (not weekly) maintenance task.', difficulty: 'medium' },
        { question: 'Daily generator checks include:', options: ['Only checking oil', 'Coolant level, oil level, fuel level, charge-air piping, battery charger', 'Only cleaning', 'Only visual inspection'], answer: 'Coolant level, oil level, fuel level, charge-air piping, battery charger', explanation: 'Daily generator checks cover coolant heater, coolant level, oil level, fuel level, charge-air piping, and battery charger.', difficulty: 'medium' },
      ],
    },
  ],
};
course12.exam = buildExam(course12.modules, 20);

// =============================================================================
// COMBINED MASTER SEED — runs all three parts together
// =============================================================================

// =============================================================================
// MASTER SEED FUNCTION — seeds all 12 courses in one run
// =============================================================================
const seedAll = async () => {
  try {
    await connectDB();
    console.log('🌱  Starting master seed — all 12 FundCo courses...');

    const allCourses = [
      course1, course2, course3,
      course4, course5, course6, course7,
      course8, course9, course10, course11, course12,
    ];

    let seeded = 0;
    let replaced = 0;

    for (const course of allCourses) {
      const existing = await LearningCourse.findOne({ title: course.title });
      if (existing) {
        await LearningCourse.findByIdAndDelete(existing._id);
        replaced++;
        console.log(`🔄  Replaced: ${course.title}`);
      }
      const created = await LearningCourse.create(course);
      seeded++;
      console.log(`✅  ${created.title}`);
      console.log(`    Level: ${created.level} | AssetCo: ${created.assetco} | Required: ${created.required}`);
      console.log(`    Modules: ${course.modules.length} | Exam Qs: ${course.exam ? course.exam.length : 0}`);
    }

    const total = await LearningCourse.countDocuments();
    console.log(`\n🎉  Master seed complete!`);
    console.log(`📚  Courses seeded: ${seeded} (${replaced} replaced)`);
    console.log(`📊  Total courses in database: ${total}`);
    console.log(`\n  Breakdown:`);
    const beginner = await LearningCourse.countDocuments({ level: 'beginner' });
    const intermediate = await LearningCourse.countDocuments({ level: 'intermediate' });
    const expert = await LearningCourse.countDocuments({ level: 'expert' });
    console.log(`  • Beginner:     ${beginner}`);
    console.log(`  • Intermediate: ${intermediate}`);
    console.log(`  • Expert:       ${expert}`);
  } catch (err) {
    console.error('❌  Seeding error:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedAll();