// PDF Processing Engine using PDF-Lib, PDF.js, and JSZip
import * as PDFEncryptor from '../vendor/pdf-lib-encrypt.js';

// Helper to access PDFLib globally
function getPDFLib() {
  if (typeof window !== 'undefined' && window.PDFLib) {
    return window.PDFLib;
  }
  throw new Error('PDFLib is not loaded. Please verify vendor scripts or internet connection.');
}

// Helper to access PDF.js globally
function getPDFJS() {
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
    }
    return window.pdfjsLib;
  }
  throw new Error('PDF.js is not loaded.');
}

// Helper to access JSZip globally
function getJSZip() {
  if (typeof window !== 'undefined' && window.JSZip) {
    return window.JSZip;
  }
  throw new Error('JSZip is not loaded.');
}

// Convert File / Blob to ArrayBuffer
export async function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Convert DataURL to Uint8Array
export function dataURLtoUint8Array(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return u8arr;
}

// Format bytes into human readable format
export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// 1. MERGE PDFs (With blank page insertion and custom options)
export async function mergePDFs(files, options = {}, onProgress) {
  const { PDFDocument } = getPDFLib();
  const mergedPdf = await PDFDocument.create();

  const { addBlankPage = false } = typeof options === 'object' && options !== null ? options : {};

  const totalFiles = files.length;
  for (let i = 0; i < totalFiles; i++) {
    if (onProgress) onProgress((i / totalFiles) * 80);
    const buffer = await fileToArrayBuffer(files[i]);
    const donorPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));

    // Optional blank page between documents for double-sided printing
    if (addBlankPage && i < totalFiles - 1) {
      const lastPage = copiedPages[copiedPages.length - 1];
      const { width, height } = lastPage.getSize();
      mergedPdf.addPage([width, height]);
    }
  }

  if (onProgress) onProgress(90);
  const pdfBytes = await mergedPdf.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 2. SPLIT PDF (With Range, Every Page, Fixed Chunks, and Even/Odd split modes)
