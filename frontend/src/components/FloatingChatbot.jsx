import React, { useState, useEffect, useRef } from 'react';
import {
    MessageCircle,
    X,
    Send,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Loader2,
    Sparkles,
    Globe
} from 'lucide-react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const FloatingChatbot = ({ isCustomerMode = false, retailerId = null, retailerName = null }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [language, setLanguage] = useState('en'); // en, hi, te
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [pendingConfirmation, setPendingConfirmation] = useState(null);
    
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const synthesisRef = useRef(null);

    // Language configurations
    const languages = [
        { code: 'en', name: 'English', speechCode: 'en-IN', icon: '🇬🇧' },
        { code: 'hi', name: 'हिंदी', speechCode: 'hi-IN', icon: '🇮🇳' },
        { code: 'te', name: 'తెలుగు', speechCode: 'te-IN', icon: '🇮🇳' }
    ];

    const currentLang = languages.find(l => l.code === language);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputMessage(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        // Initialize Speech Synthesis
        if ('speechSynthesis' in window) {
            synthesisRef.current = window.speechSynthesis;
        }

        // Welcome message
        const welcomeMessage = isCustomerMode 
            ? `Hi! I'm your AI shopping assistant for ${retailerName || 'our store'}. What would you like to buy or cook today?`
            : t(`chatbot.welcome.${language}`);
        
        setMessages([{
            type: 'bot',
            content: welcomeMessage,
            timestamp: new Date()
        }]);

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (synthesisRef.current) {
                synthesisRef.current.cancel();
            }
        };
    }, []);

    // Update language in speech recognition
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = currentLang.speechCode;
        }
    }, [language]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Start voice recognition
    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.lang = currentLang.speechCode;
                recognitionRef.current.start();
                setIsListening(true);
            } catch (error) {
                console.error('Error starting recognition:', error);
            }
        }
    };

    // Stop voice recognition
    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    // Text to Speech - Use browser TTS for all languages
    const speak = async (text) => {
        if (!autoSpeak) return;
        speakWithBrowser(text);
    };

    // Browser-based Text to Speech (fallback for all, default for English)
    const speakWithBrowser = (text) => {
        if (synthesisRef.current && autoSpeak) {
            // Cancel any ongoing speech
            synthesisRef.current.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = currentLang.speechCode;
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;

            // Wait for voices to load, then speak
            const setVoiceAndSpeak = () => {
                const voices = synthesisRef.current.getVoices();
                
                // Try to find exact language match first
                let voice = voices.find(v => v.lang === currentLang.speechCode);
                
                // If not found, try language code without region
                if (!voice) {
                    const langCode = currentLang.speechCode.split('-')[0];
                    voice = voices.find(v => v.lang.startsWith(langCode));
                }
                
                // If still not found, try any voice with matching language
                if (!voice) {
                    voice = voices.find(v => v.lang.includes(language));
                }
                
                // Set the voice if found
                if (voice) {
                    utterance.voice = voice;
                    console.log(`🔊 Using browser voice: ${voice.name} (${voice.lang})`);
                } else {
                    console.log(`⚠️ No voice found for ${currentLang.speechCode}, using default`);
                }

                utterance.onstart = () => {
                    setIsSpeaking(true);
                    console.log('🗣️ Browser TTS started');
                };
                utterance.onend = () => {
                    setIsSpeaking(false);
                    console.log('✅ Browser TTS ended');
                };
                utterance.onerror = (event) => {
                    setIsSpeaking(false);
                    console.error('❌ Browser TTS error:', event.error);
                };

                synthesisRef.current.speak(utterance);
            };

            // Check if voices are loaded
            const voices = synthesisRef.current.getVoices();
            if (voices.length > 0) {
                setVoiceAndSpeak();
            } else {
                // Wait for voices to load
                synthesisRef.current.onvoiceschanged = () => {
                    setVoiceAndSpeak();
                };
                // Fallback: try after a delay
                setTimeout(setVoiceAndSpeak, 100);
            }
        }
    };

    // Stop speaking
    const stopSpeaking = () => {
        if (synthesisRef.current) {
            synthesisRef.current.cancel();
        }
        setIsSpeaking(false);
    };

    // Handle confirmation response
    const handleConfirmation = async (confirmed) => {
        if (!pendingConfirmation) return;

        setIsLoading(true);

        try {
            // Send confirmation message in local language
            const confirmMessages = {
                'en': confirmed ? 'yes' : 'no',
                'hi': confirmed ? 'हाँ' : 'नहीं',
                'te': confirmed ? 'అవును' : 'కాదు'
            };
            
            const confirmMessage = confirmMessages[language] || (confirmed ? 'yes' : 'no');
            
            const requestData = {
                message: confirmMessage,
                language: language
            };

            // Add retailer_id for customer mode
            if (isCustomerMode && retailerId) {
                requestData.retailer_id = retailerId;
            }

            const response = await api.post('/chatbot/chat', requestData);

            if (response.data) {
                const botMessage = {
                    type: 'bot',
                    content: response.data.message,
                    timestamp: new Date(),
                    isSuccess: response.data.success
                };

                setMessages(prev => [...prev, botMessage]);

                // Speak the response
                if (autoSpeak && !isCustomerMode) {
                    speak(response.data.message);
                }
            }
        } catch (error) {
            console.error('Confirmation error:', error);
            const errorMessages = {
                en: "Sorry, something went wrong. Please try again.",
                hi: "क्षमा करें, कुछ गलत हो गया। कृपया पुन: प्रयास करें।",
                te: "క్షమించండి, ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి."
            };

            setMessages(prev => [...prev, {
                type: 'bot',
                content: errorMessages[language] || errorMessages['en'],
                timestamp: new Date()
            }]);
        } finally {
            setPendingConfirmation(null);
            setIsLoading(false);
        }
    };

    // Send message
    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            type: 'user',
            content: inputMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        const currentMessage = inputMessage;
        setInputMessage('');
        setIsLoading(true);

        try {
            // Use the unified chatbot endpoint
            const requestData = {
                message: currentMessage,
                language: language
            };

            // Add retailer_id for customer mode
            if (isCustomerMode && retailerId) {
                requestData.retailer_id = retailerId;
            }

            const response = await api.post('/chatbot/chat', requestData);

            // Check if response requires confirmation
            const requiresConfirmation = response.data.data?.pending === true || 
                                        response.data.data?.type === 'sale_preview' ||
                                        response.data.data?.type === 'expense_preview' ||
                                        response.data.data?.type === 'item_exists';

            // Always display the message, whether success or error
            const botMessage = {
                type: 'bot',
                content: response.data.message,
                timestamp: new Date(),
                data: response.data.data,
                isError: !response.data.success,
                isStockError: response.data.data?.type === 'stock_error',
                isConfirmation: requiresConfirmation
            };

            setMessages(prev => [...prev, botMessage]);

            // Set pending confirmation if needed
            if (requiresConfirmation) {
                setPendingConfirmation({
                    confirmationId: Date.now(), // Temporary ID
                    data: response.data.data
                });
            }

            // Speak the response (only for retailer mode and only on success)
            if (autoSpeak && !isCustomerMode && response.data.success) {
                speak(response.data.message);
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMessages = {
                en: "Sorry, I couldn't process your request. Please try again.",
                hi: "क्षमा करें, मैं आपका अनुरोध संसाधित नहीं कर सका। कृपया पुन: प्रयास करें।",
                te: "క్షమించండి, నేను మీ అభ్యర్థనను ప్రాసెస్ చేయలేకపోయాను. దయచేసి మళ్లీ ప్రయత్నించండి."
            };

            setMessages(prev => [...prev, {
                type: 'bot',
                content: errorMessages[language],
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Enter key
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-black dark:bg-white text-white dark:text-black text-white p-4 rounded-full shadow-2xl hover:shadow-neutral-500/50 transition-all duration-300 hover:scale-110 z-50 group"
                    style={{
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }}
                >
                    <div className="relative">
                        <MessageCircle className="h-6 w-6" />
                        <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-black dark:text-white animate-spin" />
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        AI Assistant
                    </div>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 w-auto sm:w-96 max-w-full h-[600px] max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-black dark:bg-white text-white dark:text-black text-white p-3 sm:p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0 flex-shrink">
                            <div className="relative flex-shrink-0">
                                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-black dark:bg-white rounded-full animate-pulse"></div>
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-sm sm:text-base truncate">
                                    {isCustomerMode ? `${retailerName || 'Store'} Assistant` : 'AI Assistant'}
                                </h3>
                                <p className="text-xs opacity-90 hidden sm:block">
                                    {isCustomerMode ? 'Shopping Assistant' : 'Business Intelligence'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                            {/* Language Selector */}
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="bg-white/20 text-white text-xs sm:text-sm rounded-lg px-1.5 sm:px-2 py-1 border-none focus:ring-2 focus:ring-white/30 cursor-pointer"
                            >
                                {languages.map(lang => (
                                    <option key={lang.code} value={lang.code} className="text-gray-900">
                                        {lang.icon} {lang.name}
                                    </option>
                                ))}
                            </select>

                            {/* Auto-speak toggle */}
                            <button
                                onClick={() => {
                                    setAutoSpeak(!autoSpeak);
                                    if (!autoSpeak) stopSpeaking();
                                }}
                                className="hover:bg-white/20 p-1 rounded transition-colors flex-shrink-0"
                                title={autoSpeak ? "Auto-speak ON" : "Auto-speak OFF"}
                            >
                                {autoSpeak ? <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                            </button>

                            {/* Close button */}
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    stopSpeaking();
                                }}
                                className="hover:bg-white/20 p-1 rounded transition-colors flex-shrink-0"
                            >
                                <X className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2 sm:px-4 ${
                                        message.type === 'user'
                                            ? 'bg-black dark:bg-white text-white dark:text-black text-white'
                                            : message.isStockError
                                            ? 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white'
                                            : message.isError
                                            ? 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white'
                                            : message.isSuccess
                                            ? 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white'
                                            : message.isConfirmation
                                            ? 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white'
                                            : 'bg-white border border-gray-200 text-gray-800'
                                    }`}
                                >
                                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                    <p className={`text-xs mt-1 ${
                                        message.type === 'user' ? 'text-black dark:text-white' : 'text-gray-400'
                                    }`}>
                                        {new Date(message.timestamp).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2 sm:px-4 sm:py-3">
                                    <div className="flex items-center space-x-2">
                                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-black dark:text-white" />
                                        <span className="text-xs sm:text-sm text-gray-600">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isSpeaking && (
                            <div className="flex justify-start">
                                <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 sm:px-4">
                                    <div className="flex items-center space-x-2">
                                        <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-black dark:text-white animate-pulse" />
                                        <span className="text-xs sm:text-sm text-black dark:text-white">Speaking...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Confirmation Buttons */}
                    {pendingConfirmation && (
                        <div className="p-2.5 sm:p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                            <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                                <button
                                    onClick={() => handleConfirmation(true)}
                                    disabled={isLoading}
                                    className="flex-1 bg-black dark:bg-white text-white dark:text-black px-3 py-2 sm:px-4 text-sm sm:text-base rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 font-medium"
                                >
                                    {language === 'hi' ? '✅ हाँ' : 
                                     language === 'te' ? '✅ అవును' : 
                                     '✅ Yes'}
                                </button>
                                <button
                                    onClick={() => handleConfirmation(false)}
                                    disabled={isLoading}
                                    className="flex-1 bg-black dark:bg-white text-white dark:text-black px-3 py-2 sm:px-4 text-sm sm:text-base rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 font-medium"
                                >
                                    {language === 'hi' ? '❌ नहीं' : 
                                     language === 'te' ? '❌ కాదు' : 
                                     '❌ No'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
                        <div className="flex items-center space-x-1.5 sm:space-x-2">
                            <button
                                onClick={isListening ? stopListening : startListening}
                                disabled={isLoading}
                                className={`p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0 ${
                                    isListening
                                        ? 'bg-black dark:bg-white text-white dark:text-black animate-pulse'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                } disabled:opacity-50`}
                                title={isListening ? "Stop listening" : "Start voice input"}
                            >
                                {isListening ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                            </button>

                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={
                                    language === 'hi' ? 'अपना सवाल पूछें...' :
                                    language === 'te' ? 'మీ ప్రశ్న అడగండి...' :
                                    'Ask your question...'
                                }
                                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-2 sm:px-4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                                disabled={isLoading || isListening}
                            />

                            <button
                                onClick={sendMessage}
                                disabled={isLoading || !inputMessage.trim() || isListening || pendingConfirmation}
                                className="bg-black dark:bg-white text-white dark:text-black text-white p-1.5 sm:p-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                title={pendingConfirmation ? 'Please confirm or cancel the pending action first' : 'Send message'}
                            >
                                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        </div>

                        {/* Language indicator */}
                        <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
                            <Globe className="h-3 w-3" />
                            <span>Speaking in {currentLang.name}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Pulse Animation CSS */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.5);
                    }
                    50% {
                        box-shadow: 0 0 0 20px rgba(0, 0, 0, 0);
                    }
                }
            `}</style>
        </>
    );
};

export default FloatingChatbot;
