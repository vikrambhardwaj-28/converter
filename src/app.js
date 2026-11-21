// Main Application Logic for PDFCraft Studio
import { translations } from './i18n.js';
import * as PDFEngine from './pdf-engine.js';
import * as Converters from './converters.js';
import { VisualPdfEditor } from './pdf-editor.js';
import { 
  VoiceRecognitionController, 
  SmartWriterEngine, 
  SUPPORTED_LANGUAGES, 
  WRITING_PURPOSES 
} from './voice-writer.js';

// Application State
const state = {
  lang: 'hi', // default to Hindi as requested by the user, with easy 1-click toggle to English
  theme: 'light',
  currentCategory: 'all',
  currentToolId: null,
  uploadedFiles: [], // array of File objects
  processedResult: null, // { blob, filename, isZip, text }
  searchQuery: '',
  // Voice Writer State
  voiceState: {
    spokenLang: 'hi-IN',
    targetLang: 'en-US',
    purpose: 'email',
    tone: 'professional',
    customContext: '',
    rawTranscript: '',
    refinedSubject: '',
    refinedBody: '',
    controller: null,
    engine: null,
    isSpeaking: false
  },
  // Specific tool state
  signatureState: {
    mode: 'draw', // 'draw', 'type', 'upload'
    dataUrl: null,
    color: '#000000',
    text: '',
    pageIndex: 0,
    xPercent: 50,
    yPercent: 15,
    widthPercent: 30
  },
  watermarkState: {
    type: 'text',
    text: 'CONFIDENTIAL',
    fontSize: 48,
    color: '#dc2626',
    opacity: 0.3,
    rotation: 45,
    position: 'center',
    imageDataUrl: null,
    imageScale: 0.5
  },
  organizePages: [] // array of { origIndex, rotation }
};

// Tool Definitions
const TOOLS = [
  {
    id: 'merge',
    icon: 'copy',
    theme: 'theme-red',
    category: 'organize',
    accept: '.pdf,application/pdf',
    multiple: true
  },
  {
    id: 'split',
    icon: 'scissors',
    theme: 'theme-orange',
    category: 'organize',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'compress',
    icon: 'minimize-2',
    theme: 'theme-green',
    category: 'organize',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'pdf-to-img',
    icon: 'image',
    theme: 'theme-amber',
    category: 'convert',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'img-to-pdf',
    icon: 'file-image',
    theme: 'theme-indigo',
    category: 'convert',
    accept: 'image/png,image/jpeg,image/webp,image/jpg',
    multiple: true
  },
  {
    id: 'rotate',
    icon: 'rotate-cw',
    theme: 'theme-teal',
    category: 'organize',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'organize',
    icon: 'layout-grid',
    theme: 'theme-purple',
    category: 'organize',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'watermark',
    icon: 'stamp',
    theme: 'theme-rose',
    category: 'edit',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'page-numbers',
    icon: 'hash',
    theme: 'theme-cyan',
    category: 'edit',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'sign',
    icon: 'pen-tool',
    theme: 'theme-violet',
    category: 'edit',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'protect',
    icon: 'lock',
    theme: 'theme-emerald',
    category: 'security',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'unlock',
    icon: 'unlock',
    theme: 'theme-blue',
    category: 'security',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'pdf-to-text',
    icon: 'file-text',
    theme: 'theme-fuchsia',
    category: 'convert',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'crop',
    icon: 'crop',
    theme: 'theme-pink',
    category: 'edit',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'annotate',
    icon: 'edit-3',
    theme: 'theme-amber',
    category: 'edit',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'repair',
    icon: 'wrench',
    theme: 'theme-teal',
    category: 'organize',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'pdf-editor',
    icon: 'edit',
    theme: 'theme-rose',
    category: 'edit',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'pdf-to-word',
    icon: 'file-text',
    theme: 'theme-blue',
    category: 'convert',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'pdf-to-excel',
    icon: 'table',
    theme: 'theme-emerald',
    category: 'convert',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'pdf-to-ppt',
    icon: 'presentation',
    theme: 'theme-orange',
    category: 'convert',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'pdf-to-html',
    icon: 'code',
    theme: 'theme-purple',
    category: 'convert',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'word-to-pdf',
    icon: 'file-type-2',
    theme: 'theme-blue',
    category: 'convert',
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    multiple: false
  },
  {
    id: 'excel-to-pdf',
    icon: 'sheet',
    theme: 'theme-green',
    category: 'convert',
    accept: '.xlsx,.xls,.csv',
    multiple: false
  },
  {
    id: 'md-to-pdf',
    icon: 'file-code',
    theme: 'theme-indigo',
    category: 'convert',
    accept: '.md,text/markdown,text/plain',
    multiple: false
  },
  {
    id: 'code-to-pdf',
    icon: 'terminal',
    theme: 'theme-cyan',
    category: 'convert',
    accept: '.js,.ts,.py,.java,.cpp,.c,.html,.css,.json,.sql,text/plain',
    multiple: false
  },
  {
    id: 'redact',
    icon: 'eye-off',
    theme: 'theme-red',
    category: 'security',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'voice-writer',
    icon: 'mic',
    theme: 'theme-rose',
    category: 'edit',
    accept: '',
    multiple: false,
    noUploadRequired: true
  },
  {
    id: 'flatten',
    icon: 'layers',
    theme: 'theme-indigo',
    category: 'organize',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'grayscale',
    icon: 'sun',
    theme: 'theme-teal',
    category: 'convert',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'invert-colors',
    icon: 'moon',
    theme: 'theme-purple',
    category: 'convert',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'bates-numbers',
    icon: 'hash',
    theme: 'theme-emerald',
    category: 'edit',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'header-footer',
    icon: 'align-center',
    theme: 'theme-blue',
    category: 'edit',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'extract-images',
    icon: 'image',
    theme: 'theme-amber',
    category: 'convert',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'extract-pages',
    icon: 'file-text',
    theme: 'theme-orange',
    category: 'organize',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'metadata',
    icon: 'shield',
    theme: 'theme-rose',
    category: 'security',
    accept: '.pdf,application/pdf',
    multiple: false
  }
];

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLanguage();
  renderToolsGrid();
  attachGlobalEventListeners();
  refreshLucide();
});

// Refresh Lucide Icons safely
function refreshLucide() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Theme Management
function initTheme() {
  const saved = localStorage.getItem('pdfcraft_theme') || 'light';
  state.theme = saved;
  applyTheme(saved);
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    refreshLucide();
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('pdfcraft_theme', state.theme);
  applyTheme(state.theme);
}

// Language / i18n Management
function initLanguage() {
  const saved = localStorage.getItem('pdfcraft_lang') || 'hi';
  state.lang = saved;
  updateLanguageUI();
}

function toggleLanguage() {
  state.lang = state.lang === 'hi' ? 'en' : 'hi';
  localStorage.setItem('pdfcraft_lang', state.lang);
  updateLanguageUI();
  renderToolsGrid();
  if (state.currentToolId) {
    if (state.uploadedFiles.length > 0) {
      setupActiveWorkspace();
    } else {
      openToolWorkspace(state.currentToolId);
    }
  }
}

function t(key, subkey = null) {
  const dict = translations[state.lang] || translations.en;
  if (subkey) {
    return dict[key]?.[subkey] || translations.en[key]?.[subkey] || '';
  }
  return dict[key] || translations.en[key] || '';
}

function getToolT(toolId, field) {
  const dict = translations[state.lang]?.tools?.[toolId] || translations.en.tools[toolId] || {};
  return dict[field] || '';
}

function updateLanguageUI() {
  const isHi = state.lang === 'hi';
  const flagEl = document.getElementById('lang-flag');
  const labelEl = document.getElementById('lang-label');
  if (flagEl) flagEl.textContent = isHi ? '🇬🇧' : '🇮🇳';
  if (labelEl) labelEl.textContent = isHi ? 'English' : 'हिन्दी';

  // Hero & Nav
  document.getElementById('site-title-text').textContent = t('siteTitle');
  document.getElementById('privacy-badge-text').textContent = t('privacyBadge');
  document.getElementById('hero-title-text').textContent = isHi 
    ? 'आपके पसंदीदा सभी पीडीएफ टूल्स, बिल्कुल प्राइवेट और फ्री'
    : 'Every PDF tool you need, right in your browser';
  document.getElementById('hero-sub-text').textContent = t('siteTagline');
  document.getElementById('tool-search-input').placeholder = t('searchPlaceholder');

  // Tabs
  document.getElementById('tab-all').textContent = t('allTools');
  document.getElementById('tab-organize').textContent = t('organizeTab');
  document.getElementById('tab-convert').textContent = t('convertTab');
  document.getElementById('tab-edit').textContent = t('editTab');
  document.getElementById('tab-security').textContent = t('securityTab');

  // Workspace buttons
  document.getElementById('back-btn-text').textContent = t('backToTools');
  document.getElementById('btn-browse-text').textContent = t('selectFiles');
  document.getElementById('btn-add-more-text').textContent = t('addMoreFiles');
}

// Render Tools Grid in Dashboard
function renderToolsGrid() {
  const container = document.getElementById('tools-grid');
  if (!container) return;

  const filtered = TOOLS.filter((tool) => {
    // Category filter
    if (state.currentCategory !== 'all' && tool.category !== state.currentCategory) {
      return false;
    }
    // Search filter
    if (state.query) {
      const name = getToolT(tool.id, 'name').toLowerCase();
      const desc = getToolT(tool.id, 'desc').toLowerCase();
      return name.includes(state.query) || desc.includes(state.query);
    }
    return true;
  });

  container.innerHTML = filtered.map((tool) => {
    const name = getToolT(tool.id, 'name');
    const desc = getToolT(tool.id, 'desc');
    const badge = getToolT(tool.id, 'badge');

    return `
      <div class="tool-card" data-tool-id="${tool.id}">
        <div class="tool-card-header">
          <div class="tool-icon-box ${tool.theme}">
            <i data-lucide="${tool.icon}" style="width: 26px; height: 26px;"></i>
          </div>
          <span class="tool-badge">${badge}</span>
        </div>
        <h3 class="tool-title">${name}</h3>
        <p class="tool-desc">${desc}</p>
        <div class="tool-footer">
          <span>${state.lang === 'hi' ? 'खोलें →' : 'Open Tool →'}</span>
          <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
        </div>
      </div>
    `;
  }).join('');

  refreshLucide();

  // Attach click listener to tool cards
  container.querySelectorAll('.tool-card').forEach((card) => {
    card.addEventListener('click', () => {
      const toolId = card.getAttribute('data-tool-id');
      openToolWorkspace(toolId);
    });
  });
}

// Open Specific Tool Workspace
function openToolWorkspace(toolId) {
  state.currentToolId = toolId;
  state.uploadedFiles = [];
  state.processedResult = null;

  document.getElementById('dashboard-view').style.display = 'none';
  const wsView = document.getElementById('workspace-view');
  wsView.classList.add('active');

  const tool = TOOLS.find((t) => t.id === toolId);
  const fileInput = document.getElementById('file-input');
  fileInput.value = '';
  fileInput.accept = tool.accept;
  fileInput.multiple = tool.multiple;

  // Title & Desc
  document.getElementById('ws-tool-title').textContent = getToolT(toolId, 'name');
  document.getElementById('ws-tool-desc').textContent = getToolT(toolId, 'desc');

  // Reset Dropzone & Layout
  document.getElementById('ws-dropzone').style.display = 'block';
  document.getElementById('ws-active-content').style.display = 'none';

  if (toolId === 'img-to-pdf') {
    document.getElementById('dropzone-text').textContent = t('dropImages');
    document.getElementById('btn-browse-text').textContent = t('selectImages');
  } else {
    document.getElementById('dropzone-text').textContent = t('dropFiles');
    document.getElementById('btn-browse-text').textContent = t('selectFiles');
  }

  // Tools that do not require file upload (e.g. AI Voice Writer)
  if (tool.noUploadRequired) {
    setupActiveWorkspace();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  refreshLucide();
}

// Return to Dashboard
function returnToDashboard() {
  state.currentToolId = null;
  state.uploadedFiles = [];
  document.getElementById('workspace-view').classList.remove('active');
  document.getElementById('dashboard-view').style.display = 'block';
  refreshLucide();
}

// File Selection & Dropzone Handling
function handleFiles(files) {
  if (!files || files.length === 0) return;
  const tool = TOOLS.find((t) => t.id === state.currentToolId);

  const fileArray = Array.from(files);
  if (tool.multiple) {
    state.uploadedFiles = [...state.uploadedFiles, ...fileArray];
  } else {
    state.uploadedFiles = [fileArray[0]];
  }

  if (state.uploadedFiles.length > 0) {
    setupActiveWorkspace();
  }
}

// Setup Active Workspace once files are loaded
async function setupActiveWorkspace() {
  document.getElementById('ws-dropzone').style.display = 'none';
  const contentArea = document.getElementById('ws-active-content');
  const sidebar = document.getElementById('ws-sidebar');
  contentArea.style.display = 'grid';
  contentArea.style.gridTemplateColumns = '1fr 340px';
  sidebar.style.display = 'flex';

  const toolId = state.currentToolId;
  const previewArea = document.getElementById('ws-preview-area');
  const controlsArea = document.getElementById('ws-custom-controls');
  const btnProcessText = document.getElementById('btn-process-text');

  btnProcessText.textContent = getToolT(toolId, 'action') || t('processButton');

  // Render Tool-Specific Controls & Previews
  switch (toolId) {
    case 'pdf-editor':
    case 'redact': {
      contentArea.style.gridTemplateColumns = '1fr';
      sidebar.style.display = 'none';
      const editor = new VisualPdfEditor(previewArea, {
        onSave: (filename, blob) => {
          showSuccessModal(filename, blob, false);
          showToast(t('successMessage'));
        },
        onClose: () => {
          returnToDashboard();
        }
      });
      await editor.loadPdf(state.uploadedFiles[0]);
      break;
    }
    case 'pdf-to-word':
    case 'pdf-to-excel':
    case 'pdf-to-ppt':
    case 'pdf-to-html':
    case 'word-to-pdf':
    case 'excel-to-pdf':
    case 'md-to-pdf':
    case 'code-to-pdf':
      renderConverterWorkspace(previewArea, controlsArea, toolId);
      break;
    case 'merge':
      renderMergeWorkspace(previewArea, controlsArea);
      break;
    case 'split':
      renderSplitWorkspace(previewArea, controlsArea);
      break;
    case 'compress':
      renderCompressWorkspace(previewArea, controlsArea);
      break;
    case 'pdf-to-img':
      renderPdfToImgWorkspace(previewArea, controlsArea);
      break;
    case 'img-to-pdf':
      renderImgToPdfWorkspace(previewArea, controlsArea);
      break;
    case 'rotate':
      renderRotateWorkspace(previewArea, controlsArea);
      break;
    case 'organize':
      await renderOrganizeWorkspace(previewArea, controlsArea);
      break;
    case 'watermark':
      renderWatermarkWorkspace(previewArea, controlsArea);
      break;
    case 'page-numbers':
      renderPageNumbersWorkspace(previewArea, controlsArea);
      break;
    case 'sign':
      await renderSignWorkspace(previewArea, controlsArea);
      break;
    case 'protect':
      renderProtectWorkspace(previewArea, controlsArea);
      break;
    case 'unlock':
      renderUnlockWorkspace(previewArea, controlsArea);
      break;
    case 'pdf-to-text':
      renderPdfToTextWorkspace(previewArea, controlsArea);
      break;
    case 'crop':
      renderCropWorkspace(previewArea, controlsArea);
      break;
    case 'annotate':
      renderAnnotateWorkspace(previewArea, controlsArea);
      break;
    case 'repair':
      renderRepairWorkspace(previewArea, controlsArea);
      break;
    case 'voice-writer': {
      contentArea.style.gridTemplateColumns = '1fr';
      sidebar.style.display = 'none';
      renderVoiceWriterWorkspace(previewArea, controlsArea);
      break;
    }
    case 'flatten':
      renderFlattenWorkspace(previewArea, controlsArea);
      break;
    case 'grayscale':
      renderGrayscaleWorkspace(previewArea, controlsArea);
      break;
    case 'invert-colors':
      renderInvertColorsWorkspace(previewArea, controlsArea);
      break;
    case 'bates-numbers':
      renderBatesNumbersWorkspace(previewArea, controlsArea);
      break;
    case 'header-footer':
      renderHeaderFooterWorkspace(previewArea, controlsArea);
      break;
    case 'extract-images':
      renderExtractImagesWorkspace(previewArea, controlsArea);
      break;
    case 'extract-pages':
      renderExtractPagesWorkspace(previewArea, controlsArea);
      break;
    case 'metadata':
      renderMetadataWorkspace(previewArea, controlsArea);
      break;
    default:
      renderGenericFileList(previewArea);
      controlsArea.innerHTML = '';
      break;
  }

  refreshLucide();
}

function renderFlattenWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);
  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">FLATTEN ENGINE</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'फॉर्म और सिग्नेचर लॉक' : 'Lock Forms & Annotations'}</h4>
      <p class="pro-step-desc">${state.lang === 'hi' ? 'सभी इंटरएक्टिव फॉर्म फील्ड्स, चेकबॉक्स, डिजिटल सिग्नेचर और एनोटेशन को स्थायी पेज कंटेंट में बदलें ताकि कोई इसे एडिट न कर सके।' : 'Flatten form fields, digital signatures, and markup into permanent page pixels.'}</p>
    </div>
    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">OPTIONS</span>
      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'स्थायी लेआउट' : 'Permanent Page Vectors'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'अपरिवर्तनीय कानूनी मोड' : 'Non-editable legal compliance'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" checked disabled>
          <span class="ios-slider"></span>
        </div>
      </label>
    </div>
  `;
}

function renderGrayscaleWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);
  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">COLOR FILTER</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'कलर मोड चुनें' : 'Select Grayscale Mode'}</h4>
      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.75rem;">
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 600; cursor: pointer;">
          <input type="radio" name="gray-mode" value="grayscale" checked>
          <span>${state.lang === 'hi' ? 'ग्रेस्केल (256 शेड्स — स्मूथ प्रिंटिंग)' : 'Grayscale (Smooth 256 gray tones)'}</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 600; cursor: pointer;">
          <input type="radio" name="gray-mode" value="bw">
          <span>${state.lang === 'hi' ? 'प्योर ब्लैक एंड व्हाइट (हाई कंट्रास्ट)' : 'Pure Monochrome (Black & White)'}</span>
        </label>
      </div>
    </div>
  `;
}

function renderInvertColorsWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);
  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">DARK MODE ENGINE</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'नाइट रीडिंग मोड' : 'Night Reading Mode'}</h4>
      <p class="pro-step-desc">${state.lang === 'hi' ? 'PDF के कलर्स को इन्वर्ट करता है — डार्क बैकग्राउंड पर सफेद टेक्स्ट, जिससे रात में पढ़ने पर आंखों पर बिल्कुल जोर नहीं पड़ता।' : 'Invert page luminance to render white text on dark background for eye-strain-free night reading.'}</p>
    </div>
  `;
}

function renderBatesNumbersWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);
  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">LEGAL INDEXING</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'बेट्स नंबर सेटिंग्स' : 'Bates Stamp Settings'}</h4>
      
      <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.75rem;">
        <div>
          <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">${state.lang === 'hi' ? 'प्रीफिक्स (Prefix)' : 'Prefix'}</label>
          <input type="text" id="bates-prefix" class="control-input" value="CASE-" style="width: 100%;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          <div>
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">${state.lang === 'hi' ? 'स्टार्ट नंबर' : 'Start Number'}</label>
            <input type="number" id="bates-start" class="control-input" value="1" min="1" style="width: 100%;">
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">${state.lang === 'hi' ? 'कुल डिजिट्स' : 'Digits (Padding)'}</label>
            <input type="number" id="bates-digits" class="control-input" value="6" min="1" max="10" style="width: 100%;">
          </div>
        </div>
        <div>
          <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">${state.lang === 'hi' ? 'सफिक्स (Suffix - वैकल्पिक)' : 'Suffix (Optional)'}</label>
          <input type="text" id="bates-suffix" class="control-input" placeholder="-CONFIDENTIAL" style="width: 100%;">
        </div>
        <div>
          <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">${state.lang === 'hi' ? 'पोजीशन' : 'Position'}</label>
          <select id="bates-position" class="control-select" style="width: 100%;">
            <option value="bottom-right" selected>${state.lang === 'hi' ? 'नीचे दाएं (Bottom Right)' : 'Bottom Right'}</option>
            <option value="bottom-center">${state.lang === 'hi' ? 'नीचे बीच में (Bottom Center)' : 'Bottom Center'}</option>
            <option value="bottom-left">${state.lang === 'hi' ? 'नीचे बाएं (Bottom Left)' : 'Bottom Left'}</option>
            <option value="top-right">${state.lang === 'hi' ? 'ऊपर दाएं (Top Right)' : 'Top Right'}</option>
            <option value="top-center">${state.lang === 'hi' ? 'ऊपर बीच में (Top Center)' : 'Top Center'}</option>
            <option value="top-left">${state.lang === 'hi' ? 'ऊपर बाएं (Top Left)' : 'Top Left'}</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function renderHeaderFooterWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);
  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">RUNNING HEADERS</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'शीर्ष लेख (Header)' : 'Running Header'}</h4>
      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
        <input type="text" id="hf-head-left" class="control-input" placeholder="${state.lang === 'hi' ? 'हेडर बायां (Header Left)' : 'Header Left'}" value="">
        <input type="text" id="hf-head-center" class="control-input" placeholder="${state.lang === 'hi' ? 'हेडर बीच (Header Center)' : 'Header Center (e.g. {filename})'}" value="{filename}">
        <input type="text" id="hf-head-right" class="control-input" placeholder="${state.lang === 'hi' ? 'हेडर दायां (Header Right)' : 'Header Right (e.g. {date})'}" value="{date}">
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">RUNNING FOOTERS</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'पाद लेख (Footer)' : 'Running Footer'}</h4>
      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
        <input type="text" id="hf-foot-left" class="control-input" placeholder="${state.lang === 'hi' ? 'फुटर बायां (Footer Left)' : 'Footer Left (e.g. Confidential)'}" value="Confidential">
        <input type="text" id="hf-foot-center" class="control-input" placeholder="${state.lang === 'hi' ? 'फुटर बीच (Footer Center)' : 'Footer Center (e.g. Page {page} of {total})'}" value="Page {page} of {total}">
        <input type="text" id="hf-foot-right" class="control-input" placeholder="${state.lang === 'hi' ? 'फुटर दायां (Footer Right)' : 'Footer Right'}" value="">
      </div>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
        ${state.lang === 'hi' ? 'उपलब्ध टोकन: {page}, {total}, {date}, {filename}' : 'Available tokens: {page}, {total}, {date}, {filename}'}
      </p>
    </div>
  `;
}

function renderExtractImagesWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);
  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">IMAGE EXTRACTION</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'फोटो और इमेज एक्सट्रैक्टर' : 'Extract Embedded Images'}</h4>
      <p class="pro-step-desc">${state.lang === 'hi' ? 'PDF के प्रत्येक पेज से उच्च-रिज़ॉल्यूशन PNG इमेज निकालकर ZIP में पैक करेगा।' : 'Extract all page graphics & embedded raster photos into a high-resolution ZIP archive.'}</p>
    </div>
  `;
}

function renderExtractPagesWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);
  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">PAGE RANGE</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'चुनिंदा पेज रेंज दर्ज करें' : 'Enter Pages to Extract'}</h4>
      <p class="pro-step-desc">${state.lang === 'hi' ? 'उदाहरण: 1-3, 5, 8-10 दर्ज करें' : 'Example: Enter 1-3, 5, 8-10'}</p>
      <input type="text" id="extract-range-input" class="control-input" value="1" placeholder="1-3, 5" style="width: 100%; margin-top: 0.75rem;">
    </div>
  `;
}

function renderMetadataWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);
  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">METADATA EDITOR</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'दस्तावेज़ जानकारी' : 'Document Properties'}</h4>
      <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.6rem;">
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">${state.lang === 'hi' ? 'शीर्षक (Title)' : 'Title'}</label>
          <input type="text" id="meta-title" class="control-input" placeholder="Title" value="${file.name.replace('.pdf', '')}" style="width: 100%;">
        </div>
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">${state.lang === 'hi' ? 'लेखक (Author)' : 'Author'}</label>
          <input type="text" id="meta-author" class="control-input" placeholder="Author name" style="width: 100%;">
        </div>
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">${state.lang === 'hi' ? 'विषय (Subject)' : 'Subject'}</label>
          <input type="text" id="meta-subject" class="control-input" placeholder="Subject" style="width: 100%;">
        </div>
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">${state.lang === 'hi' ? 'कीवर्ड्स (Keywords — कोमा से अलग)' : 'Keywords (Comma separated)'}</label>
          <input type="text" id="meta-keywords" class="control-input" placeholder="finance, report, 2026" style="width: 100%;">
        </div>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">PRIVACY SANITIZER</span>
      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title" style="color: #ef4444;">${state.lang === 'hi' ? 'सारा मेटाडेटा हटाएं' : 'Sanitize & Wipe All Metadata'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'सारे लेखक, कंप्यूटर नाम और टाइमस्टैम्प हटाकर 100% अज्ञात बनाएं' : 'Strip all software tags, timestamps & authors for 100% anonymity'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" id="meta-sanitize">
          <span class="ios-slider"></span>
        </div>
      </label>
    </div>
  `;
}

function renderConverterWorkspace(preview, controls, toolId) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  const toolName = getToolT(toolId, 'name');
  const toolDesc = getToolT(toolId, 'desc');

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • SOURCE FILE</span>
      <h4 class="pro-step-title">${toolName}</h4>
      <p class="pro-step-desc">${toolDesc}</p>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • CONVERSION ENGINE</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'स्मार्ट इंजन सेटिंग्स' : 'Smart Engine Settings'}</h4>
      
      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'स्ट्रक्चर्ड लेआउट' : 'Preserve Layout & Tables'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'टेबल और पैराग्राफ को यथावत रखें' : 'Maintain exact text blocks & structure'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" id="conv-preserve-layout" checked>
          <span class="ios-slider"></span>
        </div>
      </label>

      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'लोकल प्राइवेसी मोड' : 'Client-Side Privacy'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? '100% ऑन-डिवाइस प्रोसेसिंग' : 'Zero cloud upload, 100% private'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" checked disabled>
          <span class="ios-slider"></span>
        </div>
      </label>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • EXPORT READY</span>
      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: #059669; font-weight: 600;">
        <i data-lucide="zap" style="width: 16px; height: 16px;"></i>
        <span>${state.lang === 'hi' ? 'क्लिक करते ही तुरंत कन्वर्जन शुरू होगा' : 'Ready for instant high-speed conversion'}</span>
      </div>
    </div>
  `;
}

// --- WORKSPACE RENDERERS ---

// 1. Merge Workspace
function renderMergeWorkspace(preview, controls) {
  renderMergeFileList(preview);
  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • DOCUMENT SEQUENCE</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'फाइलों का क्रम' : 'PDF Merge Sequence'}</h4>
      <p class="pro-step-desc">
        ${state.lang === 'hi' 
          ? 'फाइलों को ऊपर/नीचे करने के लिए तीरों का उपयोग करें। जिस क्रम में फाइलें होंगी, उसी क्रम में मर्ज होंगी।' 
          : 'Use arrows to reorder files. They will be merged in this exact sequence.'}
      </p>
      <div style="display: flex; gap: 0.5rem; margin-top: 0.35rem;">
        <button id="btn-sort-name" class="secondary-btn" style="flex: 1; padding: 0.45rem 0.65rem; font-size: 0.78rem; justify-content: center;">
          <i data-lucide="arrow-down-a-z" style="width: 14px; height: 14px;"></i>
          <span>${state.lang === 'hi' ? 'A to Z सॉर्ट' : 'Sort A to Z'}</span>
        </button>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • ADVANCED MERGE OPTIONS</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'प्रो मर्ज विकल्प' : 'Pro Options'}</h4>
      
      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'ब्लैंक पेज इन्सर्ट करें' : 'Insert Blank Page'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'डबल-साइड प्रिंटिंग के लिए हर डॉक्यूमेंट के बाद' : 'For duplex / double-sided printing'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" id="merge-blank-page">
          <span class="ios-slider"></span>
        </div>
      </label>

      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'ऑब्जेक्ट स्ट्रीम ऑप्टिमाइजेशन' : 'Fast Stream Optimization'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'मर्ज की गई फाइल का साइज़ ऑप्टिमाइज़ रखें' : 'Keep final PDF size compact'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" id="merge-optimize-stream" checked>
          <span class="ios-slider"></span>
        </div>
      </label>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • ASSEMBLY READY</span>
      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: #059669; font-weight: 600;">
        <i data-lucide="layers" style="width: 16px; height: 16px;"></i>
        <span>${state.uploadedFiles.length} ${state.lang === 'hi' ? 'फाइलें एक मास्टर PDF में जुड़ेंगी' : 'files will be combined'}</span>
      </div>
    </div>
  `;

  document.getElementById('btn-sort-name')?.addEventListener('click', () => {
    state.uploadedFiles.sort((a, b) => a.name.localeCompare(b.name));
    renderMergeFileList(preview);
    refreshLucide();
    showToast(state.lang === 'hi' ? 'फाइलें नाम अनुसार क्रमबद्ध हो गईं' : 'Files sorted alphabetically');
  });
}

function renderMergeFileList(preview) {
  preview.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h3 style="font-size: 1.15rem; font-weight: 700;">${state.uploadedFiles.length} ${t('selectFiles')}</h3>
      <button id="btn-clear-files" style="background: none; border: none; color: var(--primary); font-weight: 600; cursor: pointer; font-size: 0.85rem;">${t('clearAll')}</button>
    </div>
    <div class="file-list" id="merge-file-list">
      ${state.uploadedFiles.map((file, idx) => `
        <div class="file-item-card" data-idx="${idx}">
          <div class="file-item-info">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="file-text" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <div class="file-name">${file.name}</div>
              <div class="file-meta">${PDFEngine.formatBytes(file.size)}</div>
            </div>
          </div>
          <div class="file-actions">
            <button class="mini-action-btn btn-move-up" data-idx="${idx}" title="Move Up" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>
              <i data-lucide="arrow-up" style="width: 14px; height: 14px;"></i>
            </button>
            <button class="mini-action-btn btn-move-down" data-idx="${idx}" title="Move Down" ${idx === state.uploadedFiles.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>
              <i data-lucide="arrow-down" style="width: 14px; height: 14px;"></i>
            </button>
            <button class="mini-action-btn btn-remove-file" data-idx="${idx}" title="Delete" style="color: #dc2626;">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Attach re-ordering and delete listeners
  preview.querySelectorAll('.btn-move-up').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      if (idx > 0) {
        const temp = state.uploadedFiles[idx];
        state.uploadedFiles[idx] = state.uploadedFiles[idx - 1];
        state.uploadedFiles[idx - 1] = temp;
        renderMergeFileList(preview);
        refreshLucide();
      }
    });
  });

  preview.querySelectorAll('.btn-move-down').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      if (idx < state.uploadedFiles.length - 1) {
        const temp = state.uploadedFiles[idx];
        state.uploadedFiles[idx] = state.uploadedFiles[idx + 1];
        state.uploadedFiles[idx + 1] = temp;
        renderMergeFileList(preview);
        refreshLucide();
      }
    });
  });

  preview.querySelectorAll('.btn-remove-file').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      state.uploadedFiles.splice(idx, 1);
      if (state.uploadedFiles.length === 0) {
        document.getElementById('ws-dropzone').style.display = 'block';
        document.getElementById('ws-active-content').style.display = 'none';
      } else {
        renderMergeFileList(preview);
        refreshLucide();
      }
    });
  });

  document.getElementById('btn-clear-files')?.addEventListener('click', () => {
    state.uploadedFiles = [];
    document.getElementById('ws-dropzone').style.display = 'block';
    document.getElementById('ws-active-content').style.display = 'none';
  });
}

