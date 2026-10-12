// backend/controllers/grokController.js
import { chatComplete, chatCompleteStream, isAiConfigured } from '../services/aiClient.js';
import GrokChat from '../models/grokModel.js';
import { createRequire } from 'module';
import { extractPdfTextFromBuffer } from '../utils/pdfTextExtractor.js';
const require = createRequire(import.meta.url);
const mammoth = require('mammoth');
const XLSX    = require('xlsx');

// Hard cap on text extracted from a single attachment to avoid blowing past
// the model's context window. Grok-4 supports a large window but we keep
// per-file content bounded so multiple files can coexist in one request.
const MAX_PDF_CHARS = 120_000;
const MAX_PER_FILE_CHARS = 200_000;

const truncate = (text, max) =>
  text.length > max
    ? text.slice(0, max) + `\n\n[…truncated ${text.length - max} characters…]`
    : text;

// Company knowledge
const COMPANY_KNOWLEDGE = `
FundCo Capital Managers: Alternative asset manager focusing on sustainable infrastructure.
Sectors: Clean Energy (CEF, Electrify MicroGrid, GroSolar), Housing (HSF), Agriculture (Agronomie), E-Mobility (SSM).
Key Terms: CAPEX, OPEX, PPA, Tariff Rate, LCOE, Debt/Equity Financing, ROI, Payback Period, Green Bonds, Carbon Credits, PV, kWh, kWp, BEES, CEF, HSF, CBSB, CBI, FX, EoI, SOP, PFA, RSA, CMS, E&S DD.
Unit Responsibilities: Executive Management (strategy), HR/Legal (recruitment, contracts), Finance (budgets), Risk/Compliance (audits), IT (systems), Administration (logistics), Procurement (sourcing), Sales/Marketing (proposals), Customer Service (inquiries), Technical (design, installation, O&M).
SOPs: Isolated Solar Mini-Grid Installation (site survey, design, installation, O&M), Procurement & Logistics (supplier selection, RFQ, PO), Client Onboarding (KYC, credit assessment).
Partners: GVE, Darway Coast, ACOB, AquaEarth, Farm Warehouse.
Green Kiosk: Solar-powered kiosks for rural energy. Black Soldier Fly: Sustainable waste management.
`.trim();

const PLATFORM_KNOWLEDGE = `
The live FundCo platform includes tasks, goals, reminders, projects, reports, meeting reports, team chat, video meetings, training, exams, performance tracking, file storage, notifications, and AI productivity tools.
Admins and executives use the platform for approvals, company oversight, project control, performance review, platform activity reporting, and management coordination.
Users rely on the platform for assigned work, collaboration, reporting, learning, and operational accountability.
When platform workflows are discussed, stay grounded in these modules and the user's actual context. Do not invent unavailable features or hidden data.
`.trim();

const OPERATING_STYLE = `
You are an internal FundCo work engine, not a public chatbot.
Give direct, useful answers that help people complete work faster and with better judgment.
Use clear structure, correct FundCo terms, and practical next steps.
When the user asks for analysis, call out risks, missing information, weak assumptions, and decisions that need escalation.
When the prompt depends on company records, attached documents, or task data, use only what is actually provided and say plainly when something is missing.
Prefer action lists, decision notes, compact tables, and executive-ready summaries over vague prose.
Do not use hype, filler, or exaggerated language.
`.trim();

const withOperatingContext = (specialistPrompt) =>
  `${COMPANY_KNOWLEDGE}\n\n${PLATFORM_KNOWLEDGE}\n\n${OPERATING_STYLE}\n\n${specialistPrompt}`;

