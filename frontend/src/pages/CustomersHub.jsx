import React, { useState } from 'react';
import { Users, MessageSquare } from 'lucide-react';
import Customers from './Customers';
import CustomerRequestsPage from './CustomerRequestsPage';

/**
 * Customers Hub - Combined page for all customer-related features
 * Tabs: Customers List, Customer Requests
 */
const CustomersHub = () => {
    const [activeTab, setActiveTab] = useState('customers');

    const tabs = [
        { id: 'customers', name: 'Customers List', icon: Users, color: 'indigo' },
        { id: 'requests', name: 'Customer Requests', icon: MessageSquare, color: 'orange' }
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    Customers
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Manage your customers and their requests
                </p>
            </div>

            {/* Enhanced Tabs */}
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
                <div className="p-2">
                    <nav className="flex gap-2 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                    flex items-center gap-3 px-6 py-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap min-w-fit
                    ${isActive
                                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-md scale-105'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-black dark:hover:text-white'
                                        }
                  `}
                                >
                                    <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                                    <span>{tab.name}</span>
                                    {isActive && (
                                        <span className="ml-2 px-2 py-0.5 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black text-xs rounded-full border border-neutral-600">
                                            Active
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content with better spacing */}
                <div className="bg-transparent rounded-b-xl p-3 sm:p-4">
                    {activeTab === 'customers' && <Customers />}
                    {activeTab === 'requests' && <CustomerRequestsPage />}
                </div>
            </div>
        </div>
    );
};

export default CustomersHub;
