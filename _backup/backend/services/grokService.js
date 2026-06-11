// backend/services/grokServices.js
import OpenAI from 'openai';
const openai = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

export const COMPANY_KNOWLEDGE = `
# FundCo Capital Managers Comprehensive Knowledge Base

## Overview of FundCo Capital Managers
FundCo Capital Managers is an alternative asset manager focusing on sustainable infrastructure. Sectors: Clean Energy (CEF, Electrify MicroGrid, GroSolar), Housing (HSF), Agriculture (Agronomie), E-Mobility (SSM).
FundCo is authorized and registered by the Nigeria Securities & Exchange Commission to conduct the business of a fund/portfolio manager. It innovatively unlocks domestic finance for small and medium-sized infrastructure in unserved or under-served sectors that provide essential services to society, are recession resilient, demonstrate long term viability with predictable cashflows, and reduce the impact of climate change.
The company's range of strategies and opportunities are tailored to preserve and grow institutional investments in sustainable infrastructure alongside proactive management of environmental, social, and governance (ESG) considerations.
FundCo supports the development of renewable energy solutions, including C&I solar systems, solar-powered minigrids, and monitoring systems to enhance energy reliability for industrial operations while expanding electricity access for surrounding communities.
FundCo is divided into two sectors: Housing Solution Fund (HSF) and Clean Energy Fund (CEF).

### Housing Solution Fund (HSF)
HSF is a local currency real estate investment fund providing innovative market-based solutions to stimulate housing demand and scale housing supply by providing affordable and accessible long-dated home loans to eligible homebuyers in partnership with participating lending institutions and housing developers.
The investment objective is to deliver inflation-protected income and capital growth over the medium term by funding a diversified portfolio of affordable home loan assets across Nigeria.
HSF focuses on four thematic areas aligned with UN Sustainable Development Goals.

### Clean Energy Fund (CEF)
CEF is a local currency fund providing funds to climate-aligned, sustainable, and inclusive clean energy infrastructure. It has been awarded a dedicated climate-aligned green certification by the Climate Bonds Initiative (CBI), the first and only green fund in Nigeria.
CEF treats each investment opportunity on its own merit and designs suitable transaction structures. It supports alternative clean energy infrastructure, reduces FX exposure by providing local currency financing, and creates a diversified portfolio of investments.
CEF Series 1 closed in May 2024 with ₦3.32 billion in subscriptions. Series 2 of up to ₦30 billion proposes to invest in 16 clean energy projects.
CEF has subsidiaries: Electrify MicroGrid Limited (EML), GroSolar AssetCo Limited (GroSolar), Agronomie, Swap Station Mobility Limited (SSM).

#### Electrify MicroGrid Limited (EML)
EML is a specialized renewable energy asset management company accelerating rural electrification in Nigeria through mini-grids integrated with productive use of energy (PuE) for agricultural activities.
EML addresses energy access gaps and agricultural productivity limits in rural areas using a Design, Finance, Build, and Operate (DFBO) model.
EML manages a 50 kWp mini-grid on Umon Island, Cross River State, serving 200+ customers, with a second 24kWp under construction. It has submitted 142 mini-grid projects to REA and has 150 under development.
Goals: PuE integration, financing efficiency, gender inclusion, scale to 1,000 sites over five years.
Impact: Contribute to 105,000 mini-grids by 2030, avoid 1M+ tons CO2, create jobs, align with ESG.

#### GroSolar AssetCo Limited (GroSolar)
GroSolar is a solar asset holding platform investing in and owning solar equipment for Solar as a Service (SaaS) model, allowing residential and commercial customers to switch to solar without high upfront costs.
GroSolar revolutionizes solar adoption by scaling Stand-Alone Solar Systems (SAS) through subscription arrangements, leveraging long-term domestic financing and partnerships with local solar providers.
SOP: Client onboarding (inquiry, profile, contact, KYC, credit assessment, technical assessment, BoQ, financial structuring, proposal, consent, installation, monitoring).

#### Agronomie
Agronomie is a specialized agro-tech company aggregating and accelerating access to finance for agro-productive use of clean energy from solar mini-grids through productive asset financing, training, and technology-based asset management.
It provides end-to-end solutions for procurement, operation, and maintenance of productive use agro-processing equipment using a Hub & Spoke model.
Mandate: Origination and management of PuE infrastructure, deal structuring, portfolio management.
Target sectors: Crop processing, cold storage, milling.
Activities: Needs assessments (20 completed in Abia, Benue, Cross River, Edo, Plateau, Ondo), procurement, installations, management.
Projects: Angwan Rina (Plateau), Shimankar (Plateau), Calabar (Darway Coast), Abia/Benue/Edo/Ondo/Rivers (AquaEarth), Ondo (Green Kiosk).
Lessons: Importance of synergy among stakeholders, addressing fabrication challenges.
Black Soldier Fly (BSF): Sustainable job replacement converting organic waste to protein feed and fertilizer.
Business Model: Waste collection, BSF breeding/rearing, harvesting/processing, training, quality control.
Benefits: Job creation, waste management, food security, community empowerment.

#### Swap Station Mobility Limited (SSM)
SSM is an electric vehicle and battery swapping infrastructure company providing EVs and swapping infrastructure to replace ICE vehicles.
It has a robust Environmental and Social Management System (ESMS) complying with national and international standards.
SOP: Station setup/maintenance, battery charging/swapping, EV bike management (lease-to-own, rental), safety/emergency, customer service.

## Key Terms
- CAPEX (Capital Expenditure): Funds used to acquire, build, or upgrade physical assets such as solar panels, mini-grid equipment, batteries, etc.
- OPEX (Operational Expenditure): Day-to-day running costs of the energy system—fuel, maintenance, staff, monitoring, site security.
- PPA (Power Purchase Agreement): A long-term contract where a buyer agrees to purchase power from a clean energy provider at an agreed rate.
- Tariff Rate: The price per kWh charged to customers for electricity supply.
- LCOE (Levelized Cost of Energy): The average cost per unit of electricity generated over the lifetime of a clean-energy system.
- Debt Financing: Borrowing funds from banks or investors to fund energy projects, repayable with interest.
- Equity Financing: Raising capital by selling ownership stake to investors.
- ROI (Return on Investment): Measures how profitable an energy project is relative to its cost.
- Payback Period: Time it takes for an energy project to recover its initial investment.
- Green Bonds: Fixed-income instruments used to finance environmentally sustainable projects.
- Carbon Credits: Tradable permits earned from reducing carbon emissions, which can be sold for revenue.
- PV (Photovoltaic): Technology that converts sunlight directly into electricity using semiconductor materials; basis of solar panels.
- Working Capital: Funds available for day-to-day operations like fuel, maintenance, and staff payments.
- Depreciation: Gradual reduction in the value of clean-energy assets such as inverters, batteries, solar arrays.
- Amortization: Gradual repayment of intangible assets or loan principal over time.
- Energy Yield: Total amount of electricity generated by a system—used to calculate revenue.
- Revenue Assurance: Processes to ensure accurate billing, correct metering, and full revenue collection.
- Cost-Benefit Analysis: Comparison of all project costs vs. expected benefits before investment.
- NPL (Non-Performing Loans): Loans where customers are not repaying.
- Asset Leasing: Renting or leasing solar equipment or mini-grid assets to customers or partners.
- BoQ (Bill of Quantities): Detailed document listing materials, components, labour, and costs for projects.
- kWh (kilowatt-hour): Unit of energy measuring electricity used or generated over time.
- kWp (kilowatt-peak): Maximum capacity output a solar PV system can produce under standard test conditions.
- BEES (Building for Environmental and Economic Sustainability): Rating tool evaluating buildings on energy efficiency, economic feasibility, environmental impact.
- CEF: Clean Energy Fund
- HSF: Housing Solution Fund
- CBSB: Climate Bonds Standard Board
- CBI: Climate Bonds Initiative
- FX: Foreign Exchange
- EoI: Expression of Interest
- SOP: Standard Operating Procedure
- PFA: Pension Fund Administrators
- RSA: Retirement Savings Account
- CMS: Client Management System
- E&S DD: Environmental and Social Due Diligence

## Hierarchical Structure and Leadership
### FundCo Capital Managers Overall Structure
- Executive Management: Leads strategy, operations, opportunities.
- Departments: HR/Legal, Finance & Accounts, Risk & Compliance, IT & Systems, Administration, Procurement & Supply Chain, Sales & Marketing, Customer Service, Technical Team.
- Subsidiaries: CEF (with EML, GroSolar, Agronomie, SSM), HSF.

### Leadership and Department Staff
#### Executive Management
- CEO/MD: Not specified, but oversees all.
- CIO: Abiodun Oni (Chief Investment Officer).
- Deputy CIO: Adesola Alli.
- Senior Adviser: Olumide Fatoki.
- Other: Maurice Okoli (CEO AFREAL, possibly affiliated).

#### Human Resources and Legal Unit
- Head Legal/Company Secretariat: Olufunmilola Abraham.

#### Finance & Accounts
- Finance Specialist: Vivian Umeaku.

#### Risk & Compliance
- Credit Risk Manager: Oluseyi Olayinka.

#### IT & Systems Unit
- Not specified.

#### Administration
- Not specified.

#### Procurement & Supply Chain
- Not specified.

#### Sales & Marketing
- Not specified.

#### Customer Service / Client Support
- Not specified.

#### Technical Team
- Various engineers and managers across subsidiaries.

### CEF Structure
- CIO: Abiodun Oni.
- Deputy CIO: Adesola Alli.
- Senior Adviser: Olumide Fatoki.
- Senior Technical Analyst: Jojo Ngene.
- Technical Adviser: Vacant.
- Senior Analyst: Seyi Omidiora.
- Portfolio Manager: Moses Ekure.
- ESG Adviser: Omolola Okunubi.
- Analyst Pool: Ayobami Akinwonmi, Muhammed Abiodun, Onyioza Raji, Wale Abdulazeez, Ridwan Abdulraheem.
- Investment Committee: David Humphrey (Chairman), Welela Dawit, Obinna Ihedioha, Abiodun Oni.

### EML Structure
- Chairman: Olumide Fatoki.
- CEO: Jojololami Ngene (Jojo Ngene).
- Project Engineer: Emmanuel Ogwuche.
- Acting Project Manager: Oluwabusayo Akinrelere.
- Finance Specialist: Vivian Umeaku.
- Agro Technician: Oche Joshua.
- Regional Managers Community Engagement: Israel Akomodesegbe, Taiwo Popoola, Adekunle Anjorin.
- Project Technician: Timothy Yusuf.
- Project Engineers: Fegha Amodu, Ismail Yakub, Abdulbasit Abdulkareem.

### Agronomie Structure
- Director: Jojololami Ngene.
- Project Manager/Agricultural Economist: John Edoja Akpovwovwo.
- Head Legal: Olufunmilola Abraham.
- Head Agricultural Extension: Lambert Saviour.
- Agricultural Extension Agent: Ogolo Raphael.
- Energy Expert: Emmanuel Ogbuche.
- ESG Adviser: Ozioma Chinedu (AquaEarth).
- Electrical/Electronics Engineer: Edward Chidiebere Gideon (Farm Warehouse).

### SSM Structure
- Not detailed, but SOP responsibilities: Station Project Manager, Technicians, Customer Service Representatives.

## Unit Responsibilities
### Executive Management
- Provide strategic direction and long-term vision.
- Approve major policies, budgets, and initiatives.
- Oversee performance and departmental alignment.
- Ensure regulatory compliance and governance.
- Evaluate department heads.
- Manage day-to-day operations.
- Coordinate technical, commercial, administrative teams.
- Identify project opportunities and maintain relationships.

### Human Resources and Legal Unit
- Manage recruitment and onboarding.
- Maintain employee records and HR policies.
- Oversee performance evaluations.
- Implement learning and development programs.
- Draft and review contracts (EPC, SLA, PFA, vendor, community).
- Ensure compliance with regulations.
- Handle disputes, arbitration, filings.
- Maintain corporate documentation.

### Finance & Accounts
- Prepare budgets, forecasts, financial statements.
- Manage invoicing, payments, reconciliations, cashflow.
- Track expenditures, optimize costs.
- Ensure accounting standards, taxes, audits.
- Manage payroll, compensation, benefits.

### Risk & Compliance
- Ensure compliance with regulations and safety.
- Conduct internal audits, enforce controls.
- Maintain documentation for regulatory bodies.
- Perform credit risk and fraud analysis.

### IT & Systems Unit
- Support digital systems, applications, integrations.
- Ensure data protection, secure access.
- Manage internal software (AI Task platform).
- Provide technical support.
- Maintain IoT hardware integration.
- Liaison with external IT contractors.

### Administration
- Oversee facilities, logistics, office operations.
- Handle procurement of supplies and equipment support.
- Manage documentation, scheduling, vendor coordination.
- Support communication between management and staff.
- Support executives with itinerary, appointments, trips.

### Procurement & Supply Chain
- Source equipment: solar panels, inverters, batteries, meters, BOS.
- Negotiate vendors, maintain performance records.
- Manage inventory, ensure component availability.
- Oversee logistics, warehousing, delivery.
- Track procurement KPIs, quality compliance.

### Sales & Marketing
- Prepare proposals, feasibility studies, documentation.
- Track revenue, customer acquisition.
- Manage brand visibility, digital engagement, PR.
- Develop materials on clean energy impact.
- Run campaigns for GroSolar customer acquisition.

### Customer Service / Client Support
- Handle inquiries, complaints, escalations.
- Ensure GroSolar customer onboarding, tariff awareness.
- Track satisfaction, retention.
- Coordinate with technical team for troubleshooting.

### Technical Team (Clean Energy, EML, GroSolar)
#### System Design & Engineering
- Conduct load assessments, site surveys, audits.
- Design mini-grid layouts, PV arrays, batteries, networks.
- Perform sizing for panels, inverters, controllers, storage.
- Develop drawings, schematics, documentation.

#### Installation & Commissioning
- Execute installation of PV systems, lines, metering.
- Install/configure inverters, batteries, controllers, BoQ.
- Conduct testing, commissioning, verification.
- Ensure adherence to standards, safety.

#### Technical Operations & Maintenance
- Monitor performance using dashboards/tools.
- Perform routine/preventive maintenance.
- Respond to faults, outages, complaints.
- Maintain logs, downtime records, analysis.

#### Environmental, Social & Governance
- Enforce safety protocols.
- Conduct E&S due diligence, risk assessments.
- Ensure environmental compliance.
- Document incidents, corrective actions.

#### Technical Research & Optimization
- Test new technologies (smart meters, lithium batteries).
- Recommend upgrades for efficiency.
- Improve installation/maintenance processes.
- Collaborate on monitoring/automation.

- Supervise technicians, contractors.

## SOPs
### Isolated Solar Mini-Grid Installation
- Purpose: Process for installing isolated solar mini-grid systems, including generation (PV, inverter, battery, racks, protection, earthing, wiring), distribution (poles, cables), customer connection (meter, wiring).
- Scope: All installations by EML and contractors.
- Responsibilities: EML provides equipment, selects installers, documentation, quality checks; Contractors complete installations per standards.
- Pre-Installation: Site survey (space, sunlight, load, hazards), acquisition (research, documents, validation), design/specification (PV, inverter, battery, racks, protection, wires, earthing), financing (verified costs, blend equity/debt), contractual agreement (EPC, scope, safety, materials, warranty).
- Installation: PV mounting (slope, height, no shading, depth, bolts, corrosion protection, gravelling, wind resistance, voltage), inverter/electrical (cabin, connections, grounding, polarity, testing), BESS (base, earthing, fire suppression, AC, insulation, cable size, standards, temperature, DOD), protection (surge, breakers, testing), earthing/grounding (rod, connections, resistance 0-2 Ohms), wiring (insulated, labeled, grounded), distribution (poles erect, certified, aluminum conductors, sag <5°, voltage drop <3%, earthed every 5 spans, protection on first poles), energy cabin (reinforced, earthed, fire/alarm, AC, prefabricated, rust-free, plinth 0.5m), customer connection (meters per OEM, single/three phase per load, document Meter ID/details, 16sqmm cables).
- Operation and Maintenance: Daily (monitoring, load management), generation/consumption (irradiance, cleaning), routine (monthly inspections, quarterly cleaning), preventive (replace components), corrective (address issues), reporting (logs, incidents, monthly summaries).
- Quality Control: Inspections at stages, final inspection, rectify issues, NEMSA inspection.
- External Contractors: Qualifications (certifications, references, COREN/NEMSA), performance/liability (damage liability, penalties, payments inspection-based), warranty (18 months), non-compliance (termination, blacklist).
- Handover: User manual, maintenance schedule, warranty, certificate, signed handover.
- Health/Safety: PPE, regulations, clean workspace, permit to work.
- Review: Annual.

### Procurement & Logistics SOP
- Preface: Framework for efficient procurement/logistics at GroSolar/FundCo.
- Objectives: Streamline processes, minimize costs, timely delivery, compliance, transparency, quality, risk mitigation.
- Outcome: Timely high-quality procurement, efficient logistics, minimized risks, strong suppliers, compliance.
- Structure: Introduction, objectives, benefits, risks, controls, success factors, narrative, KPIs, enforcement.
- Risks: Supplier issues, disruptions, logistics challenges, cost overruns.
- Controls: Qualification/evaluation, PO approval, inventory management, planning, monitoring, reviews.
- Success Factors: Strong relationships, efficient processes, effective management, improvement.
- Narrative:
  - Supplier Identification/Selection: Research, evaluate (quality, reliability, cost, stability, expertise), database, audits.
  - RFQ/RFP: Prepare detailed, disseminate, evaluate (price, quality, timeline, capabilities, stability). Approval by dept head, evaluation committee (3+ members).
  - PO Generation/Approval: Prepare detailed, approvals, issue, track.
  - Supplier Performance: Monitor KPIs, reviews, feedback, corrective action.
  - Inventory: Accurate records, audits, turnover.
  - Logistics: Plans (modes, routing, scheduling), providers, tracking, customs, delivery.
  - Delivery/Receipt: Inspect, verify docs, update inventory, resolve issues.
- KPIs: Supplier rating, on-time delivery, inventory turnover, logistics cost/unit.
- Enforcement: Annual review, training, monitoring, corrective action.

### Client Onboarding SOP (GroSolar)
- Purpose: Standardize processes for consistency, efficiency, compliance.
- Scope: All departments (Customer Relations, Credit/Risk, Engineering/Procurement, Finance, Legal, Sales).
- Objectives: Standardize, compliance, satisfaction, risk mitigation.
- Definitions: SoP, PV, O&M, CRO, KYC, C/R, BoQ, MD, OEM, BVN, CAM.
- Responsibilities: Project Manager (lifecycle), Site Assessor (suitability), Design Engineer (system), Installation Team (execution), QA Officer (standards), Customer Support (ongoing).
- Onboarding: Inquiry via website, CRO profile/contact, folder, contact within 24hrs.
- KYC: Auto-send docs, client submit, CRO monitor, share with C/R, within 7 days.
- Credit Assessment: Check Credit Bureau, financial history, report, approval doc, within 5 days.
- Final Approval: Affordability/risk, summary, MD approval, log, within 3 days.
- Technical Assessment: Site visit, report, within 7 days.
- Engineering Costings: BoQ/term sheet, approval, within 3 days.
- Financial Structuring: Payment plans, proposal, within 5 days.
- Management Assessment: Vetting, MD sign-off, within 3 days.
- Proposal Sending: Email/meeting, follow-up, within 24hrs.
- Customer Consent: Select terms, share with Legal, drafting within 5 days.
- Installation/Commissioning: Schedule, install, report/certificate, demo, within 14 days.
- Portfolio Monitoring: Repayment tracking, stress tests, dashboard, monthly.
- Summary: Flow from onboarding to monitoring.
- Conclusion: Efficiency, risk mitigation, quality delivery.
- Enforcement: Annual review, training, monitoring, corrective action.

### Swap Station Mobility SOP
- Introduction: Guidelines for swap stations operations, uniformity, efficiency, safety.
- Scope: Battery handling, customer service, maintenance, data management.
- Responsibilities: Station Manager (oversee, inventory), Technicians (maintenance), CSR (inquiries, subscriptions).
- Operational Procedures:
  - Station Setup/Maintenance: Daily opening (clean, equipment, inventory), regular (inspections, monthly maintenance).
  - Battery Charging: Inspect, connect, monitor, disconnect/store.
  - Battery Swapping: Check-in (subscription), procedure (power off, compatibility, swap, secure), check-out (record, receipt).
  - EV Bike/Battery Management: Lease-to-own (agreement, reviews, transfer), rental (inspection, management, cleaning), battery (BMS, charging environment).
  - Station Audit: Weekly performance review.
  - Data Logging: Records, analytics for maintenance.
  - Safety/Emergency: Protocols, response (fire, spill, evacuate, first aid, report).
  - Customer Service: Interaction, feedback.
  - Other: Documentation/reporting, continuous improvement, training, compliance/review.
- Conclusion: Guide for efficient/safe operation, regular updates.

### Green Kiosk Concept Note
- Executive Summary: Close energy gap, deploy mini-grids, hurdles, GreenKiosk as standalone solar-powered kiosk for electricity/telecom in centralized hub for PUE.
- Problem: 80M lack electricity, rural farmers, waste, mini-grids hindered by density/costs.
- Rationale: Standalone kiosks for unfeasible areas, centralized services, serve 5-10km radius.
- SDG Alignment: 1 (income), 5 (women empowerment), 7 (energy), 8 (economy/jobs), 13 (emissions).
- Solution: Modular solar-powered kiosks with PV, batteries, outlets for charging, cold storage, business centers, retail, barbing, entertainment.
- Revenue: Power sales, appliances/SHS sales.
- Target: Women/youth for entrepreneurship.
- Implementation: Engagement (meetings, assessment, campaigns, partnerships), ownership (cooperatives, lease-to-own), training, maintenance.
- Key Questions: Energy needs, dynamics, access/challenges, interest, financial, gender/youth, operational, sustainability.
- Financial: CAPEX (panels, batteries, structure, training), OPEX (maintenance, parts, remuneration).
- Scalability: Pilot 2-3, expand to 50+ in 5 years.
- Risk/Mitigation: Operational (failure - maintenance/training), Community (adoption - engagement), Market (revenue - diversify), Environmental (weather - storage/hybrid).
- Flow: Funding partners, local operators (women), leaders, engagement officers, technical (GroSolar), end-users.
- Conclusion: Transformative for energy poverty, empower women/youth, socio-economic development.

### Company Task Manager Requirements
- Auto-Record Meetings, Centralized Project Management, 2FA, Employee Status, Access Levels, Task Delegation, Alerts, Document Storage, Team Chat, Audit Trail, Dashboard/Analytics, Reminders, Mobile Support, Integrations, Task Visibility, Performance Tracking, Knowledge Base.

## Learning Resources
- Microsoft Word: Beginners course by Technology for Teachers and Students (YouTube playlist).
- Microsoft Excel: Basics to Advanced by excelisfun (YouTube).
- Microsoft PowerPoint: Full course (YouTube playlist).
- CFI Finance: Free courses on finance skills, Excel, modeling, forecasting.

## Profiles
### Corporate Team (FundCo/CEF/EML/Agronomie/SSM)
- Abiodun Oni: CIO FundCo, ex-Infracredit, Tesla, Stanbic, MSc UCT, BSc Ilorin.
- Maurice Okoli: CEO AFREAL, ex-Abbey Mortgage, Deutsche Bank, Citigroup, ABN Amro, MSc London, MBA ESADE, BSc Guildhall.
- Yewande Senbore: Partner Olaniwun Ajayi LP, ex-Capital Market Solicitors, LLB Lagos, BL, MSc SOAS.
- Fiona Robertson-Etet: Independent, ex-InfraCredit, One Campaign, BA Sussex, MSc SOAS.
- Chizoba Onoh: 10yrs finance/impact, ex-IFC, Ecowas, BSc Leicester, MSc LSE.
- Chidinma Nsofor: 10yrs finance, ex-ASO Savings, BSc Imo State.
- Olufunmilola Abraham: 12yrs legal, LLB Onabanjo, BL.
- Jojololami Ngene: Director, 11yrs engineering, ex-Cundall, Norman Disney, MSc Southampton.
- John Edoja Akpovwovwo: Project Manager/Agricultural Economist, BSc/MSc, ex-FundCo, Lulu Briggs, Ok Farm.
- Olufunmilola Abraham: Head Legal (repeated).
- Lambert Saviour: Head Agricultural Extension, MSc Rivers, BSc Port Harcourt, ex-FundCo, Idah Farms, Nice Business.
- Ogolo Raphael: Agricultural Extension Agent, BSc Port Harcourt, ex-Idah Farms.
- Emmanuel Ogbuche: Energy Expert, BSc Makurdi, ex-Husk, Privida.
- Ozioma Chinedu: ESG Adviser AquaEarth, BSc Chukwuemeka Odumegwu, certifications World Bank/UN/IFC/GEF.
- Edward Chidiebere Gideon: Electrical/Electronics Engineer Farm Warehouse, HND Federal Polytechnic Bida, MSc Rome Business School.
- Olumide Fatoki: Chairman EML, 15yrs energy, ex-GIZ NESP, EU programs, Exec MBA, MSc, Acumen Fellow.
- Vivian Umeaku: Finance Specialist, 8yrs, analytical/leadership.
- Oche Joshua: Agro Technician, BEng Agricultural Engineering.
- Taiwo Popoola: Regional Manager Community Engagement, HND/ND Electronics/Telecom.
- Adekunle Anjorin: Regional Manager Community Engagement, BEng Agricultural Engineering.
- Timothy Yusuf: Project Technician, electrical engineering.
- Israel Akomodesegbe: Regional Manager Community Engagement, B.Agric Agricultural Economics.

## Partners
- Mini-Grid Developers: GVE, Darway Coast, ACOB Lighting.
- ESG Consultants: AquaEarth.
- Rural Telephony: Hotspot Network Limited.
- OEMs: Niji Lukas, Nova Technologies, Okeke Casmir, Zebra Milling, Bennie Agro, Alayan Metal, Dominion Industrial, DOINGS Group, Farm Warehouse, Zhengzhou Maosu, ECOM group, China Impact Sourcing.
- Consultants/Procurement: Farmwarehouse.
- Systems: UnoTelos, PowerTech Nigeria, Transilient Technologies.

## Lessons Learnt
- Synergy among stakeholders crucial.
- Address fabrication challenges like startup load mismatch.

## List of OEM’s
Local: Bennie Agro, Niji Agro, Alayan metal, Dominion Industrial Services, Okeke Casmir Enterprise, Best Royal Agro, Zebra milling.
International: DOINGS Group (China), Farm Warehouse (Canada), Zhengzhou Maosu (China), ECOM group (Micromec), China Impact Sourcing.

## List of Community Interviewed
Angwan Rina (Plateau), Shimankar (Plateau), Agbokim (Cross River), Bendeghe (Cross River), Etomi (Cross River), Ikang (Cross River), Umuoye (Rivers), Akpoku (Rivers), Orwu/Ogida (Rivers), Eleuma (Rivers), Lokpakwu 1/2 (Abia), Sule (Edo), Ajegunle (Edo), Otu Costain (Ondo), Afia (Benue), Gbegi (Benue), Oloyan (Edo), Onipanu (Edo).

## Contact
6th Floor Landmark Towers, 5B Water Corporation Way, Oniru, Victoria Island, Lagos. www.fundco.ng, +234 01-4545361, info@fundco.ng.
`;

