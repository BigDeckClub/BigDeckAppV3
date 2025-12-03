import React, { useState, useRef, useEffect, startTransition } from 'react';
import { LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function UserDropdown({ setActiveTab, activeTab }) {
  const { logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  const handleSettings = () => {
    startTransition(() => setActiveTab('settings'));
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 hover:from-teal-700 hover:to-teal-800 transition-all duration-300 text-slate-300 hover:text-teal-300 shadow-lg shadow-slate-900/50"
        title={user?.email}
      >
        <User className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-slate-900/80 z-50 backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-slate-700/50 text-sm text-slate-300 bg-gradient-to-r from-slate-800/50 to-transparent">
            <div className="text-xs text-slate-500 mb-1">Account</div>
            <div className="font-medium text-teal-300 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleSettings}
            className={`w-full px-4 py-3 text-left flex items-center gap-2 transition-all duration-200 group border-t border-slate-700/50 ${
              activeTab === 'settings' 
                ? 'bg-teal-600/20 text-teal-300' 
                : 'text-slate-300 hover:bg-teal-600/20 hover:text-teal-300'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium">Settings</span>
          </button>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full px-4 py-3 text-left text-red-300 hover:bg-red-600/20 hover:text-red-200 flex items-center gap-2 transition-all duration-200 disabled:opacity-50 group border-t border-slate-700/50"
          >
            <LogOut className="w-4 h-4 group-hover:animate-pulse" />
            <span className="font-medium">{loading ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
