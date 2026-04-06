import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, DollarSign, Package, ArrowLeft, RefreshCw, Send, Clock, Target, Sparkles, Brain, User, ShoppingBag, Percent, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

// Shared styled markdown renderer for consistent tables+formatting
const StyledMarkdown = ({ children }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            h1: ({ node, ...props }) => <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-6 mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-2" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl border-l-4 border-black dark:border-white" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4 mb-2" {...props} />,
            p: ({ node, ...props }) => <p className="text-gray-700 dark:text-neutral-300 mb-3 leading-relaxed" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-4 text-gray-700 dark:text-neutral-300" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 mb-4 text-gray-700 dark:text-neutral-300" {...props} />,
            li: ({ node, ...props }) => <li className="text-gray-700 dark:text-neutral-300" {...props} />,
            strong: ({ node, ...props }) => <strong className="font-bold text-black dark:text-white bg-neutral-100 dark:bg-neutral-800 px-1 rounded" {...props} />,
            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-neutral-300 dark:border-neutral-700 pl-4 italic text-gray-600 dark:text-neutral-400 my-3" {...props} />,
            code: ({ node, inline, ...props }) => inline
                ? <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                : <code className="block bg-neutral-100 dark:bg-neutral-900 p-4 rounded-lg text-xs font-mono overflow-x-auto" {...props} />,
            table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                    <table className="min-w-full border-collapse text-sm" {...props} />
                </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-neutral-900 dark:bg-neutral-700 text-white" {...props} />,
            tbody: ({ node, ...props }) => <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800" {...props} />,
            tr: ({ node, ...props }) => <tr className="even:bg-neutral-50 dark:even:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" {...props} />,
            th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap" {...props} />,
            td: ({ node, ...props }) => <td className="px-4 py-3 text-gray-700 dark:text-neutral-300" {...props} />,
        }}
    >
        {children}
    </ReactMarkdown>
);