// 2. Split Workspace
function renderSplitWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • SPLIT MODE</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'विभाजन का तरीका' : 'Select Split Mode'}</h4>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; cursor: pointer; padding: 0.55rem; border-radius: 9px; background: rgba(255,255,255,0.45); border: 1px solid var(--glass-border);">
          <input type="radio" name="split-mode" value="range" checked id="split-mode-range">
          <div>
            <strong style="display:block;">${state.lang === 'hi' ? 'कस्टम पेज रेंज (Custom Range)' : 'Custom Page Range'}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${state.lang === 'hi' ? 'अपनी पसंद के खास पेज एक्सट्रैक्ट करें' : 'Extract custom pages: 1-4, 7'}</span>
          </div>
        </label>
        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; cursor: pointer; padding: 0.55rem; border-radius: 9px; background: rgba(255,255,255,0.45); border: 1px solid var(--glass-border);">
          <input type="radio" name="split-mode" value="all" id="split-mode-all">
          <div>
            <strong style="display:block;">${state.lang === 'hi' ? 'सभी अलग पेज (All Pages to ZIP)' : 'All Pages Separated'}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${state.lang === 'hi' ? 'हर पेज अलग पीडीएफ बनेगा' : 'Extract every page as standalone PDF'}</span>
          </div>
        </label>
        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; cursor: pointer; padding: 0.55rem; border-radius: 9px; background: rgba(255,255,255,0.45); border: 1px solid var(--glass-border);">
          <input type="radio" name="split-mode" value="even-odd" id="split-mode-even-odd">
          <div>
            <strong style="display:block;">${state.lang === 'hi' ? 'सम एवं विषम (Even & Odd Pages)' : 'Split Even & Odd Pages'}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${state.lang === 'hi' ? 'दो अलग फाइलों में विभाजित करें' : 'Create 2 PDFs: odd and even'}</span>
          </div>
        </label>
        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; cursor: pointer; padding: 0.55rem; border-radius: 9px; background: rgba(255,255,255,0.45); border: 1px solid var(--glass-border);">
          <input type="radio" name="split-mode" value="fixed" id="split-mode-fixed">
          <div>
            <strong style="display:block;">${state.lang === 'hi' ? 'निश्चित टुकड़ों में (Fixed Page Chunks)' : 'Fixed Page Chunks'}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${state.lang === 'hi' ? 'हर N पेजों का सेट बनाएं' : 'Split every N pages'}</span>
          </div>
        </label>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • PARAMETERS</span>
      <div class="control-group" id="range-input-container">
        <label class="control-label">${state.lang === 'hi' ? 'पेज रेंज दर्ज करें' : 'Page Range'}</label>
        <input type="text" class="control-input" id="split-range-input" value="1-3" placeholder="${getToolT('split', 'rangePlaceholder')}">
        <span style="font-size: 0.75rem; color: var(--text-muted);">${state.lang === 'hi' ? 'उदाहरण: 1-4, 7, 9-12' : 'Example: 1-4, 7, 9-12'}</span>
      </div>
      <div class="control-group" id="fixed-chunk-container" style="display: none;">
        <label class="control-label">${state.lang === 'hi' ? 'प्रति फाइल पेज संख्या' : 'Pages per Part'}</label>
        <input type="number" class="control-input" id="split-chunk-input" value="2" min="1" max="100">
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • EXPORT INFO</span>
      <div style="font-size: 0.8rem; color: var(--text-muted);" id="split-mode-desc">
        ${state.lang === 'hi' ? 'चयनित रेंज के पेज एक नई पीडीएफ फाइल में डाउनलोड होंगे।' : 'Selected page ranges will be saved as a new clean PDF.'}
      </div>
    </div>
  `;

  const radioRange = document.getElementById('split-mode-range');
  const radioAll = document.getElementById('split-mode-all');
  const radioEvenOdd = document.getElementById('split-mode-even-odd');
  const radioFixed = document.getElementById('split-mode-fixed');
  const rangeContainer = document.getElementById('range-input-container');
  const chunkContainer = document.getElementById('fixed-chunk-container');
  const descEl = document.getElementById('split-mode-desc');

  const updateSplitUI = () => {
    if (radioRange.checked) {
      rangeContainer.style.display = 'flex';
      chunkContainer.style.display = 'none';
      descEl.textContent = state.lang === 'hi' ? 'चयनित रेंज के पेज एक नई पीडीएफ फाइल में डाउनलोड होंगे।' : 'Selected pages will be saved into a single PDF.';
    } else if (radioAll.checked) {
      rangeContainer.style.display = 'none';
      chunkContainer.style.display = 'none';
      descEl.textContent = state.lang === 'hi' ? 'सभी अलग-अलग पेज एक .ZIP आर्काइव में डाउनलोड होंगे।' : 'Every page will be saved as its own PDF in a .ZIP file.';
    } else if (radioEvenOdd.checked) {
      rangeContainer.style.display = 'none';
      chunkContainer.style.display = 'none';
      descEl.textContent = state.lang === 'hi' ? 'दो पीडीएफ (even_pages.pdf और odd_pages.pdf) .ZIP में मिलेंगी।' : 'Even and Odd PDFs will be packaged in a .ZIP.';
    } else if (radioFixed.checked) {
      rangeContainer.style.display = 'none';
      chunkContainer.style.display = 'flex';
      descEl.textContent = state.lang === 'hi' ? 'पीडीएफ को समान टुकड़ों में बांटकर .ZIP में दिया जाएगा।' : 'PDF will be split into equal chunks in a .ZIP.';
    }
  };

  [radioRange, radioAll, radioEvenOdd, radioFixed].forEach((r) => r?.addEventListener('change', updateSplitUI));
}

// 3. Compress Workspace
function renderCompressWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • COMPRESSION LEVEL</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'कंप्रेशन क्षमता चुनें' : 'Select Compression Level'}</h4>
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        <label style="display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.65rem; border: 1.5px solid var(--card-border); border-radius: 10px; cursor: pointer; background: rgba(255,255,255,0.4);">
          <input type="radio" name="compress-level" value="extreme" style="margin-top: 3px;">
          <div>
            <strong style="font-size: 0.88rem; display: block;">${getToolT('compress', 'extreme')}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${state.lang === 'hi' ? 'अधिकतम फाइल साइज़ बचत (कम रेजोल्यूशन)' : 'Smallest size, lower image DPI'}</span>
          </div>
        </label>
        
        <label style="display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.65rem; border: 1.5px solid var(--primary); border-radius: 10px; cursor: pointer; background: rgba(244, 63, 94, 0.05);">
          <input type="radio" name="compress-level" value="recommended" checked style="margin-top: 3px;">
          <div>
            <strong style="font-size: 0.88rem; display: block; color: var(--primary);">${getToolT('compress', 'recommended')}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${state.lang === 'hi' ? 'उत्तम क्वालिटी और बढ़िया कंप्रेशन (अनुशंसित)' : 'High compression with good quality (Recommended)'}</span>
          </div>
        </label>

        <label style="display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.65rem; border: 1.5px solid var(--card-border); border-radius: 10px; cursor: pointer; background: rgba(255,255,255,0.4);">
          <input type="radio" name="compress-level" value="low" style="margin-top: 3px;">
          <div>
            <strong style="font-size: 0.88rem; display: block;">${getToolT('compress', 'low')}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${state.lang === 'hi' ? 'उच्चतम क्वालिटी, हल्का कंप्रेशन' : 'Highest quality, light compression'}</span>
          </div>
        </label>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • PRO OPTIMIZATION</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'अतिरिक्त विकल्प' : 'Pro Tweaks'}</h4>
      
      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'ग्रेस्केल (ब्लैक & व्हाइट)' : 'Convert to Grayscale'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'कलर हटाकर 60% अतिरिक्त साइज़ घटाएं' : 'Strip color channels for extra ~60% size drop'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" id="compress-grayscale">
          <span class="ios-slider"></span>
        </div>
      </label>

      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'मेटाडेटा ऑप्टिमाइजेशन' : 'Remove Metadata'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'अतिरिक्त हिडन टैग्स हटाएं' : 'Strip redundant PDF tags & objects'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" id="compress-strip-meta" checked>
          <span class="ios-slider"></span>
        </div>
      </label>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • ENGINE READY</span>
      <div style="font-size: 0.8rem; color: #059669; font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
        <i data-lucide="check" style="width: 15px; height: 15px;"></i>
        <span>${state.lang === 'hi' ? 'ऑन-डिवाइस वेब-वर्कर कंप्रेशन सक्रिय' : 'Client-side WebWorker ready'}</span>
      </div>
    </div>
  `;
}

// 4. PDF to Image Workspace
function renderPdfToImgWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • OUTPUT FORMAT</span>
      <div class="control-group">
        <label class="control-label">${getToolT('pdf-to-img', 'format')}</label>
        <select class="control-select" id="pdf-img-format">
          <option value="png">PNG (Lossless High Quality)</option>
          <option value="jpg">JPG (Smallest File Size)</option>
        </select>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • RESOLUTION & DPI</span>
      <div class="control-group">
        <label class="control-label">${getToolT('pdf-to-img', 'scale')}</label>
        <select class="control-select" id="pdf-img-dpi">
          <option value="4.166" selected>${state.lang === 'hi' ? 'स्टूडियो मास्टर Ultra-HD 300 DPI (अल्ट्रा क्लियर)' : 'Studio Master Ultra-HD 300 DPI (Crystal Clear)'}</option>
          <option value="3.0">${state.lang === 'hi' ? 'हाई डेफिनिशन 216 DPI (प्रिंट रेडी)' : 'High Definition 216 DPI (Print Ready)'}</option>
          <option value="2.0">${state.lang === 'hi' ? 'स्टैंडर्ड 150 DPI (फ़ास्ट)' : 'Standard 150 DPI (Fast)'}</option>
        </select>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • ARCHIVE PACKAGING</span>
      <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
        ${state.lang === 'hi' 
          ? 'सभी पेजों की हाई-रेजोल्यूशन इमेज एक .ZIP फाइल में सुरक्षित बंडल होंगी।' 
          : 'Converted page images will be packaged into a single ZIP archive.'}
      </div>
    </div>
  `;
}

// 5. Images to PDF Workspace
function renderImgToPdfWorkspace(preview, controls) {
  preview.innerHTML = `
    <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem;">${state.uploadedFiles.length} ${t('selectImages')}</h3>
    <div class="thumbnail-grid" id="img-grid">
      ${state.uploadedFiles.map((file, idx) => `
        <div class="page-thumbnail-card">
          <img src="${URL.createObjectURL(file)}" alt="Image ${idx + 1}" style="max-height: 140px; object-fit: contain;">
          <div class="page-thumbnail-num">${file.name}</div>
        </div>
      `).join('')}
    </div>
  `;

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • ORIENTATION</span>
      <div class="control-group">
        <label class="control-label">${getToolT('img-to-pdf', 'orientation')}</label>
        <select class="control-select" id="img-pdf-orientation">
          <option value="auto">Auto (Match Image)</option>
          <option value="portrait">${getToolT('img-to-pdf', 'portrait')}</option>
          <option value="landscape">${getToolT('img-to-pdf', 'landscape')}</option>
        </select>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • PAGE SIZE & MARGIN</span>
      <div class="control-group">
        <label class="control-label">${getToolT('img-to-pdf', 'pageSize')}</label>
        <select class="control-select" id="img-pdf-size">
          <option value="a4">A4 (Standard 210x297 mm)</option>
          <option value="letter">US Letter</option>
          <option value="fit">Fit (Same as Image Dimensions)</option>
        </select>
      </div>

      <div class="control-group">
        <label class="control-label">${getToolT('img-to-pdf', 'margin')}</label>
        <select class="control-select" id="img-pdf-margin">
          <option value="20">Normal (20px)</option>
          <option value="0">No Margin (Border to border)</option>
          <option value="40">Wide Margin (40px)</option>
        </select>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • BINDING</span>
      <div style="font-size: 0.8rem; color: #059669; font-weight: 600;">
        ✓ ${state.uploadedFiles.length} ${state.lang === 'hi' ? 'इमेज एक क्लीन PDF में जुड़ेंगी' : 'images will be bound into a single PDF'}
      </div>
    </div>
  `;
}

// 6. Rotate Workspace
function renderRotateWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • ROTATION ANGLE</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'रोटेशन एंगल चुनें' : 'Choose Rotation'}</h4>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <button class="secondary-btn" id="btn-rot-90" style="justify-content: center;">
          <i data-lucide="rotate-cw" style="width: 17px; height: 17px;"></i>
          <span>${getToolT('rotate', 'rotateRight')} (90° Clockwise)</span>
        </button>
        <button class="secondary-btn" id="btn-rot-270" style="justify-content: center;">
          <i data-lucide="rotate-ccw" style="width: 17px; height: 17px;"></i>
          <span>${getToolT('rotate', 'rotateLeft')} (90° Counter-CW)</span>
        </button>
        <button class="secondary-btn" id="btn-rot-180" style="justify-content: center;">
          <i data-lucide="refresh-cw" style="width: 17px; height: 17px;"></i>
          <span>${getToolT('rotate', 'flip')} (180° Invert)</span>
        </button>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • TARGET PAGES</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'किन पेजों को घुमाएं' : 'Target Pages'}</h4>
      <select class="control-select" id="rotate-target-pages">
        <option value="all">${state.lang === 'hi' ? 'सभी पेज (All Pages)' : 'All Pages'}</option>
        <option value="odd">${state.lang === 'hi' ? 'केवल विषम पेज (Odd Pages: 1, 3, 5...)' : 'Odd Pages Only'}</option>
        <option value="even">${state.lang === 'hi' ? 'केवल सम पेज (Even Pages: 2, 4, 6...)' : 'Even Pages Only'}</option>
        <option value="portrait">${state.lang === 'hi' ? 'केवल खड़े पेज (Portrait Pages Only)' : 'Portrait Pages Only'}</option>
        <option value="landscape">${state.lang === 'hi' ? 'केवल आड़े पेज (Landscape Pages Only)' : 'Landscape Pages Only'}</option>
      </select>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • CONFIRMATION</span>
      <div style="font-size: 0.8rem; color: var(--text-muted);">
        ${state.lang === 'hi' ? 'पेजों का ओरिएंटेशन सुरक्षित रूप से तुरंत बदल दिया जाएगा।' : 'Target page orientations will be updated losslessly.'}
      </div>
    </div>
  `;

  state.activeRotation = 90;

  const btn90 = document.getElementById('btn-rot-90');
  const btn270 = document.getElementById('btn-rot-270');
  const btn180 = document.getElementById('btn-rot-180');

  const highlightBtn = (active) => {
    [btn90, btn270, btn180].forEach((b) => {
      b.style.borderColor = 'var(--card-border)';
      b.style.color = 'var(--text-main)';
      b.style.background = 'transparent';
    });
    active.style.borderColor = 'var(--primary)';
    active.style.color = 'var(--primary)';
    active.style.background = 'rgba(244, 63, 94, 0.08)';
  };

  highlightBtn(btn90);

  btn90.addEventListener('click', () => { state.activeRotation = 90; highlightBtn(btn90); });
  btn270.addEventListener('click', () => { state.activeRotation = 270; highlightBtn(btn270); });
  btn180.addEventListener('click', () => { state.activeRotation = 180; highlightBtn(btn180); });
}

// 7. Organize Workspace (Interactive visual page management)
async function renderOrganizeWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  preview.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h3 style="font-size: 1.15rem; font-weight: 700;">${state.lang === 'hi' ? 'पेज व्यवस्थित करें (री-ऑर्डर / हटाएं)' : 'Organize Pages'}</h3>
      <span style="font-size: 0.85rem; color: var(--text-muted);" id="organize-page-count">Loading pages...</span>
    </div>
    <div class="thumbnail-grid" id="organize-grid"></div>
  `;

  controls.innerHTML = `
    <div style="background: var(--bg-main); padding: 1rem; border-radius: 12px; border: 1px solid var(--card-border);">
      <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem;">${state.lang === 'hi' ? 'पेज कैसे मैनेज करें' : 'How to Organize'}</h4>
      <ul style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; padding-left: 1.2rem;">
        <li>${state.lang === 'hi' ? 'तीर के बटन से पेजों का क्रम बदलें।' : 'Use arrows to change page order.'}</li>
        <li>${state.lang === 'hi' ? 'ट्रैश आइकन से गैर-ज़रूरी पेज हटाएं।' : 'Use trash icon to delete unwanted pages.'}</li>
        <li>${state.lang === 'hi' ? 'रोटेट आइकन से किसी खास पेज को घुमाएं।' : 'Use rotate icon to turn specific pages.'}</li>
      </ul>
    </div>
  `;

  // Render Thumbnails with PDF.js
  const buffer = await PDFEngine.fileToArrayBuffer(file);
  const pdfjs = window.pdfjsLib;
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const total = doc.numPages;

  state.organizePages = Array.from({ length: total }, (_, i) => ({
    origIndex: i,
    rotation: 0
  }));

  document.getElementById('organize-page-count').textContent = `${total} ${t('pageCount')}`;

  const grid = document.getElementById('organize-grid');
  grid.innerHTML = '';

  for (let i = 0; i < total; i++) {
    const card = document.createElement('div');
    card.className = 'page-thumbnail-card';
    card.id = `org-card-${i}`;

    const canvas = document.createElement('canvas');
    const page = await doc.getPage(i + 1);
    const viewport = page.getViewport({ scale: 0.35 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    card.innerHTML = `
      <div class="thumb-canvas-wrapper" id="thumb-canvas-${i}"></div>
      <div class="page-thumbnail-num">${t('pageCount')} ${i + 1}</div>
      <div class="page-card-actions">
        <button class="mini-action-btn btn-org-rotate" data-idx="${i}" title="${getToolT('organize', 'rotatePage')}">
          <i data-lucide="rotate-cw" style="width: 13px; height: 13px;"></i>
        </button>
        <button class="mini-action-btn btn-org-del" data-idx="${i}" title="${getToolT('organize', 'deletePage')}" style="color: #dc2626;">
          <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
        </button>
      </div>
    `;

    card.querySelector(`#thumb-canvas-${i}`).appendChild(canvas);
    grid.appendChild(card);
  }

  refreshLucide();

  // Attach organize action handlers
  grid.querySelectorAll('.btn-org-rotate').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.idx, 10);
      state.organizePages[idx].rotation = (state.organizePages[idx].rotation + 90) % 360;
      const cardCanvas = grid.querySelector(`#thumb-canvas-${idx} canvas`);
      if (cardCanvas) {
        cardCanvas.style.transform = `rotate(${state.organizePages[idx].rotation}deg)`;
        cardCanvas.style.transition = 'transform 0.2s ease';
      }
    });
  });

  grid.querySelectorAll('.btn-org-del').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.idx, 10);
      const card = document.getElementById(`org-card-${idx}`);
      if (card) {
        card.style.opacity = '0.25';
        card.style.pointerEvents = 'none';
      }
      state.organizePages[idx].deleted = true;
      showToast(state.lang === 'hi' ? `पेज ${idx + 1} हटाया गया` : `Page ${idx + 1} removed`);
    });
  });
}

// 8. Watermark Workspace (Advanced Text & Image Logo Stamps)
function renderWatermarkWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  const wmType = state.watermarkState.type || 'text';

  controls.innerHTML = `
    <!-- Mode Switcher Tabs -->
    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; background: rgba(0,0,0,0.04); padding: 4px; border-radius: 10px; border: 1px solid var(--card-border);">
      <button id="wm-mode-text" class="secondary-btn" style="flex: 1; justify-content: center; padding: 0.45rem; font-size: 0.8rem; font-weight: 700; ${wmType === 'text' ? 'background: var(--primary); color: #fff; border-color: var(--primary);' : 'background: transparent; border-color: transparent;'}">
        ✍️ ${state.lang === 'hi' ? 'टेक्स्ट वॉटरमार्क' : 'Text Watermark'}
      </button>
      <button id="wm-mode-image" class="secondary-btn" style="flex: 1; justify-content: center; padding: 0.45rem; font-size: 0.8rem; font-weight: 700; ${wmType === 'image' ? 'background: var(--primary); color: #fff; border-color: var(--primary);' : 'background: transparent; border-color: transparent;'}">
        🖼️ ${state.lang === 'hi' ? 'लोगो / स्टाम्प इमेज' : 'Logo / Stamp Image'}
      </button>
    </div>

    <!-- Step 1: Content (Text or Image) -->
    <div class="pro-step-card" id="wm-text-panel" style="${wmType === 'text' ? 'display:block;' : 'display:none;'}">
      <span class="pro-step-badge">STEP 1 • TEXT CONTENT</span>
      <div class="control-group">
        <label class="control-label">${getToolT('watermark', 'textLabel')}</label>
        <input type="text" class="control-input" id="wm-text" value="${state.watermarkState.text || 'CONFIDENTIAL'}">
      </div>
      <div style="display: flex; gap: 0.35rem; margin-top: 0.35rem; flex-wrap: wrap;">
        <button class="secondary-btn wm-preset-btn" data-text="CONFIDENTIAL" style="padding: 0.3rem 0.5rem; font-size: 0.72rem;">CONFIDENTIAL</button>
        <button class="secondary-btn wm-preset-btn" data-text="DRAFT" style="padding: 0.3rem 0.5rem; font-size: 0.72rem;">DRAFT</button>
        <button class="secondary-btn wm-preset-btn" data-text="APPROVED" style="padding: 0.3rem 0.5rem; font-size: 0.72rem;">APPROVED</button>
        <button class="secondary-btn wm-preset-btn" data-text="SAMPLE" style="padding: 0.3rem 0.5rem; font-size: 0.72rem;">SAMPLE</button>
        <button class="secondary-btn wm-preset-btn" data-text="COPY" style="padding: 0.3rem 0.5rem; font-size: 0.72rem;">COPY</button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.75rem;">
        <div class="control-group">
          <label class="control-label">${getToolT('watermark', 'fontSize')}</label>
          <input type="range" min="16" max="96" value="${state.watermarkState.fontSize}" id="wm-size" style="accent-color: var(--primary);">
          <span style="font-size: 0.75rem; color: var(--text-muted);" id="wm-size-val">${state.watermarkState.fontSize} pt</span>
        </div>
        <div class="control-group">
          <label class="control-label">${state.lang === 'hi' ? 'टेक्स्ट कलर' : 'Color'}</label>
          <select class="control-select" id="wm-color">
            <option value="#dc2626" ${state.watermarkState.color === '#dc2626' ? 'selected' : ''}>🔴 Crimson Red</option>
            <option value="#0071e3" ${state.watermarkState.color === '#0071e3' ? 'selected' : ''}>🔵 Cupertino Blue</option>
            <option value="#374151" ${state.watermarkState.color === '#374151' ? 'selected' : ''}>⚪ Slate Charcoal</option>
            <option value="#000000" ${state.watermarkState.color === '#000000' ? 'selected' : ''}>⚫ Pure Black</option>
            <option value="#d97706" ${state.watermarkState.color === '#d97706' ? 'selected' : ''}>🟠 Warning Amber</option>
            <option value="#059669" ${state.watermarkState.color === '#059669' ? 'selected' : ''}>🟢 Certified Green</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Step 1 (Alternative): Image / Logo Upload -->
    <div class="pro-step-card" id="wm-image-panel" style="${wmType === 'image' ? 'display:block;' : 'display:none;'}">
      <span class="pro-step-badge">STEP 1 • LOGO / STAMP FILE</span>
      <div class="control-group">
        <label class="control-label">${state.lang === 'hi' ? 'पीएनजी या जेपीईजी लोगो चुनें' : 'Choose PNG / JPEG Logo'}</label>
        <input type="file" id="wm-image-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style="font-size: 0.8rem; width: 100%;">
      </div>
      <div id="wm-image-preview-box" style="margin-top: 0.5rem; text-align: center; ${state.watermarkState.imageDataUrl ? '' : 'display: none;'}">
        <img id="wm-image-thumb" src="${state.watermarkState.imageDataUrl || ''}" alt="Logo Thumbnail" style="max-height: 70px; border-radius: 6px; border: 1px solid var(--card-border); padding: 4px; background: rgba(255,255,255,0.7);">
      </div>
      <div class="control-group" style="margin-top: 0.5rem;">
        <label class="control-label">${state.lang === 'hi' ? 'लोगो स्केल / साइज़' : 'Logo Scale'}</label>
        <input type="range" min="0.1" max="1.0" step="0.05" value="${state.watermarkState.imageScale || 0.5}" id="wm-img-scale" style="accent-color: var(--primary);">
        <span style="font-size: 0.75rem; color: var(--text-muted);" id="wm-img-scale-val">${Math.round((state.watermarkState.imageScale || 0.5) * 100)}%</span>
      </div>
    </div>

    <!-- Step 2: Styling & Position -->
    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • OPACITY & ROTATION</span>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        <div class="control-group">
          <label class="control-label">${getToolT('watermark', 'opacity')}</label>
          <input type="range" min="0.05" max="1.0" step="0.05" value="${state.watermarkState.opacity}" id="wm-opacity" style="accent-color: var(--primary);">
          <span style="font-size: 0.75rem; color: var(--text-muted);" id="wm-opacity-val">${Math.round(state.watermarkState.opacity * 100)}%</span>
        </div>

        <div class="control-group">
          <label class="control-label">${getToolT('watermark', 'rotation')}</label>
          <input type="range" min="-90" max="90" value="${state.watermarkState.rotation}" id="wm-rotation" style="accent-color: var(--primary);">
          <span style="font-size: 0.75rem; color: var(--text-muted);" id="wm-rotation-val">${state.watermarkState.rotation}°</span>
        </div>
      </div>

      <div style="display: flex; gap: 0.35rem; margin-top: 0.4rem;">
        <button class="secondary-btn wm-angle-btn" data-angle="0" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; flex: 1; justify-content: center;">0°</button>
        <button class="secondary-btn wm-angle-btn" data-angle="45" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; flex: 1; justify-content: center;">45°</button>
        <button class="secondary-btn wm-angle-btn" data-angle="-45" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; flex: 1; justify-content: center;">-45°</button>
        <button class="secondary-btn wm-angle-btn" data-angle="90" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; flex: 1; justify-content: center;">90°</button>
      </div>

      <div class="control-group" style="margin-top: 0.75rem;">
        <label class="control-label">${getToolT('watermark', 'position')}</label>
        <div class="position-grid">
          <button class="pos-btn" data-pos="top-left"></button>
          <button class="pos-btn" data-pos="top-center"></button>
          <button class="pos-btn" data-pos="top-right"></button>
          <button class="pos-btn" data-pos="center-left"></button>
          <button class="pos-btn active" data-pos="center"></button>
          <button class="pos-btn" data-pos="center-right"></button>
          <button class="pos-btn" data-pos="bottom-left"></button>
          <button class="pos-btn" data-pos="bottom-center"></button>
          <button class="pos-btn" data-pos="bottom-right"></button>
        </div>
      </div>
    </div>

    <!-- Step 3: Target Pages -->
    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • TARGET PAGES</span>
      <select class="control-select" id="wm-target-pages">
        <option value="all">${state.lang === 'hi' ? 'सभी पेजों पर लागू करें (All Pages)' : 'All Pages'}</option>
        <option value="first">${state.lang === 'hi' ? 'केवल पहले पेज पर (First Page Only)' : 'First Page Only'}</option>
        <option value="exclude-first">${state.lang === 'hi' ? 'कवर पेज छोड़कर (Exclude Cover Page)' : 'Exclude Cover Page'}</option>
        <option value="odd">${state.lang === 'hi' ? 'केवल विषम पेज (Odd Pages: 1, 3, 5...)' : 'Odd Pages Only'}</option>
        <option value="even">${state.lang === 'hi' ? 'केवल सम पेज (Even Pages: 2, 4, 6...)' : 'Even Pages Only'}</option>
      </select>
    </div>
  `;

  // Mode tab switching
  const btnModeText = document.getElementById('wm-mode-text');
  const btnModeImg = document.getElementById('wm-mode-image');
  const panelText = document.getElementById('wm-text-panel');
  const panelImg = document.getElementById('wm-image-panel');

  btnModeText.addEventListener('click', () => {
    state.watermarkState.type = 'text';
    btnModeText.style.background = 'var(--primary)';
    btnModeText.style.color = '#fff';
    btnModeText.style.borderColor = 'var(--primary)';
    btnModeImg.style.background = 'transparent';
    btnModeImg.style.color = 'var(--text-main)';
    btnModeImg.style.borderColor = 'transparent';
    panelText.style.display = 'block';
    panelImg.style.display = 'none';
  });

  btnModeImg.addEventListener('click', () => {
    state.watermarkState.type = 'image';
    btnModeImg.style.background = 'var(--primary)';
    btnModeImg.style.color = '#fff';
    btnModeImg.style.borderColor = 'var(--primary)';
    btnModeText.style.background = 'transparent';
    btnModeText.style.color = 'var(--text-main)';
    btnModeText.style.borderColor = 'transparent';
    panelImg.style.display = 'block';
    panelText.style.display = 'none';
  });

  // Attach controls listeners
  document.getElementById('wm-size').addEventListener('input', (e) => {
    state.watermarkState.fontSize = parseInt(e.target.value, 10);
    document.getElementById('wm-size-val').textContent = `${e.target.value} pt`;
  });

  document.getElementById('wm-color').addEventListener('change', (e) => {
    state.watermarkState.color = e.target.value;
  });

  document.getElementById('wm-opacity').addEventListener('input', (e) => {
    state.watermarkState.opacity = parseFloat(e.target.value);
    document.getElementById('wm-opacity-val').textContent = `${Math.round(e.target.value * 100)}%`;
  });

  document.getElementById('wm-rotation').addEventListener('input', (e) => {
    state.watermarkState.rotation = parseInt(e.target.value, 10);
    document.getElementById('wm-rotation-val').textContent = `${e.target.value}°`;
  });

  document.getElementById('wm-img-scale')?.addEventListener('input', (e) => {
    state.watermarkState.imageScale = parseFloat(e.target.value);
    document.getElementById('wm-img-scale-val').textContent = `${Math.round(e.target.value * 100)}%`;
  });

  // Logo File upload
  document.getElementById('wm-image-file')?.addEventListener('change', (e) => {
    const imgFile = e.target.files[0];
    if (imgFile) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        state.watermarkState.imageDataUrl = ev.target.result;
        const previewBox = document.getElementById('wm-image-preview-box');
        const previewThumb = document.getElementById('wm-image-thumb');
        if (previewBox && previewThumb) {
          previewThumb.src = ev.target.result;
          previewBox.style.display = 'block';
        }
        showToast(state.lang === 'hi' ? 'लोगो सफलतापूर्वक लोड हुआ' : 'Logo image loaded');
      };
      reader.readAsDataURL(imgFile);
    }
  });

  // Quick Angle buttons
  controls.querySelectorAll('.wm-angle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const angle = parseInt(btn.dataset.angle, 10);
      state.watermarkState.rotation = angle;
      document.getElementById('wm-rotation').value = angle;
      document.getElementById('wm-rotation-val').textContent = `${angle}°`;
    });
  });

  controls.querySelectorAll('.pos-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      controls.querySelectorAll('.pos-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.watermarkState.position = btn.dataset.pos;
    });
  });

  controls.querySelectorAll('.wm-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.text;
      document.getElementById('wm-text').value = text;
      state.watermarkState.text = text;
    });
  });
}