// Grok query with content restriction (enhanced to handle company docs)
export const grokQuery = async (question, content) => {
  const messages = [
    {
      role: 'system',
      content: 'You are a company training AI. Answer ONLY from the provided materials (SOPs, terms, profiles). If not in materials, say "Information not available". Use markdown.',
    },
    {
      role: 'user',
      content: `Materials: ${content}\n\nQuestion: ${question}`,
    },
  ];
  const response = await openai.chat.completions.create({
    model: 'grok-4',
    messages,
    temperature: 0.7,
    max_tokens: 1024,
  });
  return response.choices[0].message.content;
};
// New: Query company docs using tools (e.g., for knowledge-base-query tool)
export const queryCompanyDocs = async (query, fileName = 'all_company_docs.pdf') => {
  // Use embedded COMPANY_KNOWLEDGE to answer queries
  const messages = [
    {
      role: 'system',
      content: `You are a knowledgeable assistant for FundCo Capital Managers. Answer the query based ONLY on the following company knowledge. If the information is not available, say "Information not available". Use markdown for structure.

Company Knowledge:
${COMPANY_KNOWLEDGE}`,
    },
    {
      role: 'user',
      content: query,
    },
  ];
  const response = await openai.chat.completions.create({
    model: 'grok-4',
    messages,
    temperature: 0.3,
    max_tokens: 4096,
  });
  return response.choices[0].message.content;
};