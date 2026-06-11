import { createRequire } from 'module';
import { structurePdfText } from './documentText.js';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const cleanText = (value) =>
  String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const toPdfData = (buffer) => {
  if (buffer instanceof Uint8Array) return buffer;
  if (Buffer.isBuffer(buffer)) return new Uint8Array(buffer);
  return new Uint8Array(buffer);
};

export const extractPdfTextFromBuffer = async (buffer) => {
  if (typeof PDFParse !== 'function') {
    throw new Error('PDF parser is not available in this environment');
  }

  const parser = new PDFParse({ data: toPdfData(buffer) });
  try {
    const textResult = await parser.getText();
    let infoResult = null;
    try {
      infoResult = await parser.getInfo({ parsePageInfo: false });
    } catch {
      infoResult = null;
    }

    const rawText = cleanText(textResult?.text);
    if (!rawText) {
      throw new Error('No text could be extracted. The PDF appears to be scanned or image-based. Run OCR first.');
    }

    const structured = structurePdfText(rawText);
    return {
      rawText,
      fullText: structured.text,
      stats: structured.stats,
      pages: Number(textResult?.total) || Number(infoResult?.total) || 0,
      info: infoResult?.info || {},
    };
  } finally {
    try {
      await parser.destroy();
    } catch {
      // no-op
    }
  }
};



