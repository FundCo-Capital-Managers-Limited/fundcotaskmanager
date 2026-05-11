// src/pages/DeckPrep.jsx
// Ultimate AI-Powered PDF -> PowerPoint Builder
// Two modes: Quick Convert + AI-Guided | Full slide editor | Real PPTX export
// NEW: Delete button appears on hover for every history card (Recent + full History view)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  Upload, FileText, Zap, Edit2, Loader2, Download, AlertCircle, Plus, Trash2,
  ChevronLeft, ChevronRight, Sparkles, Layers, LayoutTemplate, RefreshCw, X,
  Check, ArrowRight, Settings2, Wand2, PresentationIcon, AlignLeft, Quote,
  Columns2, Home, HistoryIcon, BarChart3,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4001';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const DECK_SESSION_KEY = 'fundco-deckprep-session-v1';
const readDeckSession = () => {
  try {
    const raw = localStorage.getItem(DECK_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeDeckSession = (value) => {
  try {
    localStorage.setItem(DECK_SESSION_KEY, JSON.stringify(value));
  } catch {
    // ignore session persistence failures
  }
};
const clearDeckSession = () => {
  try {
    localStorage.removeItem(DECK_SESSION_KEY);
  } catch {
    // ignore session persistence failures
  }
};
const downloadPlainText = (text, baseName = 'deckprep-text') => {
  const safeName = String(baseName || 'deckprep-text').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'deckprep-text';
  const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
const getDocumentFileName = (entry) => entry?.originalFileId?.fileName || entry?.sourceFileName || 'Untitled';
const isGenerationPending = (entry) => ['queued', 'processing'].includes(String(entry?.generationStatus || '').toLowerCase());
const isGenerationFailed = (entry) => String(entry?.generationStatus || '').toLowerCase() === 'failed';
const getGenerationLabel = (entry) => {
  const status = String(entry?.generationStatus || '').toLowerCase();
  if (status === 'queued') {
    return entry?.generationPercent ? `Queued (${entry.generationPercent}%)` : 'Queued';
  }
  if (status === 'processing') {
    const phase = entry?.generationPhase || 'Generating';
    return entry?.generationPercent ? `${phase} (${entry.generationPercent}%)` : phase;
  }
  if (status === 'failed') return 'Failed';
  if (status === 'ready' || entry?.pptJson) return 'Ready';
  return 'Draft';
};

// ── Themes ───────────────────────────────────────────────────────────────────
const THEMES = {
  consulting: { label: 'Consulting', bg: 'f7f8fa', accent: '12355b', text: '102033', subtext: '5b6b7d', titleText: 'ffffff', sectionBg: 'e7edf4', preview: ['#f7f8fa', '#12355b'] },
  professional: { label: 'Professional', bg: '1e293b', accent: '312783', text: 'f8fafc', subtext: '94a3b8', titleText: 'ffffff', sectionBg: '0f172a', preview: ['#1e293b', '#312783'] },
  clean: { label: 'Clean', bg: 'f8fafc', accent: '312783', text: '1e293b', subtext: '64748b', titleText: 'ffffff', sectionBg: 'e2e8f0', preview: ['#f8fafc', '#312783'] },
  ocean: { label: 'Ocean', bg: '0c1445', accent: '36a9e1', text: 'e0f2fe', subtext: '7dd3fc', titleText: '0c1445', sectionBg: '0d2060', preview: ['#0c1445', '#36a9e1'] },
  midnight: { label: 'Midnight', bg: '09090b', accent: '7c3aed', text: 'fafafa', subtext: 'a1a1aa', titleText: 'ffffff', sectionBg: '18181b', preview: ['#09090b', '#7c3aed'] },
  coral: { label: 'Coral', bg: 'fff7ed', accent: 'dc2626', text: '1c1917', subtext: '78716c', titleText: 'ffffff', sectionBg: 'fef2f2', preview: ['#fff7ed', '#dc2626'] },
};

const slideIcons = {
  title: Home,
  section: Layers,
  bullets: AlignLeft,
  'two-column': Columns2,
  comparison: Columns2,
  timeline: HistoryIcon,
  process: ArrowRight,
  cards: LayoutTemplate,
  quote: Quote,
  data: BarChart3,
  closing: Check,
};

const getSlideType = (slide) => slide?.layout || slide?.type || 'bullets';
const getSlideCards = (slide) => (Array.isArray(slide?.cards) && slide.cards.length
  ? slide.cards.slice(0, 4)
  : (slide?.bullets || []).slice(0, 4).map((item, index) => ({
      title: `Point ${index + 1}`,
      body: item,
      metric: '',
    })));
const getTimelineItems = (slide) => (Array.isArray(slide?.timeline) && slide.timeline.length
  ? slide.timeline.slice(0, 5)
  : (slide?.bullets || []).slice(0, 5).map((item, index) => ({
      label: `Phase ${index + 1}`,
      detail: item,
    })));
const getProcessSteps = (slide) => (Array.isArray(slide?.processSteps) && slide.processSteps.length
  ? slide.processSteps.slice(0, 5)
  : (slide?.bullets || []).slice(0, 5));
const getChartData = (slide) => {
  if (slide?.chart?.categories?.length && slide?.chart?.series?.length) return slide.chart;
  if (slide?.stats?.length >= 2) {
    const numericStats = slide.stats
      .map((item) => ({
        label: item.label || 'Metric',
        value: Number(String(item.value || '').replace(/[^0-9.-]/g, '')),
      }))
      .filter((item) => Number.isFinite(item.value))
      .slice(0, 6);
    if (numericStats.length >= 2) {
      return {
        type: 'column',
        title: slide.title || 'Key data points',
        categories: numericStats.map((item) => item.label),
        series: [{ name: 'Value', values: numericStats.map((item) => item.value) }],
      };
    }
  }
  return null;
};

// ── SlidePreview ─────────────────────────────────────────────────────────────
const SlidePreview = ({ slide, theme, scale = 1, isActive = false, onClick }) => {
  const t = THEMES[theme] || THEMES.consulting;
  const W = 640, H = 360;
  const type = getSlideType(slide);
  const isTitle = type === 'title', isSection = type === 'section';
  const isQuote = type === 'quote', isTwoCol = type === 'two-column';
  const isComparison = type === 'comparison', isCards = type === 'cards';
  const isTimeline = type === 'timeline', isProcess = type === 'process';
  const isData = type === 'data';
  const cards = getSlideCards(slide);
  const timeline = getTimelineItems(slide);
  const processSteps = getProcessSteps(slide);
  const chart = getChartData(slide);
  const chartValues = chart?.series?.[0]?.values || [];
  const maxChartValue = chartValues.length ? Math.max(...chartValues, 1) : 1;
  return (
    <div onClick={onClick} style={{
      width: W * scale, height: H * scale, backgroundColor: `#${t.bg}`,
      border: `2px solid ${isActive ? 'var(--brand-accent)' : 'transparent'}`, borderRadius: 8 * scale,
      overflow: 'hidden', cursor: 'pointer', position: 'relative', flexShrink: 0,
      boxShadow: isActive ? '0 0 0 3px rgba(54,169,225,.3)' : 'none'
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: (isTitle || isSection) ? H * scale : 4 * scale, backgroundColor: `#${t.accent}`
      }} />
      {isTitle && <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 * scale
      }}>
        <div style={{ color: `#${t.titleText}`, fontWeight: 900, fontSize: 28 * scale, lineHeight: 1.2, marginBottom: 12 * scale }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: `#${t.subtext}`, fontSize: 14 * scale }}>{slide.subtitle}</div>}
      </div>}
      {isSection && <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: 40 * scale
      }}>
        <div style={{ color: `#${t.subtext}`, fontSize: 10 * scale, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 * scale }}>Section</div>
        <div style={{ color: `#${t.text}`, fontWeight: 800, fontSize: 24 * scale, lineHeight: 1.2 }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: `#${t.subtext}`, fontSize: 12 * scale, marginTop: 8 * scale }}>{slide.subtitle}</div>}
      </div>}
      {isQuote && <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 48 * scale, textAlign: 'center'
      }}>
        <div style={{ color: `#${t.accent}`, fontSize: 40 * scale, marginBottom: 8 * scale, fontFamily: 'Georgia,serif' }}>"</div>
        <div style={{ color: `#${t.text}`, fontSize: 14 * scale, lineHeight: 1.5, fontStyle: 'italic', maxWidth: '85%' }}>{slide.quote || slide.title}</div>
        {slide.attribution && <div style={{ color: `#${t.subtext}`, fontSize: 11 * scale, marginTop: 10 * scale }}>- {slide.attribution}</div>}
      </div>}
      {isTwoCol && <div style={{ position: 'absolute', inset: 0, paddingTop: 14 * scale, padding: `${14 * scale}px ${20 * scale}px` }}>
        <div style={{ color: `#${t.text}`, fontWeight: 700, fontSize: 13 * scale, marginBottom: 8 * scale, paddingTop: 8 * scale }}>{slide.title}</div>
        <div style={{ display: 'flex', gap: 12 * scale }}>
          {[slide.leftContent, slide.rightContent].map((col, ci) => (
            <div key={ci} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.05)', borderRadius: 4 * scale, padding: 8 * scale }}>
              <div style={{ color: `#${t.accent}`, fontSize: 9 * scale, fontWeight: 700, marginBottom: 4 * scale }}>{ci === 0 ? 'Left' : 'Right'}</div>
              <div style={{ color: `#${t.subtext}`, fontSize: 10 * scale, lineHeight: 1.4 }}>{(col || '').slice(0, 100)}</div>
            </div>
          ))}
        </div>
      </div>}
      {isComparison && <div style={{ position: 'absolute', inset: 0, padding: `${16 * scale}px ${18 * scale}px` }}>
        <div style={{ color: `#${t.text}`, fontWeight: 800, fontSize: 14 * scale, marginBottom: 10 * scale }}>{slide.title}</div>
        <div style={{ display: 'flex', gap: 10 * scale }}>
          {[{ title: slide.leftTitle || 'Current state', body: slide.leftContent }, { title: slide.rightTitle || 'Recommended state', body: slide.rightContent }].map((column, index) => (
            <div key={index} style={{ flex: 1, backgroundColor: index === 0 ? `#${t.sectionBg}` : 'rgba(18,53,91,.08)', borderRadius: 8 * scale, padding: 10 * scale }}>
              <div style={{ color: `#${t.accent}`, fontSize: 9 * scale, fontWeight: 800, marginBottom: 6 * scale }}>{column.title}</div>
              <div style={{ color: `#${t.subtext}`, fontSize: 9.5 * scale, lineHeight: 1.45, whiteSpace: 'pre-line' }}>{(column.body || '').slice(0, 140)}</div>
            </div>
          ))}
        </div>
      </div>}
      {isCards && <div style={{ position: 'absolute', inset: 0, padding: `${16 * scale}px ${18 * scale}px` }}>
        <div style={{ color: `#${t.text}`, fontWeight: 800, fontSize: 14 * scale, marginBottom: 10 * scale }}>{slide.title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 * scale }}>
          {cards.slice(0, 4).map((card, index) => (
            <div key={index} style={{ backgroundColor: `#${t.sectionBg}`, borderRadius: 8 * scale, padding: 8 * scale, minHeight: 86 * scale }}>
              <div style={{ color: `#${t.accent}`, fontSize: 9 * scale, fontWeight: 800, marginBottom: 4 * scale }}>{card.metric || `0${index + 1}`}</div>
              <div style={{ color: `#${t.text}`, fontSize: 10.5 * scale, fontWeight: 800, marginBottom: 4 * scale }}>{card.title}</div>
              <div style={{ color: `#${t.subtext}`, fontSize: 9.2 * scale, lineHeight: 1.35 }}>{card.body}</div>
            </div>
          ))}
        </div>
      </div>}
      {isTimeline && <div style={{ position: 'absolute', inset: 0, padding: `${18 * scale}px ${18 * scale}px` }}>
        <div style={{ color: `#${t.text}`, fontWeight: 800, fontSize: 14 * scale, marginBottom: 18 * scale }}>{slide.title}</div>
        <div style={{ position: 'relative', marginTop: 20 * scale }}>
          <div style={{ position: 'absolute', top: 16 * scale, left: 18 * scale, right: 18 * scale, height: 2 * scale, backgroundColor: `#${t.accent}`, opacity: 0.35 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 * scale }}>
            {timeline.slice(0, 4).map((item, index) => (
              <div key={index} style={{ width: `${100 / Math.max(4, timeline.length)}%`, textAlign: 'center' }}>
                <div style={{ width: 16 * scale, height: 16 * scale, borderRadius: '50%', backgroundColor: `#${t.accent}`, margin: '0 auto 8px' }} />
                <div style={{ color: `#${t.text}`, fontSize: 9 * scale, fontWeight: 800, marginBottom: 4 * scale }}>{item.label}</div>
                <div style={{ color: `#${t.subtext}`, fontSize: 8.8 * scale, lineHeight: 1.3 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>}
      {isProcess && <div style={{ position: 'absolute', inset: 0, padding: `${16 * scale}px ${18 * scale}px` }}>
        <div style={{ color: `#${t.text}`, fontWeight: 800, fontSize: 14 * scale, marginBottom: 14 * scale }}>{slide.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 * scale }}>
          {processSteps.slice(0, 4).map((step, index) => (
            <React.Fragment key={index}>
              <div style={{ flex: 1, backgroundColor: `#${t.sectionBg}`, borderRadius: 8 * scale, padding: 10 * scale, minHeight: 76 * scale }}>
                <div style={{ color: `#${t.accent}`, fontSize: 8 * scale, fontWeight: 800, marginBottom: 4 * scale }}>STEP {index + 1}</div>
                <div style={{ color: `#${t.text}`, fontSize: 10 * scale, fontWeight: 700, lineHeight: 1.35 }}>{step}</div>
              </div>
              {index < Math.min(processSteps.length, 4) - 1 && <div style={{ color: `#${t.accent}`, fontSize: 18 * scale, fontWeight: 800 }}>{'>'}</div>}
            </React.Fragment>
          ))}
        </div>
      </div>}
      {isData && <div style={{ position: 'absolute', inset: 0, padding: `${16 * scale}px ${18 * scale}px` }}>
        <div style={{ color: `#${t.text}`, fontWeight: 800, fontSize: 14 * scale, marginBottom: 8 * scale }}>{slide.title}</div>
        {chart?.categories?.length ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 * scale, height: 145 * scale, marginTop: 6 * scale }}>
            {chart.categories.slice(0, 4).map((label, index) => {
              const value = chartValues[index] || 0;
              const height = Math.max(18 * scale, (value / maxChartValue) * 92 * scale);
              return (
                <div key={index} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: 96 * scale, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: 28 * scale, height, backgroundColor: `#${t.accent}`, borderRadius: `${6 * scale}px ${6 * scale}px 0 0` }} />
                  </div>
                  <div style={{ color: `#${t.subtext}`, fontSize: 8.5 * scale, marginTop: 6 * scale, lineHeight: 1.25 }}>{label}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 * scale }}>
            {(slide.stats || []).slice(0, 4).map((stat, index) => (
              <div key={index} style={{ backgroundColor: `#${t.sectionBg}`, borderRadius: 8 * scale, padding: 10 * scale }}>
                <div style={{ color: `#${t.accent}`, fontSize: 12 * scale, fontWeight: 900, marginBottom: 4 * scale }}>{stat.value}</div>
                <div style={{ color: `#${t.subtext}`, fontSize: 9 * scale, lineHeight: 1.3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>}
      {!isTitle && !isSection && !isQuote && !isTwoCol && !isComparison && !isCards && !isTimeline && !isProcess && !isData && <div style={{
        position: 'absolute', inset: 0,
        padding: `${14 * scale}px ${32 * scale}px ${20 * scale}px`
      }}>
        <div style={{ color: `#${t.text}`, fontWeight: 700, fontSize: 15 * scale, marginBottom: 12 * scale, paddingTop: 8 * scale }}>{slide.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 * scale }}>
          {(slide.bullets || []).slice(0, 6).map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 * scale }}>
              <div style={{ width: 5 * scale, height: 5 * scale, borderRadius: '50%', backgroundColor: `#${t.accent}`, marginTop: 4 * scale, flexShrink: 0 }} />
              <span style={{ color: `#${t.subtext}`, fontSize: 10.5 * scale, lineHeight: 1.4 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>}
      <div style={{ position: 'absolute', bottom: 5 * scale, right: 8 * scale, color: `#${t.subtext}`, fontSize: 8 * scale, opacity: .5 }}>{slide.id}</div>
    </div>
  );
};

// ── PPTX Export ───────────────────────────────────────────────────────────────
// Slide canvas: 13.333 x 7.5 in (16:9 wide). All measurements in inches.
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const MARGIN_X = 0.7;
const FOOT_Y = SLIDE_H - 0.45;
const FONT_HEAD = 'Aptos Display';
const FONT_BODY = 'Aptos';

const exportToPPTX = async (pptJson, theme) => {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const t = THEMES[theme] || THEMES.consulting;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = pptJson.title || 'Presentation';
  pptx.author = 'FundCo Capital Managers';
  pptx.company = 'FundCo Capital Managers';

  const totalSlides = pptJson.slides.length;
  const deckTitle = pptJson.title || 'Presentation';

  const drawFooter = (s, idx) => {
    s.addShape(pptx.shapes.LINE, {
      x: MARGIN_X, y: FOOT_Y - 0.05, w: SLIDE_W - MARGIN_X * 2, h: 0,
      line: { color: t.accent, width: 0.5, transparency: 70 },
    });
    s.addText(deckTitle, {
      x: MARGIN_X, y: FOOT_Y, w: 6, h: 0.3,
      fontFace: FONT_BODY, fontSize: 9, color: t.subtext, transparency: 30, margin: 0,
    });
    s.addText(`${idx + 1} / ${totalSlides}`, {
      x: SLIDE_W - MARGIN_X - 1.2, y: FOOT_Y, w: 1.2, h: 0.3,
      fontFace: FONT_BODY, fontSize: 9, color: t.subtext, transparency: 30, align: 'right', margin: 0,
    });
  };

  const addObjectiveBand = (s, slide) => {
    const objective = String(slide.objective || '').trim();
    const keyMessage = String(slide.keyMessage || '').trim();
    if (!objective && !keyMessage) return;
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: SLIDE_W - 4.65, y: 0.78, w: 3.95, h: 0.78,
      rectRadius: 0.06,
      fill: { color: t.sectionBg || 'E7EDF4' }, line: { color: t.sectionBg || 'E7EDF4' },
    });
    s.addText(objective ? 'SLIDE OBJECTIVE' : 'KEY MESSAGE', {
      x: SLIDE_W - 4.4, y: 0.95, w: 3.3, h: 0.14,
      fontFace: FONT_BODY, fontSize: 8, bold: true, color: t.accent, charSpacing: 3, margin: 0,
    });
    s.addText(objective || keyMessage, {
      x: SLIDE_W - 4.4, y: 1.12, w: 3.25, h: 0.26,
      fontFace: FONT_BODY, fontSize: 10.5, bold: true, color: t.text, margin: 0,
    });
  };

  const addKeyMessageCallout = (s, slide, x, y, w = 3.2) => {
    if (!slide.keyMessage) return;
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y, w, h: 0.78,
      rectRadius: 0.05,
      fill: { color: t.sectionBg || 'E7EDF4' }, line: { color: t.sectionBg || 'E7EDF4' },
    });
    s.addText('Key message', {
      x: x + 0.18, y: y + 0.12, w: w - 0.36, h: 0.16,
      fontFace: FONT_BODY, fontSize: 8, bold: true, color: t.accent, charSpacing: 2, margin: 0,
    });
    s.addText(slide.keyMessage, {
      x: x + 0.18, y: y + 0.29, w: w - 0.36, h: 0.32,
      fontFace: FONT_BODY, fontSize: 11.5, bold: true, color: t.text, margin: 0,
    });
  };

  for (let idx = 0; idx < pptJson.slides.length; idx++) {
    const slide = pptJson.slides[idx];
    const slideType = getSlideType(slide);
    const s = pptx.addSlide();
    s.background = { color: t.bg };
    if (slide.note) s.addNotes(slide.note);

    if (slideType === 'title') {
      s.addShape(pptx.shapes.RECTANGLE, {
        x: 0, y: 0, w: 4.6, h: SLIDE_H,
        fill: { color: t.accent }, line: { color: t.accent },
      });
      s.addShape(pptx.shapes.RECTANGLE, {
        x: 0.7, y: SLIDE_H - 1.2, w: 0.6, h: 0.06,
        fill: { color: t.titleText }, line: { color: t.titleText },
      });
      s.addText('PRESENTED BY', {
        x: 0.7, y: SLIDE_H - 1.55, w: 3.5, h: 0.3,
        fontFace: FONT_BODY, fontSize: 10, bold: true, color: t.titleText, charSpacing: 4, transparency: 30, margin: 0,
      });
      s.addText('FundCo Capital Managers', {
        x: 0.7, y: SLIDE_H - 1.0, w: 3.5, h: 0.45,
        fontFace: FONT_HEAD, fontSize: 14, bold: true, color: t.titleText, margin: 0,
      });
      s.addText(slide.title || deckTitle, {
        x: 5.0, y: 2.4, w: SLIDE_W - 5.5, h: 2.0,
        fontFace: FONT_HEAD, fontSize: 44, bold: true, color: t.text, valign: 'top', margin: 0,
      });
      if (slide.subtitle) s.addText(slide.subtitle, {
        x: 5.0, y: 4.5, w: SLIDE_W - 5.5, h: 1.0,
        fontFace: FONT_BODY, fontSize: 18, color: t.subtext, valign: 'top', margin: 0,
      });
    } else if (slideType === 'section') {
      const num = String(idx + 1).padStart(2, '0');
      s.addText(num, {
        x: MARGIN_X, y: 1.1, w: 3.0, h: 1.6,
        fontFace: FONT_HEAD, fontSize: 96, bold: true, color: t.accent, transparency: 25, margin: 0,
      });
      s.addText('SECTION', {
        x: MARGIN_X, y: 2.9, w: 3.0, h: 0.3,
        fontFace: FONT_BODY, fontSize: 11, bold: true, color: t.subtext, charSpacing: 6, margin: 0,
      });
      s.addShape(pptx.shapes.RECTANGLE, {
        x: MARGIN_X, y: 3.3, w: 0.5, h: 0.06,
        fill: { color: t.accent }, line: { color: t.accent },
      });
      s.addText(slide.title || '', {
        x: MARGIN_X, y: 3.5, w: SLIDE_W - MARGIN_X * 2, h: 1.6,
        fontFace: FONT_HEAD, fontSize: 40, bold: true, color: t.text, valign: 'top', margin: 0,
      });
      if (slide.subtitle) s.addText(slide.subtitle, {
        x: MARGIN_X, y: 5.2, w: SLIDE_W - MARGIN_X * 2, h: 1.0,
        fontFace: FONT_BODY, fontSize: 17, color: t.subtext, valign: 'top', margin: 0,
      });
      drawFooter(s, idx);
    } else if (slideType === 'quote') {
      s.addText('\u201C', {
        x: MARGIN_X, y: 0.7, w: 1.5, h: 2.0,
        fontFace: 'Georgia', fontSize: 160, bold: true, color: t.accent, transparency: 30, margin: 0,
      });
      s.addText(slide.quote || slide.title || '', {
        x: MARGIN_X + 0.4, y: 2.2, w: SLIDE_W - MARGIN_X * 2 - 0.4, h: 3.0,
        fontFace: FONT_HEAD, fontSize: 28, italic: true, color: t.text, valign: 'top', margin: 0,
      });
      if (slide.attribution) {
        s.addShape(pptx.shapes.RECTANGLE, {
          x: MARGIN_X + 0.4, y: 5.5, w: 0.4, h: 0.04,
          fill: { color: t.accent }, line: { color: t.accent },
        });
        s.addText(slide.attribution, {
          x: MARGIN_X + 0.95, y: 5.4, w: 6, h: 0.4,
          fontFace: FONT_BODY, fontSize: 14, bold: true, color: t.subtext, margin: 0,
        });
      }
      drawFooter(s, idx);
    } else if (slideType === 'two-column') {
      s.addShape(pptx.shapes.RECTANGLE, {
        x: MARGIN_X, y: 0.7, w: 0.5, h: 0.06,
        fill: { color: t.accent }, line: { color: t.accent },
      });
      addObjectiveBand(s, slide);
      s.addText(slide.title || '', {
        x: MARGIN_X, y: 0.9, w: SLIDE_W - MARGIN_X * 2, h: 0.7,
        fontFace: FONT_HEAD, fontSize: 28, bold: true, color: t.text, margin: 0,
      });
      if (slide.subtitle) s.addText(slide.subtitle, {
        x: MARGIN_X, y: 1.6, w: SLIDE_W - MARGIN_X * 2, h: 0.4,
        fontFace: FONT_BODY, fontSize: 14, color: t.subtext, margin: 0,
      });
      const colY = 2.3;
      const colH = SLIDE_H - colY - 0.8;
      const gap = 0.4;
      const colW = (SLIDE_W - MARGIN_X * 2 - gap) / 2;
      const cols = [
        { title: slide.leftTitle, body: slide.leftContent, x: MARGIN_X },
        { title: slide.rightTitle, body: slide.rightContent, x: MARGIN_X + colW + gap },
      ];
      cols.forEach((c) => {
        s.addShape(pptx.shapes.RECTANGLE, {
          x: c.x, y: colY, w: colW, h: colH,
          fill: { color: t.sectionBg }, line: { color: t.sectionBg },
        });
        s.addShape(pptx.shapes.RECTANGLE, {
          x: c.x, y: colY, w: colW, h: 0.08,
          fill: { color: t.accent }, line: { color: t.accent },
        });
        if (c.title) s.addText(c.title, {
          x: c.x + 0.3, y: colY + 0.25, w: colW - 0.6, h: 0.5,
          fontFace: FONT_HEAD, fontSize: 16, bold: true, color: t.text, margin: 0,
        });
        s.addText(c.body || '', {
          x: c.x + 0.3, y: colY + (c.title ? 0.85 : 0.35), w: colW - 0.6, h: colH - (c.title ? 1.1 : 0.6),
          fontFace: FONT_BODY, fontSize: 14, color: t.subtext, valign: 'top', margin: 0, paraSpaceAfter: 4,
        });
      });
      drawFooter(s, idx);
    } else if (slideType === 'comparison') {
      s.addShape(pptx.shapes.RECTANGLE, {
        x: MARGIN_X, y: 0.7, w: 0.5, h: 0.06,
        fill: { color: t.accent }, line: { color: t.accent },
      });
      addObjectiveBand(s, slide);
      s.addText(slide.title || '', {
        x: MARGIN_X, y: 0.9, w: 7.4, h: 0.75,
        fontFace: FONT_HEAD, fontSize: 28, bold: true, color: t.text, margin: 0,
      });
      if (slide.subtitle) s.addText(slide.subtitle, {
        x: MARGIN_X, y: 1.62, w: 7.2, h: 0.35,
        fontFace: FONT_BODY, fontSize: 14, color: t.subtext, margin: 0,
      });
      const colY = 2.2;
      const colH = 3.9;
      const gap = 0.42;
      const colW = (SLIDE_W - MARGIN_X * 2 - gap) / 2;
      [
        { title: slide.leftTitle || 'Current state', body: slide.leftContent || 'Current position', x: MARGIN_X, fill: t.sectionBg || 'E7EDF4' },
        { title: slide.rightTitle || 'Recommended state', body: slide.rightContent || 'Recommended position', x: MARGIN_X + colW + gap, fill: 'EDF4FB' },
      ].forEach((column, columnIndex) => {
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x: column.x, y: colY, w: colW, h: colH,
          rectRadius: 0.05,
          fill: { color: column.fill }, line: { color: column.fill },
        });
        s.addText(column.title, {
          x: column.x + 0.28, y: colY + 0.24, w: colW - 0.56, h: 0.35,
          fontFace: FONT_BODY, fontSize: 12, bold: true, color: columnIndex === 0 ? t.subtext : t.accent, charSpacing: 1.5, margin: 0,
        });
        s.addText(column.body, {
          x: column.x + 0.28, y: colY + 0.68, w: colW - 0.56, h: colH - 1.0,
          fontFace: FONT_BODY, fontSize: 15, color: t.text, valign: 'top', margin: 0, breakLine: false,
        });
      });
      addKeyMessageCallout(s, slide, MARGIN_X, 6.35, 4.5);
      drawFooter(s, idx);
    } else if (slideType === 'cards') {
      s.addShape(pptx.shapes.RECTANGLE, {
        x: MARGIN_X, y: 0.7, w: 0.5, h: 0.06,
        fill: { color: t.accent }, line: { color: t.accent },
      });
      addObjectiveBand(s, slide);
      s.addText(slide.title || '', {
        x: MARGIN_X, y: 0.9, w: 7.4, h: 0.75,
        fontFace: FONT_HEAD, fontSize: 28, bold: true, color: t.text, margin: 0,
      });
      const cards = getSlideCards(slide);
      const gap = 0.28;
      const cardW = (SLIDE_W - MARGIN_X * 2 - gap) / 2;
      const cardH = 1.62;
      cards.slice(0, 4).forEach((card, cardIndex) => {
        const x = MARGIN_X + (cardIndex % 2) * (cardW + gap);
        const y = 2.1 + Math.floor(cardIndex / 2) * (cardH + 0.3);
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x, y, w: cardW, h: cardH,
          rectRadius: 0.05,
          fill: { color: cardIndex % 2 === 0 ? (t.sectionBg || 'E7EDF4') : 'EDF4FB' },
          line: { color: cardIndex % 2 === 0 ? (t.sectionBg || 'E7EDF4') : 'EDF4FB' },
        });
        s.addText(card.metric || `0${cardIndex + 1}`, {
          x: x + 0.22, y: y + 0.18, w: 0.9, h: 0.24,
          fontFace: FONT_BODY, fontSize: 11, bold: true, color: t.accent, margin: 0,
        });
        s.addText(card.title, {
          x: x + 0.22, y: y + 0.5, w: cardW - 0.44, h: 0.28,
          fontFace: FONT_HEAD, fontSize: 16, bold: true, color: t.text, margin: 0,
        });
        s.addText(card.body, {
          x: x + 0.22, y: y + 0.82, w: cardW - 0.44, h: 0.58,
          fontFace: FONT_BODY, fontSize: 12.5, color: t.subtext, valign: 'top', margin: 0,
        });
      });
      drawFooter(s, idx);
    } else if (slideType === 'timeline') {
      s.addShape(pptx.shapes.RECTANGLE, {
        x: MARGIN_X, y: 0.7, w: 0.5, h: 0.06,
        fill: { color: t.accent }, line: { color: t.accent },
      });
      addObjectiveBand(s, slide);
      s.addText(slide.title || '', {
        x: MARGIN_X, y: 0.9, w: 7.4, h: 0.75,
        fontFace: FONT_HEAD, fontSize: 28, bold: true, color: t.text, margin: 0,
      });
      const items = getTimelineItems(slide).slice(0, 5);
      s.addShape(pptx.shapes.LINE, {
        x: 1.2, y: 3.6, w: 10.9, h: 0,
        line: { color: t.accent, width: 1.1, transparency: 25 },
      });
      items.forEach((item, itemIndex) => {
        const x = 1.1 + itemIndex * (10.2 / Math.max(items.length - 1, 1));
        s.addShape(pptx.shapes.ELLIPSE, {
          x, y: 3.36, w: 0.34, h: 0.34,
          fill: { color: t.accent }, line: { color: t.accent },
        });
        s.addText(item.label, {
          x: x - 0.25, y: 2.7, w: 1.0, h: 0.32,
          fontFace: FONT_BODY, fontSize: 11, bold: true, color: t.text, align: 'center', margin: 0,
        });
        s.addText(item.detail, {
          x: x - 0.55, y: 3.95, w: 1.6, h: 1.1,
          fontFace: FONT_BODY, fontSize: 11.5, color: t.subtext, align: 'center', valign: 'top', margin: 0,
        });
      });
      drawFooter(s, idx);
    } else if (slideType === 'process') {
      s.addShape(pptx.shapes.RECTANGLE, {
        x: MARGIN_X, y: 0.7, w: 0.5, h: 0.06,
        fill: { color: t.accent }, line: { color: t.accent },
      });
      addObjectiveBand(s, slide);
      s.addText(slide.title || '', {
        x: MARGIN_X, y: 0.9, w: 7.4, h: 0.75,
        fontFace: FONT_HEAD, fontSize: 28, bold: true, color: t.text, margin: 0,
      });
      const steps = getProcessSteps(slide).slice(0, 4);
      const gap = 0.2;
      const stepW = (SLIDE_W - MARGIN_X * 2 - gap * Math.max(steps.length - 1, 0)) / Math.max(steps.length, 1);
      steps.forEach((step, stepIndex) => {
        const x = MARGIN_X + stepIndex * (stepW + gap);
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x, y: 2.6, w: stepW, h: 1.7,
          rectRadius: 0.05,
          fill: { color: t.sectionBg || 'E7EDF4' }, line: { color: t.sectionBg || 'E7EDF4' },
        });
        s.addText(`STEP ${stepIndex + 1}`, {
          x: x + 0.18, y: 2.8, w: stepW - 0.36, h: 0.18,
          fontFace: FONT_BODY, fontSize: 9, bold: true, color: t.accent, charSpacing: 2, margin: 0,
        });
        s.addText(step, {
          x: x + 0.18, y: 3.1, w: stepW - 0.36, h: 0.72,
          fontFace: FONT_HEAD, fontSize: 15, bold: true, color: t.text, valign: 'mid', margin: 0,
        });
        if (stepIndex < steps.length - 1) {
          s.addText('\u2192', {
            x: x + stepW - 0.02, y: 3.15, w: 0.24, h: 0.3,
            fontFace: FONT_HEAD, fontSize: 18, bold: true, color: t.accent, align: 'center', margin: 0,
          });
        }
      });
      drawFooter(s, idx);
    } else if (slideType === 'data') {
      s.addShape(pptx.shapes.RECTANGLE, {
        x: MARGIN_X, y: 0.7, w: 0.5, h: 0.06,
        fill: { color: t.accent }, line: { color: t.accent },
      });
      addObjectiveBand(s, slide);
      s.addText(slide.title || '', {
        x: MARGIN_X, y: 0.9, w: SLIDE_W - MARGIN_X * 2, h: 0.7,
        fontFace: FONT_HEAD, fontSize: 28, bold: true, color: t.text, margin: 0,
      });
      if (slide.subtitle) s.addText(slide.subtitle, {
        x: MARGIN_X, y: 1.6, w: SLIDE_W - MARGIN_X * 2, h: 0.4,
        fontFace: FONT_BODY, fontSize: 14, color: t.subtext, margin: 0,
      });
      const chart = getChartData(slide);
      const stats = (slide.stats?.length ? slide.stats : (slide.bullets || []).map((b) => ({ value: '', label: b }))).slice(0, 4);
      if (chart?.categories?.length && chart?.series?.[0]?.values?.length) {
        const values = chart.series[0].values.slice(0, 5);
        const categories = chart.categories.slice(0, values.length);
        const maxValue = Math.max(...values, 1);
        const chartX = 0.95;
        const chartY = 2.35;
        const chartW = 7.15;
        const baseY = 5.55;
        const slot = chartW / Math.max(values.length, 1);
        s.addShape(pptx.shapes.LINE, {
          x: chartX, y: baseY, w: chartW, h: 0,
          line: { color: t.subtext, width: 0.6, transparency: 35 },
        });
        values.forEach((value, valueIndex) => {
          const barH = Math.max(0.45, (value / maxValue) * 2.3);
          const x = chartX + valueIndex * slot + slot * 0.22;
          const width = slot * 0.42;
          s.addShape(pptx.shapes.RECTANGLE, {
            x, y: baseY - barH, w: width, h: barH,
            fill: { color: t.accent }, line: { color: t.accent },
          });
          s.addText(String(value), {
            x: x - 0.05, y: baseY - barH - 0.28, w: width + 0.1, h: 0.2,
            fontFace: FONT_BODY, fontSize: 9, bold: true, color: t.text, align: 'center', margin: 0,
          });
          s.addText(categories[valueIndex], {
            x: x - 0.15, y: baseY + 0.1, w: width + 0.3, h: 0.45,
            fontFace: FONT_BODY, fontSize: 9, color: t.subtext, align: 'center', margin: 0,
          });
        });
        addKeyMessageCallout(s, slide, 9.15, 2.35, 3.35);
        if (chart.insight) {
          s.addText(chart.insight, {
            x: 9.15, y: 3.35, w: 3.35, h: 0.9,
            fontFace: FONT_BODY, fontSize: 14, color: t.subtext, valign: 'top', margin: 0,
          });
        }
      } else {
        const statY = 2.4;
        const statH = 3.6;
        const sgap = 0.3;
        const statW = (SLIDE_W - MARGIN_X * 2 - sgap * (Math.max(stats.length, 1) - 1)) / Math.max(stats.length, 1);
        stats.forEach((stat, i) => {
          const x = MARGIN_X + i * (statW + sgap);
          s.addShape(pptx.shapes.RECTANGLE, {
            x, y: statY, w: statW, h: statH,
            fill: { color: t.sectionBg || 'E7EDF4' }, line: { color: t.sectionBg || 'E7EDF4' },
          });
          s.addShape(pptx.shapes.RECTANGLE, {
            x, y: statY, w: 0.1, h: statH,
            fill: { color: t.accent }, line: { color: t.accent },
          });
          s.addText(stat.value || '\u2014', {
            x: x + 0.3, y: statY + 0.6, w: statW - 0.6, h: 1.6,
            fontFace: FONT_HEAD, fontSize: 44, bold: true, color: t.accent, valign: 'top', margin: 0,
          });
          s.addText(stat.label || '', {
            x: x + 0.3, y: statY + 2.2, w: statW - 0.6, h: 1.2,
            fontFace: FONT_BODY, fontSize: 13, color: t.subtext, valign: 'top', margin: 0,
          });
        });
      }
      drawFooter(s, idx);
    } else if (slideType === 'closing') {
      s.addText('KEY TAKEAWAYS', {
        x: MARGIN_X, y: 0.7, w: SLIDE_W - MARGIN_X * 2, h: 0.3,
        fontFace: FONT_BODY, fontSize: 11, bold: true, color: t.accent, charSpacing: 6, margin: 0,
      });
      s.addShape(pptx.shapes.RECTANGLE, {
        x: MARGIN_X, y: 1.1, w: 0.5, h: 0.06,
        fill: { color: t.accent }, line: { color: t.accent },
      });
      s.addText(slide.title || 'Thank You', {
        x: MARGIN_X, y: 1.3, w: SLIDE_W - MARGIN_X * 2, h: 0.9,
        fontFace: FONT_HEAD, fontSize: 32, bold: true, color: t.text, margin: 0,
      });
      if (slide.bullets?.length) {
        const items = slide.bullets.map((b, i) => ({
          text: `${i + 1}. ${b}`,
          options: { color: t.text, fontFace: FONT_BODY, fontSize: 18, breakLine: i < slide.bullets.length - 1, paraSpaceAfter: 8 },
        }));
        s.addText(items, {
          x: MARGIN_X, y: 2.5, w: SLIDE_W - MARGIN_X * 2, h: 4.0,
          valign: 'top', margin: 0,
        });
      }
      drawFooter(s, idx);
    } else {
      s.addShape(pptx.shapes.RECTANGLE, {
        x: MARGIN_X, y: 0.7, w: 0.5, h: 0.06,
        fill: { color: t.accent }, line: { color: t.accent },
      });
      addObjectiveBand(s, slide);
      s.addText(slide.title || '', {
        x: MARGIN_X, y: 0.9, w: SLIDE_W - MARGIN_X * 2, h: 0.85,
        fontFace: FONT_HEAD, fontSize: 28, bold: true, color: t.text, margin: 0,
      });
      if (slide.subtitle) s.addText(slide.subtitle, {
        x: MARGIN_X, y: 1.7, w: SLIDE_W - MARGIN_X * 2, h: 0.4,
        fontFace: FONT_BODY, fontSize: 14, color: t.subtext, margin: 0,
      });
      const bulletsTop = slide.subtitle ? 2.2 : 1.9;
      const bulletsHeight = FOOT_Y - bulletsTop - 0.2;
      if (slide.bullets?.length) {
        const items = slide.bullets.map((b, i) => ({
          text: b,
          options: {
            bullet: { code: '25A0', color: t.accent },
            color: t.text, fontFace: FONT_BODY, fontSize: 18,
            breakLine: i < slide.bullets.length - 1, paraSpaceAfter: 10, indent: 18,
          },
        }));
        s.addText(items, {
          x: MARGIN_X, y: bulletsTop, w: SLIDE_W - MARGIN_X * 2, h: bulletsHeight,
          valign: 'top', margin: 0,
        });
      }
      if (slide.visualElements?.length) {
        const chips = slide.visualElements.slice(0, 4);
        chips.forEach((chip, chipIndex) => {
          const chipX = MARGIN_X + chipIndex * 1.45;
          s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: chipX, y: 6.2, w: 1.22, h: 0.34,
            rectRadius: 0.03,
            fill: { color: t.sectionBg || 'E7EDF4' }, line: { color: t.sectionBg || 'E7EDF4' },
          });
          s.addText(chip, {
            x: chipX + 0.08, y: 6.28, w: 1.06, h: 0.14,
            fontFace: FONT_BODY, fontSize: 8.5, bold: true, color: t.accent, align: 'center', margin: 0,
          });
        });
      }
      drawFooter(s, idx);
    }
  }
  await pptx.writeFile({ fileName: `${(pptJson.title || 'Presentation').replace(/[^a-z0-9]/gi, '_')}.pptx` });
};

// ── Slide Editor Panel ────────────────────────────────────────────────────────
const SlideEditor = ({ slide, onUpdate, onRegenerate, onDelete, onAddSlide, isRegenerating }) => {
  const [local, setLocal] = useState(slide);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [showRegen, setShowRegen] = useState(false);
  useEffect(() => { setLocal(slide); }, [slide]);
  const upd = (f, v) => { const u = { ...local, [f]: v }; setLocal(u); onUpdate(u); };
  const updBullet = (i, v) => { const b = [...(local.bullets || [])]; b[i] = v; upd('bullets', b); };
  const inp = {
    backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)',
    border: '1px solid var(--border-color)', borderRadius: 10, padding: '8px 12px',
    width: '100%', fontSize: 13, outline: 'none', resize: 'vertical'
  };
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>{slide.type}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowRegen(p => !p)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
            <Wand2 className="w-3.5 h-3.5" /> AI Regen
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(220,38,38,.1)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <Trash2 className="w-4 h-4" style={{ color: '#dc2626' }} />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showRegen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--bg-subtle)', borderLeft: '3px solid var(--brand-accent)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>How to improve this slide:</p>
            <textarea value={regenPrompt} onChange={e => setRegenPrompt(e.target.value)} rows={2}
              placeholder="e.g. More concise, add data, change layout..." style={{ ...inp, resize: 'none' }} />
            <button onClick={() => { onRegenerate(regenPrompt); setShowRegen(false); setRegenPrompt(''); }}
              disabled={isRegenerating}
              className="w-full py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              {isRegenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Regenerating...</> : <><Wand2 className="w-4 h-4" />Regenerate</>}
            </button>
          </div>
        </motion.div>}
      </AnimatePresence>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Title</label>
        <input value={local.title || ''} onChange={e => upd('title', e.target.value)} style={inp} />
      </div>
      {(slide.type === 'title' || slide.type === 'section') && <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Subtitle</label>
        <input value={local.subtitle || ''} onChange={e => upd('subtitle', e.target.value)} style={inp} />
      </div>}
      {slide.type === 'quote' && <>
        <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Quote</label>
          <textarea value={local.quote || ''} onChange={e => upd('quote', e.target.value)} rows={3} style={inp} /></div>
        <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Attribution</label>
          <input value={local.attribution || ''} onChange={e => upd('attribution', e.target.value)} style={inp} /></div>
      </>}
      {slide.type === 'two-column' && <>
        <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Left Column</label>
          <textarea value={local.leftContent || ''} onChange={e => upd('leftContent', e.target.value)} rows={4} style={inp} /></div>
        <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Right Column</label>
          <textarea value={local.rightContent || ''} onChange={e => upd('rightContent', e.target.value)} rows={4} style={inp} /></div>
      </>}
      {(slide.bullets?.length > 0 || (slide.type !== 'quote' && slide.type !== 'two-column' && slide.type !== 'title' && slide.type !== 'section')) && <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Bullets</label>
          <button onClick={() => upd('bullets', [...(local.bullets || []), 'New point'])}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg font-semibold"
            style={{ color: 'var(--brand-primary)', backgroundColor: 'var(--brand-light)' }}>
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {(local.bullets || []).map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--brand-accent)' }} />
              <input value={b} onChange={e => updBullet(i, e.target.value)} style={{ ...inp, flex: 1 }} />
              <button onClick={() => upd('bullets', (local.bullets || []).filter((_, idx) => idx !== i))}
                className="flex-shrink-0 p-1 rounded" style={{ color: '#dc2626' }}><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Speaker Note</label>
        <textarea value={local.note || ''} onChange={e => upd('note', e.target.value)} rows={2}
          placeholder="Optional notes..." style={{ ...inp, resize: 'none' }} />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Slide Type</label>
        <select value={local.type} onChange={e => upd('type', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
          {['title', 'section', 'bullets', 'two-column', 'comparison', 'cards', 'timeline', 'process', 'quote', 'data', 'closing'].map(tp => (
            <option key={tp} value={tp}>{tp.charAt(0).toUpperCase() + tp.slice(1).replace('-', ' ')}</option>
          ))}
        </select>
      </div>
      <button onClick={onAddSlide}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm font-semibold"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
        <Plus className="w-4 h-4" /> Add Slide After
      </button>
    </div>
  );
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
const DeckPrep = () => {
  const outlet = useOutletContext();
  const { user = null } = outlet || {};
  const [mode, setMode] = useState('home');
  const [step, setStep] = useState(1);
  const [docId, setDocId] = useState(null);
  const [pptJson, setPptJson] = useState(null);
  const [fullText, setFullText] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [regenIdx, setRegenIdx] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [theme, setTheme] = useState('consulting');
  const [slideCount, setSlideCount] = useState(12);
  const [audience, setAudience] = useState('business');
  const [additionalContext, setAdditionalContext] = useState('');
  const [extractPrompt, setExtractPrompt] = useState('Read the full document like a strategist and presentation editor. Preserve the real meaning, identify audience and purpose, extract the strongest arguments and data, group content into a clear narrative, and structure the text into presentation-ready sections instead of raw paragraphs.');
  const [pptPrompt, setPptPrompt] = useState('Design a consulting-style presentation with a compelling title slide, clear story flow, concise executive messaging, strong slide objectives, and smart visual layouts. Use comparisons, timelines, cards, process diagrams, and data-focused slides whenever they communicate better than bullets.');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [leftPaneCollapsed, setLeftPaneCollapsed] = useState(false);
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(false);
  const fileRef = useRef();
  const autoSaveRef = useRef(null);
  const resumeAttemptedRef = useRef(false);

  const load = (msg) => { setLoading(true); setLoadingMsg(msg); setError(''); };
  const done = () => { setLoading(false); setLoadingMsg(''); };

  const persistDeckSession = useCallback((patch = {}) => {
    const nextDocumentId = patch.documentId ?? docId;
    const nextMode = patch.mode ?? mode;
    if (!nextDocumentId && nextMode === 'home') {
      clearDeckSession();
      return;
    }
    writeDeckSession({
      documentId: nextDocumentId,
      mode: nextMode,
      step: patch.step ?? step,
      activeSlide: patch.activeSlide ?? activeSlide,
      theme: patch.theme ?? theme,
      slideCount: patch.slideCount ?? slideCount,
      audience: patch.audience ?? audience,
      additionalContext: patch.additionalContext ?? additionalContext,
      leftPaneCollapsed: patch.leftPaneCollapsed ?? leftPaneCollapsed,
      rightPaneCollapsed: patch.rightPaneCollapsed ?? rightPaneCollapsed,
      updatedAt: Date.now(),
    });
  }, [activeSlide, additionalContext, audience, docId, leftPaneCollapsed, mode, rightPaneCollapsed, slideCount, step, theme]);

  const persistFullText = useCallback(async (documentId = docId, nextText = fullText) => {
    if (!documentId) return;
    await axios.post(
      `${API}/api/documents/save-text`,
      { documentId, fullText: nextText },
      { headers: headers() }
    );
  }, [docId, fullText]);

  const fetchHistory = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/api/documents/history`, { headers: headers() });
      setHistory(r.data.histories || []);
    } catch (e) {
      console.error('Failed to fetch history');
    }
  }, []);

  // ── NEW: Delete a document from history (called on hover button click) ─────
  const handleDelete = useCallback(async (documentId) => {
    if (!window.confirm('Are you sure you want to permanently delete this presentation and all its data? This action cannot be undone.')) {
      return;
    }
    try {
      await axios.delete(`${API}/api/documents/${documentId}`, { headers: headers() });
      toast.success('Presentation deleted');
      fetchHistory();
      // If the deleted document was currently loaded, reset the editor
      if (docId === documentId) {
        setDocId(null);
        setPptJson(null);
        setMode('home');
        clearDeckSession();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete presentation');
    }
  }, [docId, fetchHistory]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  const hasPendingDecks = history.some((entry) => isGenerationPending(entry));

  useEffect(() => {
    if (!hasPendingDecks) return undefined;
    const interval = setInterval(() => {
      fetchHistory();
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchHistory, hasPendingDecks]);

  useEffect(() => {
    if (docId || mode !== 'home') {
      persistDeckSession();
    }
  }, [activeSlide, additionalContext, audience, docId, leftPaneCollapsed, mode, persistDeckSession, rightPaneCollapsed, slideCount, step, theme]);

  useEffect(() => {
    if (resumeAttemptedRef.current || !history.length) return;
    resumeAttemptedRef.current = true;
    const session = readDeckSession();
    if (!session?.documentId) return;

    setTheme(session.theme || 'consulting');
    setSlideCount(session.slideCount || 12);
    setAudience(session.audience || 'business');
    setAdditionalContext(session.additionalContext || '');
    setLeftPaneCollapsed(!!session.leftPaneCollapsed);
    setRightPaneCollapsed(!!session.rightPaneCollapsed);

    const match = history.find((entry) => String(entry._id) === String(session.documentId));
    if (!match) {
      clearDeckSession();
      return;
    }

    setFile(null);
    setDocId(match._id);
    setFullText(match.fullText || '');
    setExtractedText(match.extractedText || '');

    if (isGenerationPending(match)) {
      setMode('history');
      toast.success('Resumed your in-progress presentation.');
      return;
    }

    if (match.pptJson) {
      setPptJson(match.pptJson);
      setMode('editor');
      setActiveSlide(Math.min(session.activeSlide || 0, Math.max((match.pptJson?.slides?.length || 1) - 1, 0)));
      toast.success('Resumed your last presentation session.');
      return;
    }

    if (isGenerationFailed(match)) {
      setMode('guided');
      setStep(5);
      setError(match.generationError || 'Presentation generation failed');
      toast.success('Restored your last deck workspace.');
      return;
    }

    if (match.extractedText) {
      setMode('guided');
      setStep(session.step || 5);
      toast.success('Restored your last deck workspace.');
      return;
    }

    if (match.fullText) {
      setMode('reader');
      toast.success('Restored your last deck workspace.');
      return;
    }

    setMode('guided');
    setStep(session.step || 2);
    toast.success('Restored your last deck workspace.');
  }, [history]);

  const handleQueuedGeneration = useCallback(async (responseData = {}, nextMode = 'history') => {
    const nextDocumentId = responseData?.document?._id || docId;
    if (responseData?.document?._id) setDocId(responseData.document._id);
    if (typeof responseData?.fullText === 'string') setFullText(responseData.fullText);
    if (typeof responseData?.extractedText === 'string') setExtractedText(responseData.extractedText);
    setMode(nextMode);
    persistDeckSession({ documentId: nextDocumentId, mode: nextMode });
    await fetchHistory();
    toast.success(responseData?.message || 'Presentation generation started. You can leave this section and return later.');
  }, [docId, fetchHistory, persistDeckSession]);

  const triggerAutoSave = useCallback((json) => {
    if (!docId || !json) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await axios.post(`${API}/api/documents/save-ppt`, { documentId: docId, pptJson: json }, { headers: headers() });
      } catch {}
      finally { setAutoSaving(false); }
    }, 1500);
  }, [docId]);

  const uploadPDF = async (f) => {
    if (!f) return null;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const cr = await axios.post(`${API}/api/documents/upload-pdf`, fd, {
        headers: {
          ...headers(),
          'Content-Type': 'multipart/form-data',
        },
      });
      setDocId(cr.data.document._id);
      setFullText(cr.data.fullText || '');
      setExtractedText('');
      setPptJson(null);
      toast.success('PDF ready!');
      return cr.data.document._id;
    } catch (e) {
      console.error('Upload error:', e);
      setError('Upload failed');
      toast.error('Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleQuickConvert = async () => {
    if (!file && !docId) return toast.error('Upload a PDF first');
    load('Uploading PDF...');
    let id = docId;
    if (file && !docId) { id = await uploadPDF(file); if (!id) { done(); return; } }
    setLoadingMsg('AI is reading and building your presentation...');
    try {
      const r = await axios.post(`${API}/api/documents/quick-convert`, {
        documentId: id,
        slideCount,
        theme,
        audience,
        additionalContext,
        runAsync: true,
        sourceText: fullText.trim() || undefined,
      }, { headers: headers() });
      if (r.data?.queued || !r.data?.pptJson) {
        await handleQueuedGeneration(r.data, 'history');
      } else {
        setPptJson(r.data.pptJson); setFullText(r.data.fullText || ''); setActiveSlide(0); setMode('editor'); fetchHistory();
        toast.success(`${r.data.pptJson.slides.length} slides generated!`);
      }
    } catch (e) { setError(e.response?.data?.message || 'Quick convert failed'); toast.error('Failed'); }
    finally { done(); }
  };

  const handleRawExtract = async () => {
    load('Reading the PDF...');
    try {
      const r = await axios.post(`${API}/api/documents/pdf-to-text`, { documentId: docId }, { headers: headers() });
      setFullText(r.data.fullText); setStep(3);
      toast.success(`Extracted ${r.data.wordCount?.toLocaleString() || ''} words from ${r.data.pages || '?'} page${r.data.pages === 1 ? '' : 's'}`);
    } catch (e) { setError(e.response?.data?.message || 'Extraction failed'); toast.error(e.response?.data?.message || 'Extraction failed'); }
    finally { done(); }
  };

  // PDF Reader mode: deterministic full extraction, then user picks the next step.
  const handlePdfToText = async () => {
    if (!file && !docId) return toast.error('Upload a PDF first');
    load('Uploading PDF...');
    let id = docId;
    if (file && !docId) {
      id = await uploadPDF(file);
      if (!id) { done(); return; }
    }
    setLoadingMsg('Extracting full text...');
    try {
      const r = await axios.post(`${API}/api/documents/pdf-to-text`, { documentId: id }, { headers: headers() });
      setFullText(r.data.fullText);
      setMode('reader');
      toast.success(`Extracted ${r.data.wordCount?.toLocaleString() || ''} words from ${r.data.pages || '?'} page${r.data.pages === 1 ? '' : 's'}`);
      fetchHistory();
    } catch (e) {
      setError(e.response?.data?.message || 'Extraction failed');
      toast.error(e.response?.data?.message || 'Extraction failed');
    } finally { done(); }
  };

  // From Reader -> Quick Convert (re-uses the cached fullText on the server).
  const handleReaderToQuick = async () => {
    if (!docId) return toast.error('No document loaded');
    load('Building your presentation from the extracted text...');
    try {
      const r = await axios.post(`${API}/api/documents/quick-convert`,
        {
          documentId: docId,
          slideCount,
          theme,
          audience,
          additionalContext,
          runAsync: true,
          sourceText: fullText.trim() || undefined,
        }, { headers: headers() });
      if (r.data?.queued || !r.data?.pptJson) {
        await handleQueuedGeneration(r.data, 'history');
      } else {
        setPptJson(r.data.pptJson); setActiveSlide(0); setMode('editor'); fetchHistory();
        toast.success(`${r.data.pptJson.slides.length} slides generated!`);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Generation failed');
      toast.error(e.response?.data?.message || 'Generation failed');
    } finally { done(); }
  };

  // From Reader -> Guided Builder (skip upload + extract since we already have text).
  const handleReaderToGuided = () => {
    if (!docId) return toast.error('No document loaded');
    setMode('guided');
    setStep(4);
    toast.success('Continue with the AI-Guided Builder');
  };

  // Persist user edits to full text back to the server, so subsequent
  // generation steps use the edited version.
  const handleReaderSave = async () => {
    if (!docId) return;
    setAutoSaving(true);
    try {
      await persistFullText(docId, fullText);
      toast.success('Saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setAutoSaving(false);
    }
  };

  const handleMeaningfulExtract = async () => {
    load('AI is structuring content...');
    try {
      const r = await axios.post(`${API}/api/documents/extract`, {
        documentId: docId,
        prompt: extractPrompt,
        fullText,
      }, { headers: headers() });
      setExtractedText(r.data.extractedText); setStep(5); toast.success('Content structured!');
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { done(); }
  };

  const handleGeneratePPT = async () => {
    load('AI is building your slides...');
    try {
      const r = await axios.post(`${API}/api/documents/generate-ppt`, {
        documentId: docId,
        prompt: pptPrompt,
        slideCount,
        theme,
        audience,
        additionalContext,
        runAsync: true,
        fullText,
        sourceText: extractedText.trim() || fullText.trim() || undefined,
      }, { headers: headers() });
      if (r.data?.queued || !r.data?.pptJson) {
        await handleQueuedGeneration(r.data, 'history');
      } else {
        setPptJson(r.data.pptJson); setActiveSlide(0); setMode('editor'); fetchHistory();
        toast.success(`${r.data.pptJson.slides.length} slides created!`);
      }
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { done(); }
  };

  const handleSlideUpdate = (upd) => {
    const slides = [...pptJson.slides]; slides[activeSlide] = upd;
    const nj = { ...pptJson, slides }; setPptJson(nj); triggerAutoSave(nj);
  };

  const handleRegenSlide = async (instruction) => {
    if (!docId) return;
    setRegenIdx(activeSlide);
    try {
      const r = await axios.post(`${API}/api/documents/regenerate-slide`, { documentId: docId, slideIndex: activeSlide, instruction }, { headers: headers() });
      setPptJson(r.data.pptJson); toast.success('Slide regenerated!');
    } catch { toast.error('Regeneration failed'); }
    finally { setRegenIdx(null); }
  };

  const handleDeleteSlide = () => {
    if (pptJson.slides.length <= 1) return toast.error('Cannot delete the only slide');
    const slides = pptJson.slides.filter((_, i) => i !== activeSlide).map((s, i) => ({ ...s, id: i + 1 }));
    const nj = { ...pptJson, slides }; setPptJson(nj); setActiveSlide(Math.min(activeSlide, slides.length - 1)); triggerAutoSave(nj);
  };

  const handleAddSlide = () => {
    const ns = { id: pptJson.slides.length + 1, type: 'bullets', title: 'New Slide', bullets: ['Key point 1', 'Key point 2', 'Key point 3'] };
    const slides = [...pptJson.slides.slice(0, activeSlide + 1), ns, ...pptJson.slides.slice(activeSlide + 1)].map((s, i) => ({ ...s, id: i + 1 }));
    const nj = { ...pptJson, slides }; setPptJson(nj); setActiveSlide(activeSlide + 1); triggerAutoSave(nj);
  };

  const loadFromHistory = (h) => {
    setFile(null);
    setDocId(h._id); setFullText(h.fullText || ''); setExtractedText(h.extractedText || '');
    if (isGenerationPending(h)) {
      setMode('history');
      persistDeckSession({ documentId: h._id, mode: 'history' });
      toast.success('This presentation is still generating in the background.');
    }
    else if (h.pptJson) { setPptJson(h.pptJson); setMode('editor'); setActiveSlide(0); persistDeckSession({ documentId: h._id, mode: 'editor', activeSlide: 0 }); }
    else if (isGenerationFailed(h)) { setMode('guided'); setStep(5); setError(h.generationError || 'Presentation generation failed'); persistDeckSession({ documentId: h._id, mode: 'guided', step: 5 }); }
    else if (h.extractedText) { setMode('guided'); setStep(5); persistDeckSession({ documentId: h._id, mode: 'guided', step: 5 }); }
    else if (h.fullText) { setMode('reader'); persistDeckSession({ documentId: h._id, mode: 'reader' }); }
    else { setMode('guided'); setStep(2); persistDeckSession({ documentId: h._id, mode: 'guided', step: 2 }); }
    toast.success('Loaded!');
  };

  const handleExport = async () => {
    if (!pptJson?.slides?.length) return toast.error('No presentation to export');
    load('Building PPTX file...');
    try { await exportToPPTX(pptJson, theme); toast.success('PPTX downloaded!'); }
    catch (e) { toast.error('Export failed: ' + e.message); }
    finally { done(); }
  };

  // Shared sub-components
  const inp = { backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' };
  const inpFocus = (e) => { e.target.style.borderColor = 'var(--brand-accent)'; };
  const inpBlur = (e) => { e.target.style.borderColor = 'var(--input-border)'; };
  const SectionLabel = ({ children }) => (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{children}</h2>
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
  );

  // Loading screen
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-5">
      <Toaster position="top-right" />
      <div className="relative">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--brand-primary)' }} />
      </div>
      <div className="text-center">
        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{loadingMsg || 'Processing...'}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>AI is working on your presentation</p>
      </div>
    </div>
  );

  const ErrorBox = ({ msg }) => msg ? (
    <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(220,38,38,.06)', borderColor: 'rgba(220,38,38,.3)' }}>
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
      <p className="text-sm" style={{ color: '#dc2626' }}>{msg}</p>
    </div>
  ) : null;

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (mode === 'home') return (
    <div className="space-y-8 py-4">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
             FundCo DeckPrep AI
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Convert PDFs into polished PowerPoint presentations</p>
        </div>
        {history.length > 0 && <button onClick={() => setMode('history')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}>
          <HistoryIcon className="w-4 h-4" /> History ({history.length})
        </button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { key: 'reader-start', icon: AlignLeft, title: 'PDF to Text', desc: 'Convert a PDF to clean, full text - every paragraph, heading, list and table preserved. Edit, copy, or send straight to the deck builder.', tags: ['Full Text', 'No Summary', 'Editable', 'Send Forward'], color: 'var(--brand-primary)', bg: 'var(--brand-light)' },
          { key: 'quick', icon: Zap, title: 'Quick Convert', desc: 'Upload a PDF and get a polished presentation in one click. AI reads, structures, and designs everything.', tags: ['One-Click', 'AI Slides', 'Auto Theme', 'PPTX Export'], color: '#36a9e1', bg: 'rgba(54,169,225,.1)' },
          { key: 'guided', icon: Wand2, title: 'AI-Guided Builder', desc: 'Full control at every step - extract raw text, structure content with your prompt, then generate and fine-tune slides.', tags: ['Step-by-Step', 'Custom Prompts', 'Edit Everything'], color: '#0f9f6e', bg: 'rgba(15,159,110,.1)' },
        ].map(card => (
          <motion.div key={card.key} whileHover={{ y: -2 }}
            className="rounded-2xl border p-6 cursor-pointer transition-all"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            onClick={() => {
              if (card.key === 'reader-start') { setMode('reader-upload'); setFile(null); setDocId(null); setFullText(''); }
              else { setMode(card.key); if (card.key === 'guided') setStep(1); }
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow-color)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: card.bg }}>
              <card.icon className="w-7 h-7" style={{ color: card.color }} />
            </div>
            <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>{card.title}</h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>{card.desc}</p>
            <div className="flex flex-wrap gap-2">
              {card.tags.map(t => <span key={t} className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: card.bg, color: card.color }}>{t}</span>)}
            </div>
            <div className="mt-6 flex items-center gap-2 font-bold text-sm" style={{ color: card.color }}>
              Get Started <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Presentations - now with hover delete button */}
      {history.length > 0 && <>
        <SectionLabel>Recent Presentations</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {history.slice(0, 6).map(h => (
            <motion.div
              key={h._id}
              whileHover={{ y: -1 }}
              onClick={() => loadFromHistory(h)}
              className="rounded-xl border p-4 cursor-pointer transition-all flex items-center gap-3 group relative"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: h.pptJson ? 'var(--brand-light)' : 'var(--bg-subtle)' }}>
                <FileText className="w-5 h-5" style={{ color: h.pptJson ? 'var(--brand-primary)' : 'var(--text-muted)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{getDocumentFileName(h)}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {h.pptJson ? `${h.pptJson.slides?.length || 0} slides` : 'No slides'}  -  {new Date(h.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Hover-only delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(h._id);
                }}
                className="absolute top-3 right-3 p-2 rounded-xl bg-white shadow-sm border border-transparent hover:border-red-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Delete presentation"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </motion.div>
          ))}
        </div>
      </>}
    </div>
  );

  // ── QUICK CONVERT ─────────────────────────────────────────────────────────
  if (mode === 'quick') return (
    <div className="space-y-6 py-4 max-w-2xl mx-auto">
      <Toaster position="top-right" />
      <button onClick={() => setMode('home')} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}><ChevronLeft className="w-4 h-4" /> Back</button>
      <div><h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Quick Convert</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Upload PDF to get PPTX in seconds</p></div>
      <div onClick={() => fileRef.current?.click()}
        className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
        style={{ borderColor: file ? 'var(--brand-primary)' : 'var(--border-color)', backgroundColor: file ? 'var(--brand-light)' : 'var(--bg-surface)' }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.pdf')) { setFile(f); setDocId(null); } else toast.error('PDF only'); }}>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setDocId(null); } }} />
        {file ? <>
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary)' }}><FileText className="w-6 h-6 text-white" /></div>
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <button onClick={e => { e.stopPropagation(); setFile(null); setDocId(null); }} className="mt-2 text-xs" style={{ color: '#dc2626' }}>Remove</button>
        </> : <>
          <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Drop PDF here or click to browse</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Works with searchable PDFs (not scanned images)</p>
        </>}
      </div>
      {history.filter(h => h.originalFileId).length > 0 && <div>
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Or use a previous PDF</p>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {history.filter(h => h.originalFileId).slice(0, 5).map(h => (
            <div key={h._id} onClick={() => { setDocId(h._id); setFile(null); }}
              className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer"
              style={{ backgroundColor: docId === h._id ? 'var(--brand-light)' : 'var(--bg-surface)', borderColor: docId === h._id ? 'var(--brand-primary)' : 'var(--border-color)' }}>
              <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
              <span className="text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>{h.originalFileId.fileName}</span>
              {docId === h._id && <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />}
            </div>
          ))}
        </div>
      </div>}
      <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Settings2 className="w-4 h-4" /> Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Slides</label>
            <input type="number" min={6} max={30} value={slideCount} onChange={e => setSlideCount(+e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inp} onFocus={inpFocus} onBlur={inpBlur} /></div>
          <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inp}>
              {['business', 'technical', 'academic', 'executive', 'general'].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
            </select></div>
        </div>
        <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Visual Theme</label>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(THEMES).map(([k, v]) => (
              <button key={k} onClick={() => setTheme(k)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all"
                style={{ borderColor: theme === k ? 'var(--brand-primary)' : 'var(--border-color)', backgroundColor: theme === k ? 'var(--brand-light)' : 'var(--bg-subtle)' }}>
                <div className="flex gap-1">{v.preview.map((c, i) => <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />)}</div>
                <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>{v.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Additional Context</label>
          <textarea
            value={additionalContext}
            onChange={e => setAdditionalContext(e.target.value)}
            rows={4}
            className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y"
            style={inp}
            onFocus={inpFocus}
            onBlur={inpBlur}
            placeholder="Add audience context, the decision this deck should support, what to emphasize, or what to avoid."
          />
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            This helps the deck speak to the real meeting, committee, investor, client, or leadership audience.
          </p>
        </div>
      </div>
      <ErrorBox msg={error} />
      <button onClick={handleQuickConvert} disabled={!file && !docId}
        className="w-full py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--brand-primary)' }}>
         Generate Presentation
      </button>
    </div>
  );

  // ── PDF READER (UPLOAD) ───────────────────────────────────────────────────
  if (mode === 'reader-upload') return (
    <div className="space-y-6 py-4 max-w-2xl mx-auto">
      <Toaster position="top-right" />
      <button onClick={() => setMode('home')} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>PDF to Text</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Get the full, structured text from any searchable PDF - no summaries, no scattered output.</p>
      </div>
      <div onClick={() => fileRef.current?.click()}
        className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
        style={{ borderColor: file ? 'var(--brand-primary)' : 'var(--border-color)', backgroundColor: file ? 'var(--brand-light)' : 'var(--bg-surface)' }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.pdf')) { setFile(f); setDocId(null); } else toast.error('PDF only'); }}>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setDocId(null); } }} />
        {file ? <>
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary)' }}><FileText className="w-6 h-6 text-white" /></div>
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <button onClick={e => { e.stopPropagation(); setFile(null); setDocId(null); }} className="mt-2 text-xs" style={{ color: '#dc2626' }}>Remove</button>
        </> : <>
          <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Drop PDF here or click to browse</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Searchable PDFs only - scanned/image PDFs need OCR first.</p>
        </>}
      </div>
      {history.filter(h => h.originalFileId).length > 0 && <div>
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Or reuse a previous PDF</p>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {history.filter(h => h.originalFileId).slice(0, 5).map(h => (
            <div key={h._id} onClick={() => { setDocId(h._id); setFile(null); }}
              className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer"
              style={{ backgroundColor: docId === h._id ? 'var(--brand-light)' : 'var(--bg-surface)', borderColor: docId === h._id ? 'var(--brand-primary)' : 'var(--border-color)' }}>
              <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
              <span className="text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>{h.originalFileId.fileName}</span>
              {docId === h._id && <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />}
            </div>
          ))}
        </div>
      </div>}
      <ErrorBox msg={error} />
      <button onClick={handlePdfToText} disabled={!file && !docId}
        className="w-full py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--brand-primary)' }}>
        <FileText className="w-5 h-5" /> Extract Full Text
      </button>
    </div>
  );

  // ── PDF READER (STRUCTURED VIEW) ──────────────────────────────────────────
  if (mode === 'reader') {
    const wordCount = (fullText || '').split(/\s+/).filter(Boolean).length;
    const charCount = (fullText || '').length;
    return (
      <div className="space-y-5 py-4 max-w-5xl mx-auto">
        <Toaster position="top-right" />
        <button onClick={() => setMode('home')} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Extracted Text</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{wordCount.toLocaleString()} words  -  {charCount.toLocaleString()} characters</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigator.clipboard?.writeText(fullText); toast.success('Copied to clipboard'); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <FileText className="w-3.5 h-3.5" /> Copy
            </button>
            <button
              onClick={() => {
                downloadPlainText(fullText, pptJson?.title || 'extracted-text');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <Download className="w-3.5 h-3.5" /> Download .txt
            </button>
            <button
              onClick={handleReaderSave}
              disabled={autoSaving}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              {autoSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save edits
            </button>
          </div>
        </div>

        <ErrorBox msg={error} />

        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Document body</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Editable</span>
          </div>
          <textarea
            value={fullText}
            onChange={e => setFullText(e.target.value)}
            rows={28}
            className="w-full px-7 py-6 text-[14px] leading-7 focus:outline-none resize-y"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontFamily: 'Georgia, "Source Serif Pro", serif' }}
          />
        </div>

        <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Sparkles className="w-4 h-4" /> Send to deck builder
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use the text above to generate a presentation. Choose how much control you want.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Slides</label>
              <input type="number" min={6} max={30} value={slideCount} onChange={e => setSlideCount(+e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inp} onFocus={inpFocus} onBlur={inpBlur} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Theme</label>
              <select value={theme} onChange={e => setTheme(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inp}>
                {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <button
              onClick={async () => { await handleReaderSave(); handleReaderToQuick(); }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              <Zap className="w-4 h-4" /> Quick Convert to PPTX
            </button>
            <button
              onClick={async () => { await handleReaderSave(); handleReaderToGuided(); }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border font-bold"
              style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}>
              <Wand2 className="w-4 h-4" /> Open in AI-Guided Builder
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── GUIDED MODE ───────────────────────────────────────────────────────────
  if (mode === 'guided') {
    const steps = [{ n: 1, label: 'Upload' }, { n: 2, label: 'Extract' }, { n: 3, label: 'Review' }, { n: 4, label: 'Structure' }, { n: 5, label: 'Edit' }, { n: 6, label: 'Generate' }];
    return (
      <div className="space-y-6 py-4 max-w-3xl mx-auto">
        <Toaster position="top-right" />
        <button onClick={() => setMode('home')} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}><ChevronLeft className="w-4 h-4" /> Back</button>
        <div><h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>AI-Guided Builder</h1></div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {steps.map((s, i) => (
            <React.Fragment key={s.n}>
              <button onClick={() => step >= s.n && setStep(s.n)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all"
                style={step === s.n ? { backgroundColor: 'var(--brand-primary)', color: '#fff' } : step > s.n ? { backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' } : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ backgroundColor: step === s.n ? 'rgba(255,255,255,.25)' : step > s.n ? 'var(--brand-primary)' : 'var(--bg-hover)', color: step > s.n ? '#fff' : 'inherit' }}>
                  {step > s.n ? 'Done' : s.n}
                </span>{s.label}
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
            </React.Fragment>
          ))}
        </div>
        <ErrorBox msg={error} />
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {step === 1 && <div className="rounded-2xl border p-8 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Upload className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />Upload PDF</h2>
              <div onClick={() => fileRef.current?.click()} className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer"
                style={{ borderColor: file ? 'var(--brand-primary)' : 'var(--border-color)' }}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.pdf')) setFile(f); }}
                onDragOver={e => e.preventDefault()}>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
                {file ? <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>File: {file.name}</p>
                  : <><Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} /><p style={{ color: 'var(--text-secondary)' }}>Click or drop PDF</p></>}
              </div>
              <button onClick={async () => { if (!file) return toast.error('Select a PDF'); setUploading(true); const id = await uploadPDF(file); setUploading(false); if (id) setStep(2); }}
                disabled={!file || uploading}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-primary)' }}>
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : 'Upload & Continue'}
              </button>
              {history.length > 0 && <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Or load existing</p>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {history.slice(0, 5).map(h => (
                    <div key={h._id} onClick={() => loadFromHistory(h)} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                      <FileText className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} /><span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{getDocumentFileName(h)}</span>
                    </div>
                  ))}
                </div>
              </div>}
            </div>}
            {step === 2 && <div className="rounded-2xl border p-8 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><FileText className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />Extract Full PDF Text</h2>
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>The document service converts the PDF directly to structured text first. No summaries. No binary-file round trip through the model.</p>
              </div>
              <button onClick={handleRawExtract} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
                <Zap className="w-4 h-4" /> Extract Full Text
              </button>
            </div>}
            {step === 3 && <div className="rounded-2xl border p-8 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Edit2 className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />Review Full Text</h2>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{fullText.length.toLocaleString()} chars</span><span>~{Math.ceil(fullText.split(' ').length / 250)} pages</span>
              </div>
              <textarea value={fullText} onChange={e => setFullText(e.target.value)} rows={14}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y"
                style={{ ...inp, fontFamily: 'Georgia, \"Source Serif Pro\", serif', lineHeight: 1.7 }} onFocus={inpFocus} onBlur={inpBlur} />
              <button onClick={() => setStep(4)} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>}
            {step === 4 && <div className="rounded-2xl border p-8 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>Structure Content</h2>
              <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Extraction Prompt</label>
                <textarea value={extractPrompt} onChange={e => setExtractPrompt(e.target.value)} rows={5}
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y"
                  style={inp} onFocus={inpFocus} onBlur={inpBlur} />
              </div>
              <button onClick={handleMeaningfulExtract} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
                <Wand2 className="w-4 h-4" /> Structure with AI
              </button>
            </div>}
            {step === 5 && <div className="rounded-2xl border p-8 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Edit2 className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />Edit Structured Content</h2>
              <textarea value={extractedText} onChange={e => setExtractedText(e.target.value)} rows={14}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y"
                style={inp} onFocus={inpFocus} onBlur={inpBlur} />
              <button onClick={() => setStep(6)} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
                Continue to Slides <ArrowRight className="w-4 h-4" />
              </button>
            </div>}
            {step === 6 && <div className="rounded-2xl border p-8 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Generate Presentation</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Slides</label>
                  <input type="number" min={6} max={30} value={slideCount} onChange={e => setSlideCount(+e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inp} onFocus={inpFocus} onBlur={inpBlur} /></div>
                <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Theme</label>
                  <select value={theme} onChange={e => setTheme(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inp}>
                    {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Generation Prompt</label>
                <textarea value={pptPrompt} onChange={e => setPptPrompt(e.target.value)} rows={4}
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y"
                  style={inp} onFocus={inpFocus} onBlur={inpBlur} />
              </div>
              <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Additional Context</label>
                <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} rows={4}
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y"
                  style={inp} onFocus={inpFocus} onBlur={inpBlur}
                  placeholder="Add real-world context: the audience, decision to drive, tone, topics to emphasize, or missing background the PDF alone may not show." />
              </div>
              <div className="rounded-xl border px-4 py-3 text-sm" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                Presentation generation runs in the background. You can leave Deck Prep, return later, and you will receive a notification when the deck is ready.
              </div>
              <button onClick={handleGeneratePPT} className="w-full py-4 rounded-xl font-black text-white text-base flex items-center justify-center gap-3 hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
                 Generate Presentation
              </button>
            </div>}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── EDITOR ────────────────────────────────────────────────────────────────
  if (mode === 'editor' && pptJson) {
    const slide = pptJson.slides[activeSlide];
    const SlideIcon = slideIcons[slide?.type] || AlignLeft;
    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
        <Toaster position="top-right" />
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 flex-wrap gap-2"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMode('home')}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <ChevronLeft className="w-3.5 h-3.5" /> Home
            </button>
            <div className="w-px h-5" style={{ backgroundColor: 'var(--border-color)' }} />
            <div className="min-w-0">
              <p className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>{pptJson.title || 'Untitled Presentation'}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pptJson.slides.length} slides</span>
                {autoSaving && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={theme} onChange={e => setTheme(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none"
              style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
              {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90"
              style={{ backgroundColor: '#16a34a' }}>
              <Download className="w-3.5 h-3.5" /> Export PPTX
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Thumbnail strip */}
          <div className={`${leftPaneCollapsed ? 'w-14' : 'w-44'} flex-shrink-0 border-r flex flex-col overflow-y-auto transition-all duration-200`}
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
            <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              {!leftPaneCollapsed ? <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Slides</span> : <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Deck</span>}
              <div className="flex items-center gap-1">
                {!leftPaneCollapsed ? (
                  <button onClick={handleAddSlide} className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}><Plus className="w-3.5 h-3.5" /></button>
                ) : null}
                <button onClick={() => setLeftPaneCollapsed(value => !value)} className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                  {leftPaneCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {!leftPaneCollapsed ? (
              <div className="flex flex-col gap-2 p-2">
                {pptJson.slides.map((s, i) => (
                  <div key={s.id || i} onClick={() => setActiveSlide(i)}
                    className="relative cursor-pointer rounded-lg overflow-hidden"
                    style={{ outline: activeSlide === i ? '2px solid var(--brand-primary)' : '2px solid transparent' }}>
                    <SlidePreview slide={s} theme={theme} scale={0.22} />
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 flex items-center gap-1"
                      style={{ backgroundColor: 'rgba(0,0,0,.55)' }}>
                      <span className="text-white text-[9px] opacity-80">{i + 1}</span>
                    </div>
                    {regenIdx === i && <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,.6)' }}>
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center gap-2 px-2 py-3">
                {pptJson.slides.map((s, i) => (
                  <button
                    key={s.id || i}
                    type="button"
                    onClick={() => setActiveSlide(i)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[0.7rem] font-black"
                    style={{ backgroundColor: activeSlide === i ? 'var(--brand-primary)' : 'var(--bg-surface)', color: activeSlide === i ? '#fff' : 'var(--text-secondary)' }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Main preview */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
            <div className="flex items-center justify-center gap-4 py-3 flex-shrink-0">
              <button onClick={() => setActiveSlide(p => Math.max(0, p - 1))} disabled={activeSlide === 0}
                className="p-1.5 rounded-lg disabled:opacity-30"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Slide {activeSlide + 1} of {pptJson.slides.length}
              </span>
              <button onClick={() => setActiveSlide(p => Math.min(pptJson.slides.length - 1, p + 1))} disabled={activeSlide === pptJson.slides.length - 1}
                className="p-1.5 rounded-lg disabled:opacity-30"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={activeSlide} initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>
                  <SlidePreview slide={pptJson.slides[activeSlide]} theme={theme}
                    scale={Math.min(1, Math.max(.5, (window.innerWidth - 500) / 640))} isActive />
                </motion.div>
              </AnimatePresence>
            </div>
            {pptJson.slides[activeSlide]?.note && <div className="mx-6 mb-4 px-4 py-3 rounded-xl border text-xs"
              style={{ backgroundColor: 'rgba(245,158,11,.06)', borderColor: 'rgba(245,158,11,.3)', color: 'var(--text-secondary)' }}>
              Note: {pptJson.slides[activeSlide].note}
            </div>}
          </div>
          {/* Edit panel */}
          <div className={`${rightPaneCollapsed ? 'w-14' : 'w-72'} flex-shrink-0 border-l overflow-y-auto transition-all duration-200`}
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="px-3 py-3 border-b flex items-center justify-between gap-2 sticky top-0 z-10"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 overflow-hidden">
                <SlideIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                {!rightPaneCollapsed ? <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>Edit Slide</span> : null}
              </div>
              <button onClick={() => setRightPaneCollapsed(value => !value)} className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                {rightPaneCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
            {!rightPaneCollapsed ? (
              <SlideEditor slide={pptJson.slides[activeSlide]} onUpdate={handleSlideUpdate}
                onRegenerate={handleRegenSlide} onDelete={handleDeleteSlide}
                onAddSlide={handleAddSlide} isRegenerating={regenIdx === activeSlide} />
            ) : (
              <div className="flex flex-col items-center gap-3 px-2 py-4 text-center text-[0.68rem] font-semibold" style={{ color: 'var(--text-muted)' }}>
                <span>Editor</span>
                <span>{activeSlide + 1}/{pptJson.slides.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── HISTORY ───────────────────────────────────────────────────────────────
  if (mode === 'history') return (
    <div className="space-y-6 py-4">
      <Toaster position="top-right" />
      <button onClick={() => setMode('home')} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}><ChevronLeft className="w-4 h-4" /> Back</button>
      <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Presentation History</h1>
      <div className="space-y-3">
        {history.length === 0 ? <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No history yet</p>
          : history.map(h => (
            <motion.div
              key={h._id}
              whileHover={{ y: -1 }}
              onClick={() => loadFromHistory(h)}
              className="rounded-xl border p-4 cursor-pointer transition-all flex items-center gap-4 group relative"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: h.pptJson ? 'var(--brand-light)' : 'var(--bg-subtle)' }}>
                <FileText className="w-5 h-5" style={{ color: h.pptJson ? 'var(--brand-primary)' : 'var(--text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{getDocumentFileName(h)}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {h.pptJson ? `${h.pptJson.slides?.length || 0} slides` : 'No slides'}  -  {new Date(h.createdAt).toLocaleDateString()}
                  {h.pptJson?.title ? `  -  "${h.pptJson.title}"` : ''}
                </p>
                <div className="mt-1">
                  <span className="inline-flex rounded-full px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.08em]" style={{
                    backgroundColor: isGenerationFailed(h) ? 'rgba(220,38,38,.12)' : isGenerationPending(h) ? 'rgba(54,169,225,.12)' : 'rgba(22,163,74,.12)',
                    color: isGenerationFailed(h) ? '#dc2626' : isGenerationPending(h) ? 'var(--brand-primary)' : '#16a34a',
                  }}>
                    {getGenerationLabel(h)}
                  </span>
                </div>
              </div>

              {/* Hover-only delete button - appears exactly when mouse hovers the card */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(h._id);
                }}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white shadow-sm border border-transparent hover:border-red-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Delete presentation"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>

              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            </motion.div>
          ))}
      </div>
    </div>
  );

  return null;
};

export default DeckPrep;


