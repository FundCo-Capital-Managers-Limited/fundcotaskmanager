// backend/controllers/grokController.js
import OpenAI from 'openai';
import GrokChat from '../models/grokModel.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mammoth = require('mammoth');
const XLSX    = require('xlsx');

const openai = new OpenAI({
  apiKey:  process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// ── Company knowledge ─────────────────────────────────────────────────────────
const COMPANY_KNOWLEDGE = `
FundCo Capital Managers: Alternative asset manager focusing on sustainable infrastructure.
Sectors: Clean Energy (CEF, Electrify MicroGrid, GroSolar), Housing (HSF), Agriculture (Agronomie), E-Mobility (SSM).
Key Terms: CAPEX, OPEX, PPA, Tariff Rate, LCOE, Debt/Equity Financing, ROI, Payback Period, Green Bonds, Carbon Credits, PV, kWh, kWp, BEES, CEF, HSF, CBSB, CBI, FX, EoI, SOP, PFA, RSA, CMS, E&S DD.
Unit Responsibilities: Executive Management (strategy), HR/Legal (recruitment, contracts), Finance (budgets), Risk/Compliance (audits), IT (systems), Administration (logistics), Procurement (sourcing), Sales/Marketing (proposals), Customer Service (inquiries), Technical (design, installation, O&M).
SOPs: Isolated Solar Mini-Grid Installation (site survey, design, installation, O&M), Procurement & Logistics (supplier selection, RFQ, PO), Client Onboarding (KYC, credit assessment).
Partners: GVE, Darway Coast, ACOB, AquaEarth, Farm Warehouse.
Green Kiosk: Solar-powered kiosks for rural energy. Black Soldier Fly: Sustainable waste management.
`.trim();

// ── Tool system prompts ───────────────────────────────────────────────────────
const TOOL_PROMPTS = {
  'general':                   `${COMPANY_KNOWLEDGE}\n\nYou are FundCo AI, a knowledgeable assistant for FundCo Capital Managers. Be concise, accurate, and professional. Use Markdown formatting. Address the user as "you". Analyze attached files thoroughly.`,
  'report-generator':          `${COMPANY_KNOWLEDGE}\n\nYou are a professional report writer. Generate clear, structured progress reports in Markdown using ONLY the tasks provided. Be truthful about completed and incomplete work. Use FundCo terminology.`,
  'task-prioritizer':          `${COMPANY_KNOWLEDGE}\n\nYou are a task management expert. Analyze and prioritize tasks using Eisenhower matrix or MoSCoW. Output a sorted list with scores and reasoning. Use FundCo SOPs for context.`,
  'effort-estimator':          `${COMPANY_KNOWLEDGE}\n\nYou are a project estimation specialist. Provide realistic time and resource estimates with phase breakdowns. Use FundCo terms like CAPEX/OPEX.`,
  'task-breaker':              `${COMPANY_KNOWLEDGE}\n\nYou are a task decomposition expert. Break tasks into atomic sub-tasks with dependencies and estimates. Align with FundCo unit responsibilities.`,
  'email-writer':              `${COMPANY_KNOWLEDGE}\n\nYou are a professional communicator. Draft clear, structured emails with subject, greeting, body, and closing. Adapt tone as needed.`,
  'summary-generator':         `${COMPANY_KNOWLEDGE}\n\nYou are a summarization expert. Create concise summaries highlighting key points, actions, deadlines, and risks. Use bullet points.`,
  'brainstormer':              `${COMPANY_KNOWLEDGE}\n\nYou are a creative brainstormer. Generate diverse ideas with pros/cons and feasibility scores. Tailor ideas to FundCo's sectors.`,
  'document-analyzer':         `${COMPANY_KNOWLEDGE}\n\nYou are a document analysis expert. Extract key information from attached files, identify anomalies, and suggest actions. Analyze SOPs and BoQs thoroughly.`,
  'mini-grid-planner':         `${COMPANY_KNOWLEDGE}\n\nYou are a mini-grid planning expert. Use FundCo SOPs for site survey, design (PV, BESS), and installation. Include BoQ, timelines, and ESG risks.`,
  'lcoe-calculator':           `${COMPANY_KNOWLEDGE}\n\nYou are an LCOE calculation expert. Calculate levelized cost of energy incorporating CAPEX/OPEX, energy yield, and depreciation. Provide comparisons to grid/diesel.`,
  'ppa-drafter':               `${COMPANY_KNOWLEDGE}\n\nYou are a PPA drafting expert. Draft Power Purchase Agreements based on FundCo SOPs including tariff rates, terms, and carbon credits.`,
  'carbon-credit-estimator':   `${COMPANY_KNOWLEDGE}\n\nYou are a carbon credit estimation expert. Calculate CO2 avoidance from diesel displacement. Align with NDCs and CBI certification.`,
  'mortgage-simulator':        `${COMPANY_KNOWLEDGE}\n\nYou are a mortgage simulation expert for HSF. Factor in ROI, payback period, and green bonds in financial models.`,
  'property-valuator':         `${COMPANY_KNOWLEDGE}\n\nYou are a property valuation expert. Incorporate ESG factors (BEES rating), location analysis, and market data.`,
  'green-building-assessor':   `${COMPANY_KNOWLEDGE}\n\nYou are a green building assessment expert. Assess energy efficiency, environmental impact, and sustainability ratings.`,
  'crop-yield-predictor':      `${COMPANY_KNOWLEDGE}\n\nYou are a crop yield prediction expert for Agronomie. Factor in energy access from mini-grids, soil health, and BSF farming.`,
  'pue-optimizer':             `${COMPANY_KNOWLEDGE}\n\nYou are a Productive Use of Energy optimizer. Analyze agro-processing needs (milling, cold storage) and optimize energy usage.`,
  'ev-infrastructure-planner': `${COMPANY_KNOWLEDGE}\n\nYou are an EV infrastructure planning expert for SSM. Plan charging and swapping stations with solar integration.`,
  'portfolio-risk-analyzer':   `${COMPANY_KNOWLEDGE}\n\nYou are a portfolio risk analysis expert. Assess FX risks, NPL exposure, and ESG compliance. Run stress tests.`,
  'esg-compliance-checker':    `${COMPANY_KNOWLEDGE}\n\nYou are an ESG compliance expert. Check against IFC standards and UN principles. Flag non-compliance issues.`,
  'investment-forecaster':     `${COMPANY_KNOWLEDGE}\n\nYou are an investment forecasting expert. Project ROI and payback periods using market trends and financial models.`,
  'financial-structurer':      `${COMPANY_KNOWLEDGE}\n\nYou are a financial structuring expert. Design debt/equity financing, green bond structures, and payment plans.`,
  'contract-drafter':          `${COMPANY_KNOWLEDGE}\n\nYou are a contract drafting expert. Draft EPC, PPA, and other contracts based on FundCo SOPs and legal templates.`,
  'procurement-advisor':       `${COMPANY_KNOWLEDGE}\n\nYou are a procurement advisor. Guide supplier selection, RFQ processes, and PO management using FundCo SOPs.`,
  'boq-generator':             `${COMPANY_KNOWLEDGE}\n\nYou are a Bill of Quantities expert. Generate detailed BoQs for FundCo projects with materials, quantities, and cost estimates.`,
  'sdg-impact-analyzer':       `${COMPANY_KNOWLEDGE}\n\nYou are an SDG impact analysis expert. Map project activities to UN Sustainable Development Goals with measurable indicators.`,
};

// ── File processing helper ─────────────────────────────────────────────────────
const processFiles = async (files, lastMessage) => {
  let contentParts = typeof lastMessage.content === 'string'
    ? [{ type: 'text', text: lastMessage.content }]
    : (Array.isArray(lastMessage.content) ? lastMessage.content : [{ type: 'text', text: String(lastMessage.content) }]);

  for (const file of files) {
    const mime = file.mimetype || file.mime || '';
    try {
      if (mime.startsWith('image/')) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${file.buffer.toString('base64')}` },
        });
      } else if (mime.startsWith('text/')) {
        contentParts.push({ type: 'text', text: `📄 Attached: "${file.originalname}"\n\n${file.buffer.toString('utf-8')}` });
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        contentParts.push({ type: 'text', text: `📄 Word doc "${file.originalname}":\n\n${result.value}` });
      } else if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const wb = XLSX.read(file.buffer, { type: 'buffer' });
        let text = '';
        wb.SheetNames.forEach(s => { text += `Sheet "${s}":\n${XLSX.utils.sheet_to_txt(wb.Sheets[s])}\n\n`; });
        contentParts.push({ type: 'text', text: `📊 Excel "${file.originalname}":\n\n${text}` });
      } else {
        contentParts.push({ type: 'text', text: `📎 File attached: "${file.originalname}" (${mime}) — note: binary content not directly readable.` });
      }
    } catch (e) {
      contentParts.push({ type: 'text', text: `⚠️ Could not process "${file.originalname}": ${e.message}` });
    }
  }
  return contentParts;
};

// ── Auto-generate title + summary ─────────────────────────────────────────────
const generateTitleAndSummary = async (fullContent) => {
  try {
    const resp = await openai.chat.completions.create({
      model: 'grok-4',
      messages: [
        { role: 'system', content: 'You generate a short title (max 8 words) and one-sentence summary for chat sessions. Reply with EXACTLY two lines:\nTitle: <title>\nSummary: <summary>' },
        { role: 'user',   content: `Generate title and summary for this response:\n\n${fullContent.slice(0, 800)}` },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });
    const text  = resp.choices[0].message.content || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const title   = (lines.find(l => l.startsWith('Title:'))   || '').replace('Title:', '').trim()   || 'FundCo AI Chat';
    const summary = (lines.find(l => l.startsWith('Summary:')) || '').replace('Summary:', '').trim() || '';
    return { title, summary };
  } catch {
    return { title: 'FundCo AI Chat', summary: '' };
  }
};

// ── Main chat handler (streaming SSE) ────────────────────────────────────────
export const grokChat = async (req, res) => {
  let { messages, taskContext, toolId, chatId } = req.body;

  // Parse JSON strings (from FormData)
  if (typeof messages    === 'string') try { messages    = JSON.parse(messages);    } catch { return res.status(400).json({ error: 'Invalid messages' }); }
  if (typeof taskContext === 'string') try { taskContext = JSON.parse(taskContext); } catch {}

  if (!Array.isArray(messages) || !messages.length)
    return res.status(400).json({ error: 'messages array required' });

  // Process file attachments
  if (req.files?.length) {
    const lastMsg = messages[messages.length - 1];
    lastMsg.content = await processFiles(req.files, lastMsg);
  }

  // Build system prompt
  const systemPrompt = TOOL_PROMPTS[toolId] || TOOL_PROMPTS['general'];
  let systemContent = systemPrompt;
  if (taskContext) {
    const tc = Array.isArray(taskContext) ? taskContext : [taskContext];
    systemContent += `\n\n--- User's Current Tasks ---\n${JSON.stringify(tc.slice(0, 50), null, 2)}`;
  }
  systemContent += `\n\nCurrent user: ${req.user?.firstName || req.user?.name || 'User'}. Date: ${new Date().toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} (WAT/Lagos time).`;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const stream = await openai.chat.completions.create({
      model: 'grok-4',
      messages: [
        { role: 'system', content: systemContent },
        ...messages.map(m => ({
          role:    m.role,
          content: Array.isArray(m.content) ? m.content : (typeof m.content === 'string' ? m.content : String(m.content)),
        })),
      ],
      temperature: 0.35,
      max_tokens:  4096,
      stream: true,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');

    // Persist / update chat history
    try {
      const assistantMsg = { role: 'assistant', content: fullContent };
      const allMessages  = [...messages, assistantMsg];

      if (chatId) {
        // Continue existing chat
        const existing = await GrokChat.findOne({ _id: chatId, userId: req.user._id });
        if (existing) {
          existing.messages = allMessages;
          existing.taskContext = taskContext || existing.taskContext;
          await existing.save();
          res.write(`data: ${JSON.stringify({ chatId: existing._id.toString(), saved: true })}\n\n`);
        }
      } else {
        // Create new chat
        const { title, summary } = await generateTitleAndSummary(fullContent);
        const newChat = await GrokChat.create({
          userId:      req.user._id,
          toolId,
          messages:    allMessages,
          taskContext,
          title,
          summary,
        });
        res.write(`data: ${JSON.stringify({ chatId: newChat._id.toString(), title, summary, saved: true })}\n\n`);
      }
    } catch (saveErr) {
      console.error('Chat save error:', saveErr.message);
    }
  } catch (err) {
    console.error('FundCo AI error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'FundCo AI is temporarily unavailable. Please try again.' })}\n\n`);
  } finally {
    res.end();
  }
};

// ── Get chat history ──────────────────────────────────────────────────────────
export const getChatHistory = async (req, res) => {
  try {
    const { toolId, toolIds, search, starred, page = 1, limit = 30 } = req.query;
    const filter = { userId: req.user._id };
    // toolIds = comma-separated list (AI Tools section scope)
    // toolId  = single exact match
    if (toolIds) {
      filter.toolId = { $in: toolIds.split(',').map(s => s.trim()).filter(Boolean) };
    } else if (toolId) {
      filter.toolId = toolId;
    }
    if (starred === 'true') filter.starred = true;
    if (search)  filter.$text   = { $search: search };

    const chats = await GrokChat.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-messages'); // Don't send full messages in list — saves bandwidth

    const total = await GrokChat.countDocuments(filter);
    res.json({ success: true, histories: chats, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
};

// ── Get single chat (with messages) ──────────────────────────────────────────
export const getChatById = async (req, res) => {
  try {
    const chat = await GrokChat.findOne({ _id: req.params.chatId, userId: req.user._id });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch chat' });
  }
};

// ── Update chat (title / tags / starred) ──────────────────────────────────────
export const updateChat = async (req, res) => {
  try {
    const { title, tags, starred } = req.body;
    const update = {};
    if (title   !== undefined) update.title   = title;
    if (tags    !== undefined) update.tags    = tags;
    if (starred !== undefined) update.starred = starred;

    const chat = await GrokChat.findOneAndUpdate(
      { _id: req.params.chatId, userId: req.user._id },
      update,
      { new: true }
    );
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update chat' });
  }
};

// ── Delete chat ───────────────────────────────────────────────────────────────
export const deleteChat = async (req, res) => {
  try {
    const deleted = await GrokChat.findOneAndDelete({ _id: req.params.chatId, userId: req.user._id });
    if (!deleted) return res.status(404).json({ success: false, error: 'Chat not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete chat' });
  }
};

// ── Delete all chats for a tool ───────────────────────────────────────────────
export const clearToolHistory = async (req, res) => {
  try {
    await GrokChat.deleteMany({ userId: req.user._id, toolId: req.params.toolId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear history' });
  }
};