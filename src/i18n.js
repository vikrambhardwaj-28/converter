// Internationalization (i18n) Support: English & Hindi
export const translations = {
  en: {
    siteTitle: "PDFCraft Pro",
    siteTagline: "Incredible PDF power. All on-device. Studio Master 300 DPI quality designed for macOS Sequoia & Apple Silicon.",
    privacyBadge: "100% On-Device Privacy • Studio Master 300 DPI Quality",
    allTools: "All Tools",
    organizeTab: "Organize & Optimize",
    convertTab: "Convert",
    editTab: "Edit & Sign",
    securityTab: "Security",
    searchPlaceholder: "Search any PDF tool (e.g. merge, compress, sign)...",
    dropFiles: "Drop PDF files here, or click to browse",
    dropImages: "Drop JPG/PNG images here, or click to browse",
    selectFiles: "Select PDF files",
    selectImages: "Select Images",
    backToTools: "Back to All Tools",
    processButton: "Process PDF",
    downloadButton: "Download Result",
    processing: "Processing, please wait...",
    successMessage: "Success! Your file is ready.",
    errorMessage: "An error occurred while processing the file.",
    addMoreFiles: "Add More Files",
    clearAll: "Clear All",
    pageCount: "Pages",
    size: "Size",
    
    // Tools
    tools: {
      merge: {
        name: "Merge PDF",
        badge: "Popular",
        desc: "Combine multiple PDF files into one unified document in any order you choose.",
        action: "Merge PDFs",
        readyText: "Files combined successfully!"
      },
      split: {
        name: "Split PDF",
        badge: "Essential",
        desc: "Separate one PDF into individual pages or extract custom page ranges.",
        action: "Split PDF",
        modeRange: "Custom Range (e.g. 1-3, 5)",
        modeAll: "Extract all pages as separate files (ZIP)",
        rangePlaceholder: "e.g. 1-3, 5, 7-9"
      },
      compress: {
        name: "Compress PDF",
        badge: "Fast",
        desc: "Reduce PDF file size while optimizing for the best visual quality.",
        action: "Compress PDF",
        extreme: "Extreme Compression (Smallest file size)",
        recommended: "Recommended Compression (Best balance)",
        low: "Low Compression (Highest quality)"
      },
      "pdf-to-img": {
        name: "PDF to Images",
        badge: "Convert",
        desc: "Convert every page of your PDF into high-resolution JPG or PNG images.",
        action: "Convert to Images",
        format: "Image Format",
        scale: "Resolution (Scale)",
        downloadZip: "Download All as ZIP"
      },
      "img-to-pdf": {
        name: "Images to PDF",
        badge: "Convert",
        desc: "Transform JPG, PNG, or WebP photos into a beautiful PDF document.",
        action: "Generate PDF",
        orientation: "Orientation",
        portrait: "Portrait",
        landscape: "Landscape",
        pageSize: "Page Size",
        margin: "Margin"
      },
      rotate: {
        name: "Rotate PDF",
        badge: "Organize",
        desc: "Rotate all pages or specific pages 90°, 180°, or 270° clockwise.",
        action: "Rotate and Save",
        rotateRight: "Rotate Right 90°",
        rotateLeft: "Rotate Left 90°",
        flip: "Flip 180°"
      },
      organize: {
        name: "Organize PDF",
        badge: "Interactive",
        desc: "Visually reorder, delete, rotate, or duplicate pages with drag & drop.",
        action: "Save Organized PDF",
        deletePage: "Delete",
        duplicatePage: "Duplicate",
        rotatePage: "Rotate"
      },
      watermark: {
        name: "Watermark PDF",
        badge: "Branding",
        desc: "Stamp text or custom watermarks on every page with custom opacity and angle.",
        action: "Apply Watermark",
        textLabel: "Watermark Text",
        position: "Position",
        opacity: "Opacity",
        rotation: "Rotation Angle",
        fontSize: "Font Size",
        color: "Color"
      },
      "page-numbers": {
        name: "Page Numbers",
        badge: "Format",
        desc: "Add customized page numbering (Page X of Y, 1, 2...) to your PDF.",
        action: "Add Page Numbers",
        formatLabel: "Number Format",
        positionLabel: "Position",
        startAt: "Start from page",
        excludeFirst: "Exclude Cover Page"
      },
      sign: {
        name: "Sign PDF",
        badge: "Signature",
        desc: "Draw, type, or upload your signature and place it anywhere on any page.",
        action: "Sign & Download",
        drawTab: "Draw Signature",
        typeTab: "Type Name",
        uploadTab: "Upload Image",
        clearSign: "Clear",
        signatureColor: "Pen Color",
        fontChoice: "Signature Style",
        dragNote: "Drag and resize the signature onto the PDF preview below:"
      },
      protect: {
        name: "Protect PDF",
        badge: "Security",
        desc: "Encrypt your PDF with a strong password to prevent unauthorized access.",
        action: "Protect PDF",
        passwordLabel: "Enter Password",
        confirmPasswordLabel: "Confirm Password"
      },
      unlock: {
        name: "Unlock PDF",
        badge: "Security",
        desc: "Remove password security from a PDF so it can be viewed and edited freely.",
        action: "Unlock PDF",
        enterPassword: "Enter Current Password"
      },
      "pdf-to-text": {
        name: "PDF to Text",
        badge: "Extract",
        desc: "Extract raw readable text from all pages of your PDF document.",
        action: "Extract Text",
        copyClipboard: "Copy to Clipboard",
        downloadTxt: "Download .txt File"
      },
      crop: {
        name: "Crop PDF",
        badge: "Edit",
        desc: "Trim white margins or crop specific areas across your PDF pages.",
        action: "Crop PDF",
        cropMargins: "Trim Margins (px)"
      },
      annotate: {
        name: "Edit & Annotate",
        badge: "Editor",
        desc: "Add text notes, shapes, and freehand markup directly onto PDF pages.",
        action: "Save Annotated PDF",
        addText: "Add Text",
        addBox: "Add Box",
        drawFreehand: "Draw"
      },
      repair: {
        name: "Repair PDF",
        badge: "Utility",
        desc: "Analyze and rebuild corrupted PDF structures into a valid document.",
        action: "Repair & Rebuild PDF"
      },
      "pdf-editor": {
        name: "Visual PDF Editor",
        badge: "Pro Suite",
        desc: "Open, view, and visually edit any PDF with text, pen, highlighters, shapes, and whiteout.",
        action: "Open in PDF Studio"
      },
      "pdf-to-word": {
        name: "PDF to Word",
        badge: "Convert",
        desc: "Extract text, headings, and formatting into an editable Microsoft Word (.docx) document.",
        action: "Convert to Word (.docx)"
      },
      "pdf-to-excel": {
        name: "PDF to Excel",
        badge: "Convert",
        desc: "Automatically detect tables, numbers, and rows and export to Microsoft Excel (.xlsx).",
        action: "Convert to Excel (.xlsx)"
      },
      "pdf-to-ppt": {
        name: "PDF to PowerPoint",
        badge: "Convert",
        desc: "Transform PDF pages into a real Microsoft PowerPoint (.pptx) presentation slides.",
        action: "Convert to PowerPoint (.pptx)"
      },
      "pdf-to-html": {
        name: "PDF to HTML",
        badge: "Convert",
        desc: "Convert PDF pages into standalone, responsive HTML web pages with clean CSS styling.",
        action: "Convert to HTML"
      },
      "word-to-pdf": {
        name: "Word to PDF",
        badge: "Convert",
        desc: "Convert DOCX Microsoft Word files directly into a professional PDF document.",
        action: "Convert to PDF"
      },
      "excel-to-pdf": {
        name: "Excel / CSV to PDF",
        badge: "Convert",
        desc: "Turn XLSX spreadsheets or CSV data into formatted, printable table PDF reports.",
        action: "Generate Table PDF"
      },
      "md-to-pdf": {
        name: "Markdown to PDF",
        badge: "Convert",
        desc: "Compile Markdown (.md) documents with headings, bold text, and code into clean PDF.",
        action: "Convert Markdown to PDF"
      },
      "code-to-pdf": {
        name: "Code to PDF",
        badge: "Developer",
        desc: "Turn source code files (.js, .py, .java, .cpp, .html) into syntax-styled PDF documents.",
        action: "Export Code to PDF"
      },
      redact: {
        name: "Redact PDF (Blackout)",
        badge: "Security",
        desc: "Permanently blackout sensitive personal, financial, or confidential information.",
        action: "Apply Redactions"
      },
      "voice-writer": {
        name: "AI Voice Dictation & Smart Writer",
        badge: "AI Voice",
        desc: "Speak in any language (Hindi, English, etc.) — live speech-to-text, translated into Professional or Casual English, Hindi, or any language tailored for your specific purpose (Email, Legal, SOP, WhatsApp).",
        action: "Export Document"
      },
      flatten: {
        name: "Flatten PDF",
        badge: "Essential",
        desc: "Convert interactive form fields, annotations, and signatures into permanent static page elements.",
        action: "Flatten PDF"
      },
      grayscale: {
        name: "Grayscale / B&W PDF",
        badge: "Printing",
        desc: "Convert full color PDFs to high-contrast grayscale or pure monochrome for printing & archiving.",
        action: "Convert to Grayscale"
      },
      "invert-colors": {
        name: "Invert / Dark Mode PDF",
        badge: "Reading",
        desc: "Invert colors for night-time reading with white text on dark background to eliminate eye strain.",
        action: "Invert Colors"
      },
      "bates-numbers": {
        name: "Bates Numbering",
        badge: "Legal",
        desc: "Index legal documents with sequential Bates numbers, custom prefixes, suffixes, and padding.",
        action: "Apply Bates Numbers"
      },
      "header-footer": {
        name: "Header & Footer",
        badge: "Organize",
        desc: "Add running headers and footers with page numbers, document titles, dates, or custom disclaimers.",
        action: "Apply Header & Footer"
      },
      "extract-images": {
        name: "Extract Images",
        badge: "Media",
        desc: "Extract all high-resolution pictures and raster images embedded in your PDF into a clean ZIP.",
        action: "Extract Images"
      },
      "extract-pages": {
        name: "Extract Pages",
        badge: "Organize",
        desc: "Extract specific page ranges (e.g. 1-3, 5, 8-10) directly into a new clean document.",
        action: "Extract Pages"
      },
      metadata: {
        name: "PDF Metadata & Privacy",
        badge: "Privacy",
        desc: "View and edit document Title, Author, Subject, Keywords, or 1-click sanitize all tracking metadata.",
        action: "Update Metadata"
      }
    }
  },
  hi: {
    siteTitle: "PDFCraft Pro",
    siteTagline: "अविश्वसनीय PDF ताकत। 100% ऑन-डिवाइस। macOS Sequoia & Apple Silicon के लिए डिज़ाइन किया गया।",
    privacyBadge: "100% ऑन-डिवाइस प्राइवेसी • स्टूडियो मास्टर 300 DPI टॉप क्वालिटी",
    allTools: "सभी टूल्स",
    organizeTab: "व्यवस्थित और ऑप्टिमाइज़",
    convertTab: "कन्वर्ट करें",
    editTab: "एडिट और साइन",
    securityTab: "सुरक्षा",
    searchPlaceholder: "कोई भी पीडीएफ टूल खोजें (जैसे: मर्ज, कंप्रेस, साइन)...",
    dropFiles: "पीडीएफ फाइलें यहाँ ड्रैग करें, या ब्राउज़ करने के लिए क्लिक करें",
    dropImages: "JPG/PNG इमेज यहाँ ड्रैग करें, या ब्राउज़ करने के लिए क्लिक करें",
    selectFiles: "पीडीएफ फाइलें चुनें",
    selectImages: "इमेज चुनें",
    backToTools: "← सभी टूल्स पर वापस जाएं",
    processButton: "पीडीएफ प्रोसेस करें",
    downloadButton: "डाउनलोड करें",
    processing: "प्रोसेस हो रहा है, कृपया प्रतीक्षा करें...",
    successMessage: "सफल! आपकी फाइल तैयार है।",
    errorMessage: "फाइल प्रोसेस करने में कोई त्रुटि आई।",
    addMoreFiles: "+ और फाइलें जोड़ें",
    clearAll: "सभी हटाएं",
    pageCount: "पेज",
    size: "साइज़",
    
    // Tools in Hindi
    tools: {
      merge: {
        name: "पीडीएफ जोड़ें (Merge)",
        badge: "लोकप्रिय",
        desc: "कई पीडीएफ फाइलों को अपनी मनपसंद क्रम में एक सिंगल पीडीएफ में जोड़ें।",
        action: "पीडीएफ मर्ज करें",
        readyText: "फाइलें सफलतापूर्वक जुड़ गईं!"
      },
      split: {
        name: "पीडीएफ विभाजित करें (Split)",
        badge: "ज़रूरी",
        desc: "एक पीडीएफ को अलग-अलग पेजों में बांटें या कस्टम पेज रेंज निकालें।",
        action: "पीडीएफ अलग करें",
        modeRange: "कस्टम रेंज (जैसे 1-3, 5)",
        modeAll: "सभी पेजों को अलग-अलग फाइलों में निकालें (ZIP)",
        rangePlaceholder: "जैसे 1-3, 5, 7-9"
      },
      compress: {
        name: "पीडीएफ कंप्रेस करें (Compress)",
        badge: "तेज़",
        desc: "पीडीएफ का साइज़ कम करें और बेहतरीन विज़ुअल क्वालिटी बनाए रखें।",
        action: "कंप्रेस करें",
        extreme: "अत्यधिक कंप्रेशन (सबसे छोटा साइज़)",
        recommended: "अनुशंसित कंप्रेशन (संतुलित)",
        low: "कम कंप्रेशन (उच्चतम क्वालिटी)"
      },
      "pdf-to-img": {
        name: "पीडीएफ से इमेज (PDF to Image)",
        badge: "कन्वर्ट",
        desc: "पीडीएफ के हर पेज को हाई-क्वालिटी JPG या PNG इमेज में बदलें।",
        action: "इमेज में बदलें",
        format: "इमेज फॉर्मेट",
        scale: "रेज़ोल्यूशन (Scale)",
        downloadZip: "सभी इमेज ZIP में डाउनलोड करें"
      },
      "img-to-pdf": {
        name: "इमेज से पीडीएफ (Image to PDF)",
        badge: "कन्वर्ट",
        desc: "JPG, PNG या WebP तस्वीरों को एक खूबसूरत पीडीएफ में बदलें।",
        action: "पीडीएफ बनाएं",
        orientation: "ओरिएंटेशन",
        portrait: "पोर्ट्रेट (खड़ा)",
        landscape: "लैंडस्केप (आड़ा)",
        pageSize: "पेज साइज़",
        margin: "मार्जिन"
      },
      rotate: {
        name: "पीडीएफ घुमाएं (Rotate)",
        badge: "व्यवस्थित",
        desc: "सभी या चुनिंदा पेजों को 90°, 180° या 270° क्लॉकवाइज़ घुमाएं।",
        action: "घुमाएं और सेव करें",
        rotateRight: "दाएं 90° घुमाएं",
        rotateLeft: "बाएं 90° घुमाएं",
        flip: "180° पलटें"
      },
      organize: {
        name: "पेज व्यवस्थित करें (Organize)",
        badge: "इंटरएक्टिव",
        desc: "पेज थंबनेल देखें, क्रम बदलें, गैर-ज़रूरी पेज हटाएं या डुप्लीकेट करें।",
        action: "व्यवस्थित पीडीएफ सेव करें",
        deletePage: "हटाएं",
        duplicatePage: "डुप्लीकेट",
        rotatePage: "घुमाएं"
      },
      watermark: {
        name: "वॉटरमार्क जोड़ें (Watermark)",
        badge: "ब्रांडिंग",
        desc: "कस्टम टेक्स्ट या वॉटरमार्क जोड़ें, रंग, पारदर्शिता और कोण सेट करें।",
        action: "वॉटरमार्क लगाएं",
        textLabel: "वॉटरमार्क टेक्स्ट",
        position: "स्थिति (Position)",
        opacity: "पारदर्शिता (Opacity)",
        rotation: "कोण (Rotation)",
        fontSize: "फॉन्ट साइज़",
        color: "रंग"
      },
      "page-numbers": {
        name: "पेज नंबर डालें (Page Numbers)",
        badge: "फॉर्मेट",
        desc: "पीडीएफ में पेज नंबर जोड़ें (जैसे: Page 1 of N, 1, 2, 3)।",
        action: "पेज नंबर जोड़ें",
        formatLabel: "नंबर फॉर्मेट",
        positionLabel: "स्थिति",
        startAt: "किस पेज से शुरू करें",
        excludeFirst: "कवर पेज छोड़ें"
      },
      sign: {
        name: "हस्ताक्षर करें (Sign PDF)",
        badge: "डिजिटल साइन",
        desc: "साइन बनाएं, टाइप करें या इमेज अपलोड करें और किसी भी पेज पर लगाएं।",
        action: "साइन करके डाउनलोड करें",
        drawTab: "हस्ताक्षर बनाएं (Draw)",
        typeTab: "नाम लिखें (Type)",
        uploadTab: "इमेज अपलोड करें",
        clearSign: "हटाएं (Clear)",
        signatureColor: "पेन का रंग",
        fontChoice: "स्टाइल चुनें",
        dragNote: "हस्ताक्षर को नीचे दिए गए पीडीएफ प्रीव्यू पर ड्रैग और रीसाइज़ करें:"
      },
      protect: {
        name: "पीडीएफ लॉक करें (Protect)",
        badge: "सुरक्षा",
        desc: "पासवर्ड डालकर अपनी गोपनीय पीडीएफ को पूरी तरह सुरक्षित करें।",
        action: "पासवर्ड लगाएं",
        passwordLabel: "पासवर्ड दर्ज करें",
        confirmPasswordLabel: "पासवर्ड की पुष्टि करें"
      },
      unlock: {
        name: "पीडीएफ अनलॉक करें (Unlock)",
        badge: "सुरक्षा",
        desc: "पासवर्ड-प्रोटेक्टेड पीडीएफ से लॉक हटाएं ताकि उसे आसानी से खोला जा सके।",
        action: "अनलॉक करें",
        enterPassword: "वर्तमान पासवर्ड डालें"
      },
      "pdf-to-text": {
        name: "पीडीएफ से टेक्स्ट (PDF to Text)",
        badge: "एक्सट्रैक्ट",
        desc: "पीडीएफ के सभी पेजों से टेक्स्ट कंटेंट को निकालें और कॉपी करें।",
        action: "टेक्स्ट निकालें",
        copyClipboard: "क्लिपबोर्ड पर कॉपी करें",
        downloadTxt: ".txt फाइल डाउनलोड करें"
      },
      crop: {
        name: "पीडीएफ क्रॉप करें (Crop)",
        badge: "एडिट",
        desc: "अतिरिक्त सफेद बॉर्डर को ट्रिम करें और पीडीएफ पेजों को क्रॉप करें।",
        action: "क्रॉप करें",
        cropMargins: "मार्जिन ट्रिम करें (px)"
      },
      annotate: {
        name: "एडिट और मार्कअप (Edit PDF)",
        badge: "एडिटर",
        desc: "पीडीएफ पर टेक्स्ट नोट्स, बॉक्स, हाइलाइट और ड्राइंग जोड़ें।",
        action: "एडिटेड पीडीएफ सेव करें",
        addText: "टेक्स्ट जोड़ें",
        addBox: "बॉक्स बनाएं",
        drawFreehand: "फ्रीहैंड ड्रॉ"
      },
      repair: {
        name: "पीडीएफ रिपेयर करें (Repair)",
        badge: "यूटिलिटी",
        desc: "खराब या एरर वाली पीडीएफ फाइलों को ठीक करें और दोबारा बनाएं।",
        action: "रिपेयर और रीबिल्ड करें"
      },
      "pdf-editor": {
        name: "सम्पूर्ण विज़ुअल एडिटर (PDF Editor)",
        badge: "एडवांस प्रो",
        desc: "पूरी पीडीएफ को ओपन करें, टेक्स्ट जोड़ें, पेन ड्रॉइंग, हाइलाइटर, आकृतियां और व्हाइटआउट करें।",
        action: "एडिटर स्टूडियो में खोलें"
      },
      "pdf-to-word": {
        name: "पीडीएफ से वर्ड (PDF to Word)",
        badge: "कन्वर्ट",
        desc: "पीडीएफ को एडिटेबल माइक्रोसॉफ्ट वर्ड (.docx) दस्तावेज में बदलें।",
        action: "Word (.docx) में बदलें"
      },
      "pdf-to-excel": {
        name: "पीडीएफ से एक्सेल (PDF to Excel)",
        badge: "कन्वर्ट",
        desc: "पीडीएफ से टेबल, डेटा और रो को पहचानकर सीधे Excel (.xlsx) में एक्सपोर्ट करें।",
        action: "Excel (.xlsx) में बदलें"
      },
      "pdf-to-ppt": {
        name: "पीडीएफ से पावरपॉइंट (PDF to PPT)",
        badge: "कन्वर्ट",
        desc: "पीडीएफ पेजों को माइक्रोसॉफ्ट पावरपॉइंट (.pptx) प्रेजेंटेशन स्लाइड्स में बदलें।",
        action: "PowerPoint (.pptx) में बदलें"
      },
      "pdf-to-html": {
        name: "पीडीएफ से एचटीएमएल (PDF to HTML)",
        badge: "कन्वर्ट",
        desc: "पीडीएफ को आधुनिक, रिस्पॉन्सिव वेबपेज (.html) में बदलें।",
        action: "HTML में बदलें"
      },
      "word-to-pdf": {
        name: "वर्ड से पीडीएफ (Word to PDF)",
        badge: "कन्वर्ट",
        desc: "माइक्रोसॉफ्ट वर्ड (.docx) फाइल को सीधे उच्च गुणवत्ता वाली पीडीएफ में बदलें।",
        action: "पीडीएफ में बदलें"
      },
      "excel-to-pdf": {
        name: "एक्सेल से पीडीएफ (Excel to PDF)",
        badge: "कन्वर्ट",
        desc: "XLSX स्प्रेडशीट या CSV डेटा को टेबल बॉर्डर्स के साथ प्रिंटेबल पीडीएफ में बदलें।",
        action: "टेबल पीडीएफ बनाएं"
      },
      "md-to-pdf": {
        name: "मार्कडाउन से पीडीएफ (MD to PDF)",
        badge: "कन्वर्ट",
        desc: "मार्कडाउन (.md) फाइलों को हेडिंग, कोड ब्लॉक्स और स्टाइल्स के साथ पीडीएफ में बदलें।",
        action: "पीडीएफ में कन्वर्ट करें"
      },
      "code-to-pdf": {
        name: "सोर्स कोड से पीडीएफ (Code to PDF)",
        badge: "डेवलपर",
        desc: "प्रोग्रामिंग कोड (.js, .py, .java, .cpp, .html) को लाइन नंबर के साथ पीडीएफ बनाएं।",
        action: "कोड पीडीएफ बनाएं"
      },
      redact: {
        name: "गोपनीय डेटा छुपाएं (Redact / Blackout)",
        badge: "सुरक्षा",
        desc: "बैंक विवरण, आधार या गोपनीय टेक्स्ट पर परमानेंट ब्लैकआउट पट्टी लगाएं।",
        action: "ब्लैकआउट लागू करें"
      },
      "voice-writer": {
        name: "आवाज़ से लिखें & ट्रांसलेट (AI Voice Writer)",
        badge: "AI Voice",
        desc: "किसी भी भाषा (हिन्दी, इंग्लिश आदि) में बोलें — लाइव बोलकर लिखवाएं, प्रोफेशनल या कैजुअल इंग्लिश/हिन्दी में बदलें, और ईमेल, कानूनी पत्र या चैट के अनुसार तैयार करें।",
        action: "दस्तावेज़ एक्सपोर्ट करें"
      },
      flatten: {
        name: "PDF समतल करें (Flatten PDF)",
        badge: "जरूरी",
        desc: "फॉर्म फील्ड्स, डिजिटल हस्ताक्षर और एनोटेशन को स्थायी पेज कंटेंट में बदलें ताकि कोई बदल न सके।",
        action: "PDF समतल करें"
      },
      grayscale: {
        name: "ब्लैक एंड व्हाइट PDF (Grayscale)",
        badge: "प्रिंटिंग",
        desc: "रंगीन PDF को प्रिंटिंग और सुरक्षित रखने के लिए साफ ग्रेस्केल या प्योर ब्लैक एंड व्हाइट में बदलें।",
        action: "ग्रेस्केल में बदलें"
      },
      "invert-colors": {
        name: "डार्क मोड PDF (Invert Colors)",
        badge: "रीडिंग",
        desc: "रात में आरामदायक पढ़ाई के लिए कलर्स को इन्वर्ट करें — डार्क बैकग्राउंड पर सफेद टेक्स्ट।",
        action: "रंग इन्वर्ट करें"
      },
      "bates-numbers": {
        name: "बेट्स नंबरिंग (Legal Indexing)",
        badge: "लीगल",
        desc: "कानूनी व कोर्ट दस्तावेजों के लिए प्रीफिक्स, सफिक्स और सीरियल नंबरिंग लगाएं।",
        action: "बेट्स नंबर लागू करें"
      },
      "header-footer": {
        name: "हेडर और फुटर जोड़ें",
        badge: "ऑर्गनाइज़",
        desc: "सभी पेजों पर शीर्ष लेख (हेडर) और पाद लेख (फुटर) में पेज संख्या, शीर्षक या तारीख जोड़ें।",
        action: "हेडर/फुटर लागू करें"
      },
      "extract-images": {
        name: "PDF से फोटो निकालें (Extract Images)",
        badge: "मीडिया",
        desc: "PDF के अंदर मौजूद सभी उच्च-गुणवत्ता वाली तस्वीरों को अलग करके ZIP फाइल में डाउनलोड करें।",
        action: "इमेज निकालें"
      },
      "extract-pages": {
        name: "चुनिंदा पेज निकालें (Extract Pages)",
        badge: "ऑर्गनाइज़",
        desc: "अपनी पसंद के चुनिंदा पेज (जैसे 1-3, 5, 8-10) निकालकर नया अलग PDF बनाएं।",
        action: "पेज एक्सट्रैक्ट करें"
      },
      metadata: {
        name: "PDF मेटाडेटा & गोपनीयता (Privacy)",
        badge: "सुरक्षा",
        desc: "डॉक्युमेंट का शीर्षक, लेखक, कीवर्ड्स बदलें या 1-क्लिक में सारा ट्रैकिंग डेटा साफ करें।",
        action: "मेटाडेटा अपडेट करें"
      }
    }
  }
};
