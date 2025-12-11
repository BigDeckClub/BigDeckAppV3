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
        className="p-2.5 rounded-lg bg-[var(--bda-surface)] hover:bg-[var(--bda-primary)] transition-all duration-300 text-[var(--bda-muted)] hover:text-[var(--bda-primary-foreground)] shadow-md border border-[var(--bda-border)]"
        title={user?.email}
      >
        <User className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-[var(--bda-surface)] border border-[var(--bda-border)] rounded-xl shadow-2xl z-50 backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-[var(--bda-border)] text-sm text-[var(--bda-muted)] bg-[var(--card-hover)]">
            <div className="text-xs text-[var(--bda-muted)] mb-1">Account</div>
            <div className="font-medium text-[var(--bda-primary)] truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleSettings}
            className={`w-full px-4 py-3 text-left flex items-center gap-2 transition-all duration-200 group border-t border-[var(--bda-border)] ${
              activeTab === 'settings' 
                ? 'bg-[var(--bda-primary)]/20 text-[var(--bda-primary)]' 
                : 'text-[var(--bda-muted)] hover:bg-[var(--bda-primary)]/20 hover:text-[var(--bda-primary)]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium">Settings</span>
          </button>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full px-4 py-3 text-left text-red-500 hover:bg-red-600/20 hover:text-red-400 flex items-center gap-2 transition-all duration-200 disabled:opacity-50 group border-t border-[var(--bda-border)]"
          >
            <LogOut className="w-4 h-4 group-hover:animate-pulse" />
            <span className="font-medium">{loading ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