export async function splitPDF(file, mode, rangeStr, options = {}, onProgress) {
  const { PDFDocument } = getPDFLib();
  const JSZip = getJSZip();
  const buffer = await fileToArrayBuffer(file);
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  if (mode === 'all') {
    // Extract every page as separate PDF
    const zip = new JSZip();
    for (let i = 0; i < totalPages; i++) {
      if (onProgress) onProgress(Math.round(((i + 1) / totalPages) * 90));
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(sourcePdf, [i]);
      singleDoc.addPage(copiedPage);
      const pdfBytes = await singleDoc.save();
      zip.file(`page_${String(i + 1).padStart(3, '0')}.pdf`, pdfBytes);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    if (onProgress) onProgress(100);
    return { blob: zipBlob, filename: 'all_pages_extracted.zip', isZip: true };
  } else if (mode === 'even-odd') {
    // Split into Odd and Even documents
    const oddDoc = await PDFDocument.create();
    const evenDoc = await PDFDocument.create();

    const oddIndices = [];
    const evenIndices = [];

    for (let i = 0; i < totalPages; i++) {
      if (i % 2 === 0) oddIndices.push(i); // Page 1, 3, 5... (0-indexed)
      else evenIndices.push(i); // Page 2, 4, 6...
    }

    if (oddIndices.length > 0) {
      const copiedOdds = await oddDoc.copyPages(sourcePdf, oddIndices);
      copiedOdds.forEach((p) => oddDoc.addPage(p));
    }
    if (evenIndices.length > 0) {
      const copiedEvens = await evenDoc.copyPages(sourcePdf, evenIndices);
      copiedEvens.forEach((p) => evenDoc.addPage(p));
    }

    const zip = new JSZip();
    zip.file('odd_pages.pdf', await oddDoc.save());
    if (evenIndices.length > 0) {
      zip.file('even_pages.pdf', await evenDoc.save());
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    if (onProgress) onProgress(100);
    return { blob: zipBlob, filename: 'even_odd_pages.zip', isZip: true };
  } else if (mode === 'fixed') {
    // Split by fixed chunk size (e.g. 2 pages per document)
    const chunkSize = Math.max(1, parseInt(rangeStr, 10) || 2);
    const zip = new JSZip();
    let partNum = 1;

    for (let i = 0; i < totalPages; i += chunkSize) {
      if (onProgress) onProgress(Math.round(((i + 1) / totalPages) * 90));
      const chunkDoc = await PDFDocument.create();
      const indices = [];
      for (let j = i; j < Math.min(i + chunkSize, totalPages); j++) {
        indices.push(j);
      }
      const copied = await chunkDoc.copyPages(sourcePdf, indices);
      copied.forEach((p) => chunkDoc.addPage(p));
      const bytes = await chunkDoc.save();
      zip.file(`part_${partNum}_pages_${i + 1}-${Math.min(i + chunkSize, totalPages)}.pdf`, bytes);
      partNum++;
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    if (onProgress) onProgress(100);
    return { blob: zipBlob, filename: 'split_chunks.zip', isZip: true };
  } else {
    // Custom Page Range
    const pageIndices = parsePageRanges(rangeStr, totalPages);
    if (pageIndices.length === 0) {
      throw new Error(`Invalid page range. Please select pages between 1 and ${totalPages}`);
    }

    const subDoc = await PDFDocument.create();
    const copiedPages = await subDoc.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach((page) => subDoc.addPage(page));

    if (onProgress) onProgress(90);
    const pdfBytes = await subDoc.save();
    if (onProgress) onProgress(100);
    return {
      blob: new Blob([pdfBytes], { type: 'application/pdf' }),
      filename: `split_pages_${rangeStr.replace(/[^0-9-]/g, '_')}.pdf`,
      isZip: false
    };
  }
}

// Helper to parse page range strings
function parsePageRanges(rangeStr, maxPages) {
  const indices = new Set();
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => parseInt(s.trim(), 10));
      const start = Math.max(1, startStr || 1);
      const end = Math.min(maxPages, endStr || maxPages);
      for (let p = start; p <= end; p++) {
        indices.add(p - 1);
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        indices.add(p - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

// 3. COMPRESS PDF (With Grayscale toggle, custom quality and downscaling)
export async function compressPDF(file, level, options = {}, onProgress) {
  const { PDFDocument } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const { grayscale = false } = typeof options === 'object' && options !== null ? options : {};

  if (onProgress) onProgress(25);

  const totalPages = pdfDoc.getPageCount();
  const pdfjs = getPDFJS();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const pdfJsDoc = await loadingTask.promise;

  let quality = 0.75;
  let scale = 1.3;

  if (level === 'extreme') {
    quality = 0.40;
    scale = 0.95;
  } else if (level === 'recommended') {
    quality = 0.68;
    scale = 1.25;
  } else {
    quality = 0.88;
    scale = 1.5;
  }

  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= totalPages; i++) {
    if (onProgress) onProgress(25 + Math.round((i / totalPages) * 60));
    const page = await pdfJsDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (grayscale) {
      ctx.filter = 'grayscale(100%)';
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgDataUrl = canvas.toDataURL('image/jpeg', quality);
    const imgBytes = dataURLtoUint8Array(imgDataUrl);
    const embeddedImg = await newDoc.embedJpg(imgBytes);

    const origPage = pdfDoc.getPage(i - 1);
    const { width, height } = origPage.getSize();

    const newPage = newDoc.addPage([width, height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width,
      height
    });
  }

  if (onProgress) onProgress(92);
  const bytes = await newDoc.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([bytes], { type: 'application/pdf' });
}

// 4. PDF TO IMAGES (Ultra-HD 300 DPI Studio Master Quality)
export async function pdfToImages(file, format = 'png', scale = 3.5, onProgress) {
  const pdfjs = getPDFJS();
  const buffer = await fileToArrayBuffer(file);
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  const images = [];
  const JSZip = getJSZip();
  const zip = new JSZip();

  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpg' ? 'jpg' : 'png';

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(Math.round((i / numPages) * 85));
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    // Fill white background for JPG
    if (format === 'jpg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL(mimeType, format === 'jpg' ? 0.98 : 1.0);
    const uint8 = dataURLtoUint8Array(dataUrl);

    const fileName = `page_${String(i).padStart(3, '0')}.${ext}`;
    zip.file(fileName, uint8);

    images.push({
      pageNum: i,
      dataUrl,
      fileName,
      width: viewport.width,
      height: viewport.height
    });
  }

  if (onProgress) onProgress(95);
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  if (onProgress) onProgress(100);

  return { images, zipBlob, totalPages: numPages };
}

// 5. IMAGES TO PDF
export async function imagesToPDF(imageFiles, options = {}, onProgress) {
  const { PDFDocument } = getPDFLib();
  const pdfDoc = await PDFDocument.create();

  const {
    orientation = 'auto', // 'portrait', 'landscape', 'auto'
    pageSize = 'a4', // 'a4', 'letter', 'fit'
    margin = 20 // 0, 10, 20
  } = options;

  // Standard sizes in points (72 points = 1 inch)
  const SIZES = {
    a4: { w: 595.28, h: 841.89 },
    letter: { w: 612.0, h: 792.0 }
  };

  const total = imageFiles.length;
  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(Math.round(((i + 1) / total) * 85));
    const file = imageFiles[i];
    const buffer = await fileToArrayBuffer(file);

    let embeddedImg;
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

    try {
      if (isPng) {
        embeddedImg = await pdfDoc.embedPng(buffer);
      } else {
        embeddedImg = await pdfDoc.embedJpg(buffer);
      }
    } catch {
      // Fallback: draw image to canvas then embed as PNG
      const dataUrl = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(file);
      });
      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.src = dataUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const pngData = canvas.toDataURL('image/png');
      embeddedImg = await pdfDoc.embedPng(dataURLtoUint8Array(pngData));
    }

    const imgWidth = embeddedImg.width;
    const imgHeight = embeddedImg.height;

    let targetPageW, targetPageH;

    if (pageSize === 'fit') {
      targetPageW = imgWidth + margin * 2;
      targetPageH = imgHeight + margin * 2;
    } else {
      const base = SIZES[pageSize] || SIZES.a4;
      let isLand = false;
      if (orientation === 'landscape') isLand = true;
      else if (orientation === 'portrait') isLand = false;
      else isLand = imgWidth > imgHeight; // auto

      targetPageW = isLand ? base.h : base.w;
      targetPageH = isLand ? base.w : base.h;
    }

    const page = pdfDoc.addPage([targetPageW, targetPageH]);

    const availW = targetPageW - margin * 2;
    const availH = targetPageH - margin * 2;

    const scale = Math.min(availW / imgWidth, availH / imgHeight, 1.0);
    const drawW = imgWidth * scale;
    const drawH = imgHeight * scale;

    const drawX = margin + (availW - drawW) / 2;
    const drawY = margin + (availH - drawH) / 2;

    page.drawImage(embeddedImg, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH
    });
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 6. ROTATE PDF (With target selection: all, odd only, even only, portrait only, landscape only)
export async function rotatePDF(file, rotationAngle = 90, options = {}, onProgress) {
  const { target = 'all' } = typeof options === 'object' && options !== null ? options : {};
  const { PDFDocument, degrees } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const pages = pdfDoc.getPages();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const isLandscape = width > height;

    if (target === 'odd' && i % 2 !== 0) continue; // page 1, 3, 5... (0-indexed)
    if (target === 'even' && i % 2 === 0) continue; // page 2, 4, 6...
    if (target === 'portrait' && isLandscape) continue;
    if (target === 'landscape' && !isLandscape) continue;

    if (onProgress) onProgress(Math.round(((i + 1) / total) * 85));
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + rotationAngle) % 360));
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 7. ORGANIZE PDF (Reorder, Rotate, Delete pages)
export async function organizePDF(file, pageConfigs, onProgress) {
  // pageConfigs = array of { origIndex: number, rotation: number }
  const { PDFDocument, degrees } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const newDoc = await PDFDocument.create();
  const total = pageConfigs.length;

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(Math.round(((i + 1) / total) * 85));
    const cfg = pageConfigs[i];
    const [copiedPage] = await newDoc.copyPages(sourceDoc, [cfg.origIndex]);

    if (cfg.rotation) {
      const curAngle = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((curAngle + cfg.rotation) % 360));
    }

    newDoc.addPage(copiedPage);
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await newDoc.save();
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 8. WATERMARK PDF (Supports Text & Image/Logo Watermarks, opacity, angle, 9-positions, target pages)
export async function watermarkPDF(file, options = {}, onProgress) {
  const { PDFDocument, rgb, degrees, StandardFonts } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const {
    type = 'text', // 'text' or 'image'
    text = 'CONFIDENTIAL',
    fontSize = 48,
    color = '#ff0000',
    opacity = 0.25,
    rotation = 45,
    position = 'center',
    targetPages = 'all',
    imageDataUrl = null,
    imageScale = 0.5
  } = options;

  let embeddedImg = null;
  if (type === 'image' && imageDataUrl) {
    const imgBytes = dataURLtoUint8Array(imageDataUrl);
    if (imageDataUrl.includes('image/png')) {
      embeddedImg = await pdfDoc.embedPng(imgBytes);
    } else {
      embeddedImg = await pdfDoc.embedJpg(imgBytes);
    }
  }

  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.8;
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.1;
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.1;

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const humanPageNum = i + 1;
    if (targetPages === 'first' && i !== 0) continue;
    if (targetPages === 'exclude-first' && i === 0) continue;
    if (targetPages === 'odd' && humanPageNum % 2 === 0) continue;
    if (targetPages === 'even' && humanPageNum % 2 !== 0) continue;

    if (onProgress) onProgress(Math.round(((i + 1) / total) * 85));
    const page = pages[i];
    const { width, height } = page.getSize();

    if (type === 'image' && embeddedImg) {
      const origW = embeddedImg.width;
      const origH = embeddedImg.height;
      const drawW = Math.min(width * 0.8, origW * imageScale);
      const drawH = (origH / origW) * drawW;

      let x = (width - drawW) / 2;
      let y = (height - drawH) / 2;

      if (position.includes('top')) y = height - drawH - 40;
      if (position.includes('bottom')) y = 40;
      if (position.includes('left')) x = 40;
      if (position.includes('right')) x = width - drawW - 40;

      page.drawImage(embeddedImg, {
        x,
        y,
        width: drawW,
        height: drawH,
        opacity: Math.max(0.05, Math.min(1.0, opacity)),
        rotate: degrees(rotation)
      });
    } else {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      let x = (width - textWidth) / 2;
      let y = (height - textHeight) / 2;

      if (position.includes('top')) y = height - textHeight - 40;
      if (position.includes('bottom')) y = 40;
      if (position.includes('left')) x = 40;
      if (position.includes('right')) x = width - textWidth - 40;

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(r, g, b),
        opacity: Math.max(0.05, Math.min(1.0, opacity)),
        rotate: degrees(rotation)
      });
    }
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// Helper to convert integer to Roman numeral string
function toRomanNumerals(num) {
  if (num <= 0) return String(num);
  const lookup = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let res = '';
  for (const [val, roman] of lookup) {
    while (num >= val) {
      res += roman;
      num -= val;
    }
  }
  return res;
}