// 9. Page Numbers Workspace
function renderPageNumbersWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • NUMBERING STYLE</span>
      <div class="control-group">
        <label class="control-label">${getToolT('page-numbers', 'formatLabel')}</label>
        <select class="control-select" id="pn-format">
          <option value="Page {n} of {total}">Page 1 of 5 (Standard Report)</option>
          <option value="{n}">1, 2, 3... (Minimal Arabic)</option>
          <option value="- {n} -">- 1 - (Hyphen Accent)</option>
          <option value="{n} / {total}">1 / 5 (Slash Format)</option>
          <option value="roman-lower">i, ii, iii... (Roman Lowercase)</option>
          <option value="roman-upper">I, II, III... (Roman Uppercase Legal)</option>
          <option value="roman-lower-of">i of v (Roman of Total)</option>
          <option value="roman-upper-of">I of V (Roman of Total)</option>
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        <div class="control-group">
          <label class="control-label">${state.lang === 'hi' ? 'प्रीफिक्स (Prefix)' : 'Prefix (Optional)'}</label>
          <input type="text" class="control-input" id="pn-prefix" placeholder="e.g. DOC-">
        </div>
        <div class="control-group">
          <label class="control-label">${state.lang === 'hi' ? 'सफिक्स (Suffix)' : 'Suffix (Optional)'}</label>
          <input type="text" class="control-input" id="pn-suffix" placeholder="e.g. -FINAL">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        <div class="control-group">
          <label class="control-label">${state.lang === 'hi' ? 'शुरुआती नंबर' : 'Start Number'}</label>
          <input type="number" class="control-input" id="pn-start-from" value="1" min="1" max="9999">
        </div>
        <div class="control-group">
          <label class="control-label">${state.lang === 'hi' ? 'फॉन्ट साइज़' : 'Font Size'}</label>
          <input type="number" class="control-input" id="pn-size" value="11" min="8" max="28">
        </div>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • PLACEMENT & MARGIN</span>
      
      <div class="control-group">
        <label class="control-label">${getToolT('page-numbers', 'positionLabel')}</label>
        <select class="control-select" id="pn-position">
          <option value="bottom-center">Bottom Center (अनुशंसित / Standard)</option>
          <option value="bottom-right">Bottom Right (Book Outer)</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="top-center">Top Center (Running Header)</option>
          <option value="top-right">Top Right (Header Right)</option>
          <option value="top-left">Top Left (Header Left)</option>
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        <div class="control-group">
          <label class="control-label">${state.lang === 'hi' ? 'मार्जिन (दूरी)' : 'Margin (Points)'}</label>
          <input type="number" class="control-input" id="pn-margin" value="30" min="10" max="100">
        </div>
        <div class="control-group">
          <label class="control-label">${state.lang === 'hi' ? 'टेक्स्ट कलर' : 'Number Color'}</label>
          <select class="control-select" id="pn-color">
            <option value="#333333">${state.lang === 'hi' ? 'डार्क ग्रे (#333)' : 'Dark Charcoal'}</option>
            <option value="#000000">${state.lang === 'hi' ? 'प्योर ब्लैक (#000)' : 'Pure Black'}</option>
            <option value="#0071e3">${state.lang === 'hi' ? 'क्यूपर्टिनो ब्लू' : 'Cupertino Blue'}</option>
            <option value="#64748b">${state.lang === 'hi' ? 'सॉफ्ट स्लेट' : 'Soft Slate'}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • EXCLUSION RULES</span>
      
      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${getToolT('page-numbers', 'excludeFirst')}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'कवर / टाइटल पेज पर नंबर प्रिंट न करें' : 'Do not number title page'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" id="pn-exclude-cover" checked>
          <span class="ios-slider"></span>
        </div>
      </label>
    </div>
  `;
}

// 10. Sign Workspace (Draw, Type, Upload signature)
async function renderSignWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];

  preview.innerHTML = `
    <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.75rem;">${getToolT('sign', 'name')}</h3>
    
    <!-- Signature Creator Modes -->
    <div style="background: var(--bg-main); border: 1px solid var(--card-border); border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem;">
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
        <button class="nav-tab-btn active" id="tab-sig-draw">${getToolT('sign', 'drawTab')}</button>
        <button class="nav-tab-btn" id="tab-sig-type">${getToolT('sign', 'typeTab')}</button>
      </div>

      <!-- Mode 1: Draw Canvas -->
      <div id="sig-draw-pane">
        <div class="signature-box">
          <canvas id="sig-canvas" class="signature-canvas"></canvas>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.82rem; font-weight: 600;">${getToolT('sign', 'signatureColor')}:</span>
            <button class="sig-color-btn" data-color="#000000" style="width: 24px; height: 24px; border-radius: 50%; background: #000000; border: 2px solid white; cursor: pointer;"></button>
            <button class="sig-color-btn" data-color="#2563eb" style="width: 24px; height: 24px; border-radius: 50%; background: #2563eb; border: 2px solid white; cursor: pointer;"></button>
            <button class="sig-color-btn" data-color="#dc2626" style="width: 24px; height: 24px; border-radius: 50%; background: #dc2626; border: 2px solid white; cursor: pointer;"></button>
          </div>
          <button class="secondary-btn" id="btn-clear-sig" style="padding: 0.4rem 0.85rem; font-size: 0.82rem;">${getToolT('sign', 'clearSign')}</button>
        </div>
      </div>

      <!-- Mode 2: Type Text -->
      <div id="sig-type-pane" style="display: none;">
        <input type="text" id="sig-type-input" class="signature-types-input" placeholder="Type your signature...">
      </div>
    </div>

    <!-- PDF Page Preview for Placement -->
    <div>
      <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem;">${getToolT('sign', 'dragNote')}</h4>
      <div style="position: relative; display: inline-block; border: 1.5px solid var(--card-border); border-radius: 12px; overflow: hidden;" id="sig-preview-wrapper">
        <canvas id="sig-pdf-canvas"></canvas>
        <div id="sig-draggable-stamp" style="position: absolute; bottom: 15%; left: 50%; transform: translateX(-50%); border: 2px dashed var(--primary); padding: 4px; background: rgba(225,29,72,0.08); border-radius: 6px; cursor: move; user-select: none;">
          <img id="sig-stamp-img" style="max-height: 50px; display: block;" alt="Signature">
        </div>
      </div>
    </div>
  `;

  controls.innerHTML = `
    <div class="control-group">
      <label class="control-label">${state.lang === 'hi' ? 'किस पेज पर साइन करें' : 'Target Page'}</label>
      <select class="control-select" id="sig-page-select"></select>
    </div>

    <div class="control-group">
      <label class="control-label">${state.lang === 'hi' ? 'हस्ताक्षर का साइज़' : 'Signature Size'}</label>
      <input type="range" min="15" max="60" value="30" id="sig-width-range" style="accent-color: var(--primary);">
    </div>
  `;

  // Init Signature Drawing Canvas
  initSignatureDrawing();

  // Render Page Preview
  const buffer = await PDFEngine.fileToArrayBuffer(file);
  const pdfjs = window.pdfjsLib;
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pageSelect = document.getElementById('sig-page-select');

  for (let p = 1; p <= doc.numPages; p++) {
    const opt = document.createElement('option');
    opt.value = p - 1;
    opt.textContent = `${t('pageCount')} ${p}`;
    pageSelect.appendChild(opt);
  }

  const renderSignPage = async (pageIdx) => {
    const page = await doc.getPage(pageIdx + 1);
    const canvas = document.getElementById('sig-pdf-canvas');
    const viewport = page.getViewport({ scale: 0.8 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  };

  await renderSignPage(0);

  pageSelect.addEventListener('change', async (e) => {
    state.signatureState.pageIndex = parseInt(e.target.value, 10);
    await renderSignPage(state.signatureState.pageIndex);
  });
}

function initSignatureDrawing() {
  const canvas = document.getElementById('sig-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width || 400;
  canvas.height = rect.height || 180;

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let isDrawing = false;

  const getPos = (e) => {
    const cRect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - cRect.left,
      y: clientY - cRect.top
    };
  };

  const startDraw = (e) => {
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    updateSignatureStamp();
  };

  const stopDraw = () => {
    if (isDrawing) {
      isDrawing = false;
      updateSignatureStamp();
    }
  };

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  document.getElementById('btn-clear-sig')?.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.signatureState.dataUrl = null;
    const stamp = document.getElementById('sig-stamp-img');
    if (stamp) stamp.src = '';
  });

  // Color options
  document.querySelectorAll('.sig-color-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ctx.strokeStyle = btn.dataset.color;
      state.signatureState.color = btn.dataset.color;
    });
  });

  // Mode switching (Draw vs Type)
  const tabDraw = document.getElementById('tab-sig-draw');
  const tabType = document.getElementById('tab-sig-type');
  const paneDraw = document.getElementById('sig-draw-pane');
  const paneType = document.getElementById('sig-type-pane');

  tabDraw?.addEventListener('click', () => {
    tabDraw.classList.add('active');
    tabType.classList.remove('active');
    paneDraw.style.display = 'block';
    paneType.style.display = 'none';
    state.signatureState.mode = 'draw';
    updateSignatureStamp();
  });

  tabType?.addEventListener('click', () => {
    tabType.classList.add('active');
    tabDraw.classList.remove('active');
    paneType.style.display = 'block';
    paneDraw.style.display = 'none';
    state.signatureState.mode = 'type';
    updateSignatureStamp();
  });

  document.getElementById('sig-type-input')?.addEventListener('input', () => {
    updateSignatureStamp();
  });
}

function updateSignatureStamp() {
  const stamp = document.getElementById('sig-stamp-img');
  if (!stamp) return;

  if (state.signatureState.mode === 'draw') {
    const canvas = document.getElementById('sig-canvas');
    if (canvas) {
      const data = canvas.toDataURL('image/png');
      state.signatureState.dataUrl = data;
      stamp.src = data;
    }
  } else {
    const text = document.getElementById('sig-type-input')?.value || 'Signature';
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 120;
    const ctx = c.getContext('2d');
    ctx.font = '64px "Dancing Script", cursive';
    ctx.fillStyle = state.signatureState.color || '#000000';
    ctx.fillText(text, 20, 80);
    const data = c.toDataURL('image/png');
    state.signatureState.dataUrl = data;
    stamp.src = data;
  }
}

// 11. Protect Workspace
function renderProtectWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • ENCRYPTION KEY</span>
      <div class="control-group">
        <label class="control-label">${getToolT('protect', 'passwordLabel')}</label>
        <input type="password" class="control-input" id="protect-pw" placeholder="••••••••">
      </div>

      <div class="control-group">
        <label class="control-label">${getToolT('protect', 'confirmPasswordLabel')}</label>
        <input type="password" class="control-input" id="protect-confirm-pw" placeholder="••••••••">
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • PERMISSIONS & RIGHTS</span>
      
      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'प्रिंटिंग लॉक करें' : 'Lock Document Printing'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'दस्तावेज़ को प्रिंट न करने दें' : 'Prevent printing without permission'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" id="protect-no-print" checked>
          <span class="ios-slider"></span>
        </div>
      </label>

      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'कंटेंट कॉपी लॉक करें' : 'Lock Content Copying'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'टेक्स्ट या इमेज कॉपी करने पर रोक' : 'Prevent extracting text or graphics'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" id="protect-no-copy" checked>
          <span class="ios-slider"></span>
        </div>
      </label>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • SECURITY GUARANTEE</span>
      <div style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 10px; padding: 0.75rem; font-size: 0.8rem; color: #059669; line-height: 1.4;">
        🔒 <strong>100% Client-Side AES Security:</strong> ${state.lang === 'hi' 
          ? 'पासवर्ड आपके डिवाइस पर ही सुरक्षित रहता है, कभी इंटरनेट पर नहीं भेजा जाता।' 
          : 'Encryption occurs locally with zero network transmission.'}
      </div>
    </div>
  `;
}

