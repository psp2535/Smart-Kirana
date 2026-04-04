import React, { useState, useEffect } from 'react';
import { X, Bot, Store, Package, Send, Moon, Sun, Globe, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const FloatingAIChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [retailers, setRetailers] = useState([]);
    const [selectedRetailer, setSelectedRetailer] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [isDark, setIsDark] = useState(localStorage.getItem('chatbotDarkMode') === 'true');
    const [language, setLanguage] = useState(localStorage.getItem('chatbotLanguage') || 'en');
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(localStorage.getItem('chatbotMuted') === 'true');
    const [recognition, setRecognition] = useState(null);

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
        { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
        { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
        { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' }
    ];

    const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
    const token = localStorage.getItem('token');

    useEffect(() => {
        localStorage.setItem('chatbotDarkMode', isDark);
    }, [isDark]);

    useEffect(() => {
        localStorage.setItem('chatbotLanguage', language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem('chatbotMuted', isMuted);
    }, [isMuted]);

    // Initialize speech recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = false;
            recognitionInstance.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US';

            recognitionInstance.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputMessage(transcript);
                setIsListening(false);
            };

            recognitionInstance.onerror = () => {
                setIsListening(false);
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
            };

            setRecognition(recognitionInstance);
        }
    }, [language]);

    useEffect(() => {
        if (isOpen && retailers.length === 0) {
            fetchRetailers();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedRetailer) {
            fetchInventory(selectedRetailer._id);
            initializeChat();
        }
    }, [selectedRetailer]);

    const fetchRetailers = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/customer-requests/retailers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setRetailers(response.data.data.retailers || []);
            }
        } catch (error) {
            console.error('Failed to fetch retailers:', error);
        }
    };

    const fetchInventory = async (retailerId) => {
        try {
            const response = await axios.get(`${API_URL}/api/customer-requests/retailer/${retailerId}/inventory`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setInventory(response.data.data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        }
    };

    const getWelcomeMessage = () => {
        const messages = {
            en: `👋 Hi! I'm your AI shopping assistant for ${selectedRetailer?.shop_name}!\n\nWhat would you like to order today?\n\n💡 Try:\n• "I want to make chicken curry"\n• "Buy 2kg rice, 1 litre milk"`,
            hi: `👋 नमस्ते! मैं ${selectedRetailer?.shop_name} के लिए आपका AI शॉपिंग सहायक हूं!\n\nआज आप क्या ऑर्डर करना चाहेंगे?\n\n💡 कोशिश करें:\n• "मुझे चिकन करी बनानी है"\n• "2 किलो चावल, 1 लीटर दूध खरीदें"`,
            te: `👋 హలో! నేను ${selectedRetailer?.shop_name} కోసం మీ AI షాపింగ్ అసిస్టెంట్!\n\nఈరోజు మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?\n\n💡 ప్రయత్నించండి:\n• "నాకు చికెన్ కర్రీ చేయాలి"\n• "2 కిలో బియ్యం, 1 లీటర్ పాలు కొనండి"`,
            ta: `👋 வணக்கம்! நான் ${selectedRetailer?.shop_name} க்கான உங்கள் AI ஷாப்பிங் உதவியாளர்!\n\nஇன்று நீங்கள் என்ன ஆர்டர் செய்ய விரும்புகிறீர்கள்?\n\n💡 முயற்சிக்கவும்:\n• "எனக்கு சிக்கன் கறி செய்ய வேண்டும்"\n• "2 கிலோ அரிசி, 1 லிட்டர் பால் வாங்கவும்"`,
            kn: `👋 ನಮಸ್ಕಾರ! ನಾನು ${selectedRetailer?.shop_name} ಗಾಗಿ ನಿಮ್ಮ AI ಶಾಪಿಂಗ್ ಸಹಾಯಕ!\n\nಇಂದು ನೀವು ಏನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?\n\n💡 ಪ್ರಯತ್ನಿಸಿ:\n• "ನನಗೆ ಚಿಕನ್ ಕರಿ ಮಾಡಬೇಕು"\n• "2 ಕೆಜಿ ಅಕ್ಕి, 1 ಲೀಟರ್ ಹಾಲು ಖರೀದಿಸಿ"`
        };
        return messages[language] || messages.en;
    };

    const initializeChat = () => {
        setMessages([{
            id: 'welcome',
            type: 'bot',
            content: getWelcomeMessage(),
            timestamp: new Date()
        }]);
    };

    const sendMessage = async (overrideMessage = null) => {
        const messageToSend = overrideMessage || inputMessage;
        if (!messageToSend.trim() || isLoading || !selectedRetailer) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: messageToSend,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/chatbot/chat`, {
                message: messageToSend,
                retailer_id: selectedRetailer._id,
                language: language
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const botMessage = {
                id: Date.now() + 1,
                type: 'bot',
                content: response.data.message,
                data: response.data.data,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);

            if (!isMuted && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(response.data.message);
                utterance.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US';
                utterance.rate = 0.9;
                window.speechSynthesis.speak(utterance);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                type: 'bot',
                content: error.response?.data?.message || 'Sorry, I had trouble understanding that. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const startVoiceInput = () => {
        if (recognition && !isListening) {
            setIsListening(true);
            recognition.start();
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (!isMuted) {
            window.speechSynthesis.cancel();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!isOpen) {
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative bg-black dark:bg-white text-white dark:text-black p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 group"
                >
                    <Bot className="w-7 h-7 animate-pulse" />
                    <span className="absolute -top-1 -right-1 bg-neutral-100 dark:bg-neutral-800 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce shadow-lg border border-black dark:border-white">
                        AI
                    </span>
                </button>
            </div>
        );
    }

    const bgClass = isDark ? 'bg-gray-900' : 'bg-white';
    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
    const cardBgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const hoverBgClass = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

    return (
        <div className={`fixed bottom-6 right-6 w-[95vw] sm:w-[500px] h-[85vh] sm:h-[650px] ${bgClass} rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border-2 ${borderClass}`}>
            {/* Header */}
            <div className="bg-black dark:bg-white text-white dark:text-black p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <Bot className="w-7 h-7" />
                            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">AI Assistant</h3>
                            <p className="text-xs opacity-70">
                                {selectedRetailer ? selectedRetailer.shop_name : 'Smart Kirana'}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex items-center justify-between space-x-2">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none"
                    >
                        {languages.map((lang) => (
                            <option key={lang.code} value={lang.code} className="text-black">{lang.flag} {lang.name}</option>
                        ))}
                    </select>
                    <button onClick={() => setIsDark(!isDark)} className="p-1.5 bg-white/10 rounded-lg">
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Content Aria */}
            {!selectedRetailer ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <h4 className={`font-semibold ${textClass} flex items-center gap-2`}><Store className="w-4 h-4" /> Select Store</h4>
                    {retailers.map((r) => (
                        <div key={r._id} onClick={() => setSelectedRetailer(r)} className={`p-4 border ${borderClass} rounded-xl cursor-pointer ${hoverBgClass} transition-all`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center font-bold">{r.shop_name[0]}</div>
                                <div>
                                    <p className={`font-medium ${textClass}`}>{r.shop_name}</p>
                                    <p className="text-xs text-gray-500">{r.phone}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Chat Messages */}
                    <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${m.type === 'user' ? 'bg-black text-white' : `${cardBgClass} border ${borderClass} ${textClass}`}`}>
                                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                                    {m.data?.type === 'order_summary' && (
                                        <div className="mt-3 pt-2 border-t border-gray-500/30">
                                            {m.data.availableItems.map((item, i) => (
                                                <div key={i} className="flex justify-between text-xs my-1">
                                                    <span>{item.item_name} x {item.quantity}</span>
                                                    <span>₹{item.total_price}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between font-bold mt-2 text-sm pt-1 border-t border-gray-500/30">
                                                <span>Total</span>
                                                <span>₹{m.data.totalAmount}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && <div className="flex justify-start"><div className="bg-white p-3 rounded-xl animate-pulse text-xs">AI thinking...</div></div>}
                    </div>

                    {/* Dynamic Action Chips */}
                    <div className={`px-2 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t ${borderClass} ${bgClass}`}>
                        {[
                            { label: 'Business Health', icon: <TrendingUp className="w-3 h-3" />, msg: 'What is my business health score?' },
                            { label: 'Festivals', icon: <Sparkles className="w-3 h-3" />, msg: 'What festivals are coming up and what should I stock?' },
                            { label: 'Low Stock', icon: <AlertTriangle className="w-3 h-3" />, msg: 'Show me items with low stock' },
                            { label: 'Top Sales', icon: <Package className="w-3 h-3" />, msg: 'What are my top selling products?' }
                        ].map((chip, i) => (
                            <button key={i} onClick={() => sendMessage(chip.msg)} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${borderClass} ${textClass} text-[10px] uppercase tracking-wider font-bold ${hoverBgClass}`}>
                                {chip.icon} {chip.label}
                            </button>
                        ))}
                    </div>

                    {/* Controls Footer */}
                    <div className={`p-3 border-t ${borderClass} ${bgClass}`}>
                        <div className="flex gap-2">
                            <button onClick={toggleMute} className={`p-2 rounded-lg border ${borderClass} ${textClass}`}>{isMuted ? '🔈' : '🔊'}</button>
                            <input
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask about sales, stock or trends..."
                                className={`flex-1 px-4 py-2 border ${borderClass} rounded-xl text-sm ${isDark ? 'bg-gray-700' : 'bg-white'} ${textClass}`}
                            />
                            <button onClick={() => sendMessage()} className="p-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl"><Send className="w-5 h-5" /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloatingAIChatbot;