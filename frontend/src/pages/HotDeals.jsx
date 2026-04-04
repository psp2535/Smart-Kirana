import React, { useState, useEffect } from 'react';
import { Flame, TrendingDown, Clock, MapPin, Search, Filter, Tag, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// Ensure API_URL always has /api
let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
if (!API_URL.endsWith('/api')) {
  API_URL = API_URL + '/api';
}

const HotDeals = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('discount'); // discount, price, ending_soon
  
  // Modal states
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Get shop_id from URL params or localStorage
  const shopId = new URLSearchParams(window.location.search).get('shop_id') || localStorage.getItem('selected_shop_id');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (shopId) {
      fetchHotDeals();
    }
  }, [shopId]);

  const fetchHotDeals = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/campaigns/hot-deals?shop_id=${shopId}&limit=50`);
      setDeals(response.data.data || []);
    } catch (error) {
      console.error('Error fetching hot deals:', error);
      toast.error('Failed to load hot deals');
    } finally {
      setLoading(false);
    }
  };

  const handleDealClick = async (deal) => {
    try {
      // Track click
      await axios.post(`${API_URL}/campaigns/track-click`, { inventory_id: deal.item_id });
      
      // Open quantity modal
      setSelectedDeal(deal);
      setQuantity(1);
      setShowQuantityModal(true);
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  const handleGrabDeal = async () => {
    if (!selectedDeal || !token) {
      toast.error('Please login to grab deals');
      return;
    }

    if (quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (quantity > selectedDeal.stock_qty) {
      toast.error(`Only ${selectedDeal.stock_qty} items available`);
      return;
    }

    setSendingRequest(true);
    try {
      // Remove /api from API_URL for customer-requests endpoint
      const baseURL = API_URL.replace('/api', '');
      
      const response = await axios.post(
        `${baseURL}/api/customer-requests`,
        {
          retailer_id: shopId,
          items: [{
            item_name: selectedDeal.item_name,
            quantity: quantity
          }],
          notes: `HOT DEAL REQUEST - ${selectedDeal.discount_percentage}% OFF! Original Price: ₹${selectedDeal.original_price}, Deal Price: ₹${selectedDeal.discounted_price}`,
          is_hot_deal: true,
          hot_deal_info: {
            discount_percentage: selectedDeal.discount_percentage,
            original_price: selectedDeal.original_price,
            discounted_price: selectedDeal.discounted_price,
            savings: selectedDeal.savings
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success('Hot deal request sent to retailer!');
        setShowQuantityModal(false);
        setSelectedDeal(null);
        setQuantity(1);
        
        // Navigate to customer dashboard after 2 seconds
        setTimeout(() => {
          navigate('/customer-dashboard');
        }, 2000);
      } else {
        toast.error(response.data.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending hot deal request:', error);
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setSendingRequest(false);
    }
  };

  const getFilteredDeals = () => {
    let filtered = deals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(deal =>
        deal.item_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(deal => deal.category === selectedCategory);
    }

    // Sort
    if (sortBy === 'discount') {
      filtered.sort((a, b) => b.discount_percentage - a.discount_percentage);
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => a.discounted_price - b.discounted_price);
    } else if (sortBy === 'ending_soon') {
      filtered.sort((a, b) => a.ends_in_days - b.ends_in_days);
    }

    return filtered;
  };

  const filteredDeals = getFilteredDeals();
  const categories = ['All', ...new Set(deals.map(d => d.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 10000,
        }}
      />

      {/* Header */}
      <div className="bg-black dark:bg-neutral-900 text-white py-8 px-4 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="h-6 w-6 text-white" />
            </button>
            <Flame className="h-10 w-10 text-white" />
            <h1 className="text-4xl font-bold">Hot Deals</h1>
          </div>
          <p className="text-gray-400 text-lg ml-14">
            Limited time offers on expiring & clearance items - Save up to 75%!
          </p>
          <div className="mt-4 ml-14 flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>Deals updated in real-time • {deals.length} active offers</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="discount">Highest Discount</option>
              <option value="price">Lowest Price</option>
              <option value="ending_soon">Ending Soon</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No deals found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your filters or check back later for new deals!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => (
              <div
                key={deal.item_id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all border-2 border-transparent hover:border-black dark:hover:border-white"
              >
                {/* Discount Badge */}
                <div className="relative">
                  <div className="absolute top-4 right-4 z-10">
                    <div className={`px-4 py-2 rounded-full font-bold text-white shadow-lg ${
                      deal.discount_percentage >= 50 ? 'bg-black' :
                      deal.discount_percentage >= 30 ? 'bg-neutral-800' :
                      'bg-neutral-600'
                    }`}>
                      {deal.discount_percentage}% OFF
                    </div>
                  </div>
                  
                  {/* Urgency Badge */}
                  {deal.ends_in_days <= 2 && (
                    <div className="absolute top-4 left-4 z-10">
                      <div className="px-3 py-1 bg-black bg-opacity-75 text-white rounded-full text-xs font-bold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {deal.ends_in_days === 0 ? 'Ends Today!' : `${deal.ends_in_days}d left`}
                      </div>
                    </div>
                  )}

                  {/* Placeholder Image */}
                  <div className="h-48 bg-neutral-100 dark:bg-neutral-900/50 flex items-center justify-center">
                    <Tag className="h-20 w-20 text-neutral-400 dark:text-neutral-600" />
                  </div>
                </div>

                {/* Deal Info */}
                <div className="p-5">
                  <div className="mb-3">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                      {deal.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {deal.item_name}
                  </h3>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-neutral-900 dark:text-white">
                      ₹{deal.discounted_price}
                    </span>
                    <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                      ₹{deal.original_price}
                    </span>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-900/20 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 mb-3">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-300">
                      You Save: ₹{deal.savings}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>{deal.reason}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Offer ends in {deal.ends_in_days} day{deal.ends_in_days !== 1 ? 's' : ''}</span>
                    </div>
                    {deal.stock_qty <= 10 && (
                      <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200 font-semibold px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md inline-flex">
                        <AlertCircle className="h-4 w-4" />
                        <span>Only {deal.stock_qty} left!</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleDealClick(deal)}
                    className="w-full mt-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-3 rounded-lg font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-md"
                  >
                    Grab This Deal!
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-neutral-900 text-white py-8 px-4 mt-12 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-2">Why These Deals?</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            These items are nearing expiry or need to be cleared quickly. 
            The shop offers massive discounts to avoid waste - you get amazing prices, 
            they avoid losses. It's a win-win!
          </p>
        </div>
      </div>

      {/* Quantity Modal */}
      {showQuantityModal && selectedDeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="h-6 w-6 text-neutral-900 dark:text-white" />
                Grab This Deal!
              </h3>
              <button
                onClick={() => setShowQuantityModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Deal Info */}
            <div className="mb-6">
              <div className="bg-neutral-50 dark:bg-neutral-900/40 rounded-lg p-4 mb-4 border border-neutral-200 dark:border-neutral-800">
                <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                  {selectedDeal.item_name}
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                    ₹{selectedDeal.discounted_price}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                    ₹{selectedDeal.original_price}
                  </span>
                  <span className="px-2 py-1 bg-neutral-900 text-white rounded-full text-xs font-bold">
                    {selectedDeal.discount_percentage}% OFF
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You save ₹{selectedDeal.savings} per item
                </p>
              </div>

              {/* Stock Info */}
              <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-neutral-800 font-medium">
                  Available Stock: {selectedDeal.stock_qty} items
                </p>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  How many do you want?
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedDeal.stock_qty}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg text-lg font-semibold text-center bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                />
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setQuantity(Math.min(selectedDeal.stock_qty, quantity + 1))}
                    className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="mt-4 bg-neutral-100 border border-neutral-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-neutral-600">Quantity:</span>
                  <span className="font-semibold text-neutral-900">{quantity}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-neutral-600">Price per item:</span>
                  <span className="font-semibold text-neutral-900">₹{selectedDeal.discounted_price}</span>
                </div>
                <div className="border-t border-neutral-200 dark:border-neutral-800 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white">Total:</span>
                    <span className="text-2xl font-bold text-black dark:text-white">
                      ₹{(selectedDeal.discounted_price * quantity).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    Total savings: ₹{(selectedDeal.savings * quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuantityModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGrabDeal}
                disabled={sendingRequest}
                className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold hover:bg-neutral-900 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingRequest ? 'Sending...' : 'Send Request'}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              Your request will be sent to the retailer for confirmation
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotDeals;