// 12. Unlock Workspace
function renderUnlockWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • CREDENTIALS</span>
      <div class="control-group">
        <label class="control-label">${getToolT('unlock', 'enterPassword')}</label>
        <input type="password" class="control-input" id="unlock-pw" placeholder="••••••••">
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • UNLOCK ENGINE</span>
      <div style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.45;">
        ${state.lang === 'hi'
          ? 'पासवर्ड सत्यापन के बाद पीडीएफ से एन्क्रिप्शन सुरक्षा हटाकर पूरी तरह अनलॉक्ड क्लीन कॉपी तैयार की जाएगी।'
          : 'After password verification, encryption constraints are stripped and a clean unencrypted PDF is generated.'}
      </div>
    </div>
  `;
}

// 13. PDF to Text Workspace
function renderPdfToTextWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • DOCUMENT SOURCE</span>
      <h4 class="pro-step-title">${getToolT('pdf-to-text', 'name')}</h4>
      <p class="pro-step-desc">${getToolT('pdf-to-text', 'desc')}</p>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • EXTRACTION ENGINE</span>
      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'पेज सेपरेटर शामिल करें' : 'Include Page Dividers'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? '--- Page 1 --- मार्कर्स लगाएं' : 'Format text with page boundary markers'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" id="text-page-markers" checked>
          <span class="ios-slider"></span>
        </div>
      </label>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • EXPORT AS TXT</span>
      <div style="font-size: 0.8rem; color: #059669; font-weight: 600;">
        ⚡ ${state.lang === 'hi' ? 'सभी पेजों का टेक्स्ट .txt फाइल में तुरंत एक्सट्रैक्ट होगा' : 'Instant plain text export (.txt)'}
      </div>
    </div>
  `;
}

// 14. Crop Workspace
function renderCropWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • CROP MARGINS</span>
      <h4 class="pro-step-title">${getToolT('crop', 'cropMargins')}</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.35rem;">
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Top (px)</span>
          <input type="number" class="control-input" id="crop-top" value="40" min="0">
        </div>
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Bottom (px)</span>
          <input type="number" class="control-input" id="crop-bottom" value="40" min="0">
        </div>
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Left (px)</span>
          <input type="number" class="control-input" id="crop-left" value="30" min="0">
        </div>
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Right (px)</span>
          <input type="number" class="control-input" id="crop-right" value="30" min="0">
        </div>
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • TARGET PAGES</span>
      <label class="ios-toggle-label">
        <div class="ios-toggle-text">
          <span class="ios-toggle-title">${state.lang === 'hi' ? 'सभी पेजों पर समान क्रॉप' : 'Apply to All Pages'}</span>
          <span class="ios-toggle-subtitle">${state.lang === 'hi' ? 'पूरी डॉक्यूमेंट के मार्जिन ट्रिम करें' : 'Uniform crop across all pages'}</span>
        </div>
        <div class="ios-switch">
          <input type="checkbox" checked disabled>
          <span class="ios-slider"></span>
        </div>
      </label>
    </div>
  `;
}

// 15. Annotate Workspace
function renderAnnotateWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • ANNOTATION NOTE</span>
      <div class="control-group">
        <label class="control-label">${state.lang === 'hi' ? 'टेक्स्ट नोट दर्ज करें' : 'Note Content'}</label>
        <input type="text" class="control-input" id="ann-text" placeholder="e.g. Approved by Director">
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • TYPOGRAPHY</span>
      <div class="control-group">
        <label class="control-label">${state.lang === 'hi' ? 'फॉन्ट साइज़' : 'Font Size'}</label>
        <input type="number" class="control-input" id="ann-fontsize" value="16" min="10" max="48">
      </div>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 3 • PLACEMENT</span>
      <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
        ${state.lang === 'hi' 
          ? 'नोट पहले पेज के शीर्ष भाग पर सुरक्षित रूप से एम्बेड हो जाएगा। या पूरे विजुअल एडिटर का उपयोग करें।' 
          : 'Note will be permanently embedded. For full interactive editing, use the Visual PDF Editor.'}
      </p>
    </div>
  `;
}

// 16. Repair Workspace
function renderRepairWorkspace(preview, controls) {
  const file = state.uploadedFiles[0];
  renderSingleFileInfo(preview, file);

  controls.innerHTML = `
    <div class="pro-step-card">
      <span class="pro-step-badge">STEP 1 • DIAGNOSTICS</span>
      <h4 class="pro-step-title">${state.lang === 'hi' ? 'स्वचालित पीडीएफ रिपेयर' : 'Automatic PDF Repair'}</h4>
      <p class="pro-step-desc">
        ${state.lang === 'hi'
          ? 'क्षतिग्रस्त XRef टेबल्स और करप्ट हेडर ऑब्जेक्ट्स का पुनर्निर्माण किया जाएगा।'
          : 'Rebuilds damaged cross-reference tables and restores corrupted stream headers.'}
      </p>
    </div>

    <div class="pro-step-card" style="margin-top: 0.75rem;">
      <span class="pro-step-badge">STEP 2 • ENGINE RECOVERY</span>
      <div style="font-size: 0.82rem; color: #0d9488; font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
        <i data-lucide="wrench" style="width: 16px; height: 16px;"></i>
        <span>${state.lang === 'hi' ? 'लॉसलेस रिकवरी मोड तैयार' : 'Lossless structure restoration ready'}</span>
      </div>
    </div>
  `;
}

function renderGenericFileList(preview) {
  if (state.uploadedFiles.length === 1) {
    renderSingleFileInfo(preview, state.uploadedFiles[0]);
  } else {
    renderMergeFileList(preview);
  }
}

// Helper: Render Single File Card
function renderSingleFileInfo(preview, file) {
  preview.innerHTML = `
    <div style="background: var(--bg-main); border: 1px solid var(--card-border); border-radius: 14px; padding: 1.5rem; display: flex; align-items: center; gap: 1rem;">
      <div style="width: 52px; height: 52px; border-radius: 12px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="file-text" style="width: 28px; height: 28px;"></i>
      </div>
      <div style="flex: 1; overflow: hidden;">
        <div style="font-weight: 750; font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">
          ${PDFEngine.formatBytes(file.size)} • ${file.type || 'PDF Document'}
        </div>
      </div>
      <button id="btn-change-file" class="secondary-btn" style="padding: 0.5rem 0.85rem; font-size: 0.85rem;">
        ${state.lang === 'hi' ? 'बदलें' : 'Change'}
      </button>
    </div>
  `;

  document.getElementById('btn-change-file')?.addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
}