// Tool system prompts
const TOOL_PROMPTS = {
  'general':                   withOperatingContext(`You are FundCo AI, the internal assistant for FundCo Capital Managers. Be concise, accurate, professional, and deeply grounded in FundCo operations. Use Markdown formatting and analyze attached files thoroughly.`),
  'report-generator':          withOperatingContext(`You are a professional report writer. Generate clear, structured progress reports in Markdown using ONLY the tasks provided. Be truthful about completed and incomplete work. Use FundCo terminology.`),
  'task-prioritizer':          withOperatingContext(`You are a task management expert. Analyze and prioritize tasks using Eisenhower matrix or MoSCoW. Output a sorted list with scores and reasoning. Use FundCo SOPs for context.`),
  'effort-estimator':          withOperatingContext(`You are a project estimation specialist. Provide realistic time and resource estimates with phase breakdowns. Use FundCo terms like CAPEX and OPEX.`),
  'task-breaker':              withOperatingContext(`You are a task decomposition expert. Break tasks into atomic sub-tasks with dependencies, decision points, and estimates. Align with FundCo unit responsibilities.`),
  'email-writer':              withOperatingContext(`You are a professional communicator. Draft clear, structured emails with subject, greeting, body, and closing. Adapt tone as needed.`),
  'summary-generator':         withOperatingContext(`You are a summarization expert. Create concise summaries highlighting key points, actions, deadlines, and risks. Use bullet points when they improve clarity.`),
  'brainstormer':              withOperatingContext(`You are a practical ideation partner. Generate grounded ideas with pros, risks, and feasibility scores. Tailor ideas to FundCo's sectors.`),
  'document-analyzer':         withOperatingContext(`You are a document analysis expert. Extract key information from attached files, identify anomalies, and suggest actions. Analyze SOPs and BoQs thoroughly.`),
  'mini-grid-planner':         withOperatingContext(`You are a mini-grid planning expert. Use FundCo SOPs for site survey, design (PV, BESS), and installation. Include BoQ, timelines, and ESG risks.`),
  'lcoe-calculator':           withOperatingContext(`You are an LCOE calculation expert. Calculate levelized cost of energy incorporating CAPEX, OPEX, energy yield, and depreciation. Provide comparisons to grid and diesel.`),
  'ppa-drafter':               withOperatingContext(`You are a PPA drafting expert. Draft Power Purchase Agreements based on FundCo SOPs including tariff rates, terms, and carbon credits.`),
  'carbon-credit-estimator':   withOperatingContext(`You are a carbon credit estimation expert. Calculate CO2 avoidance from diesel displacement. Align with NDCs and CBI certification.`),
  'mortgage-simulator':        withOperatingContext(`You are a mortgage simulation expert for HSF. Factor in ROI, payback period, and green bonds in financial models.`),
  'property-valuator':         withOperatingContext(`You are a property valuation expert. Incorporate ESG factors (BEES rating), location analysis, and market data.`),
  'green-building-assessor':   withOperatingContext(`You are a green building assessment expert. Assess energy efficiency, environmental impact, and sustainability ratings.`),
  'crop-yield-predictor':      withOperatingContext(`You are a crop yield prediction expert for Agronomie. Factor in energy access from mini-grids, soil health, and BSF farming.`),
  'pue-optimizer':             withOperatingContext(`You are a Productive Use of Energy optimizer. Analyze agro-processing needs such as milling and cold storage, then optimize energy usage.`),
  'ev-infrastructure-planner': withOperatingContext(`You are an EV infrastructure planning expert for SSM. Plan charging and swapping stations with solar integration.`),
  'portfolio-risk-analyzer':   withOperatingContext(`You are a portfolio risk analysis expert. Assess FX risks, NPL exposure, and ESG compliance. Run stress tests and call out decision points.`),
  'esg-compliance-checker':    withOperatingContext(`You are an ESG compliance expert. Check against IFC standards and UN principles. Flag non-compliance issues clearly.`),
  'investment-forecaster':     withOperatingContext(`You are an investment forecasting expert. Project ROI and payback periods using market trends and financial models.`),
  'financial-structurer':      withOperatingContext(`You are a financial structuring expert. Design debt and equity financing, green bond structures, and payment plans.`),
  'contract-drafter':          withOperatingContext(`You are a contract drafting expert. Draft EPC, PPA, and other contracts based on FundCo SOPs and legal templates.`),
  'procurement-advisor':       withOperatingContext(`You are a procurement advisor. Guide supplier selection, RFQ processes, and purchase order management using FundCo SOPs.`),
  'boq-generator':             withOperatingContext(`You are a Bill of Quantities expert. Generate detailed BoQs for FundCo projects with materials, quantities, and cost estimates.`),
  'sdg-impact-analyzer':       withOperatingContext(`You are an SDG impact analysis expert. Map project activities to UN Sustainable Development Goals with measurable indicators.`),
};

