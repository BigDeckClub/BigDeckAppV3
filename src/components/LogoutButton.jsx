import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LogoutButton() {
  const { logout, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-[var(--text-muted)]">{user?.email}</span>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="px-3 py-2 bg-[var(--muted-surface)] hover:bg-slate-600 text-white rounded flex items-center gap-2 transition disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
        {loading ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
}
