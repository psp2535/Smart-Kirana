import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { inventoryAPI, salesAPI } from '../services/api';
import { Package, TrendingUp, LogOut, Store } from 'lucide-react';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    todaySales: 0,
    todayRevenue: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      const [inventoryRes, lowStockRes, todayRes] = await Promise.all([
        inventoryAPI.getAll(),
        inventoryAPI.getLowStock(),
        salesAPI.getToday()
      ]);

      setStats({
        totalItems: inventoryRes.data.data.count,
        lowStockItems: lowStockRes.data.data.count,
        todaySales: todayRes.data.data.totalTransactions,
        todayRevenue: todayRes.data.data.totalRevenue
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Store className="w-8 h-8 text-blue-600 mr-2" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Smart Kirana</h1>
              <p className="text-sm text-gray-600">{user.shop_name || user.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Items</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalItems}</p>
              </div>
              <Package className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Low Stock Items</p>
                <p className="text-3xl font-bold text-red-600">{stats.lowStockItems}</p>
              </div>
              <Package className="w-12 h-12 text-red-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Today's Sales</p>
                <p className="text-3xl font-bold text-gray-800">{stats.todaySales}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Today's Revenue</p>
                <p className="text-3xl font-bold text-green-600">₹{stats.todayRevenue}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500" />
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Welcome, {user.name}!
          </h3>
          <p className="text-gray-600">
            Your business management dashboard is ready. Start managing your inventory and sales efficiently.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
