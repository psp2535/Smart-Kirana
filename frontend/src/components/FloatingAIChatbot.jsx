import React, { useState, useEffect } from 'react';
import { X, Bot, Store, Package, Send, Moon, Sun, Globe, Sparkles } from 'lucide-react';
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
            kn: `👋 ನಮಸ್ಕಾರ! ನಾನು ${selectedRetailer?.shop_name} ಗಾಗಿ ನಿಮ್ಮ AI ಶಾಪಿಂಗ್ ಸಹಾಯಕ!\n\nಇಂದು ನೀವು ಏನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?\n\n💡 ಪ್ರಯತ್ನಿಸಿ:\n• "ನನಗೆ ಚಿಕನ್ ಕರಿ ಮಾಡಬೇಕು"\n• "2 ಕೆಜಿ ಅಕ್ಕಿ, 1 ಲೀಟರ್ ಹಾಲು ಖರೀದಿಸಿ"`
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

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading || !selectedRetailer) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/chatbot/chat`, {
                message: inputMessage,
                retailer_id: selectedRetailer._id,
                language: language
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('📨 Chatbot response:', response.data);

            const botMessage = {
                id: Date.now() + 1,
                type: 'bot',
                content: response.data.message,
                data: response.data.data,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);

            // Text-to-speech for bot response if not muted
            if (!isMuted && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(response.data.message);
                utterance.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US';
                utterance.rate = 0.9;
                window.speechSynthesis.speak(utterance);
            }
        } catch (error) {
            console.error('Chat error:', error);
            console.error('Error details:', error.response);

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
            // Stop any ongoing speech
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
                    className="relative bg-black dark:bg-white text-white dark:text-black text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 group"
                    title="AI Shopping Assistant"
                >
                    <Bot className="w-7 h-7 animate-pulse" />
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-neutral-100 dark:from-neutral-800 to-neutral-100 dark:to-neutral-800 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce shadow-lg">
                        AI
                    </span>
                    <span className="absolute inset-0 rounded-full bg-black dark:bg-white text-white dark:text-black opacity-75 blur-xl group-hover:opacity-100 transition-opacity"></span>
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
            <div className="bg-black dark:bg-white text-white dark:text-black text-white p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <Bot className="w-7 h-7" />
                            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">AI Shopping Assistant</h3>
                            <p className="text-xs text-black dark:text-white">
                                {selectedRetailer ? selectedRetailer.shop_name : 'Select a store'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between space-x-2">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                        {languages.map((lang) => (
                            <option key={lang.code} value={lang.code} className="text-gray-900">
                                {lang.flag} {lang.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => setIsDark(!isDark)}
                        className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                        title={isDark ? 'Light Mode' : 'Dark Mode'}
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Content */}
            {!selectedRetailer ? (
                /* Store Selection */
                <div className={`flex-1 overflow-y-auto p-4 ${bgClass}`}>
                    <h4 className={`font-semibold ${textClass} mb-3 flex items-center space-x-2`}>
                        <Store className="w-5 h-5" />
                        <span>Select a Store</span>
                    </h4>
                    <div className="space-y-2">
                        {retailers.map((retailer) => (
                            <div
                                key={retailer._id}
                                onClick={() => setSelectedRetailer(retailer)}
                                className={`p-4 border-2 ${borderClass} rounded-xl cursor-pointer transition-all transform hover:scale-105 ${hoverBgClass} hover:border-neutral-200 dark:border-neutral-700 hover:shadow-lg`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        {retailer.shop_name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <h5 className={`font-semibold ${textClass}`}>{retailer.shop_name}</h5>
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{retailer.phone}</p>
                                    </div>
                                    <div className="text-black dark:text-white">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* Chat + Inventory */
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Inventory Toggle */}
                    <div className={`border-b ${borderClass} p-3 flex items-center justify-between ${cardBgClass}`}>
                        <button
                            onClick={() => setShowInventory(!showInventory)}
                            className="flex items-center space-x-2 text-sm text-black dark:text-white hover:text-black dark:text-white font-medium"
                        >
                            <Package className="w-4 h-4" />
                            <span>{showInventory ? 'Hide' : 'Show'} Inventory ({inventory.length})</span>
                        </button>
                        <button
                            onClick={() => setSelectedRetailer(null)}
                            className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Change Store
                        </button>
                    </div>

                    {/* Inventory Panel */}
                    {showInventory && (
                        <div className={`border-b ${borderClass} ${cardBgClass} p-3 max-h-48 overflow-y-auto`}>
                            <h5 className={`text-sm font-semibold ${textClass} mb-2`}>Available Items</h5>
                            <div className="space-y-2">
                                {inventory.map((item, idx) => (
                                    <div key={idx} className={`flex justify-between items-center text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded-lg`}>
                                        <span className={`font-medium ${textClass}`}>{item.item_name}</span>
                                        <div className="flex items-center space-x-3">
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{item.quantity} units</span>
                                            <span className="text-black dark:text-white font-bold">₹{item.price_per_unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.type === 'user' ? (
                                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-black dark:bg-white text-white shadow-sm">
                                        <p className="text-sm">{message.content}</p>
                                        <span className="text-xs opacity-70 mt-1 block">
                                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ) : (
                                    <div className={`max-w-[85%] ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} border rounded-2xl shadow-sm overflow-hidden`}>
                                        {/* Message Content */}
                                        <div className="p-4">
                                            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                {message.content}
                                            </p>
                                        </div>

                                        {/* Order Summary Card */}
                                        {message.data && message.data.type === 'order_summary' && message.data.availableItems && message.data.availableItems.length > 0 && (
                                            <div className={`border-t ${isDark ? 'border-gray-600 bg-gray-800/50' : 'border-gray-200 bg-gray-50'} p-3`}>
                                                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Order Items
                                                </p>
                                                <div className="space-y-1.5">
                                                    {message.data.availableItems.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm">
                                                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                                                {item.item_name} × {item.quantity} {item.unit}
                                                            </span>
                                                            <span className="font-semibold text-black dark:text-white">
                                                                ₹{item.total_price}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className={`flex justify-between items-center mt-3 pt-2 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Total</span>
                                                    <span className="font-bold text-lg text-black dark:text-white">
                                                        ₹{message.data.totalAmount}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Unavailable Items */}
                                        {message.data && message.data.unavailableItems && message.data.unavailableItems.length > 0 && message.data.unavailableItems.length <= 3 && (
                                            <div className={`border-t ${isDark ? 'border-gray-600 bg-black dark:bg-white/10' : 'border-gray-200 bg-neutral-100 dark:bg-neutral-800'} p-3`}>
                                                <p className="text-xs font-semibold text-black dark:text-white mb-1.5">Not Available</p>
                                                <div className="space-y-1">
                                                    {message.data.unavailableItems.map((item, idx) => (
                                                        <p key={idx} className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            {item.item_name}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Timestamp */}
                                        <div className={`px-4 pb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            <span className="text-xs">
                                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className={`${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} border px-4 py-3 rounded-2xl shadow-md`}>
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className={`border-t ${borderClass} p-3 ${cardBgClass}`}>
                        <div className="flex items-center space-x-2">
                            {/* Mute Button */}
                            <button
                                onClick={toggleMute}
                                className={`p-3 rounded-xl transition-all ${isMuted
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-100 dark:bg-neutral-800'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-100 dark:bg-neutral-800'
                                    }`}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                )}
                            </button>

                            {/* Voice Input Button */}
                            {recognition && (
                                <button
                                    onClick={startVoiceInput}
                                    disabled={isListening || isLoading}
                                    className={`p-3 rounded-xl transition-all ${isListening
                                        ? 'bg-black dark:bg-white text-white animate-pulse'
                                        : 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-100 dark:bg-neutral-800'
                                        }`}
                                    title="Voice Input"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </button>
                            )}

                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={isListening ? "Listening..." : "Type your message..."}
                                className={`flex-1 px-4 py-3 border-2 ${borderClass} rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                                    }`}
                                disabled={isLoading || isListening}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="bg-black dark:bg-white text-white dark:text-black text-white p-3 rounded-xl hover:from-neutral-100 dark:from-neutral-800 hover:to-neutral-100 dark:to-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2 flex items-center space-x-1`}>
                            <Sparkles className="w-3 h-3" />
                            <span>{isListening ? 'Listening...' : 'Type or speak your order'}</span>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloatingAIChatbot;