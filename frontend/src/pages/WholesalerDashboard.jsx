import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, TrendingUp, Users, LogOut, Settings, Brain, CheckCircle, Clock, Bell, Sun, Moon, Search } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from 'recharts';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import FloatingChatbot from '../components/FloatingChatbot';

const WholesalerDashboard = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        totalCost: 0,
        netProfit: 0,
        profitMargin: 0,
        activeProducts: 0
    });
    const [orders, setOrders] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            if (API_BASE_URL.endsWith('/api')) API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
            
            const API_URL = `${API_BASE_URL}/api`;

            // Fetch orders
            const ordersResponse = await fetch(`${API_URL}/wholesalers/orders/wholesaler?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Fetch inventory
            const inventoryResponse = await fetch(`${API_URL}/wholesalers/inventory/my?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (ordersResponse.ok && inventoryResponse.ok) {
                const ordersData = await ordersResponse.json();
                const inventoryData = await inventoryResponse.json();

                if (ordersData.success && inventoryData.success) {
                    const allOrders = ordersData.data.orders;
                    const inventory = inventoryData.data.inventory;

                    setOrders(allOrders);

                    const pending = allOrders.filter(o => o.status === 'REQUESTED').length;
                    const deliveredOrders = allOrders.filter(o => o.status === 'DELIVERED');
                    const revenue = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

                    // Calculate cost and profit
                    let totalCost = 0;
                    deliveredOrders.forEach(order => {
                        order.items.forEach(item => {
                            const product = inventory.find(p => p._id === item.productId);
                            if (product && product.costPrice) {
                                totalCost += product.costPrice * item.quantity;
                            }
                        });
                    });

                    const netProfit = revenue - totalCost;
                    const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;
                    const activeProducts = inventory.filter(p => p.isActive).length;

                    setStats({
                        totalOrders: ordersData.data.pagination.total,
                        pendingOrders: pending,
                        totalRevenue: revenue,
                        totalCost,
                        netProfit,
                        profitMargin: parseFloat(profitMargin),
                        activeProducts
                    });
                }
            }
            setIsLoading(false);
        } catch (error) {
            toast.error('Failed to load data');
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        toast.success('Logged out');
        navigate('/login');
    };

    const getStatusColor = (status) => {
        const colors = {
            'REQUESTED': 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200', 'ACCEPTED': 'bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white',
            'PACKED': 'bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white', 'DISPATCHED': 'bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white',
            'DELIVERED': 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200', 'CANCELLED': 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black dark:border-white"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <Package className="h-8 w-8 text-black dark:text-white" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wholesaler Dashboard</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={toggleTheme} 
                                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </button>
                            
                            <div className="relative">
                                <button 
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors relative"
                                >
                                    <Bell className="h-5 w-5" />
                                    {orders.filter(o => o.status === 'REQUESTED').length > 0 && (
                                        <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                                    )}
                                </button>
                                
                                {showNotifications && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 font-bold text-sm text-gray-900 dark:text-white">
                                            Recent Activity
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {orders.slice(0, 5).map(order => (
                                                <div key={order._id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 cursor-pointer" onClick={() => navigate('/wholesaler/orders')}>
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`p-2 rounded-lg ${order.status === 'REQUESTED' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                                            <ShoppingCart className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-bold text-gray-900 dark:text-white">Order {order.orderNumber}</p>
                                                            <p className="text-[10px] text-gray-500">{order.retailer?.shop_name || 'Retailer'} • ₹{order.totalAmount.toLocaleString()}</p>
                                                            <p className="text-[10px] mt-1 text-neutral-400 capitalize">{order.status.toLowerCase()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => navigate('/wholesaler/orders')} className="w-full py-2 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors">View All Orders</button>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => navigate('/wholesaler/profile-settings')} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><Settings className="h-5 w-5" /></button>
                            <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 font-medium transition-all shadow-sm"><LogOut className="h-4 w-4" /><span>Logout</span></button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div><p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p><p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalOrders}</p></div>
                            <ShoppingCart className="h-12 w-12 text-black dark:text-white" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div><p className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</p><p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.pendingOrders}</p></div>
                            <Package className="h-12 w-12 text-black dark:text-white" />
                        </div>
                    </div>
                    <div className="bg-black dark:bg-white text-white dark:text-black dark:text-black rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-300">Net Profit</p>
                                <p className="text-3xl font-bold mt-2">₹{stats.netProfit.toLocaleString()}</p>
                                <p className="text-xs text-neutral-300 mt-1">{stats.profitMargin}% margin</p>
                            </div>
                            <TrendingUp className="h-12 w-12 text-neutral-300" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
                                <p className="text-xs text-gray-500 mt-1">Cost: ₹{stats.totalCost.toLocaleString()}</p>
                            </div>
                            <Users className="h-12 w-12 text-black dark:text-white" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div onClick={() => navigate('/wholesaler/ai-insights')} className="bg-black dark:bg-white text-white dark:text-black rounded-[2rem] shadow-xl p-8 hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 bg-white/10 dark:bg-black/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                        <Brain className="h-12 w-12 mb-6" />
                        <h3 className="text-2xl font-black mb-3">AI Strategic Insights</h3>
                        <p className="text-sm opacity-80 leading-relaxed font-medium">Get real-time AI analysis on stock movement, personalized offers for retailers, and automated clearance strategies.</p>
                        <div className="mt-8 flex items-center text-xs font-bold uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                            Explore Strategy <Clock className="ml-2 h-4 w-4" />
                        </div>
                    </div>

                    <div onClick={() => navigate('/wholesaler/inventory')} className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-8 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="p-3 bg-neutral-100 dark:bg-neutral-700 rounded-2xl w-fit mb-6 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors">
                            <Package className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Inventory Management</h3>
                        <p className="text-sm text-gray-500 font-medium">Manage bulk inventory, set minimum order quantities, and update pricing.</p>
                    </div>

                    <div onClick={() => navigate('/wholesaler/orders')} className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-8 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="p-3 bg-neutral-100 dark:bg-neutral-700 rounded-2xl w-fit mb-6 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Order Fulfillment</h3>
                        <p className="text-sm text-gray-500 font-medium">Track incoming retailer requests and manage logistics from dispatch to delivery.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Charts Section */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Business Performance</h3>
                                <p className="text-sm text-gray-500 font-medium italic mt-1">Financial overview for the last 30 days</p>
                            </div>
                            <TrendingUp className="h-6 w-6 text-neutral-400" />
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Revenue', value: stats.totalRevenue, fill: theme === 'dark' ? '#fff' : '#171717' },
                                    { name: 'Cost', value: stats.totalCost, fill: theme === 'dark' ? '#525252' : '#737373' },
                                    { name: 'Profit', value: stats.netProfit, fill: theme === 'dark' ? '#a3a3a3' : '#a3a3a3' }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#333' : '#E5E7EB'} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: theme === 'dark' ? '#aaa' : '#666', fontSize: 12}} />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#171717' : '#fff', color: theme === 'dark' ? '#fff' : '#000' }}
                                        itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                                        formatter={(value) => `₹${value.toLocaleString()}`}
                                    />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Quick AI Insights Preview Card */}
                    <div onClick={() => navigate('/wholesaler/ai-insights')} className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-8 flex flex-col hover:shadow-lg transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                <Brain className="h-5 w-5 mr-3 text-neutral-400" />
                                Smart Alerts
                            </h3>
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black dark:bg-white opacity-20"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-black dark:bg-white"></span>
                            </span>
                        </div>
                        <div className="space-y-4 flex-1">
                            {orders.filter(o => o.status === 'REQUESTED').length > 0 && (
                                <div className="p-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Action Required</p>
                                    <p className="text-sm font-bold">{orders.filter(o => o.status === 'REQUESTED').length} Pending Orders</p>
                                    <p className="text-[10px] opacity-80 mt-1">Accept requests to begin fulfillment.</p>
                                </div>
                            )}
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Stock Movement</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Low Velocity Detected</p>
                                <p className="text-xs text-gray-500 mt-1">Some items haven't moved in 14 days. View AI suggested discounts.</p>
                            </div>
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Engagement</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Top Retailer Outreach</p>
                                <p className="text-xs text-gray-500 mt-1">3 key retailers haven't ordered this week. Send personalized offers.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Recent Orders Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                            <button onClick={() => navigate('/wholesaler/orders')} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black dark:hover:text-white transition-colors">View All</button>
                        </div>
                        <div className="p-4">
                            {orders.length === 0 ? (
                                <div className="text-center py-12"><ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400">No orders yet</p></div>
                            ) : (
                                <div className="space-y-4">
                                    {orders.slice(0, 5).map((order) => (
                                        <div key={order._id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-neutral-100 dark:bg-neutral-700 p-2 rounded-lg">
                                                    <Package className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{order.orderNumber}</p>
                                                    <p className="text-xs text-gray-500">{order.retailer?.shop_name || order.retailer?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">₹{order.totalAmount.toLocaleString()}</p>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${getStatusColor(order.status)}`}>{order.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Retailers Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Top Retailer Customers</h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from(new Set(orders.map(o => o.retailer?._id))).filter(id => id).slice(0, 3).map(retailerId => {
                                const retailerOrders = orders.filter(o => o.retailer?._id === retailerId);
                                const retailer = retailerOrders[0].retailer;
                                const spent = retailerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
                                return (
                                    <div key={retailerId} className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="h-10 w-10 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center font-bold">
                                                {(retailer.shop_name || retailer.name)?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{retailer.shop_name || retailer.name}</p>
                                                <p className="text-xs text-gray-500">📍 {retailer.locality || retailer.address?.city || 'Local'}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-gray-500">Lifetime Orders</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{retailerOrders.length}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">Total Spent</p>
                                                <p className="text-lg font-bold text-black dark:text-white">₹{spent.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
            <FloatingChatbot />
        </div>
    );
};

export default WholesalerDashboard;
