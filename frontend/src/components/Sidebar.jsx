import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Brain,
  Truck,
  BarChart3,
  MessageSquare,
  Tag,
  TrendingDown
} from 'lucide-react';

/**
 * Sidebar Component
 * Navigation menu on the left side with indigo color scheme
 */
const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const menu = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.sales'), href: '/dashboard/sales', icon: ShoppingCart },
    { name: t('nav.expenses'), href: '/dashboard/expenses', icon: Receipt },
    { name: t('nav.inventory'), href: '/dashboard/inventory', icon: Package },
    { name: t('nav.customers'), href: '/dashboard/customers', icon: Users },
    { name: 'Discount Campaigns', href: '/dashboard/discount-campaigns', icon: TrendingDown },
    { name: 'Wholesalers', href: '/dashboard/wholesalers', icon: Truck },
    { name: t('nav.aiInsights'), href: '/dashboard/ai', icon: Brain },
    { name: t('nav.analytics'), href: '/dashboard/analytics', icon: BarChart3 },
  ];

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Sidebar header */}
      <NavLink to="/dashboard" className="p-5 text-2xl font-bold text-black dark:text-white border-b border-gray-200 dark:border-gray-800 block hover:opacity-80 transition-opacity">
        {t('nav.appName')}
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {menu.map((item) => {
          const Icon = item.icon;
          // Only match exact path for dashboard, allow partial match for others
          const isExactMatch = item.href === '/dashboard';
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={isExactMatch}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  onClose();
                }
              }}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-colors text-left ${isActive
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold'
                  : 'text-gray-600 dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
