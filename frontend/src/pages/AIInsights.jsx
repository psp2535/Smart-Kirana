import React, { useState, useRef } from 'react';
import {
    Brain,
    TrendingUp,
    DollarSign,
    Calendar,
    Loader2,
    AlertCircle,
    CheckCircle,
    Sparkles,
    RefreshCw,
    Download,
    PartyPopper,
    Clock,
    Package,
    TrendingDown
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { aiInsightsAPI, chatbotAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import { useTranslation } from 'react-i18next';

const AIInsights = () => {
    const { t } = useTranslation();

    // Chart colors
    const CHART_COLORS = {
        blue: ['#171717', '#404040', '#737373', '#a3a3a3', '#d4d4d4', '#f5f5f5'],
        green: ['#171717', '#404040', '#737373', '#a3a3a3', '#d4d4d4', '#f5f5f5'],
        purple: ['#000000', '#171717', '#262626', '#404040', '#525252', '#737373'],
        orange: ['#171717', '#404040', '#737373', '#a3a3a3', '#d4d4d4', '#f5f5f5'],
        red: ['#000000', '#171717', '#262626', '#404040', '#525252', '#737373'],
        pink: ['#171717', '#404040', '#737373', '#a3a3a3', '#d4d4d4', '#f5f5f5']
    };

    const [activeTab, setActiveTab] = useState('demand');
    const [loading, setLoading] = useState({
        demand: false,
        revenue: false,
        expense: false,
        festival: false
    });
    const [insights, setInsights] = useState({
        demand: null,
        revenue: null,
        expense: null,
        festival: null
    });
    const [error, setError] = useState({
        demand: null,
        revenue: null,
        expense: null,
        festival: null
    });
    const [exportingPDF, setExportingPDF] = useState(false);

    // Fetch latest insights from backend
    const fetchLatestInsights = React.useCallback(async () => {
        try {
            const response = await aiInsightsAPI.getLatestInsights({ limit: 4 });
            if (response.success && response.data && response.data.length > 0) {
                // Map backend insights to our state structure
                const latestInsights = {};
                response.data.forEach(insight => {
                    const type = insight.insights_data?.type;
                    if (type && ['demand', 'revenue', 'expense', 'festival'].includes(type)) {
                        latestInsights[type] = insight.insights_data;
                    }
                });
                
                // Merge with existing insights (keep newer ones)
                setInsights(prev => {
                    const merged = {
                        ...prev,
                        ...latestInsights
                    };
                    // Save to localStorage
                    localStorage.setItem('retailer_ai_insights', JSON.stringify(merged));
                    return merged;
                });
            }
        } catch (error) {
            console.error('Failed to fetch latest insights:', error);
        }
    }, []);

    // Load cached insights on mount
    React.useEffect(() => {
        // Try to load from localStorage first (persists across refreshes)
        const cachedInsights = localStorage.getItem('retailer_ai_insights');

        if (cachedInsights) {
            try {
                const parsed = JSON.parse(cachedInsights);
                setInsights(parsed);
            } catch (e) {
                console.error('Failed to parse cached insights:', e);
            }
        }

        // Also fetch latest insights from backend
        fetchLatestInsights();
    }, [fetchLatestInsights]);

    // Chart data state
    const [chartData, setChartData] = useState({
        salesTrend: [],
        topProducts: [],
        revenueTrend: [],
        revenueByCategory: [],
        expenseTrend: [],
        expenseByCategory: []
    });

    // Refs for PDF export
    const demandRef = useRef(null);
    const revenueRef = useRef(null);
    const expenseRef = useRef(null);
    const fetchChartDataRef = useRef(null);

    const tabs = [
        {
            id: 'demand',
            name: t('ai.tabs.demand.name'),
            icon: TrendingUp,
            color: 'neutral',
            description: t('ai.tabs.demand.description')
        },
        {
            id: 'revenue',
            name: t('ai.tabs.revenue.name'),
            icon: DollarSign,
            color: 'neutral',
            description: t('ai.tabs.revenue.description')
        },
        {
            id: 'expense',
            name: t('ai.tabs.expense.name'),
            icon: Calendar,
            color: 'neutral',
            description: t('ai.tabs.expense.description')
        },
        {
            id: 'festival',
            name: 'Festival Planning',
            icon: PartyPopper,
            color: 'neutral',
            description: 'AI-powered festival demand forecasting for better inventory planning'
        }
    ];

    const generateInsight = async (type) => {
        setLoading(prev => ({ ...prev, [type]: true }));
        setError(prev => ({ ...prev, [type]: null }));

        try {
            let response;
            switch (type) {
                case 'demand':
                    response = await aiInsightsAPI.generateDemandForecast({ days: 30 });
                    break;
                case 'revenue':
                    response = await aiInsightsAPI.generateRevenueOptimization();
                    break;
                case 'expense':
                    response = await aiInsightsAPI.generateExpenseForecast();
                    break;
                case 'festival':
                    response = await chatbotAPI.getFestivalForecast();
                    break;
                default:
                    throw new Error('Invalid insight type');
            }

            if (response.success) {
                const newInsights = { ...insights, [type]: response.data || response };
                setInsights(newInsights);

                // Cache the insights in localStorage - persists across page refreshes
                localStorage.setItem('retailer_ai_insights', JSON.stringify(newInsights));
                
                // Refresh chart data after generating insights
                if (fetchChartDataRef.current) {
                    fetchChartDataRef.current();
                }
            } else {
                throw new Error(response.message || 'Failed to generate insights');
            }
        } catch (err) {
            console.error(`Error generating ${type} insights:`, err);
            setError(prev => ({
                ...prev,
                [type]: err.response?.data?.message || err.message || 'Failed to generate insights. Please try again.'
            }));
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    const exportToPDF = async (type) => {
        setExportingPDF(true);

        try {
            // Get the ref based on type
            let contentRef;
            switch (type) {
                case 'demand':
                    contentRef = demandRef;
                    break;
                case 'revenue':
                    contentRef = revenueRef;
                    break;
                case 'expense':
                    contentRef = expenseRef;
                    break;
                default:
                    throw new Error('Invalid type');
            }

            if (!contentRef.current) {
                throw new Error('Content not available for export');
            }

            // Show PDF header temporarily
            const pdfHeader = contentRef.current.querySelector('.pdf-header');
            if (pdfHeader) {
                pdfHeader.style.display = 'block';
            }

            // Get feature name
            const featureName = tabs.find(t => t.id === type)?.name || 'AI Insights';
            const fileName = `Smart Kirana_${featureName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;

            // PDF options
            const opt = {
                margin: [10, 10, 10, 10],
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            // Generate PDF
            await html2pdf().set(opt).from(contentRef.current).save();

            // Hide PDF header again
            if (pdfHeader) {
                pdfHeader.style.display = 'none';
            }

        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF. Please try again.');

            // Make sure to hide header on error too
            const contentRef = type === 'demand' ? demandRef : type === 'revenue' ? revenueRef : expenseRef;
            const pdfHeader = contentRef.current?.querySelector('.pdf-header');
            if (pdfHeader) {
                pdfHeader.style.display = 'none';
            }
        } finally {
            setExportingPDF(false);
        }
    };

    // Fetch chart data for visualizations
    const fetchChartData = async () => {
        try {
            // Import api from services
            const { salesAPI, inventoryAPI, expensesAPI } = await import('../services/api');

            // Fetch sales data for demand charts
            const salesResponse = await salesAPI.getSales({ limit: 100 });
            if (salesResponse.success && salesResponse.data) {
                processSalesChartData(salesResponse.data);
            }

            // Fetch expenses data for expense charts
            const expensesResponse = await expensesAPI.getExpenses({ limit: 100 });
            if (expensesResponse.success && expensesResponse.data) {
                processExpenseChartData(expensesResponse.data);
            }
        } catch (error) {
            console.error('Error fetching chart data:', error);
        }
    };
    
    // Store fetchChartData in ref so it can be called from generateInsight
    fetchChartDataRef.current = fetchChartData;

    // Process sales data for charts
    const processSalesChartData = (sales) => {
        // Sales trend - group by date
        const salesByDate = {};
        const productSales = {};
        const categoryRevenue = {};

        sales.forEach(sale => {
            const date = new Date(sale.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            salesByDate[date] = (salesByDate[date] || 0) + sale.total_amount;

            // Track product sales
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    productSales[item.item_name] = (productSales[item.item_name] || 0) + item.quantity;

                    // Track category revenue
                    const category = item.category || 'Other';
                    categoryRevenue[category] = (categoryRevenue[category] || 0) + (item.price_per_unit * item.quantity);
                });
            }
        });

        // Convert to chart format
        const salesTrend = Object.entries(salesByDate)
            .slice(-30)
            .map(([date, amount]) => ({ date, revenue: Math.round(amount) }));

        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, quantity]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, quantity }));

        const revenueByCategory = Object.entries(categoryRevenue)
            .map(([name, value]) => ({ name, value: Math.round(value) }));

        setChartData(prev => ({
            ...prev,
            salesTrend,
            topProducts,
            revenueTrend: salesTrend,
            revenueByCategory
        }));
    };

    // Process expense data for charts
    const processExpenseChartData = (expenses) => {
        const expensesByDate = {};
        const expensesByCategory = {};

        expenses.forEach(expense => {
            const date = new Date(expense.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            expensesByDate[date] = (expensesByDate[date] || 0) + expense.amount;

            const category = expense.category || 'Other';
            expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.amount;
        });

        const expenseTrend = Object.entries(expensesByDate)
            .slice(-30)
            .map(([date, amount]) => ({ date, amount: Math.round(amount) }));

        const expenseByCategory = Object.entries(expensesByCategory)
            .map(([name, value]) => ({ name, value: Math.round(value) }));

        setChartData(prev => ({
            ...prev,
            expenseTrend,
            expenseByCategory
        }));
    };

    // Fetch chart data on mount
    React.useEffect(() => {
        fetchChartData();
    }, []);

    const renderMetadata = (metadata) => {
        if (!metadata) return null;

        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {metadata.salesAnalyzed !== undefined && (
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
                        <p className="text-xs text-black dark:text-white font-medium">{t('ai.metadata.salesAnalyzed')}</p>
                        <p className="text-lg font-bold text-black dark:text-white">{metadata.salesAnalyzed}</p>
                    </div>
                )}
                {metadata.inventoryItems !== undefined && (
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
                        <p className="text-xs text-black dark:text-white font-medium">{t('ai.metadata.inventoryItems')}</p>
                        <p className="text-lg font-bold text-black dark:text-white">{metadata.inventoryItems}</p>
                    </div>
                )}
                {metadata.expensesAnalyzed !== undefined && (
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
                        <p className="text-xs text-black dark:text-white font-medium">{t('ai.metadata.expensesAnalyzed')}</p>
                        <p className="text-lg font-bold text-black dark:text-white">{metadata.expensesAnalyzed}</p>
                    </div>
                )}
                {metadata.periodDays !== undefined && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium">{t('ai.metadata.period')}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{metadata.periodDays} {t('ai.metadata.days')}</p>
                    </div>
                )}
                {metadata.totalRevenue !== undefined && (
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
                        <p className="text-xs text-black dark:text-white font-medium">{t('ai.metadata.totalRevenue')}</p>
                        <p className="text-lg font-bold text-black dark:text-white">₹{metadata.totalRevenue.toLocaleString()}</p>
                    </div>
                )}
                {metadata.avgOrderValue !== undefined && (
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
                        <p className="text-xs text-black dark:text-white font-medium">{t('ai.metadata.avgOrderValue')}</p>
                        <p className="text-lg font-bold text-black dark:text-white">₹{metadata.avgOrderValue.toLocaleString()}</p>
                    </div>
                )}
                {metadata.totalExpenses !== undefined && (
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
                        <p className="text-xs text-black dark:text-white font-medium">{t('ai.metadata.totalExpenses')}</p>
                        <p className="text-lg font-bold text-black dark:text-white">₹{metadata.totalExpenses.toLocaleString()}</p>
                    </div>
                )}
                {metadata.currentSeason && (
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg col-span-2">
                        <p className="text-xs text-black dark:text-white font-medium">{t('ai.metadata.currentSeason')}</p>
                        <p className="text-sm font-bold text-black dark:text-white">{metadata.currentSeason}</p>
                    </div>
                )}
            </div>
        );
    };

    const renderFestivalForecast = () => {
        const festivalData = insights.festival;
        const isLoading = loading.festival;
        const errorMsg = error.festival;

        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 text-black dark:text-white animate-spin mb-4" />
                    <p className="text-gray-600">Analyzing festival demand...</p>
                    <p className="text-sm text-gray-500 mt-2">Checking upcoming festivals and your inventory</p>
                </div>
            );
        }

        if (errorMsg) {
            return (
                <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                    <div className="flex items-start">
                        <AlertCircle className="h-6 w-6 text-black dark:text-white mt-0.5 mr-3" />
                        <div>
                            <h3 className="text-black dark:text-white font-semibold mb-2">Error</h3>
                            <p className="text-black dark:text-white text-sm">{errorMsg}</p>
                            <button
                                onClick={() => generateInsight('festival')}
                                className="mt-4 btn-primary"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (!festivalData) {
            return (
                <div className="text-center py-20">
                    <PartyPopper className="h-16 w-16 text-black dark:text-white mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Festival Demand Forecasting
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Get AI-powered recommendations on what to stock for upcoming Indian festivals based on your sales history and inventory.
                    </p>
                    <button
                        onClick={() => generateInsight('festival')}
                        className="btn-primary inline-flex items-center"
                    >
                        <PartyPopper className="h-5 w-5 mr-2" />
                        Generate Festival Forecast
                    </button>
                </div>
            );
        }

        // Parse the festival data from chatbot response
        const forecast = festivalData.tools_used?.includes('getFestivalDemandForecast')
            ? festivalData.results?.getFestivalDemandForecast
            : null;

        if (!forecast || !forecast.has_forecast) {
            return (
                <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Upcoming Festivals Found
                    </h3>
                    <p className="text-gray-600">
                        Check back later for festival recommendations
                    </p>
                </div>
            );
        }

        const { festival_name, months_away, is_imminent, demand_level, forecast_items, summary } = forecast;

        const getConfidenceBadge = (confidence) => {
            const badges = {
                'High': { bg: 'bg-neutral-200 dark:bg-neutral-700', text: 'text-neutral-800 dark:text-neutral-200', icon: '✅' },
                'Medium': { bg: 'bg-neutral-200 dark:bg-neutral-700', text: 'text-neutral-800 dark:text-neutral-200', icon: '⚠️' },
                'Low': { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'ℹ️' }
            };
            return badges[confidence] || badges['Low'];
        };

        return (
            <div className="space-y-6">
                {/* Festival Header Card */}
                <div className="bg-black dark:bg-white rounded-lg p-6 shadow-lg border border-neutral-800 dark:border-neutral-200">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center mb-2">
                                <PartyPopper className="h-8 w-8 mr-3 text-white dark:text-black" />
                                <h2 className="text-2xl font-bold text-white dark:text-black">{festival_name}</h2>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-neutral-300 dark:text-neutral-700">
                                <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    <span>{months_away === 0 ? 'This month' : `${months_away} month${months_away > 1 ? 's' : ''} away`}</span>
                                </div>
                                <div className="flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    <span>{demand_level} Demand</span>
                                </div>
                                {is_imminent && (
                                    <span className="bg-neutral-700 dark:bg-neutral-200 px-2 py-1 rounded text-xs font-bold text-white dark:text-black">
                                        URGENT
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-black dark:text-white font-medium">High Confidence</p>
                                <p className="text-2xl font-bold text-black dark:text-white">{summary.high_confidence}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-black dark:text-white" />
                        </div>
                    </div>
                    <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-black dark:text-white font-medium">Medium Confidence</p>
                                <p className="text-2xl font-bold text-black dark:text-white">{summary.medium_confidence}</p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-black dark:text-white" />
                        </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Low Confidence</p>
                                <p className="text-2xl font-bold text-gray-900">{summary.low_confidence}</p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-gray-500" />
                        </div>
                    </div>
                </div>

                {/* Recommended Items */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Package className="h-5 w-5 mr-2 text-black dark:text-white" />
                        Recommended Items to Stock
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {forecast_items.map((item, index) => {
                            const badge = getConfidenceBadge(item.confidence);
                            return (
                                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <h4 className="font-semibold text-gray-900 flex-1">{item.item_name}</h4>
                                        <span className={`${badge.bg} ${badge.text} px-2 py-1 rounded text-xs font-medium`}>
                                            {badge.icon} {item.confidence}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Current Stock:</span>
                                            <span className="font-medium text-gray-900">{item.current_stock} units</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Sales Velocity:</span>
                                            <span className="font-medium text-gray-900">{item.recent_sales_velocity} units/day</span>
                                        </div>
                                        <div className="pt-2 border-t border-gray-100">
                                            <p className="text-xs text-gray-600 mb-2">
                                                {item.reasoning}
                                            </p>
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${item.action.includes('Restock')
                                                ? 'bg-neutral-800 text-white'
                                                : 'bg-neutral-200 text-black'
                                                }`}>
                                                {item.action}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AI Response */}
                {festivalData.message && (
                    <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center">
                            <Brain className="h-5 w-5 mr-2" />
                            AI Recommendations
                        </h3>
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                                components={{
                                    p: ({ node, ...props }) => <p className="text-black dark:text-white mb-2" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 text-black dark:text-white" {...props} />,
                                    li: ({ node, ...props }) => <li className="text-black dark:text-white" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-semibold text-black dark:text-white" {...props} />,
                                }}
                            >
                                {festivalData.message}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderInsightContent = (type) => {
        const insight = insights[type];
        const loadingState = loading[type];
        const errorMsg = error[type];

        if (loadingState) {
            return (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 text-black dark:text-white animate-spin mb-4" />
                    <p className="text-gray-600">{t('ai.analyzing')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('ai.analyzingTime')}</p>
                </div>
            );
        }

        if (errorMsg) {
            return (
                <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                    <div className="flex items-start">
                        <AlertCircle className="h-6 w-6 text-black dark:text-white mt-0.5 mr-3" />
                        <div>
                            <h3 className="text-black dark:text-white font-semibold mb-2">{t('ai.error')}</h3>
                            <p className="text-black dark:text-white text-sm">{errorMsg}</p>
                            <button
                                onClick={() => generateInsight(type)}
                                className="mt-4 btn-primary transition-all hover:scale-105"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('ai.tryAgain')}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (!insight) {
            return (
                <div className="text-center py-20">
                    <Sparkles className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {tabs.find(t => t.id === type)?.name}
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        {tabs.find(t => t.id === type)?.description}
                    </p>
                    <button
                        onClick={() => generateInsight(type)}
                        className="btn-primary inline-flex items-center transition-all hover:scale-105"
                    >
                        <Brain className="h-5 w-5 mr-2" />
                        {t('ai.generateButton')}
                    </button>
                </div>
            );
        }

        // Get the correct ref
        let contentRef;
        switch (type) {
            case 'demand': contentRef = demandRef; break;
            case 'revenue': contentRef = revenueRef; break;
            case 'expense': contentRef = expenseRef; break;
            default: contentRef = null;
        }

        return (
            <div className="space-y-6" ref={contentRef}>
                {/* PDF Header - Hidden on screen, shown in PDF */}
                <div className="pdf-header" style={{ display: 'none' }}>
                    <div className="text-center mb-5 border-b-2 border-neutral-900 pb-4">
                        <h1 className="text-2xl font-bold text-neutral-900 mb-1">{tabs.find(t => t.id === type)?.name}</h1>
                        <p className="text-sm text-neutral-700">Powered by AI Business Intelligence - Smart Kirana</p>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <Brain className="h-6 w-6 text-black dark:text-white mr-2" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Analysis & Insights</h3>
                        </div>
                        <div className="flex items-center space-x-3">
                            {contentRef && (
                                <button
                                    onClick={() => exportToPDF(type)}
                                    disabled={exportingPDF}
                                    className="text-sm bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg hover:opacity-80 flex items-center disabled:opacity-50 transition-all"
                                >
                                    {exportingPDF ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                                    {exportingPDF ? 'Exporting...' : 'Export PDF'}
                                </button>
                            )}
                            <button
                                onClick={() => generateInsight(type)}
                                className="text-sm font-semibold text-black dark:text-white hover:opacity-70 flex items-center transition-all bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700"
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Regenerate
                            </button>
                        </div>
                    </div>

                    {type === 'festival' ? renderFestivalForecast() : (
                        <>
                            {renderMetadata(insight.metadata)}
                            
                            <div className="prose prose-sm max-w-none">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg border-l-4 border-black dark:border-white" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2" {...props} />,
                                        p: ({ node, ...props }) => <p className="text-gray-700 dark:text-neutral-300 mb-3" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-4" {...props} />,
                                        li: ({ node, ...props }) => <li className="text-gray-700 dark:text-neutral-300" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="font-bold text-black dark:text-white bg-neutral-100 dark:bg-neutral-800 px-1 rounded" {...props} />,
                                    }}
                                >
                                    {insight.analysis}
                                </ReactMarkdown>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Brain className="h-8 w-8 mr-3 text-black dark:text-white" />
                        {t('ai.title')}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {t('ai.subtitle')}
                    </p>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`card cursor-pointer transition-all ${activeTab === tab.id
                                ? `ring-2 ring-${tab.color}-500 border-${tab.color}-200 bg-${tab.color}-50`
                                : 'hover:shadow-md'
                                }`}
                        >
                            <div className="flex items-start">
                                <div className={`p-3 bg-${tab.color}-100 rounded-lg`}>
                                    <Icon className={`h-6 w-6 text-${tab.color}-600`} />
                                </div>
                                <div className="ml-4 flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{tab.name}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{tab.description}</p>
                                    {insights[tab.id] && (
                                        <div className="mt-2 flex items-center text-xs text-black dark:text-white">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            {t('ai.generated')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Area */}
            <div className="card min-h-[500px]">
                {renderInsightContent(activeTab)}
            </div>
        </div>
    );
};

export default AIInsights;
