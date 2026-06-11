import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  ChevronRight,
  Download,
  FileText,
  History,
  Loader2,
  Plus,
  Presentation,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import userApi from '../utils/userApi.js';
import { EmptyState, LoadingScreen, Modal, PageHeader, Panel, StatCard, StatusPill } from '../components/ui.jsx';

const THEMES = {
  professional: { label: 'Professional', bg: '1E293B', accent: '312783', text: 'F8FAFC', subtext: 'CBD5E1', surface: '334155' },
  clean: { label: 'Clean', bg: 'F8FAFC', accent: '312783', text: '142033', subtext: '475569', surface: 'E2E8F0' },
  ocean: { label: 'Ocean', bg: '0C1445', accent: '36A9E1', text: 'E0F2FE', subtext: 'BAE6FD', surface: '102A68' },
  slate: { label: 'Slate', bg: '111827', accent: '15734F', text: 'F9FAFB', subtext: 'D1D5DB', surface: '243244' },
};

const xml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toEmu = (inches) => Math.round(inches * 914400);

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const textEncoder = new TextEncoder();

const write16 = (view, offset, value) => view.setUint16(offset, value, true);
const write32 = (view, offset, value) => view.setUint32(offset, value, true);

const dosTime = (date = new Date()) => ((date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2));
const dosDate = (date = new Date()) => (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate());

const createZip = (entries) => {
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();

  entries.forEach(({ name, data }) => {
    const nameBytes = textEncoder.encode(name);
    const dataBytes = typeof data === 'string' ? textEncoder.encode(data) : data;
    const crc = crc32(dataBytes);

    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    write32(localView, 0, 0x04034b50);
    write16(localView, 4, 20);
    write16(localView, 6, 0);
    write16(localView, 8, 0);
    write16(localView, 10, dosTime(now));
    write16(localView, 12, dosDate(now));
    write32(localView, 14, crc);
    write32(localView, 18, dataBytes.length);
    write32(localView, 22, dataBytes.length);
    write16(localView, 26, nameBytes.length);
    write16(localView, 28, 0);
    local.set(nameBytes, 30);
    chunks.push(local, dataBytes);

    const cent = new Uint8Array(46 + nameBytes.length);
    const centView = new DataView(cent.buffer);
    write32(centView, 0, 0x02014b50);
    write16(centView, 4, 20);
    write16(centView, 6, 20);
    write16(centView, 8, 0);
    write16(centView, 10, 0);
    write16(centView, 12, dosTime(now));
    write16(centView, 14, dosDate(now));
    write32(centView, 16, crc);
    write32(centView, 20, dataBytes.length);
    write32(centView, 24, dataBytes.length);
    write16(centView, 28, nameBytes.length);
    write16(centView, 30, 0);
    write16(centView, 32, 0);
    write16(centView, 34, 0);
    write16(centView, 36, 0);
    write32(centView, 38, 0);
    write32(centView, 42, offset);
    cent.set(nameBytes, 46);
    central.push(cent);
    offset += local.length + dataBytes.length;
  });

  const centralOffset = offset;
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50);
  write16(endView, 8, entries.length);
  write16(endView, 10, entries.length);
  write32(endView, 12, centralSize);
  write32(endView, 16, centralOffset);
  chunks.push(...central, end);
  return new Blob(chunks, { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
};

const normalizeDeck = (deck) => {
  const slides = Array.isArray(deck?.slides) ? deck.slides : [];
  return {
    title: deck?.title || 'Admin Presentation',
    slides: slides.length
      ? slides.map((slide, index) => ({
          id: slide.id || index + 1,
          type: slide.type || 'bullets',
          title: slide.title || `Slide ${index + 1}`,
          subtitle: slide.subtitle || '',
          bullets: Array.isArray(slide.bullets) ? slide.bullets.filter(Boolean) : [],
          leftContent: slide.leftContent || '',
          rightContent: slide.rightContent || '',
          quote: slide.quote || '',
          attribution: slide.attribution || '',
          note: slide.note || '',
        }))
      : [{
          id: 1,
          type: 'title',
          title: deck?.title || 'Admin Presentation',
          subtitle: 'Generated from Deck Prep',
          bullets: [],
        }],
  };
};

const paragraph = (text, options = {}) => {
  const { color = 'FFFFFF', size = 20, bold = false, italic = false, align = 'l', bullet = false } = options;
  const pPr = bullet
    ? `<a:pPr marL="285750" indent="-171450" algn="${align}"><a:buChar char="&#8226;"/><a:defRPr sz="${size * 100}"/></a:pPr>`
    : `<a:pPr algn="${align}"><a:defRPr sz="${size * 100}"/></a:pPr>`;
  return `<a:p>${pPr}<a:r><a:rPr lang="en-US" sz="${size * 100}" b="${bold ? 1 : 0}" i="${italic ? 1 : 0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${xml(text)}</a:t></a:r><a:endParaRPr lang="en-US" sz="${size * 100}"/></a:p>`;
};

const shape = (id, x, y, w, h, fill) => `
  <p:sp>
    <p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${toEmu(x)}" y="${toEmu(y)}"/><a:ext cx="${toEmu(w)}" cy="${toEmu(h)}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>
      <a:ln><a:noFill/></a:ln>
    </p:spPr>
    <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
  </p:sp>`;

const textBox = (id, x, y, w, h, paragraphs, options = {}) => `
  <p:sp>
    <p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${toEmu(x)}" y="${toEmu(y)}"/><a:ext cx="${toEmu(w)}" cy="${toEmu(h)}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:noFill/><a:ln><a:noFill/></a:ln>
    </p:spPr>
    <p:txBody>
      <a:bodyPr wrap="square" anchor="${options.anchor || 't'}" rtlCol="0"/>
      <a:lstStyle/>
      ${paragraphs.join('')}
    </p:txBody>
  </p:sp>`;

const slideShapes = (slide, index, theme) => {
  const idBase = index * 20 + 3;
  const title = slide.title || `Slide ${index + 1}`;
  const bullets = slide.bullets?.length ? slide.bullets : ['Key point', 'Supporting detail', 'Recommended next step'];

  if (slide.type === 'title') {
    return [
      shape(idBase, 0, 0, 13.333, 2.4, theme.accent),
      textBox(idBase + 1, 0.75, 0.55, 11.85, 1.05, [paragraph(title, { color: 'FFFFFF', size: 34, bold: true, align: 'ctr' })]),
      textBox(idBase + 2, 1.2, 3.05, 10.9, 1.0, [paragraph(slide.subtitle || 'Executive ready presentation', { color: theme.subtext, size: 20, align: 'ctr' })]),
    ].join('');
  }

  if (slide.type === 'section') {
    return [
      shape(idBase, 0, 0, 0.18, 7.5, theme.accent),
      textBox(idBase + 1, 0.75, 1.7, 11.6, 1.0, [paragraph('SECTION', { color: theme.subtext, size: 11, bold: true })]),
      textBox(idBase + 2, 0.75, 2.25, 11.4, 1.4, [paragraph(title, { color: theme.text, size: 32, bold: true })]),
      textBox(idBase + 3, 0.75, 4.15, 10.6, 0.8, [paragraph(slide.subtitle || '', { color: theme.subtext, size: 16 })]),
    ].join('');
  }

  if (slide.type === 'quote') {
    return [
      shape(idBase, 0, 0, 13.333, 0.08, theme.accent),
      textBox(idBase + 1, 1.0, 1.35, 11.3, 2.4, [paragraph(slide.quote || title, { color: theme.text, size: 24, italic: true, align: 'ctr' })]),
      textBox(idBase + 2, 1.0, 4.25, 11.3, 0.55, [paragraph(slide.attribution ? `- ${slide.attribution}` : '', { color: theme.subtext, size: 14, align: 'ctr' })]),
    ].join('');
  }

  if (slide.type === 'two-column') {
    return [
      shape(idBase, 0, 0, 13.333, 0.08, theme.accent),
      textBox(idBase + 1, 0.6, 0.45, 12.1, 0.7, [paragraph(title, { color: theme.text, size: 24, bold: true })]),
      shape(idBase + 2, 0.65, 1.45, 5.75, 4.75, theme.surface),
      shape(idBase + 3, 6.9, 1.45, 5.75, 4.75, theme.surface),
      textBox(idBase + 4, 0.9, 1.8, 5.25, 3.9, [paragraph(slide.leftContent || 'Left column content', { color: theme.subtext, size: 15 })]),
      textBox(idBase + 5, 7.15, 1.8, 5.25, 3.9, [paragraph(slide.rightContent || 'Right column content', { color: theme.subtext, size: 15 })]),
    ].join('');
  }

  return [
    shape(idBase, 0, 0, 13.333, 0.08, theme.accent),
    textBox(idBase + 1, 0.65, 0.45, 12, 0.8, [paragraph(title, { color: theme.text, size: 25, bold: true })]),
    textBox(idBase + 2, 0.9, 1.55, 11.8, 4.9, bullets.slice(0, 8).map((item) => paragraph(item, { color: theme.subtext, size: 17, bullet: true }))),
  ].join('');
};

const slideXml = (slide, index, theme) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="${theme.bg}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${slideShapes(slide, index, theme)}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

const buildPptxBlob = (deck, themeName) => {
  const normalized = normalizeDeck(deck);
  const theme = THEMES[themeName] || THEMES.professional;
  const slideOverrides = normalized.slides.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('');
  const slideIds = normalized.slides.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join('');
  const slideRels = normalized.slides.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join('');
  const entries = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>${slideOverrides}</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      name: 'docProps/core.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(normalized.title)}</dc:title><dc:creator>Admin Deck Prep</dc:creator><cp:lastModifiedBy>Admin Deck Prep</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified></cp:coreProperties>`,
    },
    {
      name: 'docProps/app.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Admin Deck Prep</Application><Slides>${normalized.slides.length}</Slides></Properties>`,
    },
    {
      name: 'ppt/presentation.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="wide"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    },
    {
      name: 'ppt/_rels/presentation.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slideRels}<Relationship Id="rId${normalized.slides.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>`,
    },
    {
      name: 'ppt/theme/theme1.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Admin Deck Prep"><a:themeElements><a:clrScheme name="Admin"><a:dk1><a:srgbClr val="111827"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="${theme.bg}"/></a:dk2><a:lt2><a:srgbClr val="${theme.text}"/></a:lt2><a:accent1><a:srgbClr val="${theme.accent}"/></a:accent1><a:accent2><a:srgbClr val="36A9E1"/></a:accent2><a:accent3><a:srgbClr val="15734F"/></a:accent3><a:accent4><a:srgbClr val="B3740C"/></a:accent4><a:accent5><a:srgbClr val="C0464E"/></a:accent5><a:accent6><a:srgbClr val="${theme.subtext}"/></a:accent6><a:hlink><a:srgbClr val="36A9E1"/></a:hlink><a:folHlink><a:srgbClr val="312783"/></a:folHlink></a:clrScheme><a:fontScheme name="Admin"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme><a:fmtScheme name="Admin"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`,
    },
  ];

  entries.push(
    {
      name: 'ppt/slideMasters/slideMaster1.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`,
    },
    {
      name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
    },
    {
      name: 'ppt/slideLayouts/slideLayout1.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
    },
    {
      name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
    },
  );

  normalized.slides.forEach((slide, index) => {
    entries.push(
      { name: `ppt/slides/slide${index + 1}.xml`, data: slideXml(slide, index, theme) },
      {
        name: `ppt/slides/_rels/slide${index + 1}.xml.rels`,
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
      },
    );
  });

  return createZip(entries);
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const safeFileName = (value) => `${String(value || 'presentation').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'presentation'}.pptx`;
const cardStyle = { background: 'var(--c-panel-subtle)', borderColor: 'var(--c-border)' };

const SlideVisual = ({ slide, themeName, active = false, onClick }) => {
  const theme = THEMES[themeName] || THEMES.professional;
  const bullets = slide?.bullets?.length ? slide.bullets : [];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-[1rem] border text-left transition-all"
      style={{
        borderColor: active ? 'var(--brand-secondary)' : 'var(--c-border)',
        background: `#${theme.bg}`,
        boxShadow: active ? 'var(--shadow-md)' : 'none',
        aspectRatio: '16 / 9',
      }}
    >
      <div className="h-full p-4" style={{ color: `#${theme.text}` }}>
        <div className="mb-3 h-1.5 w-16 rounded-full" style={{ background: `#${theme.accent}` }} />
        <p className="line-clamp-2 text-sm font-black leading-tight">{slide?.title || 'Untitled slide'}</p>
        {slide?.subtitle ? <p className="mt-1 line-clamp-1 text-xs" style={{ color: `#${theme.subtext}` }}>{slide.subtitle}</p> : null}
        <div className="mt-3 space-y-1.5">
          {bullets.slice(0, 4).map((bullet, index) => (
            <div key={`${bullet}-${index}`} className="flex gap-2 text-[11px]" style={{ color: `#${theme.subtext}` }}>
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: `#${theme.accent}` }} />
              <span className="line-clamp-1">{bullet}</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
};

const DeckPrep = () => {
  const fileRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [pptJson, setPptJson] = useState(null);
  const [fullText, setFullText] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [theme, setTheme] = useState('professional');
  const [slideCount, setSlideCount] = useState(12);
  const [audience, setAudience] = useState('business');
  const [extractPrompt, setExtractPrompt] = useState('Extract the key ideas, headings, summaries, tables, risks, metrics, and recommendations. Group the content by topic.');
  const [pptPrompt, setPptPrompt] = useState('Create an executive-ready presentation with a clear title slide, concise sections, evidence-backed bullets, and a practical closing slide.');
  const [busy, setBusy] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const deck = useMemo(() => normalizeDeck(pptJson), [pptJson]);
  const active = deck.slides[activeSlide] || deck.slides[0];

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await userApi.get('/api/documents/history');
      setHistory(data.histories || data.documents || []);
    } catch {
      toast.error('Could not load Deck Prep history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const withBusy = async (label, task) => {
    setBusy(label);
    try {
      return await task();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Deck Prep action failed');
      return null;
    } finally {
      setBusy('');
    }
  };

  const uploadDocument = async () => {
    if (!file) throw new Error('Choose a PDF first');
    const formData = new FormData();
    formData.append('files', file);
    const upload = await userApi.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const uploadedFile = upload.data.files?.[0] || upload.data.file || upload.data.uploaded?.[0];
    if (!uploadedFile?._id) throw new Error('The upload succeeded, but no file id was returned');
    const created = await userApi.post('/api/documents', { fileId: uploadedFile._id });
    const doc = created.data.document || created.data.doc;
    if (!doc?._id) throw new Error('Document conversion session could not be created');
    setDocumentId(doc._id);
    await fetchHistory();
    return doc._id;
  };

  const ensureDocument = async () => documentId || uploadDocument();

  const quickConvert = () => withBusy('Generating presentation', async () => {
    const id = await ensureDocument();
    const { data } = await userApi.post('/api/documents/quick-convert', { documentId: id, slideCount, theme, audience });
    setPptJson(data.pptJson);
    setFullText(data.fullText || '');
    setExtractedText(data.extractedText || '');
    setActiveSlide(0);
    toast.success(`${data.pptJson?.slides?.length || 0} slides generated`);
    await fetchHistory();
  });

  const rawExtract = () => withBusy('Extracting document text', async () => {
    const id = await ensureDocument();
    const { data } = await userApi.post('/api/documents/raw-extract', { documentId: id });
    setFullText(data.fullText || '');
    toast.success('Document text extracted');
    await fetchHistory();
  });

  const structureText = () => withBusy('Structuring document content', async () => {
    const id = await ensureDocument();
    const { data } = await userApi.post('/api/documents/extract', { documentId: id, prompt: extractPrompt });
    setExtractedText(data.extractedText || '');
    toast.success('Content structured');
    await fetchHistory();
  });

  const generateDeck = () => withBusy('Building slide deck', async () => {
    const id = await ensureDocument();
    const { data } = await userApi.post('/api/documents/generate-ppt', { documentId: id, prompt: pptPrompt, slideCount, theme });
    setPptJson(data.pptJson);
    setActiveSlide(0);
    toast.success(`${data.pptJson?.slides?.length || 0} slides created`);
    await fetchHistory();
  });

  const saveDeck = () => withBusy('Saving slide edits', async () => {
    if (!documentId || !pptJson) throw new Error('Load or generate a deck first');
    await userApi.post('/api/documents/save-ppt', { documentId, pptJson });
    toast.success('Deck saved');
    await fetchHistory();
  });

  const regenerateSlide = () => withBusy('Regenerating slide', async () => {
    if (!documentId || !pptJson) throw new Error('Load or generate a deck first');
    const { data } = await userApi.post('/api/documents/regenerate-slide', {
      documentId,
      slideIndex: activeSlide,
      instruction: 'Improve clarity, tighten wording, and keep the slide executive ready.',
    });
    setPptJson(data.pptJson);
    toast.success('Slide regenerated');
    await fetchHistory();
  });

  const deleteHistoryItem = () => withBusy('Deleting presentation', async () => {
    if (!deleteTarget?._id) return;
    await userApi.delete(`/api/documents/${deleteTarget._id}`);
    if (documentId === deleteTarget._id) {
      setDocumentId(null);
      setPptJson(null);
      setFullText('');
      setExtractedText('');
    }
    setDeleteTarget(null);
    toast.success('Presentation deleted');
    await fetchHistory();
  });

  const loadHistoryItem = (item) => {
    setDocumentId(item._id);
    setFullText(item.fullText || '');
    setExtractedText(item.extractedText || '');
    setPptJson(item.pptJson || null);
    setActiveSlide(0);
    toast.success('Presentation loaded');
  };

  const updateSlide = (patch) => {
    setPptJson({
      ...deck,
      slides: deck.slides.map((slide, index) => (index === activeSlide ? { ...slide, ...patch } : slide)),
    });
  };

  const updateBullet = (index, value) => {
    const bullets = [...(active?.bullets || [])];
    bullets[index] = value;
    updateSlide({ bullets });
  };

  const addSlide = () => {
    const nextSlide = { id: deck.slides.length + 1, type: 'bullets', title: 'New Slide', bullets: ['Key point', 'Supporting detail', 'Recommended action'] };
    const next = [...deck.slides.slice(0, activeSlide + 1), nextSlide, ...deck.slides.slice(activeSlide + 1)].map((slide, index) => ({ ...slide, id: index + 1 }));
    setPptJson({ ...deck, slides: next });
    setActiveSlide(activeSlide + 1);
  };

  const removeActiveSlide = () => {
    if (deck.slides.length <= 1) return toast.error('A deck needs at least one slide');
    const next = deck.slides.filter((_, index) => index !== activeSlide).map((slide, index) => ({ ...slide, id: index + 1 }));
    setPptJson({ ...deck, slides: next });
    setActiveSlide((value) => Math.max(0, Math.min(value, next.length - 1)));
  };

  const exportDeck = () => {
    downloadBlob(buildPptxBlob(deck, theme), safeFileName(deck.title));
    toast.success('PPTX downloaded');
  };

  const selectFile = (selected) => {
    const next = selected?.[0];
    if (!next) return;
    if (!next.name.toLowerCase().endsWith('.pdf')) return toast.error('Please choose a PDF file');
    setFile(next);
    setDocumentId(null);
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Deck Prep"
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={fetchHistory}><RefreshCw className="h-4 w-4" />Refresh</button>
            <button type="button" className="btn-primary" onClick={quickConvert} disabled={Boolean(busy) || (!file && !documentId)}><Sparkles className="h-4 w-4" />Quick Convert</button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current document" value={documentId ? 'Ready' : file ? 'Queued' : 'None'} icon={FileText} tone="var(--brand-primary)" helper={file?.name || 'Upload or load a PDF'} />
        <StatCard label="Slides" value={pptJson?.slides?.length || 0} icon={Presentation} tone="var(--brand-secondary)" helper="Editable deck pages" />
        <StatCard label="History" value={history.length} icon={History} tone="var(--c-success)" helper="Saved conversion sessions" />
        <StatCard label="Theme" value={THEMES[theme]?.label || 'Theme'} icon={Check} tone="var(--c-warning)" helper="Applied to preview and export" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Panel
            title="Document Intake"
            subtitle="Start from a searchable PDF, then choose quick conversion or the guided path."
            action={<StatusPill tone={documentId ? 'success' : file ? 'warning' : 'neutral'}>{documentId ? 'Document ready' : file ? 'Pending upload' : 'Awaiting PDF'}</StatusPill>}
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(event) => event.key === 'Enter' && fileRef.current?.click()}
                onDrop={(event) => {
                  event.preventDefault();
                  selectFile(event.dataTransfer.files);
                }}
                onDragOver={(event) => event.preventDefault()}
                className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border-2 border-dashed px-5 py-10 text-center transition-colors"
                style={{
                  borderColor: file ? 'var(--brand-secondary)' : 'var(--c-border)',
                  background: file ? 'var(--brand-secondary-soft)' : 'var(--c-panel-subtle)',
                }}
              >
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(event) => selectFile(event.target.files)} />
                <Upload className="h-10 w-10" style={{ color: file ? 'var(--brand-secondary)' : 'var(--c-text-faint)' }} />
                <p className="mt-4 text-base font-black" style={{ color: 'var(--c-text)' }}>{file ? file.name : 'Drop PDF here or browse'}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="slideCount">Slide count</label>
                  <input id="slideCount" type="number" min="4" max="30" value={slideCount} onChange={(event) => setSlideCount(Number(event.target.value))} className="input-base" />
                </div>
                <div>
                  <label className="label" htmlFor="audience">Audience</label>
                  <select id="audience" value={audience} onChange={(event) => setAudience(event.target.value)} className="input-base">
                    {['business', 'executive', 'technical', 'academic', 'general'].map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <p className="label">Theme</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(THEMES).map(([key, item]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTheme(key)}
                        className="rounded-[1rem] border px-3 py-3 text-left text-xs font-black transition-colors"
                        style={{
                          background: theme === key ? 'var(--brand-primary-soft)' : 'var(--c-panel)',
                          borderColor: theme === key ? 'var(--brand-primary)' : 'var(--c-border)',
                          color: 'var(--c-text)',
                        }}
                      >
                        <span className="mb-2 flex gap-1">
                          <span className="h-3 w-3 rounded-full" style={{ background: `#${item.bg}` }} />
                          <span className="h-3 w-3 rounded-full" style={{ background: `#${item.accent}` }} />
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="AI Guided Builder" subtitle="Extract, structure, and generate when the deck needs more human control.">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-[1.25rem] border p-4" style={cardStyle}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black" style={{ color: 'var(--c-text)' }}>1. Raw extraction</h3>
                      <p className="mt-1 text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>Read the full PDF text before structuring it.</p>
                    </div>
                    <button type="button" className="btn-secondary" onClick={rawExtract} disabled={Boolean(busy) || (!file && !documentId)}><FileText className="h-4 w-4" />Extract</button>
                  </div>
                  <textarea value={fullText} onChange={(event) => setFullText(event.target.value)} rows={7} className="input-base mt-4 resize-y font-mono text-xs" placeholder="Extracted PDF text appears here." />
                </div>

                <div className="rounded-[1.25rem] border p-4" style={cardStyle}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black" style={{ color: 'var(--c-text)' }}>2. Structure content</h3>
                      <p className="mt-1 text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>Shape the document into presentation-ready sections.</p>
                    </div>
                    <button type="button" className="btn-secondary" onClick={structureText} disabled={Boolean(busy) || (!file && !documentId)}><Wand2 className="h-4 w-4" />Structure</button>
                  </div>
                  <textarea value={extractPrompt} onChange={(event) => setExtractPrompt(event.target.value)} rows={4} className="input-base mt-4 resize-y text-sm" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.25rem] border p-4" style={cardStyle}>
                  <h3 className="font-black" style={{ color: 'var(--c-text)' }}>Structured notes</h3>
                  <textarea value={extractedText} onChange={(event) => setExtractedText(event.target.value)} rows={9} className="input-base mt-4 resize-y text-sm" placeholder="AI structured notes appear here." />
                </div>
                <div className="rounded-[1.25rem] border p-4" style={cardStyle}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black" style={{ color: 'var(--c-text)' }}>3. Generate slides</h3>
                      <p className="mt-1 text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>Create an editable deck from the structured content.</p>
                    </div>
                    <button type="button" className="btn-primary" onClick={generateDeck} disabled={Boolean(busy) || (!file && !documentId)}><Sparkles className="h-4 w-4" />Generate</button>
                  </div>
                  <textarea value={pptPrompt} onChange={(event) => setPptPrompt(event.target.value)} rows={4} className="input-base mt-4 resize-y text-sm" />
                </div>
              </div>
            </div>
          </Panel>

          {pptJson ? (
            <Panel
              title="Deck Workspace"
              subtitle={`${deck.slides.length} editable slides. Save updates back to history or export a PPTX file.`}
              action={
                <>
                  <button type="button" className="btn-secondary" onClick={saveDeck} disabled={Boolean(busy)}><Check className="h-4 w-4" />Save</button>
                  <button type="button" className="btn-primary" onClick={exportDeck}><Download className="h-4 w-4" />Export PPTX</button>
                </>
              }
            >
              <div className="grid gap-5 xl:grid-cols-[13rem_minmax(0,1fr)_22rem]">
                <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                  {deck.slides.map((slide, index) => (
                    <div key={`${slide.id}-${index}`} className="space-y-1.5">
                      <p className="text-xs font-black" style={{ color: 'var(--c-text-muted)' }}>Slide {index + 1}</p>
                      <SlideVisual slide={slide} themeName={theme} active={index === activeSlide} onClick={() => setActiveSlide(index)} />
                    </div>
                  ))}
                </div>

                <div>
                  <SlideVisual slide={active} themeName={theme} active />
                  {active?.note ? <div className="mt-4 rounded-[1rem] border px-4 py-3 text-sm" style={cardStyle}><span className="font-black">Speaker note:</span> {active.note}</div> : null}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label" htmlFor="slideType">Slide type</label>
                    <select id="slideType" value={active?.type || 'bullets'} onChange={(event) => updateSlide({ type: event.target.value })} className="input-base">
                      {['title', 'section', 'bullets', 'two-column', 'quote', 'closing'].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="slideTitle">Title</label>
                    <input id="slideTitle" value={active?.title || ''} onChange={(event) => updateSlide({ title: event.target.value })} className="input-base" />
                  </div>
                  <div>
                    <label className="label" htmlFor="slideSubtitle">Subtitle</label>
                    <input id="slideSubtitle" value={active?.subtitle || ''} onChange={(event) => updateSlide({ subtitle: event.target.value })} className="input-base" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="label mb-0">Bullets</p>
                      <button type="button" className="btn-ghost min-h-0 px-2 py-1 text-xs" onClick={() => updateSlide({ bullets: [...(active?.bullets || []), 'New point'] })}><Plus className="h-3.5 w-3.5" />Add</button>
                    </div>
                    <div className="space-y-2">
                      {(active?.bullets || []).map((bullet, index) => (
                        <div key={`${index}-${activeSlide}`} className="flex gap-2">
                          <input value={bullet} onChange={(event) => updateBullet(index, event.target.value)} className="input-base min-h-10 py-2 text-sm" />
                          <button type="button" className="btn-ghost h-10 w-10 p-0" onClick={() => updateSlide({ bullets: active.bullets.filter((_, itemIndex) => itemIndex !== index) })}><X className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="btn-secondary" onClick={addSlide}><Plus className="h-4 w-4" />Add Slide</button>
                    <button type="button" className="btn-danger" onClick={removeActiveSlide}><Trash2 className="h-4 w-4" />Delete</button>
                  </div>
                  <button type="button" className="btn-secondary w-full" onClick={regenerateSlide} disabled={Boolean(busy)}><Wand2 className="h-4 w-4" />Regenerate Active Slide</button>
                </div>
              </div>
            </Panel>
          ) : (
            <EmptyState
              icon={Presentation}
              title="No deck generated yet"
              description="Use Quick Convert or the guided builder to create an editable presentation."
              action={<button type="button" className="btn-primary" onClick={quickConvert} disabled={Boolean(busy) || (!file && !documentId)}><Sparkles className="h-4 w-4" />Quick Convert</button>}
            />
          )}
        </div>

        <Panel title="Presentation History" bodyClassName="space-y-3">
          {historyLoading ? (
            <LoadingScreen height="12rem" />
          ) : history.length === 0 ? (
            <div className="rounded-[1.2rem] border px-4 py-8 text-center" style={cardStyle}>
              <History className="mx-auto h-8 w-8" style={{ color: 'var(--c-text-faint)' }} />
              <p className="mt-3 text-sm font-black" style={{ color: 'var(--c-text)' }}>No history yet</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item._id} className="rounded-[1.2rem] border p-4" style={cardStyle}>
                <button type="button" className="w-full text-left" onClick={() => loadHistoryItem(item)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{item.pptJson?.title || item.originalFileId?.fileName || 'Untitled presentation'}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                        {item.pptJson?.slides?.length || 0} slides{item.createdAt ? `, ${new Date(item.createdAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <Presentation className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                </button>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn-secondary min-h-0 flex-1 px-3 py-2 text-xs" onClick={() => loadHistoryItem(item)}>Load</button>
                  <button type="button" className="btn-danger min-h-0 px-3 py-2 text-xs" onClick={() => setDeleteTarget(item)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>

      <Modal open={Boolean(busy)} title="Deck Prep is working" subtitle={busy} onClose={() => {}} width="max-w-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--brand-primary)' }} />
          <p className="text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>This can take a moment while the document service processes the request.</p>
        </div>
      </Modal>

      <Modal open={Boolean(deleteTarget)} title="Delete presentation?" subtitle="This removes the saved Deck Prep session from history." onClose={() => setDeleteTarget(null)} width="max-w-md">
        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button type="button" className="btn-danger flex-1" onClick={deleteHistoryItem}>Delete</button>
        </div>
      </Modal>
    </div>
  );
};

export default DeckPrep;
