import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMarketplacePreferences } from '../hooks/useMarketplacePreferences';

describe('useMarketplacePreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return tcgplayer as default marketplace when no preference is set', () => {
      const { result } = renderHook(() => useMarketplacePreferences());
      expect(result.current.preferredMarketplace).toBe('tcgplayer');
    });

    it('should return stored marketplace when preference exists', () => {
      localStorage.setItem('preferredMarketplace', 'manapool');
      const { result } = renderHook(() => useMarketplacePreferences());
      expect(result.current.preferredMarketplace).toBe('manapool');
    });

    it('should set rememberPreference to false when no preference exists', () => {
      const { result } = renderHook(() => useMarketplacePreferences());
      expect(result.current.rememberPreference).toBe(false);
    });

    it('should set rememberPreference to true when preference exists in localStorage', () => {
      localStorage.setItem('preferredMarketplace', 'cardkingdom');
      const { result } = renderHook(() => useMarketplacePreferences());
      expect(result.current.rememberPreference).toBe(true);
    });
  });

  describe('setPreferredMarketplace', () => {
    it('should update marketplace without saving when rememberPreference is false', () => {
      const { result } = renderHook(() => useMarketplacePreferences());
      
      act(() => {
        result.current.setPreferredMarketplace('manapool');
      });
      
      expect(result.current.preferredMarketplace).toBe('manapool');
      expect(localStorage.getItem('preferredMarketplace')).toBeNull();
    });

    it('should update marketplace and save when rememberPreference is true', () => {
      localStorage.setItem('preferredMarketplace', 'tcgplayer');
      const { result } = renderHook(() => useMarketplacePreferences());
      
      act(() => {
        result.current.setPreferredMarketplace('cardkingdom');
      });
      
      expect(result.current.preferredMarketplace).toBe('cardkingdom');
      expect(localStorage.getItem('preferredMarketplace')).toBe('cardkingdom');
    });
  });

  describe('setRememberPreference', () => {
    it('should save current marketplace when remember is set to true', () => {
      const { result } = renderHook(() => useMarketplacePreferences());
      
      act(() => {
        result.current.setPreferredMarketplace('manapool');
      });
      
      act(() => {
        result.current.setRememberPreference(true);
      });
      
      expect(result.current.rememberPreference).toBe(true);
      expect(localStorage.getItem('preferredMarketplace')).toBe('manapool');
    });

    it('should clear localStorage when remember is set to false', () => {
      localStorage.setItem('preferredMarketplace', 'tcgplayer');
      const { result } = renderHook(() => useMarketplacePreferences());
      
      expect(result.current.rememberPreference).toBe(true);
      
      act(() => {
        result.current.setRememberPreference(false);
      });
      
      expect(result.current.rememberPreference).toBe(false);
      expect(localStorage.getItem('preferredMarketplace')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle invalid marketplace key in localStorage', () => {
      localStorage.setItem('preferredMarketplace', 'invalid');
      const { result } = renderHook(() => useMarketplacePreferences());
      // Should return the stored value even if invalid (validation happens elsewhere)
      expect(result.current.preferredMarketplace).toBe('invalid');
    });

    it('should handle rapid marketplace changes', () => {
      const { result } = renderHook(() => useMarketplacePreferences());
      
      act(() => {
        result.current.setRememberPreference(true);
      });
      
      act(() => {
        result.current.setPreferredMarketplace('manapool');
        result.current.setPreferredMarketplace('cardkingdom');
        result.current.setPreferredMarketplace('tcgplayer');
      });
      
      expect(result.current.preferredMarketplace).toBe('tcgplayer');
      expect(localStorage.getItem('preferredMarketplace')).toBe('tcgplayer');
    });
  });
});
