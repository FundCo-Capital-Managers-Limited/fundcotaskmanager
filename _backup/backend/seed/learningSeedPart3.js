// backend/seed/learningSeedPart3.js
// Run AFTER parts 1 and 2 — adds courses 8-12
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
// COURSE 8: Green Kiosk Concept Note
// ─────────────────────────────────────────────────────────────────────────────
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
const seedData = async () => {
  try {
    await connectDB();

    const courses = [course8, course9, course10, course11, course12];

    for (const course of courses) {
      const existing = await LearningCourse.findOne({ title: course.title });
      if (existing) {
        await LearningCourse.findByIdAndDelete(existing._id);
        console.log(`🔄  Replaced existing: ${course.title}`);
      }
      const created = await LearningCourse.create(course);
      console.log(`✅  ${created.title} — ${course.modules.length} modules, ${course.exam.length} exam questions`);
    }

    console.log('\n🎉  Seed Part 3 complete (5 courses).');
    console.log('All 12 courses are now seeded.');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedData();