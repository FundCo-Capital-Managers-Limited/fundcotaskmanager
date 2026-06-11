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

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 1: FundCo Company Overview (required for all staff)
// ─────────────────────────────────────────────────────────────────────────────
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
const seedData = async () => {
  try {
    await connectDB();

    const courses = [course1, course2, course3];

    // Use upsert — safe to run multiple times and with other seed parts
    for (const course of courses) {
      const existing = await LearningCourse.findOne({ title: course.title });
      if (existing) {
        await LearningCourse.findByIdAndDelete(existing._id);
        console.log(`🔄  Replaced: ${course.title}`);
      }
      const created = await LearningCourse.create(course);
      const moduleCount = course.modules.length;
      const examCount   = course.exam ? course.exam.length : 0;
      console.log(`✅  ${created.title} — ${moduleCount} modules, ${examCount} exam questions`);
    }

    const total = await LearningCourse.countDocuments();
    console.log(`\n🎉  Seed Part 1 complete. Total courses in DB: ${total}`);
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedData();