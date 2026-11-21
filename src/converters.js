// Advanced File Conversion Engine for PDFCraft Studio
// Supports PDF to Word (.docx), PDF to Excel (.xlsx), PDF to PowerPoint (.pptx),
// PDF to HTML/SVG, Word to PDF, Excel to PDF, Markdown to PDF, Code to PDF, HTML to PDF.

import { fileToArrayBuffer } from './pdf-engine.js';

function getPDFLib() {
  if (typeof window !== 'undefined' && window.PDFLib) return window.PDFLib;
  throw new Error('PDF-Lib is not loaded');
}

function getPDFJS() {
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
    }
    return window.pdfjsLib;
  }
  throw new Error('PDF.js is not loaded');
}

function getJSZip() {
  if (typeof window !== 'undefined' && window.JSZip) return window.JSZip;
  throw new Error('JSZip is not loaded');
}

function getXLSX() {
  if (typeof window !== 'undefined' && window.XLSX) return window.XLSX;
  throw new Error('SheetJS (XLSX) is not loaded');
}

function getMammoth() {
  if (typeof window !== 'undefined' && window.mammoth) return window.mammoth;
  throw new Error('Mammoth.js is not loaded');
}

function getMarked() {
  if (typeof window !== 'undefined' && window.marked) return window.marked;
  throw new Error('Marked.js is not loaded');
}

// 1. PDF TO WORD (.DOCX)
export async function convertPdfToDocx(file, onProgress) {
  const pdfjs = getPDFJS();
  const JSZip = getJSZip();
  const buffer = await fileToArrayBuffer(file);
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const numPages = doc.numPages;

  let documentXmlContent = '';

  for (let p = 1; p <= numPages; p++) {
    if (onProgress) onProgress(Math.round((p / numPages) * 80));
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();

    // Group text items by line (using Y-coordinate with tolerance)
    const lines = [];
    let currentY = null;
    let currentLine = [];

    textContent.items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      if (currentY === null || Math.abs(currentY - y) > 6) {
        if (currentLine.length > 0) lines.push(currentLine.join(' '));
        currentLine = [item.str];
        currentY = y;
      } else {
        currentLine.push(item.str);
      }
    });
    if (currentLine.length > 0) lines.push(currentLine.join(' '));

    // Page header break
    if (p > 1) {
      documentXmlContent += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    }

    // Convert lines into Word paragraphs
    lines.forEach((line) => {
      const cleanLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (!cleanLine.trim()) return;

      const isHeading = cleanLine.length < 60 && (cleanLine === cleanLine.toUpperCase() || cleanLine.startsWith('Chapter') || cleanLine.startsWith('Section'));
      if (isHeading) {
        documentXmlContent += `
          <w:p>
            <w:pPr>
              <w:pStyle w:val="Heading1"/>
              <w:spacing w:before="240" w:after="120"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="32"/>
                <w:color w:val="1E293B"/>
              </w:rPr>
              <w:t>${cleanLine}</w:t>
            </w:r>
          </w:p>`;
      } else {
        documentXmlContent += `
          <w:p>
            <w:pPr>
              <w:spacing w:after="140" w:line="276" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="24"/>
                <w:color w:val="334155"/>
              </w:rPr>
              <w:t xml:space="preserve">${cleanLine}</w:t>
            </w:r>
          </w:p>`;
      }
    });
  }

  if (onProgress) onProgress(85);

  // Package into standard OpenXML DOCX archive
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  // _rels/.rels
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // word/_rels/document.xml.rels
  zip.folder('word').folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  // word/styles.xml
  zip.folder('word').file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

  // word/document.xml
  zip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${documentXmlContent}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  if (onProgress) onProgress(95);
  const docxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  if (onProgress) onProgress(100);
  return {
    blob: docxBlob,
    filename: `${file.name.replace(/\.pdf$/i, '')}.docx`
  };
}

// 1.1 EXPORT PLAIN / FORMATTED TEXT TO REAL WORD (.DOCX)
export async function exportTextToDocx(title, content) {
  const JSZip = getJSZip();
  const zip = new JSZip();

  let documentXmlContent = '';

  if (title) {
    const cleanTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    documentXmlContent += `
      <w:p>
        <w:pPr>
          <w:pStyle w:val="Heading1"/>
          <w:spacing w:before="240" w:after="160"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="36"/>
            <w:color w:val="0F172A"/>
          </w:rPr>
          <w:t>${cleanTitle}</w:t>
        </w:r>
      </w:p>`;
  }

  const paragraphs = content.split('\n');
  paragraphs.forEach((para) => {
    const clean = para.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (!clean.trim()) {
      documentXmlContent += `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
      return;
    }
    documentXmlContent += `
      <w:p>
        <w:pPr>
          <w:spacing w:after="160" w:line="280" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:sz w:val="24"/>
            <w:color w:val="334155"/>
          </w:rPr>
          <w:t>${clean}</w:t>
        </w:r>
      </w:p>`;
  });

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.folder('word').folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.folder('word').file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

  zip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${documentXmlContent}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  const docxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  return docxBlob;
}

// 2. PDF TO EXCEL (.XLSX)
export async function convertPdfToExcel(file, onProgress) {
  const pdfjs = getPDFJS();
  const XLSX = getXLSX();
  const buffer = await fileToArrayBuffer(file);
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const numPages = doc.numPages;

  const wb = XLSX.utils.book_new();

  for (let p = 1; p <= numPages; p++) {
    if (onProgress) onProgress(Math.round((p / numPages) * 85));
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();

    // Group by lines and detect columns based on X position
    const rowMap = new Map();

    textContent.items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);
      const text = item.str.trim();
      if (!text) return;

      // Find closest row key within 6px
      let matchedY = null;
      for (const existingY of rowMap.keys()) {
        if (Math.abs(existingY - y) <= 6) {
          matchedY = existingY;
          break;
        }
      }

      if (matchedY === null) {
        matchedY = y;
        rowMap.set(matchedY, []);
      }

      rowMap.get(matchedY).push({ x, text });
    });

    // Sort rows top-to-bottom (PDF Y starts from bottom, so higher Y is higher on page)
    const sortedY = Array.from(rowMap.keys()).sort((a, b) => b - a);

    const sheetRows = [];
    sortedY.forEach((y) => {
      const items = rowMap.get(y).sort((a, b) => a.x - b.x);
      const rowData = items.map((i) => {
        // Attempt number conversion if numeric
        const num = Number(i.text.replace(/,/g, ''));
        return !isNaN(num) && i.text.length < 15 && i.text !== '' ? num : i.text;
      });
      sheetRows.push(rowData);
    });

    if (sheetRows.length === 0) sheetRows.push(['No table data found on page']);

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(wb, ws, `Page ${p}`);
  }

  if (onProgress) onProgress(95);
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  if (onProgress) onProgress(100);
  return {
    blob,
    filename: `${file.name.replace(/\.pdf$/i, '')}.xlsx`
  };
}

// 3. PDF TO POWERPOINT (.PPTX)
export async function convertPdfToPptx(file, onProgress) {
  const pdfjs = getPDFJS();
  const JSZip = getJSZip();
  const buffer = await fileToArrayBuffer(file);
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const numPages = doc.numPages;

  const zip = new JSZip();
  const slideRelsFolder = zip.folder('ppt').folder('slides').folder('_rels');
  const slidesFolder = zip.folder('ppt').folder('slides');
  const mediaFolder = zip.folder('ppt').folder('media');

  let slideParts = '';
  let presentationRels = '';

  for (let p = 1; p <= numPages; p++) {
    if (onProgress) onProgress(Math.round((p / numPages) * 75));
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64Data = imgDataUrl.split(',')[1];
    const imgFilename = `image${p}.jpeg`;
    mediaFolder.file(imgFilename, base64Data, { base64: true });

    // Slide XML
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${p + 1}" name="Slide Page ${p}"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="6858000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`;

    slidesFolder.file(`slide${p}.xml`, slideXml);

    // Slide rels
    slideRelsFolder.file(`slide${p}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imgFilename}"/>
</Relationships>`);

    slideParts += `<p:sldId id="${255 + p}" r:id="rId${p + 1}"/>`;
    presentationRels += `<Relationship Id="rId${p + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${p}.xml"/>`;
  }

  // PPTX Core Packages
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${Array.from({ length: numPages }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}
</Types>`);

  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  zip.folder('ppt').folder('_rels').file('presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${presentationRels}
</Relationships>`);

  zip.folder('ppt').file('presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst/>
  <p:sldIdLst>
    ${slideParts}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
</p:presentation>`);

  if (onProgress) onProgress(95);
  const pptxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  });

  if (onProgress) onProgress(100);
  return {
    blob: pptxBlob,
    filename: `${file.name.replace(/\.pdf$/i, '')}.pptx`
  };
}

// 4. PDF TO HTML (.HTML)
export async function convertPdfToHtml(file, onProgress) {
  const pdfjs = getPDFJS();
  const buffer = await fileToArrayBuffer(file);
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const numPages = doc.numPages;

  let htmlBody = '';

  for (let p = 1; p <= numPages; p++) {
    if (onProgress) onProgress(Math.round((p / numPages) * 90));
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((i) => i.str).filter(Boolean);

    htmlBody += `
      <section class="pdf-page" id="page-${p}">
        <div class="page-number">Page ${p} of ${numPages}</div>
        <div class="page-content">
          ${strings.map((str) => `<p>${str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('')}
        </div>
      </section>
    `;
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${file.name} — Converted HTML</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f1f5f9; color: #1e293b; padding: 2rem 1rem; line-height: 1.6; }
    .pdf-page { max-width: 820px; margin: 0 auto 2rem auto; background: #ffffff; padding: 3rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .page-number { font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
    p { margin-bottom: 0.75rem; font-size: 1.05rem; }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  if (onProgress) onProgress(100);
  return {
    blob,
    filename: `${file.name.replace(/\.pdf$/i, '')}.html`
  };
}

// 5. WORD TO PDF (.DOCX TO .PDF)
export async function convertWordToPdf(file, onProgress) {
  const mammoth = getMammoth();
  const { PDFDocument, StandardFonts, rgb } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);

  if (onProgress) onProgress(30);

  // Parse docx to raw text and paragraphs
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const rawText = result.value;
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  if (onProgress) onProgress(60);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 18;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  for (const line of lines) {
    const isHeading = line.length < 60 && (line === line.toUpperCase() || line.startsWith('Chapter') || line.startsWith('#'));
    const activeFont = isHeading ? boldFont : font;
    const fontSize = isHeading ? 14 : 10.5;

    // Word wrap line to fit maxWidth
    const words = line.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = activeFont.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        if (currentY - lineHeight < margin) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }

        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: activeFont,
          color: isHeading ? rgb(0.1, 0.1, 0.2) : rgb(0.2, 0.2, 0.2)
        });

        currentY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (currentY - lineHeight < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }

      currentPage.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font: activeFont,
        color: isHeading ? rgb(0.1, 0.1, 0.2) : rgb(0.2, 0.2, 0.2)
      });

      currentY -= lineHeight * (isHeading ? 1.6 : 1.25);
    }
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: `${file.name.replace(/\.docx?$/i, '')}.pdf`
  };
}

// 6. EXCEL / CSV TO PDF (.XLSX / .CSV TO .PDF)
export async function convertExcelToPdf(file, onProgress) {
  const XLSX = getXLSX();
  const { PDFDocument, StandardFonts, rgb } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);

  if (onProgress) onProgress(25);
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (!data || data.length === 0) {
    throw new Error('Spreadsheet has no readable data.');
  }

  if (onProgress) onProgress(50);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Landscape A4 for wide table presentation
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;
  const rowHeight = 22;

  // Determine max columns
  const maxCols = Math.min(10, Math.max(...data.map((r) => r.length)));
  const colWidth = usableWidth / maxCols;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin - 30;

  // Title
  page.drawText(`${file.name} — ${firstSheetName}`, {
    x: margin,
    y: pageHeight - margin,
    size: 14,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.4)
  });

  const totalRows = data.length;
  for (let r = 0; r < totalRows; r++) {
    if (onProgress) onProgress(50 + Math.round((r / totalRows) * 45));
    const row = data[r];
    const isHeader = r === 0;

    if (y - rowHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    // Row Background (Alternating zebra stripes)
    page.drawRectangle({
      x: margin,
      y: y - 4,
      width: usableWidth,
      height: rowHeight,
      color: isHeader ? rgb(0.9, 0.93, 0.98) : r % 2 === 0 ? rgb(0.98, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    for (let c = 0; c < maxCols; c++) {
      const cellValue = String(row[c] !== undefined ? row[c] : '').substring(0, 22);
      if (!cellValue) continue;

      page.drawText(cellValue, {
        x: margin + c * colWidth + 6,
        y: y + 2,
        size: isHeader ? 9.5 : 8.5,
        font: isHeader ? boldFont : font,
        color: isHeader ? rgb(0.1, 0.2, 0.4) : rgb(0.2, 0.2, 0.2)
      });
    }

    y -= rowHeight;
  }

  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: `${file.name.replace(/\.(xlsx|xls|csv)$/i, '')}.pdf`
  };
}

// 7. MARKDOWN TO PDF (.MD TO .PDF)
export async function convertMarkdownToPdf(file, onProgress) {
  const { PDFDocument, StandardFonts, rgb } = getPDFLib();
  const text = await file.text();
  const lines = text.split('\n');

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 16;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    if (rawLine.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (y - lineHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    if (inCodeBlock) {
      // Render code block line
      page.drawRectangle({
        x: margin - 6,
        y: y - 2,
        width: maxWidth + 12,
        height: lineHeight,
        color: rgb(0.95, 0.96, 0.98)
      });

      page.drawText(rawLine.substring(0, 75), {
        x: margin,
        y,
        size: 9,
        font: monoFont,
        color: rgb(0.2, 0.2, 0.3)
      });
      y -= lineHeight;
      continue;
    }

    // Markdown Headings
    if (rawLine.startsWith('# ')) {
      const heading = rawLine.replace('# ', '').trim();
      y -= 10;
      page.drawText(heading, { x: margin, y, size: 18, font: boldFont, color: rgb(0.1, 0.1, 0.25) });
      y -= lineHeight * 1.8;
      continue;
    } else if (rawLine.startsWith('## ')) {
      const heading = rawLine.replace('## ', '').trim();
      y -= 8;
      page.drawText(heading, { x: margin, y, size: 14, font: boldFont, color: rgb(0.15, 0.2, 0.3) });
      y -= lineHeight * 1.5;
      continue;
    }

    // Normal text line
    const cleanLine = rawLine.replace(/[*_`]/g, '');
    if (!cleanLine.trim()) {
      y -= lineHeight * 0.75;
      continue;
    }

    page.drawText(cleanLine.substring(0, 85), {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2)
    });
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: `${file.name.replace(/\.md$/i, '')}.pdf`
  };
}

// 8. CODE TO PDF (.JS, .PY, .JAVA, .CPP, .HTML, .CSS TO .PDF)
export async function convertCodeToPdf(file, onProgress) {
  const { PDFDocument, StandardFonts, rgb } = getPDFLib();
  const text = await file.text();
  const lines = text.split('\n');

  const pdfDoc = await PDFDocument.create();
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);
  const boldMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const lineHeight = 13;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin - 20;

  // Header banner
  page.drawRectangle({
    x: margin,
    y: pageHeight - margin - 15,
    width: pageWidth - margin * 2,
    height: 22,
    color: rgb(0.12, 0.16, 0.23)
  });

  page.drawText(`File: ${file.name} (${lines.length} lines)`, {
    x: margin + 8,
    y: pageHeight - margin - 9,
    size: 10,
    font: boldMono,
    color: rgb(0.9, 0.95, 1.0)
  });

  for (let i = 0; i < lines.length; i++) {
    if (y - lineHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    const lineNum = String(i + 1).padStart(4, ' ');
    const codeLine = lines[i].replace(/\t/g, '    ').substring(0, 75);

    // Line number in muted gray
    page.drawText(lineNum, {
      x: margin,
      y,
      size: 8.5,
      font: monoFont,
      color: rgb(0.6, 0.65, 0.7)
    });

    // Code text
    page.drawText(codeLine, {
      x: margin + 35,
      y,
      size: 8.5,
      font: monoFont,
      color: rgb(0.15, 0.15, 0.2)
    });

    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: `${file.name}.pdf`
  };
}
