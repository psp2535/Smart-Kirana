import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Brain,
  Search,
  ShoppingCart,
  CreditCard,
  AlertCircle,
  UserPlus,
  Bell,
  Sun,
  Moon,
  Crown,
  Star,
  Phone
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { salesAPI, expensesAPI, inventoryAPI, customersAPI, profitAnalyticsAPI, notificationsAPI } from '../services/api';
import FloatingChatbot from '../components/FloatingChatbot';
import { useTheme } from '../contexts/ThemeContext';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [profitData, setProfitData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [frequentCustomers, setFrequentCustomers] = useState([]);

  const handleQuickAction = (path) => {
    navigate(path);
  };

  useEffect(() => {
    fetchAll();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getNotifications();
      if (res?.success) {
        setNotifications(res.data);
        const countRes = await notificationsAPI.getUnreadCount();
        if (countRes?.success) setUnreadCount(countRes.count);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const fetchAll = async () => {
    try {
      setLoading(true);

      const [sRes, eRes, iRes, cRes] = await Promise.all([
        salesAPI.getSales(),
        expensesAPI.getExpenses(),
        inventoryAPI.getInventory(),
        customersAPI.getCustomers(),
      ]);

      const salesData = (sRes?.success && Array.isArray(sRes.data)) ? sRes.data : [];
      const expensesData = (eRes?.success && Array.isArray(eRes.data)) ? eRes.data : [];
      const inventoryData = (iRes?.success && Array.isArray(iRes.data)) ? iRes.data : [];
      const customersData = (cRes?.success && Array.isArray(cRes.data)) ? cRes.data : [];

      setSales(salesData);
      setExpenses(expensesData);
      setInventory(inventoryData);
      setCustomers(customersData);

      const totalRevenue = salesData.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const totalCOGS = salesData.reduce((sum, s) => sum + Number(s.total_cogs || 0), 0);
      const totalExpenses = expensesData.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalInventoryValue = inventoryData.reduce((sum, i) => sum + (Number(i.stock_qty || 0) * Number(i.price_per_unit || 0)), 0);
      const grossProfit = totalRevenue - totalCOGS;
      const netProfit = grossProfit - totalExpenses;

      try {
        const pRes = await profitAnalyticsAPI.getProfitAnalysis();
        if (pRes?.success && pRes.data && pRes.data.revenue > 0) {
          setProfitData(pRes.data);
        } else {
          throw new Error('Invalid API data');
        }
      } catch (err) {
        setProfitData({
          revenue: totalRevenue,
          totalCOGS: totalCOGS,
          grossProfit: grossProfit,
          netProfit: netProfit,
          netProfitMargin: totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0,
          salesCount: salesData.length,
          inventoryValue: totalInventoryValue
        });
      }

      // Use actual sales data grouped by the last 7 days
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          dateObj: d,
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: 0
        };
      });

      salesData.forEach(sale => {
        const saleDate = new Date(sale.createdAt || sale.date);
        const dayMatch = last7Days.find(d =>
          d.dateObj.getDate() === saleDate.getDate() &&
          d.dateObj.getMonth() === saleDate.getMonth() &&
          d.dateObj.getFullYear() === saleDate.getFullYear()
        );
        if (dayMatch) {
          dayMatch.revenue += Number(sale.total_amount || 0);
        }
      });

      setChartData(last7Days);

      generateRecentActivities(salesData, expensesData, inventoryData, customersData);

      // Compute frequent customers from sales data
      const visitMap = {};
      salesData.forEach(sale => {
        const phone = sale.customer_phone;
        if (!phone || phone.trim() === '') return; // skip walk-ins with no phone
        const name = sale.customer_name || 'Customer';
        if (!visitMap[phone]) {
          visitMap[phone] = { name, phone, visits: 0, totalSpend: 0, lastVisit: null };
        }
        visitMap[phone].visits += 1;
        visitMap[phone].totalSpend += Number(sale.total_amount || 0);
        const saleDate = new Date(sale.createdAt || sale.date);
        if (!visitMap[phone].lastVisit || saleDate > new Date(visitMap[phone].lastVisit)) {
          visitMap[phone].lastVisit = saleDate;
        }
      });
      const topCustomers = Object.values(visitMap)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5);
      setFrequentCustomers(topCustomers);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateRecentActivities = (salesData, expensesData, inventoryData, customersData) => {
    const activities = [];

    salesData.slice(0, 3).forEach(sale => {
      activities.push({
        id: `sale-${sale._id}`,
        type: 'sale',
        icon: ShoppingCart,
        message: `Sale of ₹${sale.total_amount} recorded`,
        time: sale.createdAt || sale.date,
        status: 'default'
      });
    });

    expensesData.slice(0, 2).forEach(expense => {
      activities.push({
        id: `expense-${expense._id}`,
        type: 'expense',
        icon: CreditCard,
        message: `${expense.category || 'Expense'}: ₹${expense.amount}`,
        time: expense.createdAt || expense.date,
        status: 'default'
      });
    });

    const lowStock = inventoryData.filter(item => item.stock_qty <= (item.min_stock_level || 5));
    if (lowStock.length > 0) {
      activities.push({
        id: 'low-stock',
        type: 'inventory',
        icon: AlertCircle,
        message: `${lowStock.length} items low on stock`,
        time: new Date(),
        status: 'issue'
      });
    }

    const now = new Date();
    const expiringSoon = inventoryData.filter(item => {
      if (!item.expiry_date) return false;
      const days = Math.ceil((new Date(item.expiry_date) - now) / (1000 * 60 * 60 * 24));
      return days <= 30 && days >= 0;
    });

    if (expiringSoon.length > 0) {
      activities.push({
        id: 'expiring-soon',
        type: 'inventory',
        icon: AlertCircle,
        message: `${expiringSoon.length} items expiring within 30 days`,
        time: new Date(),
        status: 'issue'
      });
    }

    customersData.slice(0, 2).forEach(customer => {
      activities.push({
        id: `customer-${customer._id}`,
        type: 'customer',
        icon: UserPlus,
        message: `Customer ${customer.name} added`,
        time: customer.createdAt,
        status: 'default'
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    setRecentActivities(activities.slice(0, 5));
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  };

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalInventoryValue = inventory.reduce((sum, i) => sum + (Number(i.stock_qty || 0) * Number(i.price_per_unit || 0)), 0);
  const basicProfit = totalSales - totalExpenses;

  const actualProfit = (profitData && profitData.revenue > 0) ? profitData.netProfit : basicProfit;
  const actualRevenue = (profitData && profitData.revenue > 0) ? profitData.revenue : totalSales;
  const profitMargin = actualRevenue > 0 ? (actualProfit / actualRevenue * 100) : 0;

  const stats = [
    {
      name: t('dashboard.stats.netProfit'),
      value: `₹${actualProfit.toLocaleString()}`,
      change: `${profitMargin.toFixed(1)}% MARGIN`,
      icon: TrendingUp
    },
    {
      name: t('dashboard.stats.totalRevenue'),
      value: `₹${(profitData?.revenue || totalSales).toLocaleString()}`,
      change: `${profitData?.salesCount || sales.length} SALES`,
      icon: DollarSign
    },
    {
      name: t('dashboard.stats.inventoryValue'),
      value: `₹${(profitData?.inventoryValue || totalInventoryValue).toLocaleString()}`,
      change: `${inventory.length} ITEMS`,
      icon: Package
    },
    {
      name: t('dashboard.stats.activeCustomers'),
      value: String(customers.length),
      change: `TOTAL BASE`,
      icon: Users
    },
  ];

  const filteredData = {
    sales: sales.filter(s => !searchQuery || s.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.payment_method?.toLowerCase().includes(searchQuery.toLowerCase())),
    expenses: expenses.filter(e => !searchQuery || e.category?.toLowerCase().includes(searchQuery.toLowerCase()) || e.description?.toLowerCase().includes(searchQuery.toLowerCase())),
    inventory: inventory.filter(i => !searchQuery || i.item_name?.toLowerCase().includes(searchQuery.toLowerCase())),
    customers: customers.filter(c => !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone?.includes(searchQuery))
  };

  const searchResults = [
    ...filteredData.sales.map(s => ({ type: 'Sale', name: s.customer_name || 'Walk-in', amount: s.total_amount })),
    ...filteredData.expenses.map(e => ({ type: 'Expense', name: e.category, amount: e.amount })),
    ...filteredData.inventory.map(i => ({ type: 'Inventory', name: i.item_name, amount: i.stock_qty })),
    ...filteredData.customers.map(c => ({ type: 'Customer', name: c.name, amount: c.phone }))
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-black border-r-black border-b-transparent border-l-transparent dark:border-t-white dark:border-r-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-black dark:text-white pb-10">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white uppercase">{t('dashboard.title')}</h1>
          <p className="mt-2 text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">{t('dashboard.subtitle')}</p>
        </div>

        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-neutral-900 rounded-[2rem] shadow-2xl border border-neutral-100 dark:border-neutral-800 z-50 overflow-hidden">
                <div className="px-6 py-5 border-b border-neutral-50 dark:border-neutral-800 flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase tracking-widest text-neutral-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] font-bold text-neutral-500 hover:text-black dark:hover:text-white uppercase transition-colors">Mark All Read</button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Bell className="h-8 w-8 text-neutral-200 dark:text-neutral-800 mx-auto mb-3" />
                      <p className="text-xs text-neutral-400 font-bold uppercase tracking-tighter">Your inbox is clean</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div key={notification._id} className={`px-6 py-5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border-b border-neutral-50 dark:border-neutral-800 last:border-0 ${!notification.isRead ? 'bg-neutral-50/50 dark:bg-neutral-800/20' : ''}`}>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">{notification.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed opacity-80">{notification.message}</p>
                        <p className="text-[10px] text-neutral-400 font-black mt-2 uppercase tracking-widest">{timeAgo(notification.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative w-full md:w-64 hidden md:block">
            <input
              type="text"
              placeholder={t('dashboard.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-sm font-medium"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
          </div>
        </div>
      </div>

      {/* Primary KPI Stats - Bento Grid Top Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={stat.name} className="bg-white dark:bg-neutral-900 rounded-[2rem] p-6 shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300 group">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                <stat.icon className="h-6 w-6 text-neutral-700 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-black" />
              </div>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1 text-neutral-500">{stat.name}</p>
              <h3 className="text-3xl font-black tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid - Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-[2rem] p-8 shadow-sm border border-neutral-200 dark:border-neutral-800">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h3 className="text-xl font-bold tracking-tight mb-1">Weekly Revenue</h3>
              <p className="text-sm text-neutral-500 font-medium">Performance overview across the last 7 days.</p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-3xl font-black">₹{(profitData?.revenue || totalSales).toLocaleString()}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Total Payout</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#525252" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#737373' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#737373' }} dx={-10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#171717', color: '#fff', borderRadius: '12px', border: 'none', padding: '12px 16px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  labelStyle={{ color: '#a3a3a3', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase' }}
                  cursor={{ stroke: '#525252', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="currentColor" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" className="text-black dark:text-white" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Daily Digest (Rich Cards) */}
        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-8 shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center">
              <Brain className="h-6 w-6 mr-3 text-neutral-500" />
              AI Insights
            </h3>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black dark:bg-white opacity-20"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-black dark:bg-white"></span>
            </span>
          </div>

          {actualProfit !== undefined && actualProfit !== null ? (
            <div className="space-y-3 flex-1">

              {/* Profit Health Card */}
              <div className={`rounded-2xl p-4 border flex items-start gap-3 ${actualProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm ${actualProfit >= 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {actualProfit >= 0 ? '▲' : '▼'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] uppercase tracking-widest font-extrabold mb-0.5 ${actualProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    Profit Health
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                    <span className="font-black">₹{actualProfit.toLocaleString()}</span> net · <span className="font-black">{profitMargin.toFixed(1)}%</span> margin
                  </p>
                </div>
              </div>

              {/* Velocity Card */}
              {profitData?.salesCount > 0 && (
                <div className="rounded-2xl p-4 border bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30 flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center text-sm">⚡</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest font-extrabold text-blue-600 dark:text-blue-400 mb-0.5">Sales Velocity</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                      <span className="font-black">{profitData.salesCount}</span> sales · <span className="font-black">₹{profitData.revenue?.toLocaleString()}</span> revenue
                    </p>
                  </div>
                </div>
              )}

              {/* Critical Stock Card */}
              {(() => {
                const lowItems = inventory.filter(i => i.stock_qty <= (i.min_stock_level || 5));
                if (lowItems.length === 0) return null;
                return (
                  <div className="rounded-2xl p-4 border bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30 flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest font-extrabold text-amber-600 dark:text-amber-400 mb-0.5">Critical Stock</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                        <span className="font-black">{lowItems.length}</span> items running low — restock to prevent lost sales
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Expiry Warning Card */}
              {(() => {
                const now = new Date();
                const expiringSoon = inventory.filter(i => {
                  if (!i.expiry_date) return false;
                  const days = Math.ceil((new Date(i.expiry_date) - now) / (1000 * 60 * 60 * 24));
                  return days <= 30 && days >= 0;
                });
                if (expiringSoon.length === 0) return null;
                return (
                  <div className="rounded-2xl p-4 border bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/30 flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-sm">⏳</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest font-extrabold text-orange-600 dark:text-orange-400 mb-0.5">Expiry Warning</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                        <span className="font-black">{expiringSoon.length}</span> items expire within 30 days — run a clearance sale
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* All Clear Card (no issues) */}
              {inventory.filter(i => i.stock_qty <= (i.min_stock_level || 5)).length === 0 && (() => {
                const now = new Date();
                const expiring = inventory.filter(i => {
                  if (!i.expiry_date) return false;
                  const days = Math.ceil((new Date(i.expiry_date) - now) / (1000 * 60 * 60 * 24));
                  return days <= 30 && days >= 0;
                });
                if (expiring.length > 0) return null;
                return (
                  <div className="rounded-2xl p-4 border bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm">✓</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest font-extrabold text-neutral-500 mb-0.5">All Clear</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                        Inventory healthy · No alerts today
                      </p>
                    </div>
                  </div>
                );
              })()}

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 opacity-50">
              <Brain className="w-12 h-12 mb-4" />
              <p className="text-sm font-medium">Gathering data for insights...</p>
            </div>
          )}
        </div>
      </div>

      {/* Third Row - Action Grid & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Editorial Quick Actions */}
        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-8 shadow-sm border border-neutral-200 dark:border-neutral-800">
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight mb-1">Quick Actions</h3>
            <p className="text-sm text-neutral-500 font-medium">Manage your daily operations seamlessly.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleQuickAction('/dashboard/sales')} className="group flex flex-col justify-between h-32 p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all text-left border border-transparent">
              <ShoppingCart className="h-6 w-6 text-neutral-500 group-hover:text-inherit" />
              <span className="font-bold tracking-tight">Record Sale</span>
            </button>
            <button onClick={() => handleQuickAction('/dashboard/expenses')} className="group flex flex-col justify-between h-32 p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all text-left border border-transparent">
              <CreditCard className="h-6 w-6 text-neutral-500 group-hover:text-inherit" />
              <span className="font-bold tracking-tight">Add Expense</span>
            </button>
            <button onClick={() => handleQuickAction('/dashboard/inventory')} className="group flex flex-col justify-between h-32 p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all text-left border border-transparent">
              <Package className="h-6 w-6 text-neutral-500 group-hover:text-inherit" />
              <span className="font-bold tracking-tight">Update Inventory</span>
            </button>
            <button onClick={() => handleQuickAction('/dashboard/customers')} className="group flex flex-col justify-between h-32 p-5 rounded-2xl border border-neutral-300 dark:border-neutral-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all text-left">
              <UserPlus className="h-6 w-6 text-neutral-500 group-hover:text-inherit" />
              <span className="font-bold tracking-tight">Add Customer</span>
            </button>
          </div>
        </div>

        {/* Minimalist Recent Activity */}
        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-8 shadow-sm border border-neutral-200 dark:border-neutral-800">
          <div className="mb-6 flex justify-between items-end">
            <h3 className="text-xl font-bold tracking-tight">Recent Activity</h3>
            <button className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 hover:text-black dark:hover:text-white transition-colors">View All</button>
          </div>

          <div className="space-y-0">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, idx) => {
                const ActivityIcon = activity.icon;
                return (
                  <div key={activity.id} className={`flex items-center space-x-4 py-4 ${idx !== recentActivities.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''}`}>
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${activity.status === 'issue' ? 'bg-neutral-800 text-white dark:bg-white dark:text-black' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                      <ActivityIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{activity.message}</p>
                      <p className="text-xs text-neutral-500 font-medium">{timeAgo(activity.time)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-neutral-400">
                <ShoppingCart className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">No recent activity yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Frequent Customers */}
      {frequentCustomers.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-8 shadow-sm border border-neutral-200 dark:border-neutral-800">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Frequent Customers
              </h3>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">Your most loyal regulars, ranked by visit count</p>
            </div>
            <button
              onClick={() => handleQuickAction('/dashboard/customers')}
              className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {frequentCustomers.map((customer, idx) => (
              <div
                key={customer.phone}
                className="group relative rounded-2xl p-5 border-2 border-neutral-100 dark:border-neutral-800 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all bg-neutral-50 dark:bg-neutral-800/40 cursor-pointer"
                onClick={() => handleQuickAction('/dashboard/sales')}
              >
                {/* Rank badge */}
                {idx === 0 && (
                  <span className="absolute top-3 right-3 flex items-center gap-0.5 text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    <Crown className="h-2.5 w-2.5" /> Top
                  </span>
                )}

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-base mb-3 ${idx === 0 ? 'bg-amber-500 text-white' :
                    idx === 1 ? 'bg-neutral-400 text-white' :
                      idx === 2 ? 'bg-orange-400 text-white' :
                        'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }`}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{customer.name}</p>
                <p className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                  <Phone className="h-2.5 w-2.5" />{customer.phone}
                </p>

                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Visits</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />{customer.visits}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Spent</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">₹{customer.totalSpend.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Last seen</span>
                    <span className="text-[10px] text-neutral-500">{timeAgo(customer.lastVisit)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <FloatingChatbot />
    </div>
  );
};

export default Dashboard;