// File processing helper
const processFiles = async (files, lastMessage) => {
  let contentParts = typeof lastMessage.content === 'string'
    ? [{ type: 'text', text: lastMessage.content }]
    : (Array.isArray(lastMessage.content) ? lastMessage.content : [{ type: 'text', text: String(lastMessage.content) }]);

  for (const file of files) {
    const mime = file.mimetype || file.mime || '';
    const name = file.originalname || 'attachment';
    try {
      if (mime.startsWith('image/')) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${file.buffer.toString('base64')}` },
        });
      } else if (mime === 'application/pdf' || /\.pdf$/i.test(name)) {
        const parsed = await extractPdfTextFromBuffer(file.buffer);
        const text = (parsed.fullText || parsed.rawText || '').trim();
        if (!text) {
          contentParts.push({
            type: 'text',
            text: `📎 PDF "${name}" appears to contain no extractable text (it may be a scanned/image-only PDF). Ask the user to provide a text-based PDF or run OCR first.`,
          });
        } else {
          contentParts.push({
            type: 'text',
            text: `📄 PDF "${name}" (${parsed.pages || '?'} pages):\n\n${truncate(text, MAX_PDF_CHARS)}`,
          });
        }
      } else if (mime.startsWith('text/')) {
        contentParts.push({
          type: 'text',
          text: `📄 Attached: "${name}"\n\n${truncate(file.buffer.toString('utf-8'), MAX_PER_FILE_CHARS)}`,
        });
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(name)) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        contentParts.push({
          type: 'text',
          text: `📄 Word doc "${name}":\n\n${truncate(result.value || '', MAX_PER_FILE_CHARS)}`,
        });
      } else if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || /\.xlsx?$/i.test(name)) {
        const wb = XLSX.read(file.buffer, { type: 'buffer' });
        let text = '';
        wb.SheetNames.forEach(s => { text += `Sheet "${s}":\n${XLSX.utils.sheet_to_txt(wb.Sheets[s])}\n\n`; });
        contentParts.push({
          type: 'text',
          text: `📊 Excel "${name}":\n\n${truncate(text, MAX_PER_FILE_CHARS)}`,
        });
      } else {
        contentParts.push({ type: 'text', text: `📎 File attached: "${name}" (${mime}) — note: binary content not directly readable.` });
      }
    } catch (e) {
      contentParts.push({ type: 'text', text: `⚠️ Could not process "${name}": ${e.message}` });
    }
  }
  return contentParts;
};

// Auto-generate title + summary
const generateTitleAndSummary = async (fullContent) => {
  try {
    const text = await chatComplete({
      messages: [
        { role: 'system', content: 'You generate a short title (max 8 words) and one-sentence summary for chat sessions. Reply with EXACTLY two lines:\nTitle: <title>\nSummary: <summary>' },
        { role: 'user',   content: `Generate title and summary for this response:\n\n${fullContent.slice(0, 800)}` },
      ],
      temperature: 0.3,
      maxTokens: 100,
    }) || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const title   = (lines.find(l => l.startsWith('Title:'))   || '').replace('Title:', '').trim()   || 'FundCo AI Chat';
    const summary = (lines.find(l => l.startsWith('Summary:')) || '').replace('Summary:', '').trim() || '';
    return { title, summary };
  } catch {
    return { title: 'FundCo AI Chat', summary: '' };
  }
};

const getActorType = (req) => (req.platformUserType === 'admin' ? 'admin' : 'user');

const buildActorFilter = (req, extra = {}) => ({
  ...extra,
  userId: req.user._id,
  $or: [
    { actorType: getActorType(req) },
    { actorType: { $exists: false } },
  ],
});

const toChatSummary = (chat) => ({
  _id: chat._id,
  chatId: chat._id,
  toolId: chat.toolId,
  title: chat.title || 'FundCo AI Chat',
  summary: chat.summary || '',
  starred: Boolean(chat.starred),
  tags: Array.isArray(chat.tags) ? chat.tags : [],
  messageCount: Number(chat.messageCount || chat.messages?.length || 0),
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt,
});

const toChatDetail = (chat) => ({
  ...toChatSummary(chat),
  taskContext: chat.taskContext || null,
  messages: Array.isArray(chat.messages) ? chat.messages : [],
});

// Main chat handler (streaming SSE)
// Cheap, public check so the frontend can hide AI features entirely instead
// of surfacing a provider-specific error when the key is missing/invalid.
// AI_TOOLS_VISIBLE is a separate, deliberate rollout switch — the feature can
// be fully migrated and working while still reporting disabled here, so it
// stays hidden from users until someone explicitly flips it on.
export const getAiStatus = (req, res) => {
  const visible = String(process.env.AI_TOOLS_VISIBLE || '').trim().toLowerCase() === 'true';
  res.json({ enabled: visible && isAiConfigured() });
};

export const grokChat = async (req, res) => {
  if (!isAiConfigured()) return res.status(503).json({ error: 'AI provider is not configured' });

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
    const stream = chatCompleteStream({
      messages: [
        { role: 'system', content: systemContent },
        ...messages.map(m => ({
          role:    m.role,
          content: Array.isArray(m.content) ? m.content : (typeof m.content === 'string' ? m.content : String(m.content)),
        })),
      ],
      temperature: 0.35,
      maxTokens:  4096,
    });

    let fullContent = '';
    for await (const delta of stream) {
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }
    // Persist / update chat history before closing the stream so the
    // frontend can reopen the conversation immediately.
    let savedMeta = null;
    try {
      const assistantMsg = { role: 'assistant', content: fullContent };
      const allMessages  = [...messages, assistantMsg];

      let existing = null;
      if (chatId) {
        existing = await GrokChat.findOne(buildActorFilter(req, { _id: chatId }));
      }

      if (existing) {
        existing.toolId = toolId || existing.toolId;
        existing.messages = allMessages;
        existing.taskContext = taskContext || existing.taskContext;
        existing.actorType = getActorType(req);
        await existing.save();
        savedMeta = {
          ...toChatSummary(existing),
          chatId: existing._id.toString(),
          saved: true,
        };
      } else {
        // Create new chat when no chat exists yet or the provided chatId
        // no longer resolves cleanly. This keeps the UI recoverable.
        const { title, summary } = await generateTitleAndSummary(fullContent);
        const newChat = await GrokChat.create({
          userId:      req.user._id,
          actorType:   getActorType(req),
          toolId,
          messages:    allMessages,
          taskContext,
          title,
          summary,
        });
        savedMeta = {
          ...toChatSummary(newChat),
          chatId: newChat._id.toString(),
          saved: true,
        };
      }
    } catch (saveErr) {
      console.error('Chat save error:', saveErr.message);
    }
    if (savedMeta) {
      res.write(`data: ${JSON.stringify(savedMeta)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('FundCo AI error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'FundCo AI is temporarily unavailable. Please try again.' })}\n\n`);
  } finally {
    res.end();
  }
};

// Get chat history
export const getChatHistory = async (req, res) => {
  try {
    const { toolId, toolIds, search, starred, page = 1, limit = 30 } = req.query;
    const filter = buildActorFilter(req);
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
    res.json({
      success: true,
      histories: chats.map(toChatSummary),
      total,
      page: Number(page),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
};

// Get single chat (with messages)
export const getChatById = async (req, res) => {
  try {
    const chat = await GrokChat.findOne(buildActorFilter(req, { _id: req.params.chatId }));
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });
    res.json({ success: true, chat: toChatDetail(chat) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch chat' });
  }
};

// Update chat (title / tags / starred)
export const updateChat = async (req, res) => {
  try {
    const { title, tags, starred } = req.body;
    const update = {};
    if (title   !== undefined) update.title   = title;
    if (tags    !== undefined) update.tags    = tags;
    if (starred !== undefined) update.starred = starred;

    const chat = await GrokChat.findOneAndUpdate(
      buildActorFilter(req, { _id: req.params.chatId }),
      update,
      { new: true }
    );
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });
    res.json({ success: true, chat: toChatSummary(chat) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update chat' });
  }
};

// Delete chat
export const deleteChat = async (req, res) => {
  try {
    const deleted = await GrokChat.findOneAndDelete(buildActorFilter(req, { _id: req.params.chatId }));
    if (!deleted) return res.status(404).json({ success: false, error: 'Chat not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete chat' });
  }
};

// Delete all chats for a tool
export const clearToolHistory = async (req, res) => {
  try {
    await GrokChat.deleteMany(buildActorFilter(req, { toolId: req.params.toolId }));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear history' });
  }
};