// --- 17. AI Voice Dictation & Multi-Language Smart Writer Workspace ---
function renderVoiceWriterWorkspace(preview, controls) {
  if (!state.voiceState.engine) {
    state.voiceState.engine = new SmartWriterEngine();
  }

  const vState = state.voiceState;
  const isHi = state.lang === 'hi';

  preview.innerHTML = `
    <div class="voice-hero-studio">
      <!-- Top Studio Banner -->
      <div style="background: var(--glass-bg); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); border: 1px solid var(--glass-border); border-radius: var(--radius-xl); padding: 1.5rem 1.75rem; box-shadow: var(--shadow-card), var(--glass-specular); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem;">
            <span class="pro-step-badge" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e; border-color: rgba(244, 63, 94, 0.35);">
              🎙️ AI VOICE WRITER PRO
            </span>
            <span style="font-size: 0.8rem; color: #10b981; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
              ● 100% On-Device Speech API
            </span>
          </div>
          <h2 style="font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em;">
            ${isHi ? 'आवाज़ से बोलकर लिखें & स्मार्ट ट्रांसलेट' : 'AI Voice Dictation & Smart Writer'}
          </h2>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.2rem;">
            ${isHi 
              ? 'किसी भी भाषा (हिन्दी, इंग्लिश आदि) में बोलें — लाइव ट्रांसक्रिप्शन, प्रोफ़ेशनल/कैज़ुअल टोन कन्वर्जन और कस्टमाइज़्ड डॉक्युमेंट क्रिएटर' 
              : 'Speak in any language — live transcription, tone transformation (Professional/Casual), and customized document drafting.'}
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button id="btn-voice-clear" class="secondary-btn" style="padding: 0.55rem 0.95rem; font-size: 0.85rem;">
            <i data-lucide="trash-2" style="width: 15px; height: 15px; color: #ef4444;"></i>
            <span>${isHi ? 'नया ड्राफ्ट' : 'Clear All'}</span>
          </button>
        </div>
      </div>

      <!-- STEP 1: Live Voice Recording Studio & Transcript -->
      <div class="pro-step-card" style="padding: 1.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div>
            <span class="pro-step-badge">STEP 1 • VOICE INPUT</span>
            <h3 class="pro-step-title" style="font-size: 1.15rem;">${isHi ? 'बोलने की भाषा व लाइव रिकॉर्डिंग' : 'Spoken Language & Live Audio Recording'}</h3>
          </div>

          <!-- Spoken Language Selector -->
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">${isHi ? 'आपकी बोलने की भाषा:' : 'Input Spoken Language:'}</span>
            <select class="control-select" id="voice-input-lang" style="padding: 0.5rem 0.85rem; font-size: 0.88rem; min-width: 190px;">
              ${SUPPORTED_LANGUAGES.map((l) => `
                <option value="${l.code}" ${l.code === vState.spokenLang ? 'selected' : ''}>
                  ${l.flag} ${l.name}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Center Glowing Mic & Waveform -->
        <div class="voice-mic-container">
          <div class="voice-mic-wrapper">
            <button class="voice-mic-btn" id="btn-mic-toggle" title="Click to start/stop speaking">
              <i data-lucide="mic" id="voice-mic-icon" style="width: 34px; height: 34px;"></i>
            </button>
          </div>

          <div class="voice-equalizer-bars" id="voice-eq-bars" style="opacity: 0.35;">
            <div class="voice-eq-bar"></div>
            <div class="voice-eq-bar"></div>
            <div class="voice-eq-bar"></div>
            <div class="voice-eq-bar"></div>
            <div class="voice-eq-bar"></div>
            <div class="voice-eq-bar"></div>
            <div class="voice-eq-bar"></div>
          </div>

          <div class="voice-status-pill" id="voice-status-label">
            <i data-lucide="radio" style="width: 14px; height: 14px;"></i>
            <span>${isHi ? 'माइक पर क्लिक करें और बोलना शुरू करें' : 'Click the microphone to start speaking'}</span>
          </div>
        </div>

        <!-- Live Raw Transcript Textarea -->
        <div style="margin-top: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <label class="control-label" style="display: flex; align-items: center; gap: 6px;">
              <i data-lucide="file-text" style="width: 15px; height: 15px; color: var(--primary);"></i>
              <span>${isHi ? 'लाइव ट्रांसक्रिप्ट (जो आपने बोला):' : 'Raw Transcript (What you spoke):'}</span>
            </label>
            <span style="font-size: 0.75rem; color: var(--text-muted);" id="voice-word-count">0 words • 0 chars</span>
          </div>

          <textarea 
            class="voice-textarea" 
            id="voice-raw-input" 
            placeholder="${isHi 
              ? 'यहाँ आप जो भी बोलेंगे वह रीयल-टाइम में लिखता चला जाएगा... आप चाहें तो इसमें सीधे टाइप या एडिट भी कर सकते हैं।' 
              : 'Words will appear here live as you speak... You can also edit, type, or paste text directly.'}"
          >${vState.rawTranscript}</textarea>
        </div>
      </div>

      <!-- STEP 2: Writing Context, Purpose & Tone Transformation -->
      <div class="pro-step-card" style="padding: 1.75rem;">
        <span class="pro-step-badge">STEP 2 • PURPOSE, TONE & TARGET LANGUAGE</span>
        <h3 class="pro-step-title" style="font-size: 1.15rem; margin-bottom: 0.25rem;">
          ${isHi ? 'यह किस चीज़ के लिए लिखवा रहे हैं? (उद्देश्य एवं टोन चुनें)' : 'What is the purpose of this writing? (Select Context & Tone)'}
        </h3>
        <p class="pro-step-desc" style="margin-bottom: 1.25rem;">
          ${isHi 
            ? 'आपके द्वारा चुने गए उद्देश्य (ईमेल, कानूनी पत्र, चैट) के आधार पर स्मार्ट इंजन उपयुक्त विषय, संबोधन और शब्दावली तैयार करेगा।' 
            : 'The smart engine formats subject line, salutation, paragraphs, and clauses based on your selected purpose.'}
        </p>

        <!-- Purpose Pills Matrix -->
        <div class="purpose-grid" id="purpose-grid">
          ${WRITING_PURPOSES.map((p) => `
            <div class="purpose-pill ${p.id === vState.purpose ? 'active' : ''}" data-purpose="${p.id}">
              <div class="purpose-pill-title">
                <i data-lucide="${p.icon}" style="width: 15px; height: 15px;"></i>
                <span>${isHi ? p.nameHi : p.name}</span>
              </div>
              <span class="purpose-pill-desc">${p.desc}</span>
            </div>
          `).join('')}
        </div>

        <!-- Custom Context Input (Optional) -->
        <div id="custom-context-container" style="margin-top: 1rem;">
          <label class="control-label" style="font-size: 0.85rem; margin-bottom: 0.35rem;">
            ${isHi ? 'अतिरिक्त संदर्भ या निर्देश (वैकल्पिक):' : 'Additional Context or Specific Notes (Optional):'}
          </label>
          <input 
            type="text" 
            class="control-input" 
            id="voice-custom-context" 
            placeholder="${isHi ? 'जैसे: 3 दिन की छुट्टी के लिए मैनेजर को, या 50% एडवांस पेमेंट के लिए' : 'e.g. Asking manager for 3 days sick leave from Monday, or requesting a quote'}"
            value="${vState.customContext}"
          >
        </div>

        <!-- Tone & Target Language Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-top: 1.25rem;">
          <!-- Tone Selector -->
          <div class="control-group">
            <label class="control-label">${isHi ? 'टोन और शैली (Tone & Style):' : 'Writing Tone:'}</label>
            <div class="tone-selector-capsule" id="tone-capsule">
              <button class="tone-capsule-btn ${vState.tone === 'professional' ? 'active' : ''}" data-tone="professional">
                <i data-lucide="briefcase" style="width: 14px; height: 14px;"></i>
                <span>${isHi ? 'प्रोफेशनल (Formal)' : 'Professional'}</span>
              </button>
              <button class="tone-capsule-btn ${vState.tone === 'casual' ? 'active' : ''}" data-tone="casual">
                <i data-lucide="smile" style="width: 14px; height: 14px;"></i>
                <span>${isHi ? 'कैजुअल (Casual)' : 'Casual'}</span>
              </button>
              <button class="tone-capsule-btn ${vState.tone === 'persuasive' ? 'active' : ''}" data-tone="persuasive">
                <i data-lucide="target" style="width: 14px; height: 14px;"></i>
                <span>${isHi ? 'प्रेरक (Persuasive)' : 'Persuasive'}</span>
              </button>
            </div>
          </div>

          <!-- Target Language Selector -->
          <div class="control-group">
            <label class="control-label">${isHi ? 'किस भाषा में बदलें (Target Language):' : 'Output Target Language:'}</label>
            <select class="control-select" id="voice-target-lang">
              ${SUPPORTED_LANGUAGES.map((l) => `
                <option value="${l.code}" ${l.code === vState.targetLang ? 'selected' : ''}>
                  ${l.flag} ${l.name}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Transform Trigger Button -->
        <div style="margin-top: 1.5rem; text-align: center;">
          <button id="btn-transform-voice" class="primary-btn" style="width: 100%; padding: 0.95rem; font-size: 1.05rem; justify-content: center; box-shadow: 0 10px 25px rgba(244, 63, 94, 0.35);">
            <i data-lucide="sparkles" style="width: 20px; height: 20px;"></i>
            <span>${isHi ? '⚡ दस्तावेज़ तैयार व ट्रांसलेट करें (Generate Document)' : '⚡ Transform & Generate Document'}</span>
          </button>
        </div>
      </div>

      <!-- STEP 3: Polished Final Document & Multi-Format Export -->
      <div class="pro-step-card" id="voice-output-section" style="padding: 1.75rem; display: ${vState.refinedBody ? 'flex' : 'none'};">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem;">
          <div>
            <span class="pro-step-badge" style="background: rgba(16, 185, 129, 0.12); color: #059669; border-color: rgba(16, 185, 129, 0.3);">
              STEP 3 • READY TO EXPORT
            </span>
            <h3 class="pro-step-title" style="font-size: 1.15rem;">${isHi ? 'तैयार पॉलिश दस्तावेज़' : 'Refined & Polished Document'}</h3>
          </div>

          <!-- Action buttons: TTS, Copy -->
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button id="btn-voice-speak" class="secondary-btn" style="padding: 0.45rem 0.85rem; font-size: 0.82rem;" title="Listen Aloud">
              <i data-lucide="volume-2" id="voice-speak-icon" style="width: 15px; height: 15px;"></i>
              <span id="voice-speak-text">${isHi ? 'बोलकर सुनें' : 'Read Aloud'}</span>
            </button>
            <button id="btn-voice-copy" class="secondary-btn" style="padding: 0.45rem 0.85rem; font-size: 0.82rem;">
              <i data-lucide="copy" style="width: 15px; height: 15px;"></i>
              <span>${isHi ? 'कॉपी करें' : 'Copy Text'}</span>
            </button>
          </div>
        </div>

        <!-- Subject Line (if applicable) -->
        <div class="control-group" id="refined-subject-group" style="margin-bottom: 0.75rem; display: ${vState.refinedSubject ? 'flex' : 'none'};">
          <label class="control-label">${isHi ? 'विषय (Subject):' : 'Subject Line:'}</label>
          <input type="text" class="control-input" id="refined-subject-input" value="${vState.refinedSubject}" style="font-weight: 700;">
        </div>

        <!-- Refined Text Body -->
        <div class="control-group">
          <label class="control-label">${isHi ? 'दस्तावेज़ की बॉडी:' : 'Document Content:'}</label>
          <textarea class="voice-textarea" id="refined-body-input" style="min-height: 250px; font-size: 1rem;">${vState.refinedBody}</textarea>
        </div>

        <!-- 1-Click Multi-Format Export Bar -->
        <div style="margin-top: 1.25rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="btn-export-voice-pdf" class="primary-btn" style="flex: 1; min-width: 200px; justify-content: center; padding: 0.85rem;">
            <i data-lucide="file-down" style="width: 18px; height: 18px;"></i>
            <span>${isHi ? '📄 प्रिंटेबल PDF डाउनलोड करें' : '📄 Export as PDF'}</span>
          </button>
          <button id="btn-export-voice-docx" class="secondary-btn" style="flex: 1; min-width: 200px; justify-content: center; padding: 0.85rem; border-color: #2563eb; color: #2563eb;">
            <i data-lucide="file-text" style="width: 18px; height: 18px;"></i>
            <span>${isHi ? '📝 Word (.docx) फाइल लें' : '📝 Download Word (.docx)'}</span>
          </button>
          <button id="btn-open-voice-editor" class="secondary-btn" style="flex: 1; min-width: 200px; justify-content: center; padding: 0.85rem;">
            <i data-lucide="pen-tool" style="width: 18px; height: 18px;"></i>
            <span>${isHi ? '✏️ विजुअल PDF एडिटर में खोलें' : '✏️ Open in PDF Editor'}</span>
          </button>
        </div>
      </div>
    </div>
  `;

  initVoiceWriterListeners(preview);
}

function initVoiceWriterListeners(preview) {
  const vState = state.voiceState;
  const isHi = state.lang === 'hi';

  const rawInput = document.getElementById('voice-raw-input');
  const wordCount = document.getElementById('voice-word-count');
  const btnMic = document.getElementById('btn-mic-toggle');
  const statusLabel = document.getElementById('voice-status-label');
  const eqBars = document.getElementById('voice-eq-bars');
  const inputLangSelect = document.getElementById('voice-input-lang');
  const targetLangSelect = document.getElementById('voice-target-lang');
  const customContextInput = document.getElementById('voice-custom-context');

  const updateWordCount = () => {
    const text = rawInput.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    wordCount.textContent = `${words} words • ${chars} chars`;
    vState.rawTranscript = rawInput.value;
  };

  rawInput?.addEventListener('input', updateWordCount);

  // Initialize VoiceRecognitionController
  vState.controller = new VoiceRecognitionController({
    lang: vState.spokenLang,
    onTranscript: (finalText, interimText) => {
      const combined = interimText ? `${finalText} [${interimText}]` : finalText;
      rawInput.value = combined;
      updateWordCount();
    },
    onStatusChange: (isListening, msg) => {
      if (isListening) {
        btnMic.classList.add('listening');
        statusLabel.classList.add('recording');
        statusLabel.innerHTML = `<i data-lucide="mic" style="width: 14px; height: 14px;"></i> <span>🔴 ${isHi ? 'लाइव रिकॉर्डिंग... बोलिए' : 'Listening... Speak now'}</span>`;
        if (eqBars) eqBars.style.opacity = '1.0';
      } else {
        btnMic.classList.remove('listening');
        statusLabel.classList.remove('recording');
        statusLabel.innerHTML = `<i data-lucide="radio" style="width: 14px; height: 14px;"></i> <span>${isHi ? 'माइक पर क्लिक करें और बोलना शुरू करें' : 'Click the microphone to speak'}</span>`;
        if (eqBars) eqBars.style.opacity = '0.35';
      }
      refreshLucide();
    },
    onError: (err) => {
      showToast(`${isHi ? 'माइक्रोफ़ोन स्थिति' : 'Mic notice'}: ${err}`, 'error');
    }
  });

  // Toggle Mic Button
  btnMic?.addEventListener('click', () => {
    if (vState.controller.isListening) {
      vState.controller.stop();
    } else {
      vState.controller.start();
    }
  });

  // Spoken Language Change
  inputLangSelect?.addEventListener('change', (e) => {
    vState.spokenLang = e.target.value;
    vState.controller.setLanguage(e.target.value);
    showToast(isHi ? `बोलने की भाषा सेट: ${inputLangSelect.options[inputLangSelect.selectedIndex].text}` : `Spoken language: ${inputLangSelect.options[inputLangSelect.selectedIndex].text}`);
  });

  // Target Language Change
  targetLangSelect?.addEventListener('change', (e) => {
    vState.targetLang = e.target.value;
  });

  // Purpose Pills
  preview.querySelectorAll('.purpose-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      preview.querySelectorAll('.purpose-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      vState.purpose = pill.dataset.purpose;
    });
  });

  // Tone Capsule Buttons
  preview.querySelectorAll('.tone-capsule-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      preview.querySelectorAll('.tone-capsule-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      vState.tone = btn.dataset.tone;
    });
  });

  // Custom Context Input
  customContextInput?.addEventListener('input', (e) => {
    vState.customContext = e.target.value;
  });

  // Clear Button
  document.getElementById('btn-voice-clear')?.addEventListener('click', () => {
    vState.controller.stop();
    vState.controller.clear();
    rawInput.value = '';
    vState.rawTranscript = '';
    vState.refinedSubject = '';
    vState.refinedBody = '';
    updateWordCount();
    const outSec = document.getElementById('voice-output-section');
    if (outSec) outSec.style.display = 'none';
    showToast(isHi ? 'नया ड्राफ्ट शुरू किया गया' : 'Ready for new draft');
  });

  // Transform & Generate Document Button
  document.getElementById('btn-transform-voice')?.addEventListener('click', async () => {
    const rawText = rawInput.value.replace(/\[.*?\]/g, '').trim();
    if (!rawText) {
      showToast(isHi ? 'कृपया पहले माइक से बोलें या टेक्स्ट दर्ज करें!' : 'Please speak or enter text first!', 'error');
      return;
    }

    if (vState.controller.isListening) {
      vState.controller.stop();
    }

    showProgressModal(
      isHi ? 'AI दस्तावेज़ तैयार हो रहा है...' : 'Synthesizing your document...',
      isHi ? 'ट्रांसलेशन व टोन ट्रांसफॉर्मेशन जारी है...' : 'Applying purpose formatting and stylistic tone...'
    );

    try {
      updateProgress(30);

      // 1. Translate if source language differs from target
      let translated = rawText;
      if (vState.spokenLang.substring(0, 2) !== vState.targetLang.substring(0, 2)) {
        updateProgress(50);
        translated = await vState.engine.translateText(rawText, vState.spokenLang, vState.targetLang);
      }

      updateProgress(75);

      // 2. Apply Purpose & Tone
      const res = vState.engine.transformToneAndContext(translated, {
        tone: vState.tone,
        purpose: vState.purpose,
        customContext: vState.customContext,
        targetLang: vState.targetLang
      });

      vState.refinedSubject = res.subject;
      vState.refinedBody = res.body;

      updateProgress(100);
      hideProgressModal();

      // Show Output Section
      const outSec = document.getElementById('voice-output-section');
      const subjGrp = document.getElementById('refined-subject-group');
      const subjInp = document.getElementById('refined-subject-input');
      const bodyInp = document.getElementById('refined-body-input');

      if (res.subject) {
        subjGrp.style.display = 'flex';
        subjInp.value = res.subject;
      } else {
        subjGrp.style.display = 'none';
      }

      bodyInp.value = res.body;
      outSec.style.display = 'flex';
      outSec.scrollIntoView({ behavior: 'smooth', block: 'start' });

      showToast(isHi ? 'दस्तावेज़ सफलतापूर्वक तैयार हो गया!' : 'Document synthesized successfully!');
      refreshLucide();
    } catch (err) {
      hideProgressModal();
      console.error('Transform Error:', err);
      showToast(err.message || 'Error refining document', 'error');
    }
  });

  // TTS Read Aloud Button
  const btnSpeak = document.getElementById('btn-voice-speak');
  const speakIcon = document.getElementById('voice-speak-icon');
  const speakText = document.getElementById('voice-speak-text');

  btnSpeak?.addEventListener('click', () => {
    const body = document.getElementById('refined-body-input')?.value || '';
    if (!body) return;

    if (vState.isSpeaking) {
      vState.engine.stopSpeaking();
      vState.isSpeaking = false;
      speakIcon.setAttribute('data-lucide', 'volume-2');
      speakText.textContent = isHi ? 'बोलकर सुनें' : 'Read Aloud';
    } else {
      vState.engine.speakText(body, vState.targetLang);
      vState.isSpeaking = true;
      speakIcon.setAttribute('data-lucide', 'square');
      speakText.textContent = isHi ? 'रोकें' : 'Stop Audio';
    }
    refreshLucide();
  });

  // Copy Text Button
  document.getElementById('btn-voice-copy')?.addEventListener('click', () => {
    const subj = document.getElementById('refined-subject-input')?.value || '';
    const body = document.getElementById('refined-body-input')?.value || '';
    const full = subj ? `${subj}\n\n${body}` : body;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(full).then(() => {
        showToast(isHi ? 'टेक्स्ट क्लिपबोर्ड पर कॉपी हो गया!' : 'Text copied to clipboard!');
      });
    }
  });

  // Export as PDF Button
  document.getElementById('btn-export-voice-pdf')?.addEventListener('click', async () => {
    const subj = document.getElementById('refined-subject-input')?.value || '';
    const body = document.getElementById('refined-body-input')?.value || '';
    if (!body) return;

    showProgressModal(isHi ? 'PDF तैयार हो रही है...' : 'Generating PDF Document...');
    try {
      const pdfBlob = await PDFEngine.exportTextToStyledPDF(subj, body, {}, updateProgress);
      hideProgressModal();
      showSuccessModal(`${vState.purpose}_document.pdf`, pdfBlob, false);
      showToast(t('successMessage'));
    } catch (e) {
      hideProgressModal();
      showToast(e.message, 'error');
    }
  });

  // Export as Word (.docx) Button
  document.getElementById('btn-export-voice-docx')?.addEventListener('click', async () => {
    const subj = document.getElementById('refined-subject-input')?.value || '';
    const body = document.getElementById('refined-body-input')?.value || '';
    if (!body) return;

    showProgressModal(isHi ? 'Word (.docx) तैयार हो रही है...' : 'Generating Word (.docx)...');
    try {
      const docxBlob = await Converters.exportTextToDocx(subj, body);
      hideProgressModal();
      showSuccessModal(`${vState.purpose}_document.docx`, docxBlob, false);
      showToast(t('successMessage'));
    } catch (e) {
      hideProgressModal();
      showToast(e.message, 'error');
    }
  });

  // Open in Visual PDF Editor
  document.getElementById('btn-open-voice-editor')?.addEventListener('click', async () => {
    const subj = document.getElementById('refined-subject-input')?.value || '';
    const body = document.getElementById('refined-body-input')?.value || '';
    if (!body) return;

    showProgressModal(isHi ? 'PDF एडिटर में लोड हो रहा है...' : 'Opening in PDF Editor...');
    try {
      const pdfBlob = await PDFEngine.exportTextToStyledPDF(subj, body, {}, updateProgress);
      hideProgressModal();
      const file = new File([pdfBlob], `${vState.purpose}_draft.pdf`, { type: 'application/pdf' });
      state.uploadedFiles = [file];
      openToolWorkspace('pdf-editor');
      showToast(isHi ? 'दस्तावेज़ विजुअल एडिटर में लोड हो गया!' : 'Loaded in PDF Editor');
    } catch (e) {
      hideProgressModal();
      showToast(e.message, 'error');
    }
  });

  updateWordCount();
  refreshLucide();
}

// Global Event Listeners
function attachGlobalEventListeners() {
  // Theme & Lang
  document.getElementById('theme-btn')?.addEventListener('click', toggleTheme);
  document.getElementById('lang-btn')?.addEventListener('click', toggleLanguage);
  document.getElementById('brand-home')?.addEventListener('click', returnToDashboard);
  document.getElementById('btn-back-home')?.addEventListener('click', returnToDashboard);

  // Category Tabs
  document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#nav-category-tabs .nav-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentCategory = btn.dataset.category;
      renderToolsGrid();
    });
  });

  // Search input
  const searchInput = document.getElementById('tool-search-input');
  searchInput?.addEventListener('input', (e) => {
    state.query = e.target.value.toLowerCase().trim();
    renderToolsGrid();
  });

  // Keyboard shortcut '/' to search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  // Dropzone Browse Button
  const fileInput = document.getElementById('file-input');
  document.getElementById('btn-browse')?.addEventListener('click', () => fileInput.click());
  document.getElementById('btn-add-more')?.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  // Drag and drop events on dropzone
  const dropzone = document.getElementById('ws-dropzone');
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    handleFiles(e.dataTransfer.files);
  });

  // Main Action: Process PDF
  document.getElementById('btn-process-action')?.addEventListener('click', executeProcessing);

  // Success Modal Actions
  document.getElementById('btn-process-another')?.addEventListener('click', () => {
    closeSuccessModal();
    returnToDashboard();
  });
}

