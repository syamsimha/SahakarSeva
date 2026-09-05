export interface FAQItem {
  id: string;
  category: 'booking' | 'tracking' | 'location' | 'services' | 'account' | 'emergency';
  question: {
    en: string;
    hi: string;
    te: string;
  };
  answer: {
    en: string;
    hi: string;
    te: string;
  };
  tags: string[];
}

export const FAQS_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'booking',
    question: {
      en: 'How do I book a cooperative worker?',
      hi: 'मैं सहकारी कार्यकर्ता को कैसे बुक करूँ?',
      te: 'నేను సహకార కార్యకర్తను ఎలా బుక్ చేసుకోవాలి?'
    },
    answer: {
      en: 'To book a worker, select your required service from the home screen or use the search bar. Choose your service category, select any specific sub-services, verify your service address, and click "Book Service" or "Book Priority 24/7". An accredited cooperative worker will be matched immediately.',
      hi: 'कार्यकर्ता बुक करने के लिए, होम स्क्रीन से अपनी आवश्यक सेवा चुनें या खोज पट्टी का उपयोग करें। अपनी सेवा श्रेणी चुनें, विशिष्ट उप-सेवाएं चुनें, अपने पते की पुष्टि करें, और "सेवा बुक करें" या "प्राथमिकता 24/7 बुक करें" पर क्लिक करें। एक सत्यापित सहकारी कार्यकर्ता तुरंत नियुक्त किया जाएगा।',
      te: 'కార్యకర్తను బుక్ చేయడానికి, హోమ్ స్క్రీన్ నుండి అవసరమైన సేవను ఎంచుకోండి లేదా సెర్చ్ బార్ ఉపయోగించండి. మీ సేవా వర్గాన్ని ఎంచుకోండి, నిర్దిష్ట ఉప-సేవలను ఎంచుకోండి, మీ చిరునామాను ధృవీకరించండి మరియు "సేవను బుక్ చేయండి" లేదా "ప్రయారిటీ 24/7 బుక్ చేయండి" క్లిక్ చేయండి. ధృవీకరించబడిన సహకార కార్యకర్త వెంటనే నియమించబడతారు.'
    },
    tags: ['book', 'booking', 'hire', 'service', 'worker', 'order', 'బుకింగ్', 'बुकिंग']
  },
  {
    id: 'faq-2',
    category: 'services',
    question: {
      en: 'How do I search for a plumber, electrician, or technician?',
      hi: 'मैं प्लंबर, इलेक्ट्रीशियन या तकनीशियन की खोज कैसे करूँ?',
      te: 'నేను ప్లంబర్, ఎలక్ట్రీషియన్ లేదా టెక్నీషియన్ కోసం ఎలా శోధించాలి?'
    },
    answer: {
      en: 'Use the real-time search bar at the top of the Customer Home screen. Type keywords like "plumber", "pipe", "wire", "technician", or "ac" in English, Hindi, or Telugu. The search filters matching cooperative categories and accredited nearby workers instantly.',
      hi: 'कस्टमर होम स्क्रीन के शीर्ष पर स्थित रीयल-टाइम सर्च बार का उपयोग करें। "प्लंबर", "पाइप", "वायर", "तकनीशियन" या "ac" जैसे कीवर्ड टाइप करें। खोज तुरंत संबंधित सहकारी श्रेणियों और नजदीकी कार्यकर्ताओं को प्रदर्शित करती है।',
      te: 'కస్టమర్ హోమ్ స్క్రీన్ పైభాగంలో ఉన్న రియల్-టైమ్ సెర్చ్ బార్‌ను ఉపయోగించండి. "ప్లంబర్", "పైప్", "వైర్", "టెక్నీషియన్" లేదా "ac" వంటి పదాలను టైప్ చేయండి. శోధన వెంటనే సరిపోలే సహకార కేటగిరీలు మరియు సమీప కార్మికులను చూపుతుంది.'
    },
    tags: ['search', 'plumber', 'electrician', 'technician', 'find', 'filter', 'खोज', 'प्लंबर', 'శోధన']
  },
  {
    id: 'faq-3',
    category: 'emergency',
    question: {
      en: 'How does Priority 24/7 emergency service work?',
      hi: 'प्राथमिकता 24/7 आपातकालीन सेवा कैसे काम करती है?',
      te: 'ప్రయారిటీ 24/7 అత్యవసర సేవ ఎలా పనిచేస్తుంది?'
    },
    answer: {
      en: 'Priority 24/7 is designed for urgent breakdowns such as burst pipes, short circuits, or critical repairs. Selecting Priority 24/7 flags your booking with high urgency, guarantees an immediate cooperative dispatch broadcast, applies transparent surge terms, and matches on-duty emergency workers within minutes.',
      hi: 'प्राथमिकता 24/7 तत्काल खराबी जैसे पाइप फटने, शॉर्ट सर्किट या महत्वपूर्ण मरम्मत के लिए बनाई गई है। प्राथमिकता 24/7 चुनने पर आपकी बुकिंग को उच्च प्राथमिकता मिलती है, आपातकालीन कार्यकर्ताओं को तुरंत सूचना जाती है और कुछ ही मिनटों में कार्यकर्ता मिल जाता है।',
      te: 'పైపులు పగలడం, షార్ట్ సర్క్యూట్‌లు లేదా అత్యవసర మరమ్మతుల వంటి సమస్యల కోసం ప్రయారిటీ 24/7 రూపొందించబడింది. ప్రయారిటీ 24/7 ఎంచుకోవడం ద్వారా అత్యవసర డ్యూటీలో ఉన్న కార్మికులకు తక్షణమే సమాచారం అంది నిమిషాల్లో కేటాయించబడతారు.'
    },
    tags: ['priority', 'emergency', 'urgent', '24/7', 'night', 'repair', 'आपातकालीन', 'प्राथमिकता', 'అత్యవసర']
  },
  {
    id: 'faq-4',
    category: 'tracking',
    question: {
      en: 'How do I track my assigned worker in real time?',
      hi: 'मैं अपने नियुक्त कार्यकर्ता को रीयल-टाइम में कैसे ट्रैक करूँ?',
      te: 'నాకు కేటాయించిన కార్యకర్తను రియల్ టైమ్‌లో ఎలా ట్రాక్ చేయాలి?'
    },
    answer: {
      en: 'Open your booking from the Bookings tab or the live status card on your Home screen. Tap "Track Worker" to view the live GPS tracking map. The map displays the worker\'s actual location, your service destination, and updated arrival status without simulated movement.',
      hi: 'बुकिंग टैब से या अपनी होम स्क्रीन पर लाइव स्टेटस कार्ड से अपनी बुकिंग खोलें। लाइव जीपीएस ट्रैकिंग मैप देखने के लिए "कार्यकर्ता को ट्रैक करें" पर टैप करें। नक्शा कार्यकर्ता का वास्तविक स्थान और पहुंचने की स्थिति दिखाता है।',
      te: 'బుకింగ్స్ ట్యాబ్ నుండి లేదా హోమ్ స్క్రీన్‌పై ఉన్న కార్డ్ నుండి మీ బుకింగ్‌ను తెరవండి. లైవ్ మ్యాప్ చూడటానికి "ట్రాక్ వర్కర్" పై నొక్కండి. ఇది కార్మికుడి నిజమైన స్థానాన్ని మరియు చేరే సమయాన్ని స్పష్టంగా చూపుతుంది.'
    },
    tags: ['track', 'tracking', 'live', 'gps', 'map', 'worker location', 'arrival', 'ट्रैक', 'ట్రాక్']
  },
  {
    id: 'faq-5',
    category: 'location',
    question: {
      en: 'How do I change my service location?',
      hi: 'मैं अपना सेवा स्थान कैसे बदलूँ?',
      te: 'నేను నా సేవా స్థానాన్ని ఎలా మార్చగలను?'
    },
    answer: {
      en: 'Tap the location indicator bar at the top of the Customer Home screen. You can switch between your device\'s Real Browser GPS, enter a manual address directly, or pick one of your Saved Addresses (Home, Office, etc.). Your nearby worker list will refresh based on the selected location.',
      hi: 'होम स्क्रीन के शीर्ष पर स्थित लोकेशन बार पर टैप करें। आप डिवाइस के वास्तविक GPS, मैन्युअल पता प्रविष्टि, या अपने सहेजे गए पतों (घर, कार्यालय आदि) के बीच स्विच कर सकते हैं। निकटतम कार्यकर्ताओं की सूची नए स्थान के अनुसार अपडेट हो जाएगी।',
      te: 'కస్టమర్ హోమ్ స్క్రీన్ పైభాగంలో ఉన్న లొకేషన్ బార్ పై నొక్కండి. మీరు మీ పరికరపు రియల్ GPS, మాన్యువల్ అడ్రస్ లేదా సేవ్ చేసిన చిరునామాల మధ్య సులభంగా మార్చుకోవచ్చు. దీని ప్రకారం సమీప కార్మికుల జాబితా మారుతుంది.'
    },
    tags: ['location', 'change address', 'switch location', 'gps', 'area', 'स्थान', 'చిరునామా']
  },
  {
    id: 'faq-6',
    category: 'location',
    question: {
      en: 'How does the GPS location system work?',
      hi: 'जीपीएस लोकेशन सिस्टम कैसे काम करता है?',
      te: 'GPS లొకేషన్ సిస్టమ్ ఎలా పనిచేస్తుంది?'
    },
    answer: {
      en: 'SahakarSeva uses your device\'s genuine browser/device Geolocation API with high accuracy mode enabled. When permitted, it reads your real latitude and longitude coordinates. We never use arbitrary default Bengaluru coordinates when your location is active.',
      hi: 'सहकारसेवा उच्च सटीकता के साथ आपके डिवाइस के वास्तविक जियोलोकेशन का उपयोग करती है। अनुमति मिलने पर, यह आपके वास्तविक अक्षांश और देशांतर को पढ़ती है। हम किसी नकली या डिफ़ॉल्ट बेंगलुरु स्थान का उपयोग नहीं करते हैं।',
      te: 'సహకారసేవ మీ పరికరపు ఖచ్చితమైన GPS జియోలొకేషన్‌ను ఉపయోగిస్తుంది. అనుమతి ఇచ్చినప్పుడు, ఇది మీ వాస్తవ లొకేషన్ కోఆర్డినేట్‌లను తీసుకుంటుంది. ఎటువంటి తప్పుడు లేదా డిఫాల్ట్ లొకేషన్‌ను ఉపయోగించదు.'
    },
    tags: ['gps', 'geolocation', 'device location', 'browser location', 'accuracy', 'जीपीएस', 'ఖచ్చితమైన']
  },
  {
    id: 'faq-7',
    category: 'location',
    question: {
      en: 'Can I enter my location manually if GPS is unavailable?',
      hi: 'यदि जीपीएस अनुपलब्ध है तो क्या मैं मैन्युअल रूप से अपना स्थान दर्ज कर सकता हूँ?',
      te: 'GPS అందుబాటులో లేకపోతే నేను మాన్యువల్‌గా నా స్థానాన్ని నమోదు చేయవచ్చా?'
    },
    answer: {
      en: 'Yes! Tap the location bar and select "Enter Location Manually". Fill in your Street Address, Area / Locality, City, and 6-digit Pincode. You can optionally save this address for future bookings. The app will immediately use your manual address for all service bookings.',
      hi: 'हाँ! लोकेशन बार पर टैप करें और "मैन्युअल रूप से पता दर्ज करें" चुनें। अपनी सड़क का पता, इलाका, शहर और 6 अंकों का पिनकोड भरें। आप इसे भविष्य के लिए सहेज भी सकते हैं। ऐप तुरंत इस पते का उपयोग करेगा।',
      te: 'అవును! లొకేషన్ బార్ పై నొక్కి "మాన్యువల్‌గా స్థానాన్ని నమోదు చేయండి" ఎంచుకోండి. మీ వీధి చిరునామా, ప్రాంతం, నగరం మరియు 6 అంకెల పిన్‌కోడ్‌ను నమోదు చేయండి. భవిష్యత్ బుకింగ్‌ల కోసం దీన్ని సేవ్ కూడా చేసుకోవచ్చు.'
    },
    tags: ['manual', 'enter address', 'pincode', 'offline location', 'custom address', 'मैन्युअल', 'మాన్యువల్']
  },
  {
    id: 'faq-8',
    category: 'location',
    question: {
      en: 'How do Saved Addresses work and how do I manage them?',
      hi: 'सहेजे गए पते (Saved Addresses) कैसे काम करते हैं और मैं उन्हें कैसे प्रबंधित करूँ?',
      te: 'సేవ్ చేసిన చిరునామాలు ఎలా పనిచేస్తాయి మరియు వాటిని ఎలా నిర్వహించాలి?'
    },
    answer: {
      en: 'In your Profile or through the location switcher modal, you can manage your Saved Addresses (e.g., Home, Work, Parents). You can set a default address or tap any saved address to make it your active service location with one tap.',
      hi: 'अपनी प्रोफ़ाइल में या स्थान चयनकर्ता के माध्यम से, आप अपने सहेजे गए पतों (जैसे घर, कार्यालय) को प्रबंधित कर सकते हैं। आप डिफ़ॉल्ट पता सेट कर सकते हैं या एक टैप में किसी भी पते को सक्रिय कर सकते हैं।',
      te: 'మీ ప్రొఫైల్‌లో లేదా లొకేషన్ సెలెక్టర్ ద్వారా, మీరు సేవ్ చేసిన చిరునామాలను (హోమ్, ఆఫీస్ మొదలైనవి) నిర్వహించవచ్చు. సులభంగా డిఫాల్ట్ అడ్రస్‌గా సెట్ చేసుకోవచ్చు.'
    },
    tags: ['saved addresses', 'home', 'work', 'profile addresses', 'manage addresses', 'सहेजे गए पते', 'చిరునామాలు']
  },
  {
    id: 'faq-9',
    category: 'booking',
    question: {
      en: 'How do I cancel a booking and what is the policy?',
      hi: 'मैं बुकिंग कैसे रद्द करूँ और इसकी क्या नीति है?',
      te: 'నేను బుకింగ్‌ను ఎలా రద్దు చేయాలి మరియు దాని విధానం ఏమిటి?'
    },
    answer: {
      en: 'You can cancel a booking before the worker arrives by opening the booking details and tapping "Cancel Booking". Cancellations made before dispatch incur zero cancellation fees. If a worker is already at your doorstep, a nominal cooperative dispatch allowance may apply to support the worker.',
      hi: 'कार्यकर्ता के आने से पहले आप बुकिंग विवरण खोलकर "बुकिंग रद्द करें" पर टैप करके रद्द कर सकते हैं। कार्यकर्ता के निकलने से पहले रद्द करने पर कोई शुल्क नहीं लगता है। यदि कार्यकर्ता पहुंच चुका है, तो एक मामूली शुल्क लग सकता है।',
      te: 'కార్మికుడు రాకముందే బుకింగ్ వివరాలను తెరిచి "బుకింగ్ రద్దు చేయండి" పై నొక్కడం ద్వారా రద్దు చేసుకోవచ్చు. కార్మికుడు బయలుదేరక ముందు రద్దు చేస్తే ఎలాంటి ఛార్జీలు ఉండవు.'
    },
    tags: ['cancel', 'cancellation', 'refund', 'policy', 'charges', 'रद्द', 'రద్దు']
  },
  {
    id: 'faq-10',
    category: 'booking',
    question: {
      en: 'How do I contact my assigned cooperative worker?',
      hi: 'मैं अपने नियुक्त सहकारी कार्यकर्ता से कैसे संपर्क करूँ?',
      te: 'నాకు కేటాయించిన సహకార కార్యకర్తను నేను ఎలా సంప్రదించాలి?'
    },
    answer: {
      en: 'Once a worker is assigned, their verified cooperative profile is shown on the Booking Details screen. Tap the phone button or the "Call +91..." phone number to directly launch your device\'s phone dialer and place a direct cellular call to the worker.',
      hi: 'कार्यकर्ता नियुक्त होने के बाद, उनका प्रोफाइल बुकिंग विवरण में दिखाई देता है। सीधे कॉल करने के लिए फ़ोन बटन या "Call +91..." पर टैप करें। यह आपके फ़ोन का डायलर खोल देगा।',
      te: 'కార్మికుడు కేటాయించబడిన తర్వాత, వారి ప్రొఫైల్ బుకింగ్ వివరాలలో కనిపిస్తుంది. ఫోన్ బటన్ లేదా "Call +91..." పై నొక్కి నేరుగా కాల్ చేయవచ్చు.'
    },
    tags: ['call', 'phone', 'contact worker', 'reach worker', 'dial', 'फोन', 'కాల్']
  },
  {
    id: 'faq-11',
    category: 'services',
    question: {
      en: 'What happens if no cooperative worker is immediately available?',
      hi: 'यदि कोई सहकारी कार्यकर्ता तुरंत उपलब्ध न हो तो क्या होगा?',
      te: 'వెంటనే సహకార కార్యకర్త ఎవరూ అందుబాటులో లేకపోతే ఏమి జరుగుతుంది?'
    },
    answer: {
      en: 'If all accredited cooperative workers in your immediate vicinity are engaged, the cooperative dispatch system automatically widens the coverage radius and notifies nearby on-call federation members. You will be alerted with realistic wait estimates, or you may schedule the service for a later preferred time slot.',
      hi: 'यदि आपके क्षेत्र के सभी सहकारी कार्यकर्ता व्यस्त हैं, तो सिस्टम स्वचालित रूप से दायरे को बढ़ाता है और अन्य सदस्यों को सूचित करता है। आपको संभावित प्रतीक्षा समय की जानकारी दी जाती है, या आप बाद के समय के लिए शेड्यूल कर सकते हैं।',
      te: 'మీ పరిసరాల్లోని కార్మికులందరూ బిజీగా ఉంటే, సిస్టమ్ ఆటోమేటిక్‌గా పరిధిని పెంచి ఇతర ఆన్-కాల్ సభ్యులకు తెలియజేస్తుంది. మీరు వేచి ఉండే సమయాన్ని చూడవచ్చు లేదా మరొక సమయానికి షెడ్యూల్ చేసుకోవచ్చు.'
    },
    tags: ['no worker', 'unavailability', 'busy', 'schedule', 'radius', 'अनुपलब्ध', 'అందుబాటులో లేరు']
  },
  {
    id: 'faq-12',
    category: 'account',
    question: {
      en: 'How do I change the application language?',
      hi: 'मैं ऐप की भाषा कैसे बदलूँ?',
      te: 'నేను అప్లికేషన్ భాషను ఎలా మార్చగలను?'
    },
    answer: {
      en: 'Tap the language button (e.g., "English", "हिंदी", or "తెలుగు") located on the top navigation bar or inside your Profile screen. Choose between English, Hindi (हिंदी), or Telugu (తెలుగు) to immediately translate the entire application interface, services, and notifications.',
      hi: 'शीर्ष नेविगेशन बार में या अपनी प्रोफ़ाइल में भाषा बटन ("English", "हिंदी", या "తెలుగు") पर टैप करें। संपूर्ण ऐप को तुरंत अनुवादित करने के लिए अंग्रेज़ी, हिंदी या तेलुगु में से चुनें।',
      te: 'పై నావిగేషన్ బార్‌లోని లేదా ప్రొఫైల్‌లోని భాష బటన్ ("English", "हिंदी", "తెలుగు") పై నొక్కండి. మొత్తం యాప్‌ను తక్షణమే అనువదించడానికి మీకు నచ్చిన భాషను ఎంచుకోండి.'
    },
    tags: ['language', 'translate', 'hindi', 'telugu', 'english', 'bilingual', 'भाषा', 'భాష']
  },
  {
    id: 'faq-13',
    category: 'booking',
    question: {
      en: 'What happens after a booking is completed?',
      hi: 'बुकिंग पूरी होने के बाद क्या होता है?',
      te: 'బుకింగ్ పూర్తయిన తర్వాత ఏమి జరుగుతుంది?'
    },
    answer: {
      en: 'Upon completion of the service, the worker generates a digital cooperative receipt. You can inspect the transparent fare breakdown, pay securely via Cash, UPI, or Card, and rate the worker. Your rating helps maintain high standards and fair welfare dividends for cooperative members.',
      hi: 'सेवा पूरी होने पर, कार्यकर्ता एक डिजिटल सहकारी रसीद बनाता है। आप किराए का पारदर्शी विवरण देख सकते हैं, नकद, यूपीआई या कार्ड से भुगतान कर सकते हैं और रेटिंग दे सकते हैं।',
      te: 'సేవ పూర్తయిన తర్వాత, డిజిటల్ సహకార రసీదు రూపొందించబడుతుంది. మీరు బిల్ వివరాలను చూసి నగదు, UPI లేదా కార్డు ద్వారా చెల్లించి రేటింగ్ ఇవ్వవచ్చు.'
    },
    tags: ['completed', 'invoice', 'receipt', 'payment', 'rating', 'feedback', 'पूर्ण', 'పూర్తయింది']
  }
];
