import React, { useState } from 'react';
import { Menu, Bell, Search, LogOut, Globe, Moon, Sun, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';

/**
 * Header Component
 * Top navigation bar with user controls and notifications
 */
const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'te', name: 'తెలుగు' }
  ];
  
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleProfileSettings = () => {
    navigate('/dashboard/profile-settings');
    setShowUserMenu(false);
  };

  return (
    <header className="sticky top-0 bg-white dark:bg-black shadow-sm border-b border-gray-200 dark:border-gray-800 z-20 transition-colors duration-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Left section - Mobile & Desktop menu button */}
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">Toggle sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* Center - Search bar */}
          <div className="flex-1 max-w-lg mx-4 hidden md:block">
            <div className="relative">
              {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search business data..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              /> */}
            </div>
          </div>

          {/* Right section - Theme, Language, Notifications and Profile */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 dark:text-white dark:hover:text-white transition-colors duration-200"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-6 w-6" />
              ) : (
                <Moon className="h-6 w-6" />
              )}
            </button>
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 dark:text-white dark:hover:text-white transition-colors duration-200"
                title="Change Language"
              >
                <Globe className="h-6 w-6" />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-800">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        i18n.language === lang.code ? 'bg-black text-white dark:bg-white dark:text-black font-bold' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Notifications */}
            <NotificationBell />

            {/* Profile dropdown */}
            <div className="relative">
              <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group" onClick={() => setShowUserMenu(!showUserMenu)}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black dark:bg-white text-white dark:text-black dark:text-black flex items-center justify-center font-bold text-sm sm:text-base group-hover:scale-105 transition-transform">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-bold text-black dark:text-white group-hover:text-neutral-600 transition-colors">{user?.name || 'Business Owner'}</p>
                  <p className="text-xs text-neutral-500 font-medium">{user?.phone || 'Phone'}</p>
                </div>
              </div>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl py-1 z-50 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                    <p className="text-sm font-bold text-black dark:text-white">{user?.name || 'Business Owner'}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 mt-1">{user?.shop_name || 'Smart Kirana Shop'}</p>
                  </div>
                  <button
                    onClick={handleProfileSettings}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t('common.profileSettings', 'Profile Settings')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('common.signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
