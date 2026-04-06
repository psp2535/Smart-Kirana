import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Eye, CheckCircle, AlertCircle, X, UserCheck, Star, RefreshCw, Zap, Cpu, Volume2, PlusCircle, Camera } from 'lucide-react';
import CameraScanner from '../components/CameraScanner';
import { salesAPI, inventoryAPI, customersAPI } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { useTranslation } from 'react-i18next';

const Sales = () => {
    const { t } = useTranslation();
    const [sales, setSales] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editingSale, setEditingSale] = useState(null);
    const [viewingSale, setViewingSale] = useState(null);
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All'); // New: Date filter
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [itemsToShow, setItemsToShow] = useState(15); // Show 15 items initially
    const [todaysSales, setTodaysSales] = useState({
        totalRevenue: 0,
        salesCount: 0,
        totalItems: 0
    });
    const [customerInsights, setCustomerInsights] = useState(null);
    const [isInsightsLoading, setIsInsightsLoading] = useState(false);
    const [showInsightsPanel, setShowInsightsPanel] = useState(false);
    const [enableVoice, setEnableVoice] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [formData, setFormData] = useState({
        items: [{ item_name: '', quantity: 1, price_per_unit: 0 }],
        payment_method: 'Cash',
        customer_phone: '',
        customer_name: ''
    });

    useEffect(() => {
        fetchSales();
        fetchTodaysSales();
        fetchInventory();
    }, []);

    const fetchSales = async () => {
        try {
            setLoading(true);
            // Get recent sales (last 30 days)
            const response = await salesAPI.getSales({ 
                limit: 1000
            });
            if (response.success) {
                setSales(response.data);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTodaysSales = async () => {
        try {
            const response = await salesAPI.getTodaysSales();
            if (response.success) {
                setTodaysSales(response.data);
            }
        } catch (error) {
            console.error('Error fetching today\'s sales:', error);
        }
    };

    const fetchInventory = async () => {
        try {
            const response = await inventoryAPI.getInventory({ limit: 1000 }); // Request up to 1000 items
            if (response.success) {
                // Filter only items with stock > 0
                const availableItems = response.data.filter(item => item.stock_qty > 0);
                setInventory(availableItems);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            toast.error('Failed to load inventory');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate all items have valid quantities
        const invalidItems = formData.items.filter(item => {
            // Check if quantity is empty or invalid
            if (item.quantity === '' || item.quantity === null || item.quantity === undefined) {
                return true;
            }
            const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
            return isNaN(qty) || qty <= 0;
        });
        
        if (invalidItems.length > 0) {
            toast.error('Please enter valid quantities for all items (must be greater than 0)', {
                duration: 4000,
                position: 'top-right',
            });
            return;
        }
        
        // Ensure quantities are numbers before sending (convert and validate)
        const sanitizedFormData = {
            ...formData,
            items: formData.items.map(item => {
                const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
                const price = typeof item.price_per_unit === 'string' ? parseFloat(item.price_per_unit) : item.price_per_unit;
                
                return {
                    ...item,
                    quantity: Number(qty.toFixed(3)), // Normalize to 3 decimals
                    price_per_unit: Number(price.toFixed(2)) // Normalize to 2 decimals
                };
            })
        };
        
        try {
            if (editingSale) {
                await salesAPI.updateSale(editingSale._id, sanitizedFormData);
                toast.success(t('sales.toast.updated'), {
                    duration: 4000,
                    position: 'top-right',
                });
            } else {
                await salesAPI.createSale(sanitizedFormData);
                toast.success(t('sales.toast.created'), {
                    duration: 4000,
                    position: 'top-right',
                    icon: '✅',
                });
            }
            setShowModal(false);
            setEditingSale(null);
            setFormData({
                items: [{ item_name: '', quantity: 1, price_per_unit: 0 }],
                payment_method: 'Cash',
                customer_phone: '',
                customer_name: ''
            });
            fetchSales();
            fetchTodaysSales();
            fetchInventory(); // Refresh inventory after sale
        } catch (error) {
            console.error('Error saving sale:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to create sale';
            toast.error(errorMessage, {
                duration: 5000,
                position: 'top-right',
                icon: '❌',
            });
        }
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { item_name: '', quantity: 1, price_per_unit: 0 }]
        });
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            setFormData({
                ...formData,
                items: formData.items.filter((_, i) => i !== index)
            });
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...formData.items];
        
        // If item name is changed, auto-fill the price
        if (field === 'item_name') {
            const selectedItem = inventory.find(item => item.item_name === value);
            if (selectedItem) {
                newItems[index].item_name = value;
                newItems[index].price_per_unit = selectedItem.price_per_unit;
                newItems[index].quantity = 1; // Reset quantity to 1
            }
        } else {
            newItems[index][field] = value;
        }
        
        setFormData({ ...formData, items: newItems });
    };

    // Get available quantity for selected item
    const getAvailableQuantity = (itemName) => {
        const item = inventory.find(inv => inv.item_name === itemName);
        return item ? item.stock_qty : 0;
    };

    const fetchCustomerInsights = async (phone) => {
        if (!phone || phone.length < 10) {
            setCustomerInsights(null);
            setShowInsightsPanel(false);
            return;
        }
        try {
            setIsInsightsLoading(true);
            setShowInsightsPanel(true);
            const response = await customersAPI.getInsights(phone);
            if (response.success && response.data) {
                setCustomerInsights(response.data);
                if (enableVoice && response.data.memory_score > 30 && response.data.name !== 'New Customer') {
                    try {
                        const categories = response.data.bought_often.slice(0,2).map(i => i.item_name).join(' and ');
                        const msg = new SpeechSynthesisUtterance(`Customer recognized: ${response.data.name}.`);
                        window.speechSynthesis.speak(msg);
                    } catch(err) {}
                }
            } else {
                setCustomerInsights({ name: 'New Customer', phone: phone, memory_score: 0, bought_often: [], due_for_refill: [], try_this: [], combos: [] });
            }
        } catch (error) {
            setCustomerInsights({ name: 'New Customer', phone: phone, memory_score: 0, bought_often: [], due_for_refill: [], try_this: [], combos: [] });
        } finally {
            setIsInsightsLoading(false);
        }
    };

    const handlePhoneChange = (e) => {
        const val = e.target.value;
        setFormData({ ...formData, customer_phone: val });
        if (val.length >= 10) {
             fetchCustomerInsights(val);
        } else {
             setCustomerInsights(null);
             setShowInsightsPanel(false);
        }
    };

    const addItemFromInsight = (insightItem) => {
        const newItem = {
            item_name: insightItem.item_name,
            quantity: 1, 
            price_per_unit: insightItem.price || 0
        };
        let currentItems = [...formData.items];
        if (currentItems.length === 1 && !currentItems[0].item_name) {
            setFormData({ ...formData, items: [newItem] });
            return;
        }
        const existingIndex = currentItems.findIndex(i => i.item_name === insightItem.item_name);
        if (existingIndex >= 0) {
            currentItems[existingIndex].quantity += 1;
            setFormData({ ...formData, items: currentItems });
        } else {
            setFormData({ ...formData, items: [...currentItems, newItem] });
        }
    };

    // Handle item scanned via camera — add to current bill
    const handleScanItem = useCallback((inventoryItem) => {
        const newItem = {
            item_name: inventoryItem.item_name,
            quantity: 1,
            price_per_unit: inventoryItem.price_per_unit || inventoryItem.selling_price || 0,
        };
        setFormData(prev => {
            const currentItems = [...prev.items];
            // Replace empty first row if it's blank
            if (currentItems.length === 1 && !currentItems[0].item_name) {
                return { ...prev, items: [newItem] };
            }
            // Increment qty if already in cart
            const idx = currentItems.findIndex(i => i.item_name === inventoryItem.item_name);
            if (idx >= 0) {
                currentItems[idx] = { ...currentItems[idx], quantity: currentItems[idx].quantity + 1 };
                return { ...prev, items: currentItems };
            }
            return { ...prev, items: [...currentItems, newItem] };
        });
        // Make sure sale modal is open
        setShowModal(true);
    }, []);

    const calculateTotal = () => {
        return formData.items.reduce((total, item) => {
            const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
            const price = typeof item.price_per_unit === 'string' ? parseFloat(item.price_per_unit) : item.price_per_unit;
            
            if (!qty || !price || isNaN(qty) || isNaN(price)) return total;
            
            return total + (qty * price);
        }, 0);
    };

    // Filter sales by payment method and date
    const getFilteredSales = () => {
        let filtered = sales;
        
        // Payment filter
        if (paymentFilter !== 'All') {
            filtered = filtered.filter(sale => sale.payment_method === paymentFilter);
        }
        
        // Date filter
        if (dateFilter !== 'All') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(sale => {
                const saleDate = new Date(sale.createdAt);
                
                switch (dateFilter) {
                    case 'Today':
                        return saleDate >= today;
                    case 'Last 7 Days':
                        const last7Days = new Date(today);
                        last7Days.setDate(last7Days.getDate() - 7);
                        return saleDate >= last7Days;
                    case 'Last 30 Days':
                        const last30Days = new Date(today);
                        last30Days.setDate(last30Days.getDate() - 30);
                        return saleDate >= last30Days;
                    case 'This Month':
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        return saleDate >= startOfMonth;
                    case 'Custom':
                        if (customStartDate && customEndDate) {
                            const start = new Date(customStartDate);
                            const end = new Date(customEndDate);
                            end.setHours(23, 59, 59, 999);
                            return saleDate >= start && saleDate <= end;
                        }
                        return true;
                    default:
                        return true;
                }
            });
        }
        
        return filtered;
    };

    const filteredSales = getFilteredSales();

    // View sale details
    const handleView = (sale) => {
        setViewingSale(sale);
        setShowViewModal(true);
    };

    // Edit sale
    const handleEdit = (sale) => {
        setEditingSale(sale);
        setFormData({
            items: sale.items || [{ item_name: '', quantity: 1, price_per_unit: 0 }],
            payment_method: sale.payment_method || 'Cash',
            customer_phone: sale.customer_phone || '',
            customer_name: sale.customer_name || ''
        });
        setShowModal(true);
    };

    // Delete sale
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
            try {
                await salesAPI.deleteSale(id);
                toast.success(t('sales.toast.deleted'), {
                    position: 'top-right',
                    duration: 3000,
                });
                fetchSales();
                fetchTodaysSales();
                fetchInventory();
            } catch (error) {
                console.error('Error deleting sale:', error);
                toast.error(t('sales.toast.error'), {
                    position: 'top-right',
                    duration: 4000,
                });
            }
        }
    };

    // Download Invoice/Bill for Customer
    const downloadInvoice = async (sale) => {
        try {
            toast.loading(t('sales.toast.generatingInvoice'), { id: 'invoice' });

            const invoiceElement = document.createElement('div');
            invoiceElement.style.padding = '40px';
            invoiceElement.style.fontFamily = 'Arial, sans-serif';
            invoiceElement.style.backgroundColor = '#ffffff';

            // Calculate total from items if total_amount is not available
            const calculatedTotal = sale.items.reduce((sum, item) => {
                return sum + ((item.quantity || 0) * (item.price_per_unit || 0));
            }, 0);
            const totalAmount = sale.total_amount || calculatedTotal;

            // Get current user/shop details (you can customize this)
            const shopName = localStorage.getItem('shopName') || 'Biznova';
            const saleDate = new Date(sale.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            const saleTime = new Date(sale.createdAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            invoiceElement.innerHTML = `
                <div style="max-width: 600px; margin: 0 auto;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000000; padding-bottom: 15px;">
                        <h1 style="color: #000000; font-size: 28px; margin: 0 0 5px 0;">BILL</h1>
                        <p style="color: #666; font-size: 16px; margin: 0;">${shopName}</p>
                    </div>

                    <!-- Bill Info -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <p style="margin: 3px 0; color: #666;">
                                <strong style="color: #111;">Bill No:</strong> #${sale._id.substring(0, 8).toUpperCase()}
                            </p>
                            <p style="margin: 3px 0; color: #666;">
                                <strong style="color: #111;">Date:</strong> ${saleDate}
                            </p>
                        </div>
                        <div style="text-align: right;">
                            ${sale.customer_name ? `
                                <p style="margin: 3px 0; color: #666;">
                                    <strong style="color: #111;">Customer:</strong> ${sale.customer_name}
                                </p>
                            ` : ''}
                            <p style="margin: 3px 0; color: #666;">
                                <strong style="color: #111;">Payment:</strong> ${sale.payment_method}
                            </p>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background-color: #F3F4F6;">
                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #4F46E5;">Item</th>
                                <th style="padding: 8px; text-align: center; border-bottom: 1px solid #4F46E5;">Qty</th>
                                <th style="padding: 8px; text-align: right; border-bottom: 1px solid #4F46E5;">Price</th>
                                <th style="padding: 8px; text-align: right; border-bottom: 1px solid #4F46E5;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sale.items.map((item, index) => `
                                <tr style="border-bottom: 1px solid #E5E7EB;">
                                    <td style="padding: 8px;">${item.item_name}</td>
                                    <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                                    <td style="padding: 8px; text-align: right;">₹${(item.price_per_unit || 0).toFixed(2)}</td>
                                    <td style="padding: 8px; text-align: right;">₹${((item.quantity || 0) * (item.price_per_unit || 0)).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <!-- Total Row -->
                            <tr style="background-color: #F3F4F6; border-top: 2px solid #000000;">
                                <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; color: #111;">TOTAL</td>
                                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #000000;">₹${totalAmount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Footer -->
                    <div style="text-align: center; padding-top: 15px; border-top: 1px solid #E5E7EB;">
                        <p style="margin: 0; color: #999; font-size: 11px;">Thank you for your business!</p>
                    </div>
                </div>
            `;

            const opt = {
                margin: [5, 5, 5, 5],
                filename: `Bill_${sale._id.substring(0, 8).toUpperCase()}_${saleDate.replace(/\s/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a5', 
                    orientation: 'portrait' 
                }
            };

            await html2pdf().set(opt).from(invoiceElement).save();
            
            toast.success(t('sales.toast.downloaded'), { 
                id: 'invoice',
                duration: 3000 
            });
        } catch (error) {
            console.error('Error generating invoice:', error);
            toast.error(t('sales.toast.error'), { 
                id: 'invoice',
                duration: 3000 
            });
        }
    };

    // Export to PDF
    const exportSalesToPDF = () => {
        const element = document.createElement('div');
        element.style.padding = '20px';
        element.style.fontFamily = 'Arial, sans-serif';
        
        const now = new Date().toLocaleDateString();
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        
        element.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #000000; margin-bottom: 10px;">Sales Report</h1>
                <p style="color: #666;">Generated on: ${now}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Total Sales:</strong></td>
                        <td style="padding: 10px;">${filteredSales.length}</td>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Total Revenue:</strong></td>
                        <td style="padding: 10px;">₹${totalRevenue.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background: #F3F4F6;"><strong>Payment Filter:</strong></td>
                        <td colspan="3" style="padding: 10px;">${paymentFilter !== 'All' ? paymentFilter : 'All Payment Methods'}</td>
                    </tr>
                </table>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #000000; color: white;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Date</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Customer</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Items</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Payment</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredSales.map((sale, index) => `
                        <tr style="background: ${index % 2 === 0 ? '#F9FAFB' : 'white'};">
                            <td style="padding: 10px; border: 1px solid #ddd;">${new Date(sale.createdAt).toLocaleDateString()}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${sale.customer_name || 'Walk-in Customer'}</td>
                            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${sale.items?.length || 0}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${sale.payment_method}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${(sale.total_amount || 0).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E5E7EB; text-align: center; color: #666;">
                <p>This report was auto-generated by Biznova Sales Management System</p>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `sales-report-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
        toast.success('PDF exported successfully!', {
            position: 'top-right',
            duration: 3000,
        });
    };

    return (
        <div className="space-y-6">
            <Toaster 
                position="top-right"
                toastOptions={{
                    duration: 10000,
                }}
            />
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('sales.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('sales.subtitle')}</p>
                </div>
                <button
                    onClick={() => {
                        if (inventory.length === 0) {
                            toast.error(t('sales.toast.noInventory'), {
                                duration: 4000,
                                position: 'top-right',
                            });
                        } else {
                            setShowModal(true);
                        }
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    {t('sales.newSale')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sales (All Time)</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{sales.reduce((sum, sale) => sum + sale.total_amount, 0).toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            <Plus className="h-6 w-6 text-black dark:text-white" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('sales.todaysSales')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{todaysSales.totalRevenue?.toLocaleString() || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{todaysSales.salesCount || 0} {t('sales.transactions')}</p>
                        </div>
                        <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                            <Plus className="h-6 w-6 text-black dark:text-white" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{sales.length}</p>
                        </div>
                        <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                            <Plus className="h-6 w-6 text-black dark:text-white" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('sales.avgOrderValue')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{sales.length > 0 ? Math.round(sales.reduce((sum, sale) => sum + sale.total_amount, 0) / sales.length) : 0}</p>
                        </div>
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            <Plus className="h-6 w-6 text-black dark:text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sales</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowFilterModal(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Filter
                            {(paymentFilter !== 'All' || dateFilter !== 'All') && (
                                <span className="ml-1 px-2 py-0.5 text-xs bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white rounded-full">
                                    Active
                                </span>
                            )}
                        </button>
                        <button 
                            onClick={exportSalesToPDF}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export PDF
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white mx-auto"></div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">{t('sales.noSales')}</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary mt-4"
                        >
                            {t('sales.createFirstSale')}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredSales.slice(0, itemsToShow).map((sale) => (
                                    <tr key={sale._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {new Date(sale.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {sale.customer_name || 'Walk-in Customer'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {sale.items?.length || 0} item(s)
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black dark:text-white">
                                            ₹{sale.total_amount?.toLocaleString() || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {sale.payment_method}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleView(sale)}
                                                    className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => downloadInvoice(sale)}
                                                    className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                                                    title="Download Invoice"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(sale)}
                                                    className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                                                    title="Edit Sale"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(sale._id)}
                                                    className="text-neutral-400 hover:text-neutral-900 transition-colors"
                                                    title="Delete Sale"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Load More Button */}
                    {filteredSales.length > itemsToShow && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setItemsToShow(prev => prev + 15)}
                                className="btn-secondary inline-flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Load More ({filteredSales.length - itemsToShow} remaining)
                            </button>
                        </div>
                    )}
                    
                    {/* Show All Button (if more than 30 items) */}
                    {filteredSales.length > 30 && itemsToShow < filteredSales.length && (
                        <div className="mt-2 text-center">
                            <button
                                onClick={() => setItemsToShow(filteredSales.length)}
                                className="text-sm text-black dark:text-white hover:text-black dark:text-white"
                            >
                                Show All {filteredSales.length} Items
                            </button>
                        </div>
                    )}
                </>
            )}
            </div>

            {/* Camera Scanner Modal */}
            {showScanner && (
                <CameraScanner
                    inventory={inventory}
                    onItemScanned={handleScanItem}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Sale Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className={`relative top-5 mx-auto p-5 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md bg-white dark:bg-gray-800 transition-all duration-300 max-h-[95vh] overflow-y-auto ${showInsightsPanel ? 'w-11/12 lg:w-[95%] xl:w-[90%]' : 'w-11/12 md:w-3/4 lg:w-1/2'}`}>
                        <div className="mt-3 flex flex-col lg:flex-row gap-8">
                            <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    {editingSale ? 'Edit Sale' : 'New Sale'}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {/* Camera Scanner button */}
                                    {!editingSale && (
                                        <button
                                            type="button"
                                            onClick={() => setShowScanner(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all"
                                            title="Scan barcode to add item"
                                        >
                                            <Camera className="h-3.5 w-3.5" />
                                            Scan
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingSale(null);
                                            setCustomerInsights(null);
                                            setShowInsightsPanel(false);
                                            setFormData({
                                                items: [{ item_name: '', quantity: 1, price_per_unit: 0 }],
                                                payment_method: 'Cash',
                                                customer_phone: '',
                                                customer_name: ''
                                            });
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Customer Information */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white">Customer Name</label>
                                        <input
                                            type="text"
                                            value={formData.customer_name}
                                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                            className="input-field"
                                            placeholder="Customer name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white">Customer Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.customer_phone}
                                            onChange={handlePhoneChange}
                                            className="input-field"
                                            placeholder="Phone number"
                                        />
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white">Items</label>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="text-sm text-black dark:text-white hover:text-black dark:text-white"
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                                            <div className="col-span-5">
                                                <select
                                                    value={item.item_name}
                                                    onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                                    className="input-field"
                                                    required
                                                >
                                                    <option value="">Select item...</option>
                                                    {inventory.map((invItem) => (
                                                        <option key={invItem._id} value={invItem.item_name}>
                                                            {invItem.item_name} (Stock: {invItem.stock_qty} {invItem.unit || ''})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        // Allow empty string during typing, otherwise parse as number
                                                        if (value === '') {
                                                            updateItem(index, 'quantity', '');
                                                        } else {
                                                            const qty = parseFloat(value);
                                                            updateItem(index, 'quantity', isNaN(qty) ? '' : qty);
                                                        }
                                                    }}
                                                    className="input-field"
                                                    placeholder="Qty"
                                                    min="0.001"
                                                    step="0.001"
                                                    required
                                                    disabled={!item.item_name}
                                                />
                                                {item.item_name && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Available: {getAvailableQuantity(item.item_name)} {inventory.find(inv => inv.item_name === item.item_name)?.unit || ''}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    value={item.price_per_unit}
                                                    onChange={(e) => updateItem(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                                                    className="input-field"
                                                    placeholder="Selling Price"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    ₹{(() => {
                                                        const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
                                                        const price = typeof item.price_per_unit === 'string' ? parseFloat(item.price_per_unit) : item.price_per_unit;
                                                        if (!qty || !price || isNaN(qty) || isNaN(price)) return '0';
                                                        return (qty * price).toLocaleString();
                                                    })()}
                                                </span>
                                            </div>
                                            <div className="col-span-1">
                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-white">Payment Method</label>
                                    <select
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Credit">Credit</option>
                                    </select>
                                </div>

                                {/* Total Summary */}
                                <div className="bg-black dark:bg-white text-white dark:text-black dark:text-black   p-4 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-medium text-gray-900 dark:text-gray-100">Total Amount:</span>
                                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">₹{calculateTotal().toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingSale(null);
                                            setCustomerInsights(null);
                                            setShowInsightsPanel(false);
                                        }}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingSale ? 'Update Sale' : 'Create Sale'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        {/* Right Panel - Customer Intelligence */}
                        {showInsightsPanel && (
                            <div className="lg:w-[45%] xl:w-[40%] border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 pt-6 lg:pt-0 lg:pl-8 flex flex-col relative animate-fade-in">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Cpu className="h-5 w-5 text-indigo-500" />
                                        Customer Intelligence
                                    </h3>
                                    <button type="button" onClick={() => setEnableVoice(!enableVoice)} className={`p-2 rounded-full transition-colors ${enableVoice ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                                        <Volume2 className="h-4 w-4" />
                                    </button>
                                </div>
                                
                                {isInsightsLoading ? (
                                    <div className="flex flex-col items-center justify-center p-12 h-full text-gray-500">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                                        <p>Running Neural Heuristics...</p>
                                    </div>
                                ) : customerInsights && (
                                    <div className="space-y-6 mt-4 overflow-y-auto pb-8 pr-2 custom-scrollbar">
                                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-20"><UserCheck className="h-24 w-24" /></div>
                                            <div className="relative z-10">
                                                <h4 className="text-xl font-bold mb-1">{customerInsights.name}</h4>
                                                <p className="text-indigo-100 text-sm mb-4">{customerInsights.phone}</p>
                                                
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-xs text-indigo-200 uppercase tracking-wider">Total Spend</p>
                                                        <p className="text-2xl font-bold">₹{customerInsights.total_spend?.toLocaleString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-indigo-200 uppercase tracking-wider mb-1">Memory Score</p>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-16 bg-white/20 rounded-full h-2">
                                                                <div className="bg-green-400 h-2 rounded-full" style={{width: `${customerInsights.memory_score}%`}}></div>
                                                            </div>
                                                            <span className="font-bold">{customerInsights.memory_score}/100</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-5">
                                            {customerInsights.due_for_refill?.length > 0 && (
                                                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-4 border border-red-100 dark:border-red-900/30">
                                                    <h5 className="text-sm font-bold text-red-800 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <RefreshCw className="h-4 w-4" /> Due for Refill
                                                    </h5>
                                                    <div className="space-y-2">
                                                        {customerInsights.due_for_refill.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2.5 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
                                                                <div className="flex-1 min-w-0 pr-2">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.item_name}</p>
                                                                    <p className="text-xs text-red-600 dark:text-red-400">{item.days_overdue} days overdue • ₹{item.price}</p>
                                                                </div>
                                                                <button type="button" onClick={() => addItemFromInsight(item)} className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 transition-colors">
                                                                    <PlusCircle className="h-5 w-5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {customerInsights.bought_often?.length > 0 && (
                                                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
                                                    <h5 className="text-sm font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <Zap className="h-4 w-4" /> Bought Often
                                                    </h5>
                                                    <div className="space-y-2">
                                                        {customerInsights.bought_often.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2.5 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
                                                                <div className="flex-1 min-w-0 pr-2">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.item_name}</p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.frequency} times • ₹{item.price}</p>
                                                                </div>
                                                                <button type="button" onClick={() => addItemFromInsight(item)} className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 transition-colors">
                                                                    <PlusCircle className="h-5 w-5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {customerInsights.combos?.length > 0 && (
                                                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-100 dark:border-amber-900/30">
                                                        <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                            <Zap className="h-3.5 w-3.5" /> Freq. Combo
                                                        </h5>
                                                        <div className="space-y-2">
                                                            {customerInsights.combos.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between items-center">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{item.item_name}</p>
                                                                        <div className="flex gap-2 items-center">
                                                                            <p className="text-[10px] text-gray-500">₹{item.price}</p>
                                                                            {item.bought_with && <p className="text-[9px] text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-1 rounded truncate max-w-[120px]">w/ {item.bought_with}</p>}
                                                                        </div>
                                                                    </div>
                                                                    <button type="button" onClick={() => addItemFromInsight(item)} className="text-indigo-600 hover:text-indigo-800">
                                                                        <PlusCircle className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {customerInsights.try_this?.length > 0 && (
                                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30">
                                                        <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                            <Star className="h-3.5 w-3.5" /> Premium Picks
                                                        </h5>
                                                        <div className="space-y-2">
                                                            {customerInsights.try_this.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between items-center">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{item.item_name}</p>
                                                                        <div className="flex gap-2 items-center">
                                                                            <p className="text-[10px] text-gray-500">₹{item.price}</p>
                                                                            {item.reason && <p className="text-[9px] text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-1 rounded truncate max-w-[120px]">{item.reason}</p>}
                                                                        </div>
                                                                    </div>
                                                                    <button type="button" onClick={() => addItemFromInsight(item)} className="text-indigo-600 hover:text-indigo-800">
                                                                        <PlusCircle className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}

            {/* Filter Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 md:w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filter Sales</h3>
                                <button
                                    onClick={() => setShowFilterModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Date Range
                                    </label>
                                    <select
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                                    >
                                        <option value="All">All Time</option>
                                        <option value="Today">Today</option>
                                        <option value="Last 7 Days">Last 7 Days</option>
                                        <option value="Last 30 Days">Last 30 Days</option>
                                        <option value="This Month">This Month</option>
                                        <option value="Custom">Custom Range</option>
                                    </select>
                                </div>

                                {dateFilter === 'Custom' && (
                                    <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                value={customStartDate}
                                                onChange={(e) => setCustomStartDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                End Date
                                            </label>
                                            <input
                                                type="date"
                                                value={customEndDate}
                                                onChange={(e) => setCustomEndDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Payment Method
                                    </label>
                                    <select
                                        value={paymentFilter}
                                        onChange={(e) => setPaymentFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                                    >
                                        <option value="All">All Payment Methods</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Card</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Credit">Credit</option>
                                    </select>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        <span className="font-medium">Results:</span> {filteredSales.length} sales
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Total: ₹{filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0).toLocaleString()}
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setPaymentFilter('All');
                                            setDateFilter('All');
                                            setCustomStartDate('');
                                            setCustomEndDate('');
                                            setShowFilterModal(false);
                                        }}
                                        className="flex-1 btn-secondary"
                                    >
                                        Clear Filters
                                    </button>
                                    <button
                                        onClick={() => setShowFilterModal(false)}
                                        className="flex-1 btn-primary"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Sale Modal */}
            {showViewModal && viewingSale && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sale Details</h3>
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setViewingSale(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Date</label>
                                        <p className="text-base text-gray-900">{new Date(viewingSale.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Customer</label>
                                        <p className="text-base text-gray-900">{viewingSale.customer_name || 'Walk-in Customer'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Payment Method</label>
                                        <p className="text-base text-gray-900">{viewingSale.payment_method}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Customer Phone</label>
                                        <p className="text-base text-gray-900">{viewingSale.customer_phone || 'N/A'}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-600 mb-2 block">Items</label>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {viewingSale.items?.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{item.item_name}</td>
                                                        <td className="px-4 py-2 text-sm text-center text-gray-900">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-sm text-right text-gray-900">₹{item.price_per_unit?.toLocaleString()}</td>
                                                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                                                            ₹{(item.quantity * item.price_per_unit)?.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-600">Revenue:</span>
                                        <span className="text-base font-semibold text-green-600">₹{viewingSale.total_amount?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-600">COGS:</span>
                                        <span className="text-base font-semibold text-red-600">₹{viewingSale.total_cogs?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-base font-bold text-gray-900">Gross Profit:</span>
                                        <span className="text-lg font-bold text-black dark:text-white">₹{viewingSale.gross_profit?.toLocaleString() || 0}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setViewingSale(null);
                                    }}
                                    className="w-full btn-secondary"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
