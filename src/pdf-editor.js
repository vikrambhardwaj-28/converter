// Advanced Visual PDF Editor Studio (Pro Suite 2.0)
// Complete professional PDF editing:
// - Prominent Undo & Redo with step history & Ctrl+Z / Ctrl+Y keyboard shortcuts
// - Professional Interactive Floating Text Box with live typography (fonts, sizes, colors, bold, italic)
// - Drag handles, corner resize handles, multi-page strip, page rotation, blank pages, page deletion
// - Full shapes suite (Rectangles, Circles, Arrows, Lines, Checkmark, Cross)
// - Pre-made Stamps library (Approved, Confidential, Paid, Rejected, Draft, Date, Urgent)
// - Image upload & stamp, digital signature modal pad, blackout redactions, and whiteout erasers
// - 100% Client-Side Vector Burn Export via PDF-Lib

import { fileToArrayBuffer, dataURLtoUint8Array } from './pdf-engine.js';

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

export class VisualPdfEditor {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.pdfFile = null;
    this.pdfDocJs = null;
    this.totalPages = 0;
    this.currentPage = 1;
    this.scale = 1.25;

    // Active tool state
    this.activeTool = 'select'; // 'select', 'text', 'draw', 'highlighter', 'rect', 'circle', 'line', 'arrow', 'check', 'cross', 'redact', 'whiteout'
    this.activeColor = '#dc2626';
    this.fillColor = 'transparent';
    this.strokeWidth = 3;
    this.fontSize = 20;
    this.fontFamily = 'Helvetica';
    this.isBold = false;
    this.isItalic = false;

    // Per-page annotations: pageIndex (0-based) -> Array of annotations
    this.annotations = new Map();
    this.pageRotations = new Map();
    this.deletedPages = new Set();
    this.addedBlankPages = new Set();

    // Undo / Redo History Stack
    this.history = [];
    this.historyIndex = -1;

    // Interaction flags
    this.isDrawing = false;
    this.isDragging = false;
    this.isResizing = false;
    this.dragStart = { x: 0, y: 0 };
    this.currentShape = null;
    this.selectedAnnotation = null;

    // Active Inline Text Editor
    this.activeTextBox = null;

    this.onSave = options.onSave || null;
    this.onClose = options.onClose || null;
  }

  async loadPdf(file) {
    this.pdfFile = file;
    const buffer = await fileToArrayBuffer(file);
    const pdfjs = getPDFJS();
    this.pdfDocJs = await pdfjs.getDocument({ data: buffer }).promise;
    this.totalPages = this.pdfDocJs.numPages;
    this.currentPage = 1;

    for (let i = 0; i < this.totalPages; i++) {
      if (!this.annotations.has(i)) {
        this.annotations.set(i, []);
      }
      this.pageRotations.set(i, 0);
    }

    this.renderEditorUi();
    await this.renderCurrentPage();
    this.pushHistoryState('Initial State');
    this.attachGlobalKeyboardShortcuts();
  }

  renderEditorUi() {
    this.container.innerHTML = `
      <div class="pdf-editor-wrapper">
        <!-- Top Main Toolbar -->
        <div class="editor-topbar">
          <!-- Primary Tool Selection -->
          <div class="editor-tools-group">
            <button class="editor-tool-btn active" data-tool="select" title="Select & Move (V)">
              <i data-lucide="mouse-pointer" style="width: 17px; height: 17px;"></i>
              <span class="btn-text">Select</span>
            </button>
            <button class="editor-tool-btn" data-tool="text" title="Add Text Box (T)">
              <i data-lucide="type" style="width: 17px; height: 17px;"></i>
              <span class="btn-text">Text</span>
            </button>
            <button class="editor-tool-btn" data-tool="draw" title="Pen Draw (P)">
              <i data-lucide="pen-tool" style="width: 17px; height: 17px;"></i>
              <span class="btn-text">Draw</span>
            </button>
            <button class="editor-tool-btn" data-tool="highlighter" title="Highlighter (H)">
              <i data-lucide="highlighter" style="width: 17px; height: 17px;"></i>
              <span class="btn-text">Highlight</span>
            </button>
          </div>

          <!-- Shapes Palette -->
          <div class="editor-tools-group">
            <button class="editor-tool-btn" data-tool="rect" title="Rectangle Box (R)">
              <i data-lucide="square" style="width: 17px; height: 17px;"></i>
            </button>
            <button class="editor-tool-btn" data-tool="circle" title="Circle (C)">
              <i data-lucide="circle" style="width: 17px; height: 17px;"></i>
            </button>
            <button class="editor-tool-btn" data-tool="arrow" title="Arrow (A)">
              <i data-lucide="arrow-right" style="width: 17px; height: 17px;"></i>
            </button>
            <button class="editor-tool-btn" data-tool="line" title="Straight Line">
              <i data-lucide="minus" style="width: 17px; height: 17px;"></i>
            </button>
            <button class="editor-tool-btn" data-tool="check" title="Checkmark (✔)" style="color: #16a34a;">
              <i data-lucide="check" style="width: 17px; height: 17px;"></i>
            </button>
            <button class="editor-tool-btn" data-tool="cross" title="Cross (✖)" style="color: #dc2626;">
              <i data-lucide="x" style="width: 17px; height: 17px;"></i>
            </button>
            <button class="editor-tool-btn" data-tool="redact" title="Blackout Redact" style="color: #000;">
              <i data-lucide="eye-off" style="width: 17px; height: 17px;"></i>
            </button>
            <button class="editor-tool-btn" data-tool="whiteout" title="Whiteout Eraser">
              <i data-lucide="eraser" style="width: 17px; height: 17px;"></i>
            </button>
          </div>

          <!-- Stamps & Image Media -->
          <div class="editor-tools-group">
            <div class="editor-dropdown-wrapper">
              <button class="editor-tool-btn" id="editor-btn-stamps" title="Insert Pre-made Stamp">
                <i data-lucide="stamp" style="width: 17px; height: 17px;"></i>
                <span class="btn-text">Stamps</span>
                <i data-lucide="chevron-down" style="width: 13px; height: 13px; margin-left: 2px;"></i>
              </button>
              <div class="editor-dropdown-menu" id="editor-stamps-menu">
                <div class="editor-stamp-option" data-stamp="APPROVED" style="color: #16a34a;">✔ APPROVED</div>
                <div class="editor-stamp-option" data-stamp="CONFIDENTIAL" style="color: #dc2626;">🔒 CONFIDENTIAL</div>
                <div class="editor-stamp-option" data-stamp="PAID" style="color: #2563eb;">💰 PAID</div>
                <div class="editor-stamp-option" data-stamp="REJECTED" style="color: #b91c1c;">✖ REJECTED</div>
                <div class="editor-stamp-option" data-stamp="DRAFT" style="color: #64748b;">📝 DRAFT</div>
                <div class="editor-stamp-option" data-stamp="DATE" style="color: #7c3aed;">📅 TODAY'S DATE</div>
              </div>
            </div>

            <!-- Upload Image / Stamp -->
            <button class="editor-tool-btn" id="editor-btn-add-image" title="Insert Image / Logo">
              <i data-lucide="image" style="width: 17px; height: 17px;"></i>
              <span class="btn-text">Image</span>
            </button>
            <input type="file" id="editor-image-input" accept="image/*" style="display: none;">

            <!-- Digital Signature Button -->
            <button class="editor-tool-btn" id="editor-btn-sign" title="Draw Signature">
              <i data-lucide="pen-line" style="width: 17px; height: 17px;"></i>
              <span class="btn-text">Sign</span>
            </button>
          </div>

          <!-- PROMINENT UNDO & REDO BUTTONS -->
          <div class="editor-nav-group" style="background: rgba(225,29,72,0.06); border: 1px solid rgba(225,29,72,0.2);">
            <button class="editor-action-pill" id="editor-btn-undo" title="Undo Step (Ctrl+Z / ⌘Z)">
              <i data-lucide="undo-2" style="width: 16px; height: 16px;"></i>
              <span>Undo</span>
            </button>
            <button class="editor-action-pill" id="editor-btn-redo" title="Redo Step (Ctrl+Y / ⌘Y)">
              <i data-lucide="redo-2" style="width: 16px; height: 16px;"></i>
              <span>Redo</span>
            </button>
            <button class="editor-action-pill" id="editor-btn-clear-page" title="Clear All Marks on this Page" style="color: #dc2626;">
              <i data-lucide="trash" style="width: 15px; height: 15px;"></i>
              <span>Clear Page</span>
            </button>
          </div>

          <!-- Page Navigation & Controls -->
          <div class="editor-nav-group">
            <button class="editor-icon-btn" id="editor-prev-page" title="Previous Page">
              <i data-lucide="chevron-left" style="width: 18px; height: 18px;"></i>
            </button>
            <span class="editor-page-indicator" id="editor-page-indicator">1 / ${this.totalPages}</span>
            <button class="editor-icon-btn" id="editor-next-page" title="Next Page">
              <i data-lucide="chevron-right" style="width: 18px; height: 18px;"></i>
            </button>

            <div style="height: 18px; width: 1px; background: var(--card-border); margin: 0 4px;"></div>

            <button class="editor-icon-btn" id="editor-btn-rotate-page" title="Rotate Current Page 90°">
              <i data-lucide="rotate-cw" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="editor-icon-btn" id="editor-btn-add-blank-page" title="Add Blank Page" style="color: #059669;">
              <i data-lucide="plus-circle" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="editor-icon-btn" id="editor-btn-del-page" title="Delete Current Page" style="color: #dc2626;">
              <i data-lucide="delete" style="width: 16px; height: 16px;"></i>
            </button>

            <div style="height: 18px; width: 1px; background: var(--card-border); margin: 0 4px;"></div>

            <button class="editor-icon-btn" id="editor-zoom-out" title="Zoom Out">
              <i data-lucide="zoom-out" style="width: 16px; height: 16px;"></i>
            </button>
            <span style="font-size: 0.82rem; font-weight: 700; min-width: 44px; text-align: center;" id="editor-zoom-level">125%</span>
            <button class="editor-icon-btn" id="editor-zoom-in" title="Zoom In">
              <i data-lucide="zoom-in" style="width: 16px; height: 16px;"></i>
            </button>
          </div>

          <!-- Save and Close Buttons -->
          <div style="display: flex; gap: 0.5rem; margin-left: auto;">
            <button class="secondary-btn" id="editor-btn-close" style="padding: 0.5rem 0.95rem; font-size: 0.88rem;">
              Cancel
            </button>
            <button class="primary-btn" id="editor-btn-export" style="padding: 0.5rem 1.25rem; font-size: 0.9rem;">
              <i data-lucide="download" style="width: 17px; height: 17px;"></i>
              <span>Save & Download PDF</span>
            </button>
          </div>
        </div>

        <!-- Secondary Contextual Properties Bar -->
        <div class="editor-properties-bar" id="editor-properties-bar">
          <div class="editor-prop-item">
            <span class="editor-prop-label">Color:</span>
            <input type="color" id="editor-color-picker" value="${this.activeColor}" class="editor-color-input" title="Foreground Color">
          </div>

          <div class="editor-prop-item">
            <span class="editor-prop-label">Fill:</span>
            <select id="editor-fill-select" class="editor-select">
              <option value="transparent">Transparent</option>
              <option value="#ffffff">White Fill</option>
              <option value="#fef3c7">Light Yellow</option>
              <option value="#dcfce7">Light Green</option>
              <option value="#dbeafe">Light Blue</option>
              <option value="#fee2e2">Light Red</option>
            </select>
          </div>

          <div class="editor-prop-item">
            <span class="editor-prop-label">Font:</span>
            <select id="editor-font-family" class="editor-select">
              <option value="Helvetica" selected>Helvetica (Standard Sans)</option>
              <option value="TimesRoman">Times New Roman (Serif)</option>
              <option value="Courier">Courier (Monospace)</option>
              <option value="Dancing Script">Dancing Script (Calligraphy)</option>
            </select>
          </div>

          <div class="editor-prop-item">
            <span class="editor-prop-label">Size:</span>
            <select id="editor-font-size" class="editor-select">
              <option value="12">12 pt</option>
              <option value="14">14 pt</option>
              <option value="16">16 pt</option>
              <option value="18">18 pt</option>
              <option value="20" selected>20 pt</option>
              <option value="24">24 pt</option>
              <option value="32">32 pt</option>
              <option value="48">48 pt</option>
              <option value="64">64 pt</option>
            </select>
          </div>

          <!-- Bold & Italic Toggles -->
          <div class="editor-prop-item">
            <button class="editor-format-btn" id="editor-btn-bold" title="Bold">
              <i data-lucide="bold" style="width: 14px; height: 14px;"></i>
            </button>
            <button class="editor-format-btn" id="editor-btn-italic" title="Italic">
              <i data-lucide="italic" style="width: 14px; height: 14px;"></i>
            </button>
          </div>

          <!-- Stroke Width -->
          <div class="editor-prop-item">
            <span class="editor-prop-label">Stroke:</span>
            <select id="editor-stroke-width" class="editor-select">
              <option value="1">1 px (Fine)</option>
              <option value="2">2 px</option>
              <option value="3" selected>3 px (Normal)</option>
              <option value="5">5 px (Thick)</option>
              <option value="8">8 px</option>
              <option value="14">14 px (Marker)</option>
            </select>
          </div>

          <!-- Quick Palette Swatches -->
          <div class="editor-swatch-list">
            <span class="editor-color-dot" data-color="#000000" style="background: #000000;" title="Black"></span>
            <span class="editor-color-dot" data-color="#dc2626" style="background: #dc2626;" title="Red"></span>
            <span class="editor-color-dot" data-color="#2563eb" style="background: #2563eb;" title="Blue"></span>
            <span class="editor-color-dot" data-color="#16a34a" style="background: #16a34a;" title="Green"></span>
            <span class="editor-color-dot" data-color="#eab308" style="background: #eab308;" title="Yellow"></span>
            <span class="editor-color-dot" data-color="#9333ea" style="background: #9333ea;" title="Purple"></span>
          </div>

          <!-- Duplicate & Delete Selected -->
          <div style="display: flex; gap: 0.4rem; margin-left: 1rem;">
            <button class="secondary-btn" id="editor-btn-duplicate-selected" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;" title="Duplicate element (Ctrl+D)">
              <i data-lucide="copy" style="width: 13px; height: 13px;"></i> Duplicate
            </button>
            <button class="secondary-btn" id="editor-btn-delete-selected" style="padding: 0.25rem 0.6rem; font-size: 0.8rem; color: #dc2626;" title="Delete element (Del)">
              <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i> Delete
            </button>
          </div>
        </div>

        <!-- Main Workspace Stage -->
        <div class="editor-main-stage">
          <!-- Page Thumbnails Strip -->
          <div class="editor-page-strip" id="editor-page-strip"></div>

          <!-- Canvas Stage Viewport -->
          <div class="editor-canvas-viewport" id="editor-viewport">
            <div class="editor-page-sheet" id="editor-page-sheet">
              <canvas id="pdf-background-canvas"></canvas>
              <canvas id="annotation-overlay-canvas"></canvas>
              
              <!-- Professional Floating Interactive Text Box Overlay -->
              <div class="pro-text-overlay-box" id="pro-text-overlay" style="display: none;">
                <div class="pro-text-header" id="pro-text-drag-bar">
                  <span style="display: flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 700; color: #475569;">
                    <i data-lucide="move" style="width: 12px; height: 12px;"></i> Text Box
                  </span>
                  <div style="display: flex; gap: 4px;">
                    <button class="pro-text-btn pro-done-btn" id="pro-text-confirm" title="Done (Enter / Esc)">✔ Done</button>
                    <button class="pro-text-btn pro-del-btn" id="pro-text-cancel" title="Discard">✖</button>
                  </div>
                </div>
                <div class="pro-text-content" id="pro-text-input" contenteditable="true" spellcheck="false" placeholder="Type text here..."></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Signature Pad Modal -->
      <div class="modal-overlay" id="editor-sig-modal">
        <div class="modal-box" style="max-width: 440px;">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Draw Your Signature</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Sign smoothly with mouse or finger, then stamp it onto any page.</p>
          <div style="border: 2px dashed #94a3b8; border-radius: 12px; background: white; height: 160px; overflow: hidden; position: relative;">
            <canvas id="editor-sig-modal-canvas" style="width: 100%; height: 100%; cursor: crosshair;"></canvas>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
            <button class="secondary-btn" id="editor-sig-clear">Clear</button>
            <div style="display: flex; gap: 0.5rem;">
              <button class="secondary-btn" id="editor-sig-cancel">Cancel</button>
              <button class="primary-btn" id="editor-sig-apply">Apply Signature</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachUiListeners();
    this.renderPageStrip();
    this.updateUndoRedoButtons();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  attachGlobalKeyboardShortcuts() {
    this.keydownHandler = (e) => {
      // If typing in input, let native input events happen
      if (e.target.id === 'pro-text-input' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          this.commitActiveTextBox();
        }
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
        return;
      }

      // Redo: Ctrl+Y or Cmd+Y
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedAnnotation) {
          e.preventDefault();
          this.deleteSelectedAnnotation();
          return;
        }
      }

      // Duplicate: Ctrl+D or Cmd+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (this.selectedAnnotation) {
          e.preventDefault();
          this.duplicateSelectedAnnotation();
          return;
        }
      }

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'v') this.switchTool('select');
        if (k === 't') this.switchTool('text');
        if (k === 'p') this.switchTool('draw');
        if (k === 'h') this.switchTool('highlighter');
        if (k === 'r') this.switchTool('rect');
        if (k === 'c') this.switchTool('circle');
        if (k === 'a') this.switchTool('arrow');
      }
    };

    window.addEventListener('keydown', this.keydownHandler);
  }

  switchTool(toolName) {
    this.container.querySelectorAll('.editor-tool-btn[data-tool]').forEach((b) => b.classList.remove('active'));
    const target = this.container.querySelector(`.editor-tool-btn[data-tool="${toolName}"]`);
    if (target) target.classList.add('active');
    this.activeTool = toolName;
    if (this.activeTextBox) this.commitActiveTextBox();
    this.selectedAnnotation = null;
    this.drawAnnotations();
  }

  async renderPageStrip() {
    const strip = document.getElementById('editor-page-strip');
    if (!strip) return;
    strip.innerHTML = '';

    for (let p = 1; p <= this.totalPages; p++) {
      if (this.deletedPages.has(p - 1)) continue;

      const thumbItem = document.createElement('div');
      thumbItem.className = `editor-strip-thumb ${p === this.currentPage ? 'active' : ''}`;
      thumbItem.id = `thumb-page-${p}`;
      thumbItem.innerHTML = `<span class="strip-thumb-num">Page ${p}</span><div class="thumb-canvas-box"></div>`;

      thumbItem.addEventListener('click', async () => {
        if (this.currentPage !== p) {
          if (this.activeTextBox) this.commitActiveTextBox();
          this.currentPage = p;
          document.querySelectorAll('.editor-strip-thumb').forEach((el) => el.classList.remove('active'));
          thumbItem.classList.add('active');
          document.getElementById('editor-page-indicator').textContent = `${p} / ${this.totalPages}`;
          await this.renderCurrentPage();
        }
      });

      strip.appendChild(thumbItem);

      // Render miniature thumbnail
      if (p <= this.pdfDocJs.numPages) {
        const page = await this.pdfDocJs.getPage(p);
        const viewport = page.getViewport({ scale: 0.2, rotation: this.pageRotations.get(p - 1) || 0 });
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = viewport.width;
        thumbCanvas.height = viewport.height;
        await page.render({ canvasContext: thumbCanvas.getContext('2d'), viewport }).promise;
        thumbItem.querySelector('.thumb-canvas-box').appendChild(thumbCanvas);
      } else {
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 120;
        thumbCanvas.height = 160;
        const ctx = thumbCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 120, 160);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(0, 0, 120, 160);
        thumbItem.querySelector('.thumb-canvas-box').appendChild(thumbCanvas);
      }
    }
  }

  async renderCurrentPage() {
    const bgCanvas = document.getElementById('pdf-background-canvas');
    const annCanvas = document.getElementById('annotation-overlay-canvas');
    if (!bgCanvas || !annCanvas) return;

    const pageIdx = this.currentPage - 1;
    const rotation = this.pageRotations.get(pageIdx) || 0;

    let width = 595.28 * this.scale;
    let height = 841.89 * this.scale;

    if (this.currentPage <= this.pdfDocJs.numPages) {
      const page = await this.pdfDocJs.getPage(this.currentPage);
      const viewport = page.getViewport({ scale: this.scale, rotation });
      width = viewport.width;
      height = viewport.height;

      bgCanvas.width = width;
      bgCanvas.height = height;
      const ctx = bgCanvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
    } else {
      bgCanvas.width = width;
      bgCanvas.height = height;
      const ctx = bgCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    annCanvas.width = width;
    annCanvas.height = height;

    const sheet = document.getElementById('editor-page-sheet');
    sheet.style.width = `${width}px`;
    sheet.style.height = `${height}px`;

    this.drawAnnotations();
  }

  drawAnnotations() {
    const canvas = document.getElementById('annotation-overlay-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageIndex = this.currentPage - 1;
    const list = this.annotations.get(pageIndex) || [];

    list.forEach((ann) => {
      ctx.save();

      if (ann.type === 'draw' || ann.type === 'highlighter') {
        ctx.beginPath();
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (ann.type === 'highlighter') {
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = ann.width * 2.8;
        }
        ann.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (ann.type === 'rect') {
        if (ann.fill && ann.fill !== 'transparent') {
          ctx.fillStyle = ann.fill;
          ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
        }
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.width;
        ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
      } else if (ann.type === 'circle') {
        ctx.beginPath();
        const rx = Math.abs(ann.w / 2);
        const ry = Math.abs(ann.h / 2);
        const cx = ann.x + ann.w / 2;
        const cy = ann.y + ann.h / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (ann.fill && ann.fill !== 'transparent') {
          ctx.fillStyle = ann.fill;
          ctx.fill();
        }
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.width;
        ctx.stroke();
      } else if (ann.type === 'line' || ann.type === 'arrow') {
        ctx.beginPath();
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.width;
        ctx.moveTo(ann.x, ann.y);
        ctx.lineTo(ann.x + ann.w, ann.y + ann.h);
        ctx.stroke();

        if (ann.type === 'arrow') {
          const angle = Math.atan2(ann.h, ann.w);
          const arrowLength = Math.max(14, ann.width * 3.5);
          const toX = ann.x + ann.w;
          const toY = ann.y + ann.h;

          ctx.beginPath();
          ctx.fillStyle = ann.color;
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - arrowLength * Math.cos(angle - Math.PI / 6), toY - arrowLength * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(toX - arrowLength * Math.cos(angle + Math.PI / 6), toY - arrowLength * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }
      } else if (ann.type === 'redact') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
      } else if (ann.type === 'whiteout') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
      } else if (ann.type === 'stamp') {
        ctx.save();
        ctx.translate(ann.x, ann.y);
        ctx.rotate(-0.1);
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(0, 0, ann.w, ann.h);

        ctx.font = `bold ${Math.round(ann.h * 0.48)}px sans-serif`;
        ctx.fillStyle = ann.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ann.text, ann.w / 2, ann.h / 2);
        ctx.restore();
      } else if (ann.type === 'check' || ann.type === 'cross') {
        ctx.font = `bold ${ann.size || 34}px sans-serif`;
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.type === 'check' ? '✔' : '✖', ann.x, ann.y);
      } else if (ann.type === 'image') {
        if (ann.imgElement && ann.imgElement.complete) {
          ctx.drawImage(ann.imgElement, ann.x, ann.y, ann.w, ann.h);
        }
      } else if (ann.type === 'text') {
        // Multi-line text rendering
        const fontStyle = `${ann.isItalic ? 'italic ' : ''}${ann.isBold ? 'bold ' : ''}`;
        ctx.font = `${fontStyle}${ann.size}px ${ann.fontFamily || 'Helvetica'}`;
        ctx.fillStyle = ann.color;

        const lines = (ann.text || '').split('\n');
        const lineHeight = ann.size * 1.25;

        // Draw background if any
        if (ann.fill && ann.fill !== 'transparent') {
          let maxLineW = 0;
          lines.forEach((l) => {
            const w = ctx.measureText(l).width;
            if (w > maxLineW) maxLineW = w;
          });
          ctx.fillStyle = ann.fill;
          ctx.fillRect(ann.x - 4, ann.y - ann.size, maxLineW + 8, lines.length * lineHeight + 4);
          ctx.fillStyle = ann.color;
        }

        lines.forEach((lineText, idx) => {
          ctx.fillText(lineText, ann.x, ann.y + idx * lineHeight);
        });
      }

      if (this.selectedAnnotation === ann) {
        this.drawSelectionBox(ctx, ann);
      }

      ctx.restore();
    });
  }

  drawSelectionBox(ctx, ann) {
    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    let boxX = ann.x;
    let boxY = ann.y;
    let boxW = ann.w || 80;
    let boxH = ann.h || 40;

    if (ann.type === 'text') {
      const fontStyle = `${ann.isItalic ? 'italic ' : ''}${ann.isBold ? 'bold ' : ''}`;
      ctx.font = `${fontStyle}${ann.size}px ${ann.fontFamily || 'Helvetica'}`;
      const lines = (ann.text || '').split('\n');
      let maxW = 0;
      lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > maxW) maxW = w;
      });
      boxX = ann.x - 4;
      boxY = ann.y - ann.size - 2;
      boxW = maxW + 8;
      boxH = lines.length * (ann.size * 1.25) + 6;
    } else if (ann.type === 'check' || ann.type === 'cross') {
      boxX = ann.x - 4;
      boxY = ann.y - (ann.size || 34);
      boxW = (ann.size || 34) + 8;
      boxH = (ann.size || 34) + 8;
    }

    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // 4 Corner handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    const handleSize = 8;

    const handles = [
      { x: boxX - handleSize / 2, y: boxY - handleSize / 2 },
      { x: boxX + boxW - handleSize / 2, y: boxY - handleSize / 2 },
      { x: boxX + boxW - handleSize / 2, y: boxY + boxH - handleSize / 2 },
      { x: boxX - handleSize / 2, y: boxY + boxH - handleSize / 2 }
    ];

    handles.forEach((h) => {
      ctx.fillRect(h.x, h.y, handleSize, handleSize);
      ctx.strokeRect(h.x, h.y, handleSize, handleSize);
    });

    ctx.restore();
  }

  attachUiListeners() {
    // Tool buttons switching
    this.container.querySelectorAll('.editor-tool-btn[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.switchTool(btn.dataset.tool);
      });
    });

    // Color Pickers & Swatches
    const colorPicker = document.getElementById('editor-color-picker');
    colorPicker?.addEventListener('input', (e) => {
      this.activeColor = e.target.value;
      if (this.selectedAnnotation) {
        this.selectedAnnotation.color = e.target.value;
        this.drawAnnotations();
        this.pushHistoryState('Change Color');
      }
    });

    this.container.querySelectorAll('.editor-color-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const color = dot.dataset.color;
        this.activeColor = color;
        if (colorPicker) colorPicker.value = color;
        if (this.selectedAnnotation) {
          this.selectedAnnotation.color = color;
          this.drawAnnotations();
          this.pushHistoryState('Change Color');
        }
      });
    });

    // Font Size
    const fontSelect = document.getElementById('editor-font-size');
    fontSelect?.addEventListener('change', (e) => {
      this.fontSize = parseInt(e.target.value, 10);
      if (this.selectedAnnotation && this.selectedAnnotation.type === 'text') {
        this.selectedAnnotation.size = this.fontSize;
        this.drawAnnotations();
        this.pushHistoryState('Change Font Size');
      }
    });

    // Font Family
    const fontFamSelect = document.getElementById('editor-font-family');
    fontFamSelect?.addEventListener('change', (e) => {
      this.fontFamily = e.target.value;
      if (this.selectedAnnotation && this.selectedAnnotation.type === 'text') {
        this.selectedAnnotation.fontFamily = this.fontFamily;
        this.drawAnnotations();
        this.pushHistoryState('Change Font');
      }
    });

    // Fill Select
    const fillSelect = document.getElementById('editor-fill-select');
    fillSelect?.addEventListener('change', (e) => {
      this.fillColor = e.target.value;
      if (this.selectedAnnotation) {
        this.selectedAnnotation.fill = this.fillColor;
        this.drawAnnotations();
        this.pushHistoryState('Change Fill');
      }
    });

    // Stroke width
    const strokeSelect = document.getElementById('editor-stroke-width');
    strokeSelect?.addEventListener('change', (e) => {
      this.strokeWidth = parseInt(e.target.value, 10);
      if (this.selectedAnnotation) {
        this.selectedAnnotation.width = this.strokeWidth;
        this.drawAnnotations();
        this.pushHistoryState('Change Stroke Width');
      }
    });

    // Bold / Italic
    const btnBold = document.getElementById('editor-btn-bold');
    btnBold?.addEventListener('click', () => {
      this.isBold = !this.isBold;
      btnBold.classList.toggle('active', this.isBold);
      if (this.selectedAnnotation && this.selectedAnnotation.type === 'text') {
        this.selectedAnnotation.isBold = this.isBold;
        this.drawAnnotations();
        this.pushHistoryState('Toggle Bold');
      }
    });

    const btnItalic = document.getElementById('editor-btn-italic');
    btnItalic?.addEventListener('click', () => {
      this.isItalic = !this.isItalic;
      btnItalic.classList.toggle('active', this.isItalic);
      if (this.selectedAnnotation && this.selectedAnnotation.type === 'text') {
        this.selectedAnnotation.isItalic = this.isItalic;
        this.drawAnnotations();
        this.pushHistoryState('Toggle Italic');
      }
    });

    // Stamps Menu Dropdown
    const stampsBtn = document.getElementById('editor-btn-stamps');
    const stampsMenu = document.getElementById('editor-stamps-menu');
    stampsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      stampsMenu?.classList.toggle('active');
    });

    document.addEventListener('click', () => stampsMenu?.classList.remove('active'));

    this.container.querySelectorAll('.editor-stamp-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        this.insertStamp(opt.dataset.stamp);
        stampsMenu?.classList.remove('active');
      });
    });

    // Image Upload
    const imageBtn = document.getElementById('editor-btn-add-image');
    const imageInput = document.getElementById('editor-image-input');
    imageBtn?.addEventListener('click', () => imageInput?.click());
    imageInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.insertImage(e.target.files[0]);
      }
    });

    // Signature Modal Pad
    document.getElementById('editor-btn-sign')?.addEventListener('click', () => this.openSignatureModal());

    // UNDO / REDO / CLEAR PAGE BUTTONS
    document.getElementById('editor-btn-undo')?.addEventListener('click', () => this.undo());
    document.getElementById('editor-btn-redo')?.addEventListener('click', () => this.redo());
    document.getElementById('editor-btn-clear-page')?.addEventListener('click', () => {
      if (confirm('Clear all annotations on this page?')) {
        this.annotations.set(this.currentPage - 1, []);
        this.selectedAnnotation = null;
        this.drawAnnotations();
        this.pushHistoryState('Clear Page');
      }
    });

    // Duplicate & Delete Elements
    document.getElementById('editor-btn-duplicate-selected')?.addEventListener('click', () => this.duplicateSelectedAnnotation());
    document.getElementById('editor-btn-delete-selected')?.addEventListener('click', () => this.deleteSelectedAnnotation());

    // Page Management Buttons
    document.getElementById('editor-btn-rotate-page')?.addEventListener('click', async () => {
      const pageIdx = this.currentPage - 1;
      const cur = this.pageRotations.get(pageIdx) || 0;
      this.pageRotations.set(pageIdx, (cur + 90) % 360);
      await this.renderCurrentPage();
      await this.renderPageStrip();
      this.pushHistoryState('Rotate Page');
    });

    document.getElementById('editor-btn-add-blank-page')?.addEventListener('click', async () => {
      this.totalPages++;
      const newPageIdx = this.totalPages - 1;
      this.annotations.set(newPageIdx, []);
      this.pageRotations.set(newPageIdx, 0);
      this.addedBlankPages.add(newPageIdx);
      this.currentPage = this.totalPages;
      document.getElementById('editor-page-indicator').textContent = `${this.currentPage} / ${this.totalPages}`;
      await this.renderPageStrip();
      await this.renderCurrentPage();
      this.pushHistoryState('Add Blank Page');
    });

    document.getElementById('editor-btn-del-page')?.addEventListener('click', async () => {
      if (this.totalPages <= 1) {
        alert('Cannot delete the only page in the document.');
        return;
      }
      this.deletedPages.add(this.currentPage - 1);
      while (this.deletedPages.has(this.currentPage - 1) && this.currentPage < this.totalPages) {
        this.currentPage++;
      }
      document.getElementById('editor-page-indicator').textContent = `${this.currentPage} / ${this.totalPages}`;
      await this.renderPageStrip();
      await this.renderCurrentPage();
      this.pushHistoryState('Delete Page');
    });

    // Page navigation
    document.getElementById('editor-prev-page')?.addEventListener('click', async () => {
      if (this.currentPage > 1) {
        if (this.activeTextBox) this.commitActiveTextBox();
        this.currentPage--;
        document.getElementById('editor-page-indicator').textContent = `${this.currentPage} / ${this.totalPages}`;
        await this.renderCurrentPage();
      }
    });

    document.getElementById('editor-next-page')?.addEventListener('click', async () => {
      if (this.currentPage < this.totalPages) {
        if (this.activeTextBox) this.commitActiveTextBox();
        this.currentPage++;
        document.getElementById('editor-page-indicator').textContent = `${this.currentPage} / ${this.totalPages}`;
        await this.renderCurrentPage();
      }
    });

    // Zoom controls
    document.getElementById('editor-zoom-in')?.addEventListener('click', async () => {
      if (this.scale < 2.5) {
        this.scale += 0.25;
        document.getElementById('editor-zoom-level').textContent = `${Math.round(this.scale * 100)}%`;
        await this.renderCurrentPage();
      }
    });

    document.getElementById('editor-zoom-out')?.addEventListener('click', async () => {
      if (this.scale > 0.5) {
        this.scale -= 0.25;
        document.getElementById('editor-zoom-level').textContent = `${Math.round(this.scale * 100)}%`;
        await this.renderCurrentPage();
      }
    });

    // Canvas Mouse / Pointer Interaction
    const annCanvas = document.getElementById('annotation-overlay-canvas');
    if (annCanvas) {
      annCanvas.addEventListener('mousedown', (e) => this.handlePointerDown(e));
      annCanvas.addEventListener('mousemove', (e) => this.handlePointerMove(e));
      annCanvas.addEventListener('mouseup', (e) => this.handlePointerUp(e));
      annCanvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    }

    // Text Box Confirm / Cancel listeners
    document.getElementById('pro-text-confirm')?.addEventListener('click', () => this.commitActiveTextBox());
    document.getElementById('pro-text-cancel')?.addEventListener('click', () => this.cancelActiveTextBox());

    // Save & Close
    document.getElementById('editor-btn-export')?.addEventListener('click', () => this.exportEditedPdf());
    document.getElementById('editor-btn-close')?.addEventListener('click', () => {
      if (this.onClose) this.onClose();
    });
  }

  getCanvasCoords(e) {
    const canvas = document.getElementById('annotation-overlay-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  handlePointerDown(e) {
    const { x, y } = this.getCanvasCoords(e);
    const pageIndex = this.currentPage - 1;
    const list = this.annotations.get(pageIndex) || [];

    // If an inline text box is currently open and clicking outside, commit it
    if (this.activeTextBox) {
      const boxEl = document.getElementById('pro-text-overlay');
      if (boxEl && !boxEl.contains(e.target)) {
        this.commitActiveTextBox();
      }
    }

    if (this.activeTool === 'select') {
      // Check resize handle
      if (this.selectedAnnotation) {
        const handle = this.getHitHandle(this.selectedAnnotation, x, y);
        if (handle) {
          this.isResizing = true;
          this.dragStart = { x, y };
          return;
        }
      }

      // Check hit annotation
      let hit = null;
      for (let i = list.length - 1; i >= 0; i--) {
        if (this.isPointInsideAnnotation(list[i], x, y)) {
          hit = list[i];
          break;
        }
      }

      if (hit) {
        this.selectedAnnotation = hit;
        this.isDragging = true;
        this.dragStart = { x, y };
        this.syncTopBarWithAnnotation(hit);
      } else {
        this.selectedAnnotation = null;
      }

      this.drawAnnotations();
      return;
    }

    if (this.activeTool === 'text') {
      this.openProfessionalTextBox(x, y);
      return;
    }

    if (this.activeTool === 'check' || this.activeTool === 'cross') {
      list.push({
        type: this.activeTool,
        x,
        y,
        size: 34,
        color: this.activeTool === 'check' ? '#16a34a' : '#dc2626'
      });
      this.drawAnnotations();
      this.pushHistoryState(`Add ${this.activeTool}`);
      return;
    }

    this.isDrawing = true;
    if (this.activeTool === 'draw' || this.activeTool === 'highlighter') {
      this.currentShape = {
        type: this.activeTool,
        points: [{ x, y }],
        color: this.activeColor,
        width: this.strokeWidth
      };
      list.push(this.currentShape);
    } else if (['rect', 'circle', 'line', 'arrow', 'redact', 'whiteout'].includes(this.activeTool)) {
      this.currentShape = {
        type: this.activeTool,
        startX: x,
        startY: y,
        x,
        y,
        w: 0,
        h: 0,
        color: this.activeColor,
        fill: this.fillColor,
        width: this.strokeWidth
      };
      list.push(this.currentShape);
    }
  }

  handlePointerMove(e) {
    const { x, y } = this.getCanvasCoords(e);

    if (this.isDragging && this.selectedAnnotation) {
      const dx = x - this.dragStart.x;
      const dy = y - this.dragStart.y;
      this.selectedAnnotation.x += dx;
      this.selectedAnnotation.y += dy;
      this.dragStart = { x, y };
      this.drawAnnotations();
      return;
    }

    if (this.isResizing && this.selectedAnnotation) {
      const dx = x - this.dragStart.x;
      const dy = y - this.dragStart.y;
      this.selectedAnnotation.w = Math.max(24, (this.selectedAnnotation.w || 40) + dx);
      this.selectedAnnotation.h = Math.max(24, (this.selectedAnnotation.h || 40) + dy);
      this.dragStart = { x, y };
      this.drawAnnotations();
      return;
    }

    if (!this.isDrawing || !this.currentShape) return;

    if (this.currentShape.type === 'draw' || this.currentShape.type === 'highlighter') {
      this.currentShape.points.push({ x, y });
    } else if (['rect', 'circle', 'line', 'arrow', 'redact', 'whiteout'].includes(this.currentShape.type)) {
      if (this.currentShape.type === 'line' || this.currentShape.type === 'arrow') {
        this.currentShape.w = x - this.currentShape.startX;
        this.currentShape.h = y - this.currentShape.startY;
      } else {
        this.currentShape.x = Math.min(this.currentShape.startX, x);
        this.currentShape.y = Math.min(this.currentShape.startY, y);
        this.currentShape.w = Math.abs(x - this.currentShape.startX);
        this.currentShape.h = Math.abs(y - this.currentShape.startY);
      }
    }

    this.drawAnnotations();
  }

  handlePointerUp() {
    if (this.isDrawing || this.isDragging || this.isResizing) {
      this.pushHistoryState(this.isDrawing ? 'Draw shape' : this.isDragging ? 'Move item' : 'Resize item');
    }
    this.isDrawing = false;
    this.isDragging = false;
    this.isResizing = false;
    this.currentShape = null;
  }

  handleDoubleClick(e) {
    const { x, y } = this.getCanvasCoords(e);
    const list = this.annotations.get(this.currentPage - 1) || [];

    for (let i = list.length - 1; i >= 0; i--) {
      const ann = list[i];
      if (ann.type === 'text' && this.isPointInsideAnnotation(ann, x, y)) {
        this.openProfessionalTextBox(ann.x, ann.y, ann);
        break;
      }
    }
  }

  // PROFESSIONAL FLOATING TEXT BOX
  openProfessionalTextBox(x, y, existingAnn = null) {
    const overlay = document.getElementById('pro-text-overlay');
    const input = document.getElementById('pro-text-input');
    if (!overlay || !input) return;

    this.activeTextBox = {
      x,
      y,
      existingAnnotation: existingAnn
    };

    overlay.style.display = 'block';
    overlay.style.left = `${Math.max(10, x - 10)}px`;
    overlay.style.top = `${Math.max(10, y - this.fontSize - 36)}px`;

    input.style.fontSize = `${this.fontSize}px`;
    input.style.fontFamily = this.fontFamily || 'Helvetica';
    input.style.color = this.activeColor;
    input.style.fontWeight = this.isBold ? 'bold' : 'normal';
    input.style.fontStyle = this.isItalic ? 'italic' : 'normal';

    if (existingAnn) {
      input.innerText = existingAnn.text;
    } else {
      input.innerText = '';
    }

    // Hide original while editing to prevent ghosting
    if (existingAnn) {
      existingAnn._editing = true;
      this.drawAnnotations();
    }

    setTimeout(() => {
      input.focus();
    }, 50);
  }

  commitActiveTextBox() {
    if (!this.activeTextBox) return;

    const overlay = document.getElementById('pro-text-overlay');
    const input = document.getElementById('pro-text-input');
    const textContent = input ? input.innerText.trim() : '';

    overlay.style.display = 'none';

    const list = this.annotations.get(this.currentPage - 1) || [];

    if (this.activeTextBox.existingAnnotation) {
      delete this.activeTextBox.existingAnnotation._editing;
      if (textContent) {
        this.activeTextBox.existingAnnotation.text = textContent;
        this.activeTextBox.existingAnnotation.size = this.fontSize;
        this.activeTextBox.existingAnnotation.color = this.activeColor;
        this.activeTextBox.existingAnnotation.fontFamily = this.fontFamily;
        this.activeTextBox.existingAnnotation.isBold = this.isBold;
        this.activeTextBox.existingAnnotation.isItalic = this.isItalic;
        this.pushHistoryState('Edit Text');
      } else {
        // Remove empty text
        const idx = list.indexOf(this.activeTextBox.existingAnnotation);
        if (idx !== -1) list.splice(idx, 1);
        this.pushHistoryState('Remove Empty Text');
      }
    } else {
      if (textContent) {
        list.push({
          type: 'text',
          text: textContent,
          x: this.activeTextBox.x,
          y: this.activeTextBox.y,
          size: this.fontSize,
          color: this.activeColor,
          fill: this.fillColor,
          fontFamily: this.fontFamily,
          isBold: this.isBold,
          isItalic: this.isItalic
        });
        this.pushHistoryState('Add Text');
      }
    }

    this.activeTextBox = null;
    this.drawAnnotations();
  }

  cancelActiveTextBox() {
    if (!this.activeTextBox) return;
    const overlay = document.getElementById('pro-text-overlay');
    overlay.style.display = 'none';
    if (this.activeTextBox.existingAnnotation) {
      delete this.activeTextBox.existingAnnotation._editing;
    }
    this.activeTextBox = null;
    this.drawAnnotations();
  }

  insertStamp(stampType) {
    const list = this.annotations.get(this.currentPage - 1) || [];
    let text = stampType;
    let color = '#dc2626';

    if (stampType === 'APPROVED') color = '#16a34a';
    if (stampType === 'PAID') color = '#2563eb';
    if (stampType === 'DRAFT') color = '#64748b';
    if (stampType === 'REJECTED') color = '#b91c1c';
    if (stampType === 'DATE') {
      const today = new Date();
      text = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      color = '#7c3aed';
    }

    const stamp = {
      type: 'stamp',
      text,
      color,
      x: 180,
      y: 200,
      w: 195,
      h: 58
    };

    list.push(stamp);
    this.selectedAnnotation = stamp;
    this.drawAnnotations();
    this.pushHistoryState(`Insert Stamp: ${stampType}`);
  }

  insertImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        const targetW = 200;
        const targetH = targetW / aspect;

        const list = this.annotations.get(this.currentPage - 1) || [];
        const imageAnnotation = {
          type: 'image',
          imgElement: img,
          dataUrl: e.target.result,
          x: 160,
          y: 180,
          w: targetW,
          h: targetH
        };

        list.push(imageAnnotation);
        this.selectedAnnotation = imageAnnotation;
        this.drawAnnotations();
        this.pushHistoryState('Insert Image');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  openSignatureModal() {
    const modal = document.getElementById('editor-sig-modal');
    modal?.classList.add('active');

    const canvas = document.getElementById('editor-sig-modal-canvas');
    if (!canvas) return;

    canvas.width = 400;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let isSigning = false;
    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    canvas.onmousedown = (e) => {
      isSigning = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    canvas.onmousemove = (e) => {
      if (!isSigning) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    canvas.onmouseup = () => { isSigning = false; };

    document.getElementById('editor-sig-clear').onclick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    document.getElementById('editor-sig-cancel').onclick = () => {
      modal.classList.remove('active');
    };

    document.getElementById('editor-sig-apply').onclick = () => {
      const dataUrl = canvas.toDataURL('image/png');
      const img = new Image();
      img.onload = () => {
        const list = this.annotations.get(this.currentPage - 1) || [];
        const sigAnnotation = {
          type: 'image',
          imgElement: img,
          dataUrl,
          x: 200,
          y: 420,
          w: 160,
          h: 64
        };
        list.push(sigAnnotation);
        this.selectedAnnotation = sigAnnotation;
        this.drawAnnotations();
        this.pushHistoryState('Add Signature');
      };
      img.src = dataUrl;
      modal.classList.remove('active');
    };
  }

  duplicateSelectedAnnotation() {
    if (!this.selectedAnnotation) return;
    const list = this.annotations.get(this.currentPage - 1) || [];
    const clone = JSON.parse(JSON.stringify(this.selectedAnnotation, (k, v) => (k === 'imgElement' ? undefined : v)));
    clone.x += 20;
    clone.y += 20;

    if (clone.type === 'image' && clone.dataUrl) {
      const img = new Image();
      img.onload = () => {
        clone.imgElement = img;
        this.drawAnnotations();
      };
      img.src = clone.dataUrl;
    }

    list.push(clone);
    this.selectedAnnotation = clone;
    this.drawAnnotations();
    this.pushHistoryState('Duplicate Item');
  }

  deleteSelectedAnnotation() {
    if (!this.selectedAnnotation) return;
    const list = this.annotations.get(this.currentPage - 1) || [];
    const idx = list.indexOf(this.selectedAnnotation);
    if (idx !== -1) {
      list.splice(idx, 1);
      this.selectedAnnotation = null;
      this.drawAnnotations();
      this.pushHistoryState('Delete Item');
    }
  }

  isPointInsideAnnotation(ann, x, y) {
    if (ann.type === 'text') {
      const lines = (ann.text || '').split('\n');
      const h = lines.length * (ann.size * 1.25);
      return x >= ann.x - 4 && x <= ann.x + 240 && y >= ann.y - ann.size && y <= ann.y + h;
    }
    if (ann.w && ann.h) {
      return x >= ann.x && x <= ann.x + ann.w && y >= ann.y && y <= ann.y + ann.h;
    }
    return false;
  }

  getHitHandle(ann, x, y) {
    const handleSize = 12;
    const boxX = ann.x;
    const boxY = ann.y;
    const boxW = ann.w || 60;
    const boxH = ann.h || 40;

    if (Math.abs(x - (boxX + boxW)) <= handleSize && Math.abs(y - (boxY + boxH)) <= handleSize) {
      return 'se';
    }
    return null;
  }

  syncTopBarWithAnnotation(ann) {
    if (ann.color) {
      const picker = document.getElementById('editor-color-picker');
      if (picker) picker.value = ann.color;
    }
    if (ann.size) {
      const sizeSelect = document.getElementById('editor-font-size');
      if (sizeSelect) sizeSelect.value = ann.size;
    }
    if (ann.fontFamily) {
      const famSelect = document.getElementById('editor-font-family');
      if (famSelect) famSelect.value = ann.fontFamily;
    }
  }

  // STEP-BY-STEP UNDO & REDO ENGINE
  pushHistoryState(description = '') {
    const snapshot = new Map();
    for (const [k, v] of this.annotations.entries()) {
      const pageListCopy = v.map((item) => {
        const itemCopy = Object.assign({}, item);
        delete itemCopy.imgElement; // avoid non-serializable DOM ref
        return itemCopy;
      });
      snapshot.set(k, pageListCopy);
    }

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snapshot);
    this.historyIndex++;
    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreHistoryState(this.history[this.historyIndex]);
      this.updateUndoRedoButtons();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreHistoryState(this.history[this.historyIndex]);
      this.updateUndoRedoButtons();
    }
  }

  restoreHistoryState(snapshot) {
    this.annotations = new Map();
    for (const [k, v] of snapshot.entries()) {
      const restoredList = v.map((item) => {
        const itemCopy = Object.assign({}, item);
        if (itemCopy.type === 'image' && itemCopy.dataUrl) {
          const img = new Image();
          img.src = itemCopy.dataUrl;
          itemCopy.imgElement = img;
        }
        return itemCopy;
      });
      this.annotations.set(k, restoredList);
    }
    this.selectedAnnotation = null;
    this.drawAnnotations();
  }

  updateUndoRedoButtons() {
    const btnUndo = document.getElementById('editor-btn-undo');
    const btnRedo = document.getElementById('editor-btn-redo');

    if (btnUndo) {
      const canUndo = this.historyIndex > 0;
      btnUndo.disabled = !canUndo;
      btnUndo.style.opacity = canUndo ? '1' : '0.4';
      btnUndo.style.cursor = canUndo ? 'pointer' : 'not-allowed';
    }

    if (btnRedo) {
      const canRedo = this.historyIndex < this.history.length - 1;
      btnRedo.disabled = !canRedo;
      btnRedo.style.opacity = canRedo ? '1' : '0.4';
      btnRedo.style.cursor = canRedo ? 'pointer' : 'not-allowed';
    }
  }

  // Vector Burn PDF Export using PDF-Lib
  async exportEditedPdf() {
    if (this.activeTextBox) this.commitActiveTextBox();

    const { PDFDocument, rgb, degrees, StandardFonts } = getPDFLib();
    const buffer = await fileToArrayBuffer(this.pdfFile);
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    const newDoc = await PDFDocument.create();
    const fontHelvetica = await newDoc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await newDoc.embedFont(StandardFonts.HelveticaBold);
    const fontTimes = await newDoc.embedFont(StandardFonts.TimesRoman);
    const fontCourier = await newDoc.embedFont(StandardFonts.Courier);

    for (let p = 0; p < this.totalPages; p++) {
      if (this.deletedPages.has(p)) continue;

      let page;
      if (p < sourceDoc.getPageCount()) {
        const [copiedPage] = await newDoc.copyPages(sourceDoc, [p]);
        page = newDoc.addPage(copiedPage);
      } else {
        page = newDoc.addPage([595.28, 841.89]);
      }

      const rot = this.pageRotations.get(p) || 0;
      if (rot) {
        page.setRotation(degrees((page.getRotation().angle + rot) % 360));
      }

      const { width: pageW, height: pageH } = page.getSize();
      const list = this.annotations.get(p) || [];

      const scaleX = pageW / (pageW * this.scale);
      const scaleY = pageH / (pageH * this.scale);

      for (const ann of list) {
        const hex = (ann.color || '#000000').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
        const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
        const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

        if (ann.type === 'text' || ann.type === 'check' || ann.type === 'cross') {
          const textContent = ann.type === 'check' ? '✔' : ann.type === 'cross' ? '✖' : ann.text;
          const pdfX = ann.x * scaleX;
          const lines = textContent.split('\n');
          const activeFont = ann.isBold ? fontHelveticaBold : (ann.fontFamily === 'TimesRoman' ? fontTimes : ann.fontFamily === 'Courier' ? fontCourier : fontHelvetica);
          const fontSize = (ann.size || 20) * scaleY;
          const lineHeight = fontSize * 1.25;

          lines.forEach((lineText, idx) => {
            const pdfY = pageH - (ann.y * scaleY) - (idx * lineHeight);
            page.drawText(lineText, {
              x: pdfX,
              y: pdfY,
              size: fontSize,
              font: activeFont,
              color: rgb(r, g, b)
            });
          });
        } else if (ann.type === 'rect' || ann.type === 'redact' || ann.type === 'whiteout' || ann.type === 'stamp') {
          const pdfX = ann.x * scaleX;
          const pdfW = ann.w * scaleX;
          const pdfH = ann.h * scaleY;
          const pdfY = pageH - (ann.y * scaleY) - pdfH;

          if (ann.type === 'redact') {
            page.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              color: rgb(0, 0, 0)
            });
          } else if (ann.type === 'whiteout') {
            page.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              color: rgb(1, 1, 1)
            });
          } else if (ann.type === 'stamp') {
            page.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              borderColor: rgb(r, g, b),
              borderWidth: 3
            });
            page.drawText(ann.text, {
              x: pdfX + 8,
              y: pdfY + pdfH / 3,
              size: pdfH * 0.45,
              font: fontHelveticaBold,
              color: rgb(r, g, b)
            });
          } else {
            page.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              borderColor: rgb(r, g, b),
              borderWidth: (ann.width || 2) * scaleX
            });
          }
        } else if (ann.type === 'circle') {
          const pdfX = (ann.x + ann.w / 2) * scaleX;
          const pdfY = pageH - (ann.y + ann.h / 2) * scaleY;
          const xRadius = (ann.w / 2) * scaleX;
          const yRadius = (ann.h / 2) * scaleY;

          page.drawEllipse({
            x: pdfX,
            y: pdfY,
            xScale: xRadius,
            yScale: yRadius,
            borderColor: rgb(r, g, b),
            borderWidth: (ann.width || 2) * scaleX
          });
        } else if (ann.type === 'line' || ann.type === 'arrow') {
          const startX = ann.x * scaleX;
          const startY = pageH - ann.y * scaleY;
          const endX = (ann.x + ann.w) * scaleX;
          const endY = pageH - (ann.y + ann.h) * scaleY;

          page.drawLine({
            start: { x: startX, y: startY },
            end: { x: endX, y: endY },
            color: rgb(r, g, b),
            thickness: (ann.width || 2) * scaleX
          });
        } else if (ann.type === 'image' && ann.dataUrl) {
          const imgBytes = dataURLtoUint8Array(ann.dataUrl);
          const embeddedImg = await newDoc.embedPng(imgBytes);

          const pdfX = ann.x * scaleX;
          const pdfW = ann.w * scaleX;
          const pdfH = ann.h * scaleY;
          const pdfY = pageH - (ann.y * scaleY) - pdfH;

          page.drawImage(embeddedImg, {
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH
          });
        }
      }
    }

    const pdfBytes = await newDoc.save();
    const resultBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const filename = `edited_${this.pdfFile.name}`;

    if (this.onSave) {
      this.onSave(filename, resultBlob);
    }
  }
}