// 9. PAGE NUMBERS (With Roman numerals, prefix/suffix, position & margin controls)
export async function addPageNumbers(file, options = {}, onProgress) {
  const { PDFDocument, rgb, StandardFonts } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const {
    format = 'Page {n} of {total}', // '{n}', 'Page {n}', '- {n} -', 'roman-lower', 'roman-upper'
    position = 'bottom-center', // 'bottom-left', 'bottom-center', 'bottom-right', 'top-...'
    startFrom = 1,
    excludeCover = false,
    fontSize = 11,
    margin = 30,
    prefix = '',
    suffix = '',
    color = '#333333'
  } = options;

  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.2;
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.2;
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.2;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(Math.round(((i + 1) / total) * 85));

    if (i === 0 && excludeCover) continue;

    const page = pages[i];
    const { width, height } = page.getSize();
    const pageNum = i + startFrom;

    let text = format;
    if (format === 'roman-lower') {
      text = toRomanNumerals(pageNum).toLowerCase();
    } else if (format === 'roman-upper') {
      text = toRomanNumerals(pageNum);
    } else if (format === 'roman-lower-of') {
      text = `${toRomanNumerals(pageNum).toLowerCase()} of ${toRomanNumerals(total).toLowerCase()}`;
    } else if (format === 'roman-upper-of') {
      text = `${toRomanNumerals(pageNum)} of ${toRomanNumerals(total)}`;
    } else {
      text = text
        .replace('{n}', pageNum)
        .replace('{total}', total)
        .replace('{r}', toRomanNumerals(pageNum).toLowerCase())
        .replace('{R}', toRomanNumerals(pageNum));
    }

    if (prefix && prefix.trim()) {
      text = `${prefix.trim()} ${text}`;
    }
    if (suffix && suffix.trim()) {
      text = `${text} ${suffix.trim()}`;
    }

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    let x = (width - textWidth) / 2;
    let y = margin;

    if (position.includes('top')) y = height - margin - textHeight;
    if (position.includes('left')) x = margin;
    if (position.includes('right')) x = width - margin - textWidth;

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(r, g, b)
    });
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 10. PROTECT / ENCRYPT PDF (Real ISO 32000 AES-256 Encryption)
export async function protectPDF(file, password, options = {}, onProgress) {
  const PDFLib = getPDFLib();
  const { PDFDocument } = PDFLib;
  if (PDFEncryptor && PDFEncryptor.configure) {
    PDFEncryptor.configure(PDFLib);
  }

  const {
    noPrint = false,
    noCopy = false,
    ownerPassword = password
  } = typeof options === 'object' && options !== null ? options : {};

  if (onProgress) onProgress(20);
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  if (onProgress) onProgress(45);
  const plainBytes = await pdfDoc.save({ useObjectStreams: false });

  if (onProgress) onProgress(70);
  const lockedBytes = await PDFEncryptor.lock(plainBytes, password, {
    ownerPassword: ownerPassword || password,
    permissions: {
      printing: noPrint ? false : 'high',
      copying: !noCopy,
      modifying: false,
      annotating: true
    }
  });

  if (onProgress) onProgress(100);
  return new Blob([lockedBytes], { type: 'application/pdf' });
}

// 11. UNLOCK PDF (Real PDF Decryption)
export async function unlockPDF(file, password = '', onProgress) {
  const PDFLib = getPDFLib();
  const { PDFDocument } = PDFLib;
  if (PDFEncryptor && PDFEncryptor.configure) {
    PDFEncryptor.configure(PDFLib);
  }

  if (onProgress) onProgress(25);
  const buffer = await fileToArrayBuffer(file);

  // Load document with ignoreEncryption: true
  const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  if (onProgress) onProgress(50);
  if (sourceDoc.isEncrypted) {
    if (!password) {
      throw new Error('This PDF is password-protected. Please enter the password to unlock.');
    }
    // Attempt unlock
    await PDFEncryptor.unlockInPlace(sourceDoc, password);
  }

  if (onProgress) onProgress(80);
  // Re-save without encryption!
  const cleanBytes = await sourceDoc.save({ useObjectStreams: true });

  if (onProgress) onProgress(100);
  return new Blob([cleanBytes], { type: 'application/pdf' });
}

// 12. SIGN PDF
export async function signPDF(file, signatureDataUrl, signOptions, onProgress) {
  const { PDFDocument } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const {
    pageIndex = 0,
    xPercent = 50,
    yPercent = 20,
    widthPercent = 30
  } = signOptions;

  if (onProgress) onProgress(40);
  const sigBytes = dataURLtoUint8Array(signatureDataUrl);
  const embeddedSig = await pdfDoc.embedPng(sigBytes);

  const page = pdfDoc.getPage(pageIndex);
  const { width: pageW, height: pageH } = page.getSize();

  const sigW = (pageW * widthPercent) / 100;
  const sigH = sigW * (embeddedSig.height / embeddedSig.width);

  // In PDF coordinate system, (0,0) is bottom-left
  const sigX = Math.max(0, Math.min(pageW - sigW, (pageW * xPercent) / 100));
  const sigY = Math.max(0, Math.min(pageH - sigH, (pageH * yPercent) / 100));

  page.drawImage(embeddedSig, {
    x: sigX,
    y: sigY,
    width: sigW,
    height: sigH
  });

  if (onProgress) onProgress(90);
  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 13. PDF TO TEXT (Extract Text)
export async function extractTextFromPDF(file, onProgress) {
  const pdfjs = getPDFJS();
  const buffer = await fileToArrayBuffer(file);
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  let fullText = '';
  const pageTexts = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(Math.round((i / numPages) * 90));
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    const pageStr = strings.join(' ');
    pageTexts.push({ pageNum: i, text: pageStr });
    fullText += `--- Page ${i} ---\n\n${pageStr}\n\n`;
  }

  if (onProgress) onProgress(100);
  return { fullText, pageTexts, totalPages: numPages };
}

