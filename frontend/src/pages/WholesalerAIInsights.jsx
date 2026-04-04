import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, DollarSign, Package, ArrowLeft, RefreshCw, Send, Clock, Target, Sparkles, User, ShoppingBag, Percent } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const WholesalerAIInsights = () => {
    const navigate = useNavigate();
    const [insights, setInsights] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sendingCampaign, setSendingCampaign] = useState(null);

    useEffect(() => {
        // Try to load cached insights first
        const cachedInsights = localStorage.getItem('wholesaler_ai_insights');
        const cacheTimestamp = localStorage.getItem('wholesaler_ai_insights_timestamp');

        if (cachedInsights && cacheTimestamp) {
            const cacheAge = Date.now() - parseInt(cacheTimestamp);
            // Use cache if less than 1 hour old
            if (cacheAge < 3600000) {
                setInsights(JSON.parse(cachedInsights));
                setIsLoading(false);
                return;
            }
        }

        // If no cache or cache expired, fetch new insights
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
                // Cache the insights
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
                body: JSON.stringify({
                    productId,
                    campaignMessage,
                    discount,
                    retailerId
                })
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-black dark:border-white border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Analyzing your business...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => navigate('/wholesaler-dashboard')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Business Insights</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Data-driven recommendations for your business
                                {insights?.generatedAt && (
                                    <span className="ml-2">• Last updated: {new Date(insights.generatedAt).toLocaleString()}</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchAIInsights(true)}
                        disabled={isLoading}
                        className="flex items-center space-x-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? 'Regenerating...' : 'Regenerate'}</span>
                    </button>
                </div>

                {insights && (
                    <div className="space-y-6">
                        {/* NEW: Comprehensive Gemini Analysis Report */}
                        {insights.aiAnalysis && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8 animate-fadeIn">
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-3 bg-black dark:bg-white rounded-xl">
                                            <Sparkles className="h-6 w-6 text-white" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Strategic Report</h2>
                                    </div>
                                    <span className="text-xs font-bold px-3 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 rounded-full tracking-wider uppercase">Powered by Google Gemini</span>
                                </div>
                                
                                <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-700 prose-th:bg-gray-50 dark:prose-th:bg-gray-800/50 prose-th:p-3 prose-td:p-3">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b pb-2" {...props} />,
                                            h2: ({node, ...props}) => <h2 className="text-xl font-bold text-gray-800 dark:text-white mt-8 mb-4 flex items-center" {...props} />,
                                            table: ({node, ...props}) => (
                                                <div className="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
                                                </div>
                                            ),
                                            th: ({node, ...props}) => <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" {...props} />,
                                            td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700" {...props} />,
                                        }}
                                    >
                                        {insights.aiAnalysis}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-8">
                            {/* Personalized Retailer Offers Section */}
                            {insights.retailerAnalysis?.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                                <Target className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Personalized Retailer Offers</h3>
                                                <p className="text-sm text-gray-500">AI-suggested deals based on retailer purchase history</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {insights.retailerAnalysis.slice(0, 6).map((retailer, idx) => {
                                            const favProduct = Object.entries(retailer.favoriteProducts || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
                                            return (
                                                <div key={idx} className="group relative bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-5 border border-transparent hover:border-indigo-500/30 hover:shadow-md transition-all">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold">
                                                                {retailer.retailerName[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{retailer.retailerName}</p>
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Loyal Customer</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 mb-5">
                                                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                                            <ShoppingBag className="h-3.5 w-3.5 mr-2 opacity-70" />
                                                            <span>Top Product: <span className="font-semibold text-gray-900 dark:text-white">{favProduct || 'General'}</span></span>
                                                        </div>
                                                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                                            <TrendingUp className="h-3.5 w-3.5 mr-2 opacity-70" />
                                                            <span>Lifetime Sales: <span className="font-semibold text-gray-900 dark:text-white">₹{retailer.totalSpent?.toLocaleString()}</span></span>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={() => handleSendCampaign(null, `Exclusive offer for ${retailer.retailerName}! Get an extra 10% OFF on your next order of ${favProduct || 'inventory'}.`, 10, retailer.retailerId || retailer._id)}
                                                        disabled={sendingCampaign === (retailer.retailerId || retailer._id)}
                                                        className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm flex items-center justify-center space-x-2 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50"
                                                    >
                                                        {sendingCampaign === (retailer.retailerId || retailer._id) ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Send className="h-4 w-4" />
                                                                <span>Send Personal Offer</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Slow Moving Products Section */}
                                {insights.aiInsights?.slowMovingProducts?.length > 0 && (
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                                                <TrendingDown className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white">Slow Moving Products</h3>
                                                <p className="text-xs text-gray-500 italic">Recommendation: Clear stock with discounts</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            {insights.aiInsights.slowMovingProducts.map((product, idx) => (
                                                <div key={idx} className="flex flex-col p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 group hover:border-orange-500/20 transition-all">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-bold text-gray-900 dark:text-white">{product.productName}</p>
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">"{product.message}"</p>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full">-{product.suggestedDiscount}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-tighter font-bold">Suggested Campaign</span>
                                                        <button 
                                                            onClick={() => handleSendCampaign(product.productId, `Flash Sale: Get ${product.suggestedDiscount}% OFF on ${product.productName}! Limited time only.`, product.suggestedDiscount)}
                                                            disabled={sendingCampaign === product.productId}
                                                            className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-80 transition-opacity flex items-center space-x-2"
                                                        >
                                                            {sendingCampaign === product.productId ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                                            <span>Promote</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Fast Moving Products Section */}
                                {insights.aiInsights?.fastMovingProducts?.length > 0 && (
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2.5 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                                                <TrendingUp className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white">High Velocity Items</h3>
                                                <p className="text-xs text-gray-500 italic">Recommendation: Keep well-stocked</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            {insights.aiInsights.fastMovingProducts.map((product, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-900 dark:text-white">{product.productName}</p>
                                                        <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1 uppercase tracking-wider">{product.message}</p>
                                                    </div>
                                                    <div className="ml-4 p-2.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-xl shadow-inner">
                                                        <Sparkles className="h-5 w-5" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-8 p-4 bg-neutral-900 rounded-xl text-white">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Inventory Strategy</p>
                                            <p className="text-xs italic opacity-80 leading-relaxed">Consider increasing reorder levels for these items as they represent your core revenue drivers. Current trend suggests 15% WoW growth.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WholesalerAIInsights;
