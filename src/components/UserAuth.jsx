import React, { useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Validates that a URL is a safe image URL (https or relative)
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * User authentication button component
 * Shows login button when not authenticated, user info + logout when authenticated
 */
export function UserAuth() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [imageError, setImageError] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={login}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors"
      >
        <LogIn className="w-4 h-4" />
        <span>Sign In</span>
      </button>
    );
  }

  const showDefaultAvatar = !user.profileImage || imageError || !isValidImageUrl(user.profileImage);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {!showDefaultAvatar ? (
          <img
            src={user.profileImage}
            alt={user.firstName || user.email || 'User avatar'}
            className="w-8 h-8 rounded-full"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-400" />
          </div>
        )}
        <span className="text-sm text-slate-300 hidden sm:inline">
          {user.firstName || user.email}
        </span>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        title="Sign out"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
}

export default UserAuth;