// 14. CROP PDF
export async function cropPDF(file, margins = {}, onProgress) {
  const { PDFDocument } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const {
    top = 30,
    bottom = 30,
    left = 30,
    right = 30
  } = margins;

  const pages = pdfDoc.getPages();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(Math.round(((i + 1) / total) * 85));
    const page = pages[i];
    const { width, height } = page.getSize();

    const newX = left;
    const newY = bottom;
    const newWidth = Math.max(50, width - left - right);
    const newHeight = Math.max(50, height - top - bottom);

    page.setCropBox(newX, newY, newWidth, newHeight);
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 15. ANNOTATE PDF
export async function annotatePDF(file, annotations = [], onProgress) {
  const { PDFDocument, rgb, degrees, StandardFonts } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();

  for (const ann of annotations) {
    const page = pages[ann.pageIndex || 0];
    if (!page) continue;
    const { width, height } = page.getSize();

    if (ann.type === 'text') {
      page.drawText(ann.text || '', {
        x: ann.x || 50,
        y: ann.y || height - 50,
        size: ann.fontSize || 14,
        font,
        color: rgb(0.1, 0.1, 0.1)
      });
    } else if (ann.type === 'rectangle') {
      page.drawRectangle({
        x: ann.x || 50,
        y: ann.y || 50,
        width: ann.width || 150,
        height: ann.height || 80,
        borderColor: rgb(0.8, 0.2, 0.2),
        borderWidth: 2,
        opacity: 0.8
      });
    }
  }

  if (onProgress) onProgress(90);
  const bytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  return new Blob([bytes], { type: 'application/pdf' });
}

// 16. REPAIR PDF
export async function repairPDF(file, onProgress) {
  const { PDFDocument } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);

  if (onProgress) onProgress(40);
  const damagedDoc = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
    parseSpeed: 1
  });

  const repairedDoc = await PDFDocument.create();
  const pages = await repairedDoc.copyPages(damagedDoc, damagedDoc.getPageIndices());
  pages.forEach((p) => repairedDoc.addPage(p));

  if (onProgress) onProgress(90);
  const bytes = await repairedDoc.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([bytes], { type: 'application/pdf' });
}