const WholesalerAIInsights = () => {
    const navigate = useNavigate();
    const [insights, setInsights] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sendingCampaign, setSendingCampaign] = useState(null);

    useEffect(() => {
        const cachedInsights = localStorage.getItem('wholesaler_ai_insights');
        const cacheTimestamp = localStorage.getItem('wholesaler_ai_insights_timestamp');

        if (cachedInsights && cacheTimestamp) {
            const cacheAge = Date.now() - parseInt(cacheTimestamp);
            if (cacheAge < 3600000) {
                setInsights(JSON.parse(cachedInsights));
                setIsLoading(false);
                return;
            }
        }
        fetchAIInsights();
    }, []);

    const fetchAIInsights = async (forceFresh = false) => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            if (API_BASE_URL.endsWith('/api')) API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
            const API_URL = `${API_BASE_URL}/api`;

            const response = await fetch(`${API_URL}/wholesalers/ai-insights`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                setInsights(result.data);
                localStorage.setItem('wholesaler_ai_insights', JSON.stringify(result.data));
                localStorage.setItem('wholesaler_ai_insights_timestamp', Date.now().toString());
                toast.success(forceFresh ? 'Insights regenerated' : 'Insights updated');
            } else {
                toast.error(result.message);
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load insights');
            setIsLoading(false);
        }
    };

    const handleSendCampaign = async (productId, campaignMessage, discount, retailerId = null) => {
        setSendingCampaign(productId || retailerId);
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/send-campaign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productId, campaignMessage, discount, retailerId })
            });

            const result = await response.json();
            if (result.success) {
                toast.success(`✅ Sent to ${result.data.sentCount} retailer${result.data.sentCount > 1 ? 's' : ''}!`);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Failed to send campaign');
        }
        setSendingCampaign(null);
    };

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="relative inline-flex mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Brain className="h-8 w-8 text-white" />
                        </div>
                        <div className="absolute inset-0 rounded-full border-4 border-violet-300 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">Analyzing your business...</p>
                    <p className="text-sm text-neutral-500 mt-1">AI is crunching your sales data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/wholesaler-dashboard')}
                        className="p-2.5 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600">
                                <Brain className="h-7 w-7 text-white" />
                            </div>
                            AI Business Insights
                        </h1>
                        <p className="text-sm text-neutral-500 mt-1 font-medium">
                            Data-driven recommendations for your wholesale business
                            {insights?.generatedAt && (
                                <span className="ml-2 text-neutral-400">
                                    · Updated {new Date(insights.generatedAt).toLocaleTimeString()}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-widest">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        AI Engine Live
                    </div>
                    <button
                        onClick={() => fetchAIInsights(true)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-all font-semibold text-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Analyzing...' : 'Regenerate'}
                    </button>
                </div>
            </div>

            {insights && (
                <div className="space-y-6">

                    {/* AI Strategic Report — Full Width Gradient Card */}
                    {insights.aiAnalysis && (
                        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                            {/* Gradient Banner */}
                            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-8 py-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-white/20">
                                        <Sparkles className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">AI Strategic Report</h2>
                                        <p className="text-[11px] text-white/70 font-medium mt-0.5">Powered by Google Gemini · Full business intelligence analysis</p>
                                    </div>
                                </div>
                                <span className="hidden sm:inline-flex text-[10px] font-extrabold px-3 py-1.5 bg-white/20 text-white rounded-full tracking-widest uppercase">
                                    Gemini AI
                                </span>
                            </div>
                            {/* Content */}
                            <div className="p-8">
                                <StyledMarkdown>{insights.aiAnalysis}</StyledMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Personalized Retailer Offers */}
                    {insights.retailerAnalysis?.length > 0 && (
                        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-cyan-600 px-8 py-6 flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-white/20">
                                    <Target className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white">Personalized Retailer Offers</h2>
                                    <p className="text-[11px] text-white/70 font-medium mt-0.5">AI-suggested deals based on each retailer's purchase history</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {insights.retailerAnalysis.slice(0, 6).map((retailer, idx) => {
                                        const favProduct = Object.entries(retailer.favoriteProducts || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
                                        return (
                                            <div key={idx} className="rounded-2xl p-5 border-2 border-neutral-100 dark:border-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all bg-neutral-50 dark:bg-neutral-800/40">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-400 to-cyan-500 text-white rounded-full flex items-center justify-center font-black text-base">
                                                        {retailer.retailerName[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{retailer.retailerName}</p>
                                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Loyal Customer</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mb-4">
                                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                        <ShoppingBag className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
                                                        <span>Top: <span className="font-bold text-gray-900 dark:text-white">{favProduct || 'General'}</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                        <TrendingUp className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
                                                        <span>Spent: <span className="font-bold text-gray-900 dark:text-white">₹{retailer.totalSpent?.toLocaleString()}</span></span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleSendCampaign(null, `Exclusive offer for ${retailer.retailerName}! Get an extra 10% OFF on your next order of ${favProduct || 'inventory'}.`, 10, retailer.retailerId || retailer._id)}
                                                    disabled={sendingCampaign === (retailer.retailerId || retailer._id)}
                                                    className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-80 transition-all disabled:opacity-50"
                                                >
                                                    {sendingCampaign === (retailer.retailerId || retailer._id)
                                                        ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                        : <><Send className="h-3.5 w-3.5" /><span>Send Personal Offer</span></>
                                                    }
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slow + Fast Moving Products Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Slow Moving */}
                        {insights.aiInsights?.slowMovingProducts?.length > 0 && (
                            <div className="bg-white dark:bg-neutral-900 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-500 to-rose-600 px-6 py-5 flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-white/20">
                                        <TrendingDown className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-base">Slow Moving Products</h3>
                                        <p className="text-[10px] text-white/70 font-medium">Clear stock with targeted discounts</p>
                                    </div>
                                </div>
                                <div className="p-5 space-y-3">
                                    {insights.aiInsights.slowMovingProducts.map((product, idx) => (
                                        <div key={idx} className="rounded-2xl p-4 border-2 border-neutral-100 dark:border-neutral-800 hover:border-orange-200 dark:hover:border-orange-800/50 transition-all bg-orange-50/50 dark:bg-orange-900/10">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{product.productName}</p>
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">"{product.message}"</p>
                                                </div>
                                                <span className="ml-3 flex-shrink-0 text-xs font-black text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2.5 py-1 rounded-full">
                                                    -{product.suggestedDiscount}%
                                                </span>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-orange-100 dark:border-orange-900/30 flex items-center justify-between">
                                                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Campaign Ready</span>
                                                <button
                                                    onClick={() => handleSendCampaign(product.productId, `Flash Sale: Get ${product.suggestedDiscount}% OFF on ${product.productName}! Limited time only.`, product.suggestedDiscount)}
                                                    disabled={sendingCampaign === product.productId}
                                                    className="px-3.5 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:opacity-80 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {sendingCampaign === product.productId ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                                    Promote
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Fast Moving */}
                        {insights.aiInsights?.fastMovingProducts?.length > 0 && (
                            <div className="bg-white dark:bg-neutral-900 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-white/20">
                                        <Zap className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-base">High Velocity Items</h3>
                                        <p className="text-[10px] text-white/70 font-medium">Keep these well-stocked — your core revenue drivers</p>
                                    </div>
                                </div>
                                <div className="p-5 space-y-3">
                                    {insights.aiInsights.fastMovingProducts.map((product, idx) => (
                                        <div key={idx} className="rounded-2xl p-4 border-2 border-neutral-100 dark:border-neutral-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">{product.productName}</p>
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 uppercase tracking-wider">{product.message}</p>
                                            </div>
                                            <div className="ml-4 p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl flex-shrink-0">
                                                <Sparkles className="h-5 w-5" />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Strategy tip */}
                                    <div className="mt-2 p-4 bg-neutral-900 dark:bg-neutral-800 rounded-2xl">
                                        <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mb-1">Inventory Strategy</p>
                                        <p className="text-xs text-neutral-300 italic leading-relaxed">
                                            Consider increasing reorder levels for these items — they represent your core revenue drivers with strong weekly growth.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {!insights && !isLoading && (
                <div className="bg-white dark:bg-neutral-900 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 p-16 text-center">
                    <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4">
                        <Brain className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No Insights Yet</h3>
                    <p className="text-neutral-500 mb-6 text-sm">Click Regenerate to get your first AI business report</p>
                    <button
                        onClick={() => fetchAIInsights(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:opacity-80 transition-all"
                    >
                        <Sparkles className="h-4 w-4" /> Generate Insights
                    </button>
                </div>
            )}
        </div>
    );
};

export default WholesalerAIInsights;
