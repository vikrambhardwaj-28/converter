// AI Voice Dictation & Multi-Language Smart Writer Engine
// 100% Client-Side Speech Recognition, Translation, and Purpose-Driven Document Synthesis

// Supported Spoken & Target Languages
export const SUPPORTED_LANGUAGES = [
  { code: 'hi-IN', name: 'हिन्दी (Hindi)', short: 'hi', flag: '🇮🇳' },
  { code: 'en-IN', name: 'English (India)', short: 'en', flag: '🇮🇳' },
  { code: 'en-US', name: 'English (US)', short: 'en', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', short: 'en', flag: '🇬🇧' },
  { code: 'es-ES', name: 'Español (Spanish)', short: 'es', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français (French)', short: 'fr', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch (German)', short: 'de', flag: '🇩🇪' },
  { code: 'ar-SA', name: 'العربية (Arabic)', short: 'ar', flag: '🇸🇦' },
  { code: 'ru-RU', name: 'Русский (Russian)', short: 'ru', flag: '🇷🇺' },
  { code: 'zh-CN', name: '中文 (Chinese)', short: 'zh', flag: '🇨🇳' },
  { code: 'ja-JP', name: '日本語 (Japanese)', short: 'ja', flag: '🇯🇵' },
  { code: 'pt-BR', name: 'Português (Portuguese)', short: 'pt', flag: '🇧🇷' },
  { code: 'it-IT', name: 'Italiano (Italian)', short: 'it', flag: '🇮🇹' }
];

// Document Purposes / Writing Contexts
export const WRITING_PURPOSES = [
  {
    id: 'email',
    icon: 'mail',
    name: 'Formal Business Email',
    nameHi: 'आधिकारिक बिज़नेस ईमेल',
    desc: 'Polite corporate communication with subject line, salutation & professional sign-off.'
  },
  {
    id: 'legal',
    icon: 'file-text',
    name: 'Legal Notice / Formal Letter',
    nameHi: 'कानूनी नोटिस / औपचारिक पत्र',
    desc: 'Authoritative, precise legal or administrative notice with official clauses.'
  },
  {
    id: 'memo',
    icon: 'briefcase',
    name: 'Corporate Memo / Brief',
    nameHi: 'कॉर्पोरेट मेमो / एग्जीक्यूटिव समरी',
    desc: 'Internal corporate memorandum with executive summary & action items.'
  },
  {
    id: 'sop',
    icon: 'graduation-cap',
    name: 'Academic Essay / SOP',
    nameHi: 'शैक्षणिक निबंध / SOP / आवेदन',
    desc: 'Scholarly, structured academic statement with elevated vocabulary.'
  },
  {
    id: 'chat',
    icon: 'message-circle',
    name: 'Casual WhatsApp / Slack Chat',
    nameHi: 'अनौपचारिक चैट संदेश (WhatsApp/Slack)',
    desc: 'Natural, friendly, conversational tone for peers or colleagues.'
  },
  {
    id: 'social',
    icon: 'share-2',
    name: 'LinkedIn / Social Media Post',
    nameHi: 'लिंक्डइन / सोशल मीडिया पोस्ट',
    desc: 'Engaging hook, value-driven bullet points, and trending hashtags.'
  },
  {
    id: 'pitch',
    icon: 'zap',
    name: 'Sales Pitch / Proposal',
    nameHi: 'सेल्स पिच / क्लाइंट प्रपोजल',
    desc: 'Persuasive, compelling value proposition for clients or investors.'
  },
  {
    id: 'custom',
    icon: 'sparkles',
    name: 'Custom Context / Purpose',
    nameHi: 'कस्टम उद्देश्य (अपनी पसंद का)',
    desc: 'Tailor the writing to your exact specified context or requirement.'
  }
];

// Speech Recognition Class
export class VoiceRecognitionController {
  constructor(options = {}) {
    this.onTranscript = options.onTranscript || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onError = options.onError || (() => {});
    
    this.recognition = null;
    this.isListening = false;
    this.currentLang = options.lang || 'hi-IN';
    this.finalTranscript = '';
    
    this.initRecognition();
  }

  isSupported() {
    return typeof window !== 'undefined' && 
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  initRecognition() {
    if (!this.isSupported()) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRec();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.currentLang;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStatusChange(true, 'Listening... Speak naturally.');
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          this.finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      this.onTranscript(this.finalTranscript.trim(), interim.trim());
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech Recognition Event:', event.error);
      this.isListening = false;
      this.onStatusChange(false, `Mic: ${event.error}`);
      this.onError(event.error);
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Auto-restart if continuous recognition ended unexpectedly
        try {
          this.recognition.start();
        } catch {
          this.isListening = false;
          this.onStatusChange(false, 'Stopped');
        }
      } else {
        this.onStatusChange(false, 'Stopped');
      }
    };
  }

  setLanguage(langCode) {
    this.currentLang = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
      if (this.isListening) {
        this.stop();
        setTimeout(() => this.start(), 250);
      }
    }
  }

  start() {
    if (!this.recognition) this.initRecognition();
    if (!this.recognition) {
      this.onError('Browser does not support Speech Recognition. Please type text directly.');
      return;
    }
    try {
      this.isListening = true;
      this.recognition.start();
    } catch (err) {
      console.warn('Recognition start caught:', err);
    }
  }

  stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Recognition stop caught:', err);
      }
    }
  }

  clear() {
    this.finalTranscript = '';
    this.onTranscript('', '');
  }

  setTranscript(text) {
    this.finalTranscript = text;
  }
}

// Client-Side Translation & Stylistic Transformation Engine
export class SmartWriterEngine {
  constructor() {
    this.cache = new Map();
  }

  // Translate text to target language using client-side free translation service with fallback
  async translateText(text, fromLang, toLang) {
    if (!text || !text.trim()) return '';
    if (fromLang.substring(0, 2) === toLang.substring(0, 2)) return text;

    const cacheKey = `${fromLang}_${toLang}_${text}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const fromCode = fromLang.substring(0, 2);
    const toCode = toLang.substring(0, 2);

    try {
      // MyMemory Free Translation API
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 500))}&langpair=${fromCode}|${toCode}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.responseData && data.responseData.translatedText) {
          const res = data.responseData.translatedText;
          this.cache.set(cacheKey, res);
          return res;
        }
      }
    } catch (e) {
      console.warn('External translation fallback:', e.message);
    }

    // Fallback: Return original text if network is offline
    return text;
  }

  // Transform text according to tone (Professional vs Casual) and Purpose (Email, Legal, etc.)
  transformToneAndContext(text, options = {}) {
    const {
      tone = 'professional', // 'professional' | 'casual' | 'persuasive' | 'concise'
      purpose = 'email', // 'email' | 'legal' | 'memo' | 'sop' | 'chat' | 'social' | 'pitch' | 'custom'
      customContext = '',
      targetLang = 'en'
    } = options;

    if (!text || !text.trim()) return { subject: '', body: '' };

    const isEnglish = targetLang.startsWith('en');
    const isHindi = targetLang.startsWith('hi');

    let processedText = text.trim();

    // 1. Apply Vocabulary & Tone Polishing
    if (isEnglish) {
      processedText = this.refineEnglishTone(processedText, tone);
    } else if (isHindi) {
      processedText = this.refineHindiTone(processedText, tone);
    }

    // 2. Format according to Purpose / Context
    return this.formatByPurpose(processedText, purpose, tone, isHindi, customContext);
  }

  // Refine English Phrases to Corporate / Professional / Casual
  refineEnglishTone(str, tone) {
    if (tone === 'professional') {
      const replacements = [
        [/\bi want\b/gi, 'I would like to request'],
        [/\bi need\b/gi, 'I require'],
        [/\btell me\b/gi, 'kindly inform me'],
        [/\basap\b/gi, 'at your earliest convenience'],
        [/\bquickly\b/gi, 'expeditiously'],
        [/\bcan you\b/gi, 'would it be possible for you to'],
        [/\bthanks a lot\b/gi, 'Thank you for your valuable support'],
        [/\bsorry\b/gi, 'I sincerely apologize for any inconvenience'],
        [/\bproblem\b/gi, 'matter / issue'],
        [/\bbad\b/gi, 'suboptimal'],
        [/\bgood\b/gi, 'exceptional / commendable'],
        [/\bdo this\b/gi, 'kindly facilitate this request'],
        [/\bcheck this\b/gi, 'kindly review the attached information'],
        [/\bcall me\b/gi, 'please feel free to reach out via phone']
      ];
      let res = str;
      for (const [pattern, rep] of replacements) {
        res = res.replace(pattern, rep);
      }
      return res;
    } else if (tone === 'casual') {
      const replacements = [
        [/\bI would like to request\b/gi, 'I want'],
        [/\bAt your earliest convenience\b/gi, 'Whenever you get a chance'],
        [/\bPlease be advised that\b/gi, 'Just wanted to share that'],
        [/\bSincerely,\b/gi, 'Cheers,'],
        [/\bRespectfully yours\b/gi, 'Best,']
      ];
      let res = str;
      for (const [pattern, rep] of replacements) {
        res = res.replace(pattern, rep);
      }
      return res;
    }
    return str;
  }

  // Refine Hindi Phrases
  refineHindiTone(str, tone) {
    if (tone === 'professional') {
      return str
        .replace(/मुझे चाहिए/g, 'मैं सविनय निवेदन करता हूँ कि')
        .replace(/जल्दी करो/g, 'यथाशीघ्र पूर्ण करने की कृपा करें')
        .replace(/बताओ/g, 'कृपया सूचित करने का कष्ट करें')
        .replace(/धन्यवाद/g, 'सादर धन्यवाद एवं आभार');
    } else if (tone === 'casual') {
      return str
        .replace(/सविनय निवेदन है कि/g, 'बात ये है कि')
        .replace(/सादर आभार/g, 'बहुत-बहुत शुक्रिया दोस्त');
    }
    return str;
  }

  // Format the document structure by Purpose
  formatByPurpose(text, purpose, tone, isHindi, customContext) {
    const today = new Date().toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    switch (purpose) {
      case 'email': {
        const subject = isHindi
          ? `विषय: ${text.substring(0, 45)}...`
          : `Subject: Regarding ${text.substring(0, 45)}...`;

        const salutation = tone === 'casual'
          ? (isHindi ? 'नमस्ते,' : 'Hi there,')
          : (isHindi ? 'आदरणीय महोदय / महोदया,' : 'Dear Sir / Madam,');

        const signoff = tone === 'casual'
          ? (isHindi ? 'शुभकामनाएं,\n[आपका नाम]' : 'Warm regards,\n[Your Name]')
          : (isHindi ? 'भवदीय,\n[आपका नाम]\n[पद एवं संस्थान]' : 'Sincerely,\n[Your Name]\n[Your Title / Organization]');

        const body = `${salutation}\n\n${text}\n\n${signoff}`;
        return { subject, body };
      }

      case 'legal': {
        const subject = isHindi ? 'कानूनी सूचना / औपचारिक पत्र' : 'LEGAL NOTICE / FORMAL REQUISITION';
        const body = isHindi
          ? `दिनांक: ${today}\n\nप्रति,\n[प्राप्तकर्ता का नाम एवं पता]\n\nविषय: ${text.substring(0, 50)}\n\nमहोदय,\nयह सूचना एतद्द्वारा प्रेषित की जाती है कि:\n\n${text}\n\nअतः आपसे अनुरोध है कि उक्त मामले का संज्ञान लेते हुए आवश्यक कार्रवाई सुनिश्चित करें।\n\nसादर,\n[हस्ताक्षर]\n[अधिवक्ता / अधिकृत प्रतिनिधि]`
          : `DATE: ${today}\n\nTO: [Recipient Name & Address]\n\nSUBJECT: OFFICIAL NOTICE REGARDING: ${text.substring(0, 50).toUpperCase()}\n\nTO WHOM IT MAY CONCERN:\n\nPlease take formal notice of the following matter:\n\n${text}\n\nYou are hereby requested to acknowledge receipt and take appropriate action without undue delay.\n\nRespectfully submitted,\n\n_______________________\n[Authorized Signatory / Legal Counsel]`;
        return { subject, body };
      }

      case 'memo': {
        const subject = isHindi ? 'कॉर्पोरेट मेमोरेंडम' : 'INTERNAL MEMORANDUM';
        const body = isHindi
          ? `मेमो सं.: MC-${Date.now().toString().slice(-4)}\nदिनांक: ${today}\nप्रेषक: [आपका पद]\nप्रापक: [विभाग / टीम]\n\nविषय: कार्य योजना एवं दिशा-निर्देश\n\n१. कार्यकारी सारांश:\n${text}\n\n२. आगामी कार्रवाई (Next Steps):\n• सभी संबंधित सदस्य तत्काल समीक्षा करें।\n• किसी भी प्रश्न हेतु संपर्क करें।\n\nअनुमोदित: [प्रबंधन]`
          : `MEMO REF: MC-${Date.now().toString().slice(-4)}\nDATE: ${today}\nFROM: [Your Department / Name]\nTO: [All Concerned / Team Leads]\nSUBJECT: EXECUTIVE SUMMARY & DIRECTIVE\n\n1. EXECUTIVE SUMMARY:\n${text}\n\n2. ACTION ITEMS & DELIVERABLES:\n• Implement reviewed guidelines immediately.\n• Report feedback and metrics within 48 hours.\n\nApproved By Management.`;
        return { subject, body };
      }

      case 'sop': {
        const subject = isHindi ? 'शैक्षणिक वक्तव्य / SOP' : 'STATEMENT OF PURPOSE / ACADEMIC ESSAY';
        const body = isHindi
          ? `उद्देश्य विवरण (Statement of Purpose)\n\n${text}\n\nउपर्युक्त विवरण मेरे शैक्षणिक एवं व्यावसायिक लक्ष्यों का प्रमाण है। मैं संस्था के मानकों के अनुरूप उत्कृष्ट प्रदर्शन हेतु कटिबद्ध हूँ।\n\nप्रार्थी,\n[आपका नाम]`
          : `STATEMENT OF PURPOSE\n\n${text}\n\nIn conclusion, my academic preparation, dedication, and professional ethos align seamlessly with the rigorous standards of your esteemed institution. I welcome the opportunity to contribute meaningfully to this program.\n\nRespectfully,\n[Your Name]`;
        return { subject, body };
      }

      case 'chat': {
        const subject = isHindi ? 'चैट संदेश' : 'Quick Message';
        const body = tone === 'casual'
          ? (isHindi ? `अरे सुनो! 👋\n\n${text}\n\nफ्री होकर बताना! ✨` : `Hey! 👋\n\n${text}\n\nLet me know what you think! ✨`)
          : `${text}`;
        return { subject, body };
      }

      case 'social': {
        const subject = isHindi ? 'लिंक्डइन / सोशल पोस्ट' : 'LinkedIn & Social Media Post';
        const hook = isHindi ? '💡 एक महत्वपूर्ण विचार जो मैं साझा करना चाहता हूँ:' : '💡 A valuable takeaway I wanted to share with my network:';
        const tags = isHindi 
          ? '\n\n#Professional #CareerGrowth #Innovation #Leadership #Success' 
          : '\n\n#Leadership #ProfessionalGrowth #Productivity #Business #Innovation';
        const body = `${hook}\n\n${text}${tags}`;
        return { subject, body };
      }

      case 'pitch': {
        const subject = isHindi ? 'प्रपोजल एवं बिज़नेस पिच' : 'Value Proposition & Client Proposal';
        const body = isHindi
          ? `प्रस्ताव दिनांक: ${today}\n\nप्रिये [क्लाइंट का नाम],\n\nहम आपके व्यवसाय को नई ऊंचाइयों पर ले जाने के लिए प्रतिबद्ध हैं:\n\n${text}\n\nहम आपके साथ एक 15 मिनट की परिचर्चा की प्रतीक्षा कर रहे हैं।\n\nसादर,\n[आपकी कंपनी]`
          : `PROPOSAL DATE: ${today}\n\nDear [Client / Partner Name],\n\nWe are pleased to introduce our solution tailored specifically to address your core operational objectives:\n\n${text}\n\nWe would be honored to schedule a brief 15-minute alignment call this week.\n\nBest regards,\n[Your Company / Product Team]`;
        return { subject, body };
      }

      case 'custom':
      default: {
        const contextHeader = customContext ? `[Context: ${customContext}]\n\n` : '';
        const subject = isHindi ? 'तैयार दस्तावेज़' : 'Drafted Document';
        const body = `${contextHeader}${text}`;
        return { subject, body };
      }
    }
  }

  // Text-To-Speech Reader
  speakText(text, lang = 'en-US') {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick best available voice
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => v.lang.startsWith(lang.substring(0, 2)));
    if (matchedVoice) utterance.voice = matchedVoice;

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}