// Progress and Modal Controls
function showProgressModal(title, desc) {
  const modal = document.getElementById('progress-modal');
  document.getElementById('progress-modal-title').textContent = title || t('processing');
  document.getElementById('progress-modal-desc').textContent = desc || '';
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('progress-pct').textContent = '0%';
  modal.classList.add('active');
}

function updateProgress(pct) {
  const fill = document.getElementById('progress-fill');
  const txt = document.getElementById('progress-pct');
  if (fill) fill.style.width = `${pct}%`;
  if (txt) txt.textContent = `${Math.round(pct)}%`;
}

function hideProgressModal() {
  document.getElementById('progress-modal').classList.remove('active');
}

function showSuccessModal(filename, blob, isZip = false) {
  const modal = document.getElementById('success-modal');
  const btnDownload = document.getElementById('btn-download-result');
  const downloadText = document.getElementById('btn-download-text');

  downloadText.textContent = isZip 
    ? (state.lang === 'hi' ? 'ज़िप फाइल डाउनलोड करें (.zip)' : 'Download ZIP Archive')
    : (state.lang === 'hi' ? 'पीडीएफ फाइल डाउनलोड करें (.pdf)' : 'Download PDF');

  const downloadUrl = URL.createObjectURL(blob);
  btnDownload.href = downloadUrl;
  btnDownload.download = filename;

  modal.classList.add('active');
  refreshLucide();

  // Trigger Confetti!
  if (window.confetti) {
    window.confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

function closeSuccessModal() {
  document.getElementById('success-modal').classList.remove('active');
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}" style="width: 18px; height: 18px; color: ${type === 'error' ? '#dc2626' : '#16a34a'};"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  refreshLucide();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- EXECUTE PDF OPERATIONS ---
async function executeProcessing() {
  const toolId = state.currentToolId;
  const files = state.uploadedFiles;

  if (!files || files.length === 0) {
    showToast(t('errorMessage'), 'error');
    return;
  }

  showProgressModal(
    state.lang === 'hi' ? 'प्रोसेसिंग जारी है...' : 'Processing your document...',
    state.lang === 'hi' ? 'आपके कंप्यूटर पर तेजी से प्रोसेस हो रहा है' : 'Running 100% locally in browser'
  );

  try {
    let resultBlob, resultFilename, isZip = false;

    switch (toolId) {
      case 'merge': {
        const addBlankPage = document.getElementById('merge-blank-page')?.checked ?? false;
        resultBlob = await PDFEngine.mergePDFs(files, { addBlankPage }, updateProgress);
        resultFilename = 'merged_document.pdf';
        break;
      }

      case 'split': {
        const mode = document.querySelector('input[name="split-mode"]:checked')?.value || 'range';
        let rangeStr = '1-3';
        if (mode === 'fixed') {
          rangeStr = document.getElementById('split-chunk-input')?.value || '2';
        } else {
          rangeStr = document.getElementById('split-range-input')?.value || '1-3';
        }
        const res = await PDFEngine.splitPDF(files[0], mode, rangeStr, {}, updateProgress);
        resultBlob = res.blob;
        resultFilename = res.filename;
        isZip = res.isZip;
        break;
      }

      case 'compress': {
        const level = document.querySelector('input[name="compress-level"]:checked')?.value || 'recommended';
        const grayscale = document.getElementById('compress-grayscale')?.checked ?? false;
        resultBlob = await PDFEngine.compressPDF(files[0], level, { grayscale }, updateProgress);
        resultFilename = `compressed_${files[0].name}`;
        break;
      }

      case 'pdf-to-img': {
        const format = document.getElementById('pdf-img-format')?.value || 'png';
        const scale = parseFloat(document.getElementById('pdf-img-dpi')?.value || '3.5');
        const res = await PDFEngine.pdfToImages(files[0], format, scale, updateProgress);
        resultBlob = res.zipBlob;
        resultFilename = `${files[0].name.replace('.pdf', '')}_images.zip`;
        isZip = true;
        break;
      }

      case 'img-to-pdf': {
        const orientation = document.getElementById('img-pdf-orientation')?.value || 'auto';
        const pageSize = document.getElementById('img-pdf-size')?.value || 'a4';
        const margin = parseInt(document.getElementById('img-pdf-margin')?.value || '20', 10);
        resultBlob = await PDFEngine.imagesToPDF(files, { orientation, pageSize, margin }, updateProgress);
        resultFilename = 'images_combined.pdf';
        break;
      }

      case 'rotate': {
        const angle = state.activeRotation || 90;
        const target = document.getElementById('rotate-target-pages')?.value || 'all';
        resultBlob = await PDFEngine.rotatePDF(files[0], angle, { target }, updateProgress);
        resultFilename = `rotated_${files[0].name}`;
        break;
      }

      case 'organize': {
        const validConfigs = state.organizePages.filter((p) => !p.deleted);
        resultBlob = await PDFEngine.organizePDF(files[0], validConfigs, updateProgress);
        resultFilename = `organized_${files[0].name}`;
        break;
      }

      case 'watermark': {
        const wmType = state.watermarkState.type || 'text';
        const text = document.getElementById('wm-text')?.value || state.watermarkState.text || 'CONFIDENTIAL';
        const color = document.getElementById('wm-color')?.value || state.watermarkState.color || '#dc2626';
        const targetPages = document.getElementById('wm-target-pages')?.value || 'all';
        resultBlob = await PDFEngine.watermarkPDF(files[0], {
          type: wmType,
          text,
          color,
          fontSize: state.watermarkState.fontSize,
          opacity: state.watermarkState.opacity,
          rotation: state.watermarkState.rotation,
          position: state.watermarkState.position,
          targetPages,
          imageDataUrl: state.watermarkState.imageDataUrl,
          imageScale: state.watermarkState.imageScale || 0.5
        }, updateProgress);
        resultFilename = `watermarked_${files[0].name}`;
        break;
      }

      case 'page-numbers': {
        const format = document.getElementById('pn-format')?.value || 'Page {n} of {total}';
        const position = document.getElementById('pn-position')?.value || 'bottom-center';
        const excludeCover = document.getElementById('pn-exclude-cover')?.checked ?? true;
        const startFrom = parseInt(document.getElementById('pn-start-from')?.value || '1', 10);
        const margin = parseInt(document.getElementById('pn-margin')?.value || '30', 10);
        const prefix = document.getElementById('pn-prefix')?.value || '';
        const suffix = document.getElementById('pn-suffix')?.value || '';
        const fontSize = parseInt(document.getElementById('pn-size')?.value || '11', 10);
        const color = document.getElementById('pn-color')?.value || '#333333';
        resultBlob = await PDFEngine.addPageNumbers(files[0], {
          format,
          position,
          excludeCover,
          startFrom,
          margin,
          prefix,
          suffix,
          fontSize,
          color
        }, updateProgress);
        resultFilename = `numbered_${files[0].name}`;
        break;
      }

      case 'sign': {
        if (!state.signatureState.dataUrl) {
          updateSignatureStamp();
        }
        resultBlob = await PDFEngine.signPDF(files[0], state.signatureState.dataUrl, {
          pageIndex: state.signatureState.pageIndex || 0,
          xPercent: 50,
          yPercent: 15,
          widthPercent: 30
        }, updateProgress);
        resultFilename = `signed_${files[0].name}`;
        break;
      }

      case 'protect': {
        const pw = document.getElementById('protect-pw')?.value;
        const confirmPw = document.getElementById('protect-confirm-pw')?.value;
        if (!pw) {
          throw new Error(state.lang === 'hi' ? 'कृपया पासवर्ड दर्ज करें।' : 'Please enter a password.');
        }
        if (pw !== confirmPw) {
          throw new Error(state.lang === 'hi' ? 'पासवर्ड मेल नहीं खा रहे हैं।' : 'Passwords do not match.');
        }
        const noPrint = document.getElementById('protect-no-print')?.checked ?? false;
        const noCopy = document.getElementById('protect-no-copy')?.checked ?? false;
        resultBlob = await PDFEngine.protectPDF(files[0], pw, { noPrint, noCopy }, updateProgress);
        resultFilename = `protected_${files[0].name}`;
        break;
      }

      case 'unlock': {
        const pw = document.getElementById('unlock-pw')?.value || '';
        resultBlob = await PDFEngine.unlockPDF(files[0], pw, updateProgress);
        resultFilename = `unlocked_${files[0].name}`;
        break;
      }

      case 'pdf-to-text': {
        const res = await PDFEngine.extractTextFromPDF(files[0], updateProgress);
        resultBlob = new Blob([res.fullText], { type: 'text/plain;charset=utf-8' });
        resultFilename = `${files[0].name.replace('.pdf', '')}_extracted_text.txt`;
        break;
      }

      case 'crop': {
        const top = parseInt(document.getElementById('crop-top')?.value || '30', 10);
        const bottom = parseInt(document.getElementById('crop-bottom')?.value || '30', 10);
        const left = parseInt(document.getElementById('crop-left')?.value || '30', 10);
        const right = parseInt(document.getElementById('crop-right')?.value || '30', 10);
        resultBlob = await PDFEngine.cropPDF(files[0], { top, bottom, left, right }, updateProgress);
        resultFilename = `cropped_${files[0].name}`;
        break;
      }

      case 'annotate': {
        const note = document.getElementById('ann-text')?.value || 'Note Added';
        const fontSize = parseInt(document.getElementById('ann-fontsize')?.value || '16', 10);
        resultBlob = await PDFEngine.annotatePDF(files[0], [
          { type: 'text', text: note, fontSize, x: 50, y: 700 }
        ], updateProgress);
        resultFilename = `annotated_${files[0].name}`;
        break;
      }

      case 'repair': {
        resultBlob = await PDFEngine.repairPDF(files[0], updateProgress);
        resultFilename = `repaired_${files[0].name}`;
        break;
      }

      case 'pdf-to-word': {
        const res = await Converters.convertPdfToDocx(files[0], updateProgress);
        resultBlob = res.blob;
        resultFilename = res.filename;
        break;
      }

      case 'pdf-to-excel': {
        const res = await Converters.convertPdfToExcel(files[0], updateProgress);
        resultBlob = res.blob;
        resultFilename = res.filename;
        break;
      }

      case 'pdf-to-ppt': {
        const res = await Converters.convertPdfToPptx(files[0], updateProgress);
        resultBlob = res.blob;
        resultFilename = res.filename;
        break;
      }

      case 'pdf-to-html': {
        const res = await Converters.convertPdfToHtml(files[0], updateProgress);
        resultBlob = res.blob;
        resultFilename = res.filename;
        break;
      }

      case 'word-to-pdf': {
        const res = await Converters.convertWordToPdf(files[0], updateProgress);
        resultBlob = res.blob;
        resultFilename = res.filename;
        break;
      }

      case 'excel-to-pdf': {
        const res = await Converters.convertExcelToPdf(files[0], updateProgress);
        resultBlob = res.blob;
        resultFilename = res.filename;
        break;
      }

      case 'md-to-pdf': {
        const res = await Converters.convertMarkdownToPdf(files[0], updateProgress);
        resultBlob = res.blob;
        resultFilename = res.filename;
        break;
      }

      case 'code-to-pdf': {
        const res = await Converters.convertCodeToPdf(files[0], updateProgress);
        resultBlob = res.blob;
        resultFilename = res.filename;
        break;
      }

      case 'flatten': {
        resultBlob = await PDFEngine.flattenPDF(files[0], {}, updateProgress);
        resultFilename = `flattened_${files[0].name}`;
        break;
      }

      case 'grayscale': {
        const mode = document.querySelector('input[name="gray-mode"]:checked')?.value || 'grayscale';
        resultBlob = await PDFEngine.grayscalePDF(files[0], mode, updateProgress);
        resultFilename = `grayscale_${files[0].name}`;
        break;
      }

      case 'invert-colors': {
        resultBlob = await PDFEngine.invertPDF(files[0], updateProgress);
        resultFilename = `dark_mode_${files[0].name}`;
        break;
      }

      case 'bates-numbers': {
        const prefix = document.getElementById('bates-prefix')?.value || 'CASE-';
        const startNumber = parseInt(document.getElementById('bates-start')?.value || '1', 10);
        const digits = parseInt(document.getElementById('bates-digits')?.value || '6', 10);
        const suffix = document.getElementById('bates-suffix')?.value || '';
        const position = document.getElementById('bates-position')?.value || 'bottom-right';
        resultBlob = await PDFEngine.batesNumberPDF(files[0], { prefix, startNumber, digits, suffix, position }, updateProgress);
        resultFilename = `bates_${files[0].name}`;
        break;
      }

      case 'header-footer': {
        const headerLeft = document.getElementById('hf-head-left')?.value || '';
        const headerCenter = document.getElementById('hf-head-center')?.value || '';
        const headerRight = document.getElementById('hf-head-right')?.value || '';
        const footerLeft = document.getElementById('hf-foot-left')?.value || '';
        const footerCenter = document.getElementById('hf-foot-center')?.value || '';
        const footerRight = document.getElementById('hf-foot-right')?.value || '';
        resultBlob = await PDFEngine.headerFooterPDF(files[0], {
          headerLeft,
          headerCenter,
          headerRight,
          footerLeft,
          footerCenter,
          footerRight,
          filename: files[0].name
        }, updateProgress);
        resultFilename = `header_footer_${files[0].name}`;
        break;
      }

      case 'extract-images': {
        const res = await PDFEngine.extractImagesFromPDF(files[0], updateProgress);
        resultBlob = res.blob;
        resultFilename = res.filename;
        isZip = res.isZip;
        break;
      }

      case 'extract-pages': {
        const rangeStr = document.getElementById('extract-range-input')?.value || '1';
        resultBlob = await PDFEngine.extractSpecificPages(files[0], rangeStr, updateProgress);
        resultFilename = `extracted_pages_${files[0].name}`;
        break;
      }

      case 'metadata': {
        const sanitize = document.getElementById('meta-sanitize')?.checked ?? false;
        const title = document.getElementById('meta-title')?.value;
        const author = document.getElementById('meta-author')?.value;
        const subject = document.getElementById('meta-subject')?.value;
        const keywords = document.getElementById('meta-keywords')?.value;
        resultBlob = await PDFEngine.editMetadataPDF(files[0], { sanitize, title, author, subject, keywords }, updateProgress);
        resultFilename = `updated_${files[0].name}`;
        break;
      }

      default:
        throw new Error('Unsupported tool');
    }

    hideProgressModal();
    showSuccessModal(resultFilename, resultBlob, isZip);
    showToast(t('successMessage'));
  } catch (err) {
    hideProgressModal();
    console.error('PDF Processing Error:', err);
    showToast(err.message || t('errorMessage'), 'error');
  }
}
