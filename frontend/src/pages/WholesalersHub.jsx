import React, { useState } from 'react';
import { Truck, Tag, Package } from 'lucide-react';
import WholesalerDiscovery from './WholesalerDiscovery';
import WholesalerOffers from './WholesalerOffers';
import RetailerWholesalerOrders from './RetailerWholesalerOrders';

/**
 * Wholesalers Hub - Combined page for all wholesaler-related features
 * Tabs: Discovery, Special Offers, My Orders
 */
const WholesalersHub = () => {
    const [activeTab, setActiveTab] = useState('discovery');

    const tabs = [
        { id: 'discovery', name: 'Discover Wholesalers', icon: Truck, color: 'blue' },
        { id: 'offers', name: 'Special Offers', icon: Tag, color: 'green' },
        { id: 'orders', name: 'My Orders', icon: Package, color: 'purple' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    Wholesalers
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Discover wholesalers, browse offers, and manage your orders
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
                <div className="bg-transparent rounded-b-xl">
                    {activeTab === 'discovery' && <WholesalerDiscovery />}
                    {activeTab === 'offers' && <WholesalerOffers />}
                    {activeTab === 'orders' && <RetailerWholesalerOrders />}
                </div>
            </div>
        </div>
    );
};

export default WholesalersHub;