// 17. EXPORT TEXT / DICTATION TO STYLED PDF (Supports Unicode, Hindi, Arabic, Global Scripts)
export async function exportTextToStyledPDF(title, content, options = {}, onProgress) {
  const { PDFDocument } = getPDFLib();
  const pdfDoc = await PDFDocument.create();

  // Check if content has non-ASCII characters (e.g. Devanagari, Japanese, Arabic, Emojis)
  const hasUnicode = /[^\u0000-\u007F]/.test(title + content);

  if (hasUnicode) {
    // High-resolution Canvas rendering for flawless multi-language Unicode rendering (Ultra-HD 300 DPI)
    const pageWidth = 595.28; // A4 points
    const pageHeight = 841.89;
    const scale = 3.5; // Studio Master clarity

    const canvas = document.createElement('canvas');
    canvas.width = pageWidth * scale;
    canvas.height = pageHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageWidth, pageHeight);

    // Accent top bar (Apple coral rose)
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(0, 0, pageWidth, 6);

    const margin = 48;
    let y = 60;

    // Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
    ctx.fillText(title || 'Document', margin, y);
    y += 26;

    // Subtitle / Date
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillStyle = '#64748b';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`Date: ${dateStr}  •  Prepared with PDFCraft Studio`, margin, y);
    y += 18;

    // Divider line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(pageWidth - margin, y);
    ctx.stroke();
    y += 28;

    // Body text with automatic line-wrapping
    ctx.fillStyle = '#1e293b';
    ctx.font = '13px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 21;

    const paragraphs = content.split('\n');
    for (const para of paragraphs) {
      if (!para.trim()) {
        y += 12;
        continue;
      }
      const words = para.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth && line) {
          ctx.fillText(line, margin, y);
          y += lineHeight;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        ctx.fillText(line, margin, y);
        y += lineHeight;
      }
      y += 8;
    }

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('100% Client-Side Privacy  •  PDFCraft AI Studio', margin, pageHeight - 25);

    const dataUrl = canvas.toDataURL('image/png');
    const imgBytes = dataURLtoUint8Array(dataUrl);
    const embeddedImg = await pdfDoc.embedPng(imgBytes);

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight
    });
  } else {
    // Vector ASCII rendering using Standard Helvetica
    const { rgb, StandardFonts } = getPDFLib();
    const fontTitle = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontBody = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Top accent
    page.drawRectangle({
      x: 0,
      y: pageHeight - 6,
      width: pageWidth,
      height: 6,
      color: rgb(0.957, 0.247, 0.369)
    });

    let y = pageHeight - 55;
    page.drawText(title || 'Document', {
      x: margin,
      y,
      size: 18,
      font: fontTitle,
      color: rgb(0.06, 0.09, 0.16)
    });
    y -= 22;

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    page.drawText(`Date: ${dateStr}  •  Prepared with PDFCraft Studio`, {
      x: margin,
      y,
      size: 10,
      font: fontItalic,
      color: rgb(0.4, 0.45, 0.55)
    });
    y -= 15;

    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.88, 0.9, 0.94)
    });
    y -= 25;

    const fontSize = 11;
    const lineHeight = 16;
    const paragraphs = content.split('\n');

    for (const para of paragraphs) {
      if (!para.trim()) {
        y -= 10;
        continue;
      }
      const words = para.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const testWidth = fontBody.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > contentWidth && line) {
          page.drawText(line, { x: margin, y, size: fontSize, font: fontBody, color: rgb(0.12, 0.16, 0.24) });
          y -= lineHeight;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, { x: margin, y, size: fontSize, font: fontBody, color: rgb(0.12, 0.16, 0.24) });
        y -= lineHeight;
      }
      y += 6;
    }

    page.drawText('100% Client-Side Privacy  •  PDFCraft AI Studio', {
      x: margin,
      y: 25,
      size: 8,
      font: fontItalic,
      color: rgb(0.6, 0.65, 0.72)
    });
  }

  if (onProgress) onProgress(100);
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 18. FLATTEN PDF (Forms, Annotations, Signatures into static page vectors)
export async function flattenPDF(file, options = {}, onProgress) {
  const { PDFDocument } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  
  try {
    const form = pdfDoc.getForm();
    form.flatten();
  } catch (e) {
    // Some PDFs do not have acroforms, continue
  }
  
  if (onProgress) onProgress(80);
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 19. GRAYSCALE / B&W PDF CONVERSION
export async function grayscalePDF(file, mode = 'grayscale', onProgress) {
  const pdfjs = getPDFJS();
  const { PDFDocument } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const numPages = doc.numPages;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(Math.round(((i - 1) / numPages) * 90));
    const page = await doc.getPage(i);
    const scale = 3.5; // Studio Master Ultra-HD 300 DPI
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Apply Grayscale or B&W Pixel filter
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let j = 0; j < data.length; j += 4) {
      const r = data[j];
      const g = data[j + 1];
      const b = data[j + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      if (mode === 'bw') {
        const bw = gray > 140 ? 255 : 0;
        data[j] = bw;
        data[j + 1] = bw;
        data[j + 2] = bw;
      } else {
        data[j] = gray;
        data[j + 1] = gray;
        data[j + 2] = gray;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
    const imgBytes = dataURLtoUint8Array(dataUrl);
    const embeddedImg = await newPdf.embedJpg(imgBytes);

    const pdfPage = newPdf.addPage([viewport.width / scale, viewport.height / scale]);
    pdfPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: viewport.width / scale,
      height: viewport.height / scale
    });
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await newPdf.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 20. INVERT / DARK MODE PDF
export async function invertPDF(file, onProgress) {
  const pdfjs = getPDFJS();
  const { PDFDocument } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const numPages = doc.numPages;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(Math.round(((i - 1) / numPages) * 90));
    const page = await doc.getPage(i);
    const scale = 3.5; // Studio Master Ultra-HD 300 DPI
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let j = 0; j < data.length; j += 4) {
      data[j] = 255 - data[j];
      data[j + 1] = 255 - data[j + 1];
      data[j + 2] = 255 - data[j + 2];
    }
    ctx.putImageData(imgData, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
    const imgBytes = dataURLtoUint8Array(dataUrl);
    const embeddedImg = await newPdf.embedJpg(imgBytes);

    const pdfPage = newPdf.addPage([viewport.width / scale, viewport.height / scale]);
    pdfPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: viewport.width / scale,
      height: viewport.height / scale
    });
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await newPdf.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 21. BATES NUMBERING (Legal Indexing)
export async function batesNumberPDF(file, options = {}, onProgress) {
  const { PDFDocument, rgb, StandardFonts } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const {
    prefix = 'CASE-',
    startNumber = 1,
    digits = 6,
    suffix = '',
    position = 'bottom-right',
    fontSize = 10
  } = options;

  const pages = pdfDoc.getPages();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(Math.round((i / total) * 90));
    const page = pages[i];
    const { width, height } = page.getSize();
    
    const seqNum = String(Number(startNumber) + i).padStart(Number(digits), '0');
    const batesText = `${prefix}${seqNum}${suffix}`;
    const textWidth = font.widthOfTextAtSize(batesText, fontSize);

    let x = width - textWidth - 36;
    let y = 30;

    if (position === 'bottom-left') {
      x = 36;
      y = 30;
    } else if (position === 'bottom-center') {
      x = (width - textWidth) / 2;
      y = 30;
    } else if (position === 'top-left') {
      x = 36;
      y = height - 36;
    } else if (position === 'top-center') {
      x = (width - textWidth) / 2;
      y = height - 36;
    } else if (position === 'top-right') {
      x = width - textWidth - 36;
      y = height - 36;
    }

    page.drawText(batesText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1)
    });
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 22. HEADER & FOOTER
export async function headerFooterPDF(file, options = {}, onProgress) {
  const { PDFDocument, rgb, StandardFonts } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const {
    headerLeft = '',
    headerCenter = '',
    headerRight = '',
    footerLeft = '',
    footerCenter = '',
    footerRight = '',
    fontSize = 9,
    filename = 'Document.pdf'
  } = options;

  const pages = pdfDoc.getPages();
  const total = pages.length;
  const dateStr = new Date().toLocaleDateString();

  const replaceTokens = (text, pageNum) => {
    return text
      .replace(/{page}/g, pageNum)
      .replace(/{total}/g, total)
      .replace(/{date}/g, dateStr)
      .replace(/{filename}/g, filename);
  };

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(Math.round((i / total) * 90));
    const page = pages[i];
    const { width, height } = page.getSize();
    const pageNum = i + 1;
    const margin = 36;
    const headerY = height - margin;
    const footerY = margin;

    // Headers
    if (headerLeft) {
      const text = replaceTokens(headerLeft, pageNum);
      page.drawText(text, { x: margin, y: headerY, size: fontSize, font, color: rgb(0.3, 0.35, 0.45) });
    }
    if (headerCenter) {
      const text = replaceTokens(headerCenter, pageNum);
      const textW = font.widthOfTextAtSize(text, fontSize);
      page.drawText(text, { x: (width - textW) / 2, y: headerY, size: fontSize, font, color: rgb(0.3, 0.35, 0.45) });
    }
    if (headerRight) {
      const text = replaceTokens(headerRight, pageNum);
      const textW = font.widthOfTextAtSize(text, fontSize);
      page.drawText(text, { x: width - margin - textW, y: headerY, size: fontSize, font, color: rgb(0.3, 0.35, 0.45) });
    }

    // Footers
    if (footerLeft) {
      const text = replaceTokens(footerLeft, pageNum);
      page.drawText(text, { x: margin, y: footerY, size: fontSize, font, color: rgb(0.3, 0.35, 0.45) });
    }
    if (footerCenter) {
      const text = replaceTokens(footerCenter, pageNum);
      const textW = font.widthOfTextAtSize(text, fontSize);
      page.drawText(text, { x: (width - textW) / 2, y: footerY, size: fontSize, font, color: rgb(0.3, 0.35, 0.45) });
    }
    if (footerRight) {
      const text = replaceTokens(footerRight, pageNum);
      const textW = font.widthOfTextAtSize(text, fontSize);
      page.drawText(text, { x: width - margin - textW, y: footerY, size: fontSize, font, color: rgb(0.3, 0.35, 0.45) });
    }
  }

  if (onProgress) onProgress(95);
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 23. EXTRACT IMAGES FROM PDF (Download as ZIP)
export async function extractImagesFromPDF(file, onProgress) {
  const pdfjs = getPDFJS();
  const JSZip = getJSZip();
  const buffer = await fileToArrayBuffer(file);
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const numPages = doc.numPages;
  const zip = new JSZip();

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(Math.round(((i - 1) / numPages) * 90));
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 3.5 }); // Ultra-HD 300 DPI Studio Master

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    const imgBuffer = await blob.arrayBuffer();

    zip.file(`image_page_${String(i).padStart(3, '0')}.png`, imgBuffer);
  }

  if (onProgress) onProgress(95);
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  if (onProgress) onProgress(100);
  return { blob: zipBlob, isZip: true, filename: 'extracted_images.zip' };
}

// 24. EXTRACT SPECIFIC PAGES
export async function extractSpecificPages(file, rangeStr, onProgress) {
  const { PDFDocument } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  const pagesToExtract = new Set();
  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
          pagesToExtract.add(p - 1);
        }
      }
    } else {
      const p = Number(trimmed);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        pagesToExtract.add(p - 1);
      }
    }
  }

  const sortedIndices = Array.from(pagesToExtract).sort((a, b) => a - b);
  if (sortedIndices.length === 0) {
    throw new Error('No valid pages found in range. (e.g. use "1-3, 5")');
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(sourcePdf, sortedIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  if (onProgress) onProgress(90);
  const pdfBytes = await newPdf.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// 25. EDIT METADATA & PRIVACY SANITIZATION
export async function editMetadataPDF(file, meta = {}, onProgress) {
  const { PDFDocument } = getPDFLib();
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  if (meta.sanitize) {
    // Strip all metadata for complete privacy
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
    pdfDoc.setCreationDate(new Date(0));
    pdfDoc.setModificationDate(new Date(0));
  } else {
    if (meta.title !== undefined) pdfDoc.setTitle(meta.title);
    if (meta.author !== undefined) pdfDoc.setAuthor(meta.author);
    if (meta.subject !== undefined) pdfDoc.setSubject(meta.subject);
    if (meta.keywords !== undefined) {
      const kwList = Array.isArray(meta.keywords)
        ? meta.keywords
        : meta.keywords.split(',').map((s) => s.trim()).filter(Boolean);
      pdfDoc.setKeywords(kwList);
    }
    if (meta.creator !== undefined) pdfDoc.setCreator(meta.creator);
    if (meta.producer !== undefined) pdfDoc.setProducer(meta.producer);
    pdfDoc.setModificationDate(new Date());
  }

  if (onProgress) onProgress(90);
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
