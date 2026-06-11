// backend/seed/learningSeedPart2.js
// Run AFTER learningSeed.js — adds courses 4-7
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';
import { LearningCourse } from '../models/learningMaterialModel.js';
import { connectDB } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: `${__dirname}/../.env` });

function buildExam(modules, targetCount = 30) {
  const pool = [];
  modules.forEach(m => {
    (m.quiz || []).forEach(q => pool.push({ ...q, moduleRef: m.title }));
  });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(targetCount, pool.length));
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSE 4: EML Mini-Grid Installation SOP (Expert — required for EML staff)
// ─────────────────────────────────────────────────────────────────────────────
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
const seedData = async () => {
  try {
    await connectDB();

    const courses = [course4, course5, course6, course7];

    for (const course of courses) {
      // Insert fresh (don't delete — additive to part 1)
      const existing = await LearningCourse.findOne({ title: course.title });
      if (existing) {
        await LearningCourse.findByIdAndDelete(existing._id);
        console.log(`🔄  Replaced existing: ${course.title}`);
      }
      const created = await LearningCourse.create(course);
      console.log(`✅  ${created.title} — ${course.modules.length} modules, ${course.exam.length} exam questions`);
    }

    console.log('\n🎉  Seed Part 2 complete (4 courses).');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedData();