// backend/controllers/documentController.js
// Complete rebuild — two modes: Quick Convert (PDF→PPTX JSON directly) + AI-Guided pipeline
import Document from '../models/documentModel.js';
import GrokChat from '../models/grokModel.js';
import File from '../models/fileModel.js';
import mongoose from 'mongoose';
import axios from 'axios';
import { grokChat as callGrokChat } from './grokController.js';

const API_BASE = process.env.VITE_API_URL || 'http://localhost:4001';

// ── Helper: call Grok and collect full streamed response ──────────────────────
const callGrokSync = (simulatedReq) => new Promise((resolve, reject) => {
  let fullContent = '';
  callGrokChat(simulatedReq, {
    setHeader: () => {},
    write: (data) => {
      if (typeof data === 'string' && data.includes('data: {"content":')) {
        try {
          const parsed = JSON.parse(data.replace(/^data: /, ''));
          if (parsed.content) fullContent += parsed.content;
        } catch {}
      }
    },
    end: () => resolve(fullContent),
  }).catch(reject);
});

// ── Helper: safely parse JSON from AI (strips markdown fences) ────────────────
const safeParseJson = (str) => {
  if (!str) throw new Error('Empty AI response');
  // Strip markdown fences
  let clean = str.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  // Find first { or [ 
  const start = clean.search(/[{\[]/);
  if (start > 0) clean = clean.slice(start);
  const end = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (end !== -1) clean = clean.slice(0, end + 1);
  return JSON.parse(clean);
};

// ── Create document record ────────────────────────────────────────────────────
export const createDocument = async (req, res) => {
  const { fileId } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(fileId))
      return res.status(400).json({ success: false, message: 'Invalid file ID' });
    const file = await File.findById(fileId);
    if (!file || file.owner.toString() !== req.user._id.toString())
      return res.status(404).json({ success: false, message: 'File not found or not owned by you' });
    if (file.type !== 'pdf')
      return res.status(400).json({ success: false, message: 'Only PDF files are supported' });
    const newDoc = new Document({ userId: req.user._id, originalFileId: fileId });
    await newDoc.save();
    res.status(201).json({ success: true, document: newDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create document', error: error.message });
  }
};

// ── RAW EXTRACT: full text from PDF ──────────────────────────────────────────
export const rawExtract = async (req, res) => {
  const { documentId } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(documentId))
      return res.status(400).json({ success: false, message: 'Invalid document ID' });
    const doc = await Document.findById(documentId);
    if (!doc || doc.userId.toString() !== req.user._id.toString())
      return res.status(404).json({ success: false, message: 'Document not found' });
    const file = await File.findById(doc.originalFileId);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });

    const ipfsRes = await axios.get(`https://gateway.pinata.cloud/ipfs/${file.cid}`, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(ipfsRes.data);

    const simulatedReq = {
      user: req.user,
      body: {
        messages: [{
          role: 'user',
          content: 'Extract and output ONLY the full raw text from ALL pages of the attached PDF, concatenated sequentially from beginning to end, with EVERY single character, word, sentence, paragraph, table, heading, and footer included. Do not truncate, summarize, omit, or add any extra text.',
        }],
        taskContext: null,
        toolId: 'pdf-extractor',
      },
      files: [{ buffer, originalname: file.fileName, mimetype: 'application/pdf' }],
    };

    const fullContent = await callGrokSync(simulatedReq);
    if (!fullContent.trim()) throw new Error('No text extracted from PDF — it may be scanned/image-based');

    doc.fullText = fullContent;
    await doc.save();
    res.json({ success: true, fullText: fullContent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Raw extraction failed' });
  }
};

// ── MEANINGFUL EXTRACT: AI-guided prompt on fullText ─────────────────────────
export const extractText = async (req, res) => {
  const { documentId, prompt } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(documentId))
      return res.status(400).json({ success: false, message: 'Invalid document ID' });
    const doc = await Document.findById(documentId);
    if (!doc || doc.userId.toString() !== req.user._id.toString())
      return res.status(404).json({ success: false, message: 'Document not found' });
    if (!doc.fullText?.trim())
      return res.status(400).json({ success: false, message: 'Perform raw extraction first' });

    const simulatedReq = {
      user: req.user,
      body: {
        messages: [{
          role: 'user',
          content: `${prompt || 'Extract meaningful content and key points'} in a clean, structured format ready for PowerPoint: use plain bullet points for key points, numbered lists for steps, and simple section titles. No markdown symbols like # or *. No intro or summary text—just structured content.\n\nFull Text:\n${doc.fullText}`,
        }],
        taskContext: null,
        toolId: 'pdf-extractor',
      },
      files: [],
    };

    const extracted = await callGrokSync(simulatedReq);
    if (!extracted.trim()) throw new Error('No meaningful content extracted');

    doc.extractedText = extracted;
    await doc.save();
    res.json({ success: true, extractedText: extracted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Meaningful extraction failed' });
  }
};

// ── QUICK CONVERT: PDF → PPTX JSON in one shot ───────────────────────────────
// This is the new direct path: upload PDF, get slides JSON back immediately
export const quickConvert = async (req, res) => {
  const { documentId, slideCount = 12, theme = 'professional', audience = 'business' } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(documentId))
      return res.status(400).json({ success: false, message: 'Invalid document ID' });
    const doc = await Document.findById(documentId);
    if (!doc || doc.userId.toString() !== req.user._id.toString())
      return res.status(404).json({ success: false, message: 'Document not found' });
    const file = await File.findById(doc.originalFileId);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });

    // First: extract raw text from PDF
    const ipfsRes = await axios.get(`https://gateway.pinata.cloud/ipfs/${file.cid}`, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(ipfsRes.data);

    const rawReq = {
      user: req.user,
      body: {
        messages: [{ role: 'user', content: 'Extract and output ONLY the full raw text from ALL pages of this PDF. Include every heading, paragraph, table, and list. Do not summarize.' }],
        taskContext: null, toolId: 'pdf-extractor',
      },
      files: [{ buffer, originalname: file.fileName, mimetype: 'application/pdf' }],
    };

    const rawText = await callGrokSync(rawReq);
    if (!rawText?.trim()) throw new Error('Could not extract text from PDF. Ensure it is not a scanned image.');

    doc.fullText = rawText;
    await doc.save();

    // Second: generate PPTX slide JSON from raw text
    const pptReq = {
      user: req.user,
      body: {
        messages: [{
          role: 'user',
          content: `You are an expert presentation designer. Convert the following document text into a polished ${slideCount}-slide PowerPoint presentation for a ${audience} audience using a ${theme} visual style.

REQUIREMENTS:
- Respond ONLY with valid JSON. No markdown fences, no prose.
- Structure: { "title": "Presentation Title", "theme": "${theme}", "slides": [...] }
- Each slide must have EXACTLY these fields:
  {
    "id": 1,
    "type": "title|section|bullets|two-column|quote|data|closing",
    "title": "Slide Title",
    "subtitle": "Optional subtitle (for title/section slides)",
    "bullets": ["bullet 1", "bullet 2", "bullet 3"],
    "leftContent": "Left column text (for two-column type)",
    "rightContent": "Right column text (for two-column type)",  
    "quote": "Quote text (for quote type)",
    "attribution": "Quote source",
    "note": "Optional speaker note",
    "accent": "312783"
  }
- First slide must be type "title" with a compelling title and subtitle
- Last slide must be type "closing" with key takeaways
- Use type "section" for chapter breaks
- Use type "two-column" for comparisons or paired content
- Use type "quote" sparingly for impactful statements
- Make bullets concise: max 8 words each, max 6 bullets per slide
- Extract actual data/facts from the document — do not make things up
- Total slides: between ${Math.max(6, slideCount - 2)} and ${slideCount + 2}

DOCUMENT TEXT:
${rawText.slice(0, 12000)}`,
        }],
        taskContext: null, toolId: 'ppt-generator',
      },
      files: [],
    };

    const pptJsonStr = await callGrokSync(pptReq);
    let pptJson;
    try {
      pptJson = safeParseJson(pptJsonStr);
    } catch (e) {
      throw new Error('AI returned invalid JSON for slides. Please try again.');
    }
    if (!pptJson.slides?.length) throw new Error('No slides generated');

    doc.pptJson = pptJson;
    await doc.save();
    res.json({ success: true, pptJson, fullText: rawText });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Quick convert failed' });
  }
};

// ── GENERATE PPT: AI-guided from extractedText + optional template ────────────
export const generatePPT = async (req, res) => {
  const { documentId, prompt, slideCount = 12, theme = 'professional' } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(documentId))
      return res.status(400).json({ success: false, message: 'Invalid document ID' });
    const doc = await Document.findById(documentId);
    if (!doc || doc.userId.toString() !== req.user._id.toString())
      return res.status(404).json({ success: false, message: 'Document not found' });
    if (!doc.extractedText?.trim())
      return res.status(400).json({ success: false, message: 'Perform meaningful extraction first' });

    const simulatedReq = {
      user: req.user,
      body: {
        messages: [{
          role: 'user',
          content: `${prompt || 'Generate a professional PowerPoint presentation'}

REQUIREMENTS:
- Respond ONLY with valid JSON. No markdown, no prose before or after.
- Structure: { "title": "Title", "theme": "${theme}", "slides": [...] }
- Each slide: { "id": N, "type": "title|section|bullets|two-column|quote|closing", "title": "...", "subtitle": "...", "bullets": [...], "leftContent": "...", "rightContent": "...", "quote": "...", "attribution": "...", "note": "..." }
- Target ${slideCount} slides. First slide = title, last = closing with key takeaways.
- Bullets: max 8 words each, max 6 per slide.
- Use two-column for comparisons, quote for impactful statements.

CONTENT TO CONVERT:
${doc.extractedText.slice(0, 10000)}`,
        }],
        taskContext: null, toolId: 'ppt-generator',
      },
      files: [],
    };

    const pptJsonStr = await callGrokSync(simulatedReq);
    let pptJson;
    try {
      pptJson = safeParseJson(pptJsonStr);
    } catch {
      throw new Error('AI returned invalid JSON. Please try again.');
    }
    if (!pptJson.slides?.length) throw new Error('No slides generated');

    doc.pptJson = pptJson;
    await doc.save();
    res.json({ success: true, pptJson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'PPT generation failed' });
  }
};

// ── REGENERATE SINGLE SLIDE ────────────────────────────────────────────────────
export const regenerateSlide = async (req, res) => {
  const { documentId, slideIndex, instruction } = req.body;
  try {
    const doc = await Document.findById(documentId);
    if (!doc || doc.userId.toString() !== req.user._id.toString())
      return res.status(404).json({ success: false, message: 'Document not found' });
    if (!doc.pptJson?.slides) return res.status(400).json({ success: false, message: 'No presentation exists' });

    const currentSlide = doc.pptJson.slides[slideIndex];
    const simulatedReq = {
      user: req.user,
      body: {
        messages: [{
          role: 'user',
          content: `Regenerate this PowerPoint slide based on the instruction.
Instruction: "${instruction || 'Improve this slide'}"
Current slide: ${JSON.stringify(currentSlide)}
Context from document: ${(doc.extractedText || doc.fullText || '').slice(0, 3000)}

Respond ONLY with valid JSON for a single slide object (same structure as input, with same id).
Fields: { "id", "type", "title", "subtitle", "bullets", "leftContent", "rightContent", "quote", "attribution", "note" }`,
        }],
        taskContext: null, toolId: 'ppt-generator',
      },
      files: [],
    };

    const result = await callGrokSync(simulatedReq);
    let newSlide;
    try {
      newSlide = safeParseJson(result);
    } catch {
      throw new Error('AI returned invalid slide JSON');
    }

    const updatedSlides = [...doc.pptJson.slides];
    updatedSlides[slideIndex] = { ...currentSlide, ...newSlide };
    doc.pptJson = { ...doc.pptJson, slides: updatedSlides };
    await doc.save();
    res.json({ success: true, slide: updatedSlides[slideIndex], pptJson: doc.pptJson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Slide regeneration failed' });
  }
};

// ── SAVE EDITED PPT JSON ──────────────────────────────────────────────────────
export const savePptJson = async (req, res) => {
  const { documentId, pptJson } = req.body;
  try {
    const doc = await Document.findById(documentId);
    if (!doc || doc.userId.toString() !== req.user._id.toString())
      return res.status(404).json({ success: false, message: 'Document not found' });
    doc.pptJson = pptJson;
    doc.updatedAt = new Date();
    await doc.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save' });
  }
};

// ── GET HISTORY ───────────────────────────────────────────────────────────────
export const getHistory = async (req, res) => {
  try {
    const histories = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'originalFileId', select: 'fileName cid type uploadedAt' },
        { path: 'templateFileId', select: 'fileName cid type uploadedAt' },
      ]);
    res.json({ success: true, histories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
};

// ── GET SINGLE DOCUMENT ────────────────────────────────────────────────────────
export const getDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('originalFileId', 'fileName cid type')
      .populate('templateFileId', 'fileName cid type');
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch document' });
  }
};

// ── DELETE DOCUMENT ───────────────────────────────────────────────────────────
export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
};