import React from 'react';
import { ThemeSelector } from '../ui/ThemeToggle';
import { Monitor, Palette } from 'lucide-react';

export const AppearanceSettings = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[var(--bda-primary)]/10 rounded-lg">
          <Palette className="w-5 h-5 text-[var(--bda-primary)]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--bda-heading)]">Appearance</h3>
          <p className="text-sm text-[var(--bda-muted)]">Customize how BigDeck looks on your device</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 space-y-6">
        <ThemeSelector />

        <div className="border-t border-[var(--border)] pt-6">
          <div className="flex items-start gap-3">
            <Monitor className="w-5 h-5 text-[var(--bda-muted)] mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-[var(--bda-heading)]">Theme Descriptions</h4>
              <ul className="mt-2 space-y-2 text-sm text-[var(--bda-muted)]">
                <li><strong className="text-[var(--bda-text)]">Dark</strong> - Deep navy blue for low-light environments</li>
                <li><strong className="text-[var(--bda-text)]">Light</strong> - Clean, bright interface for daytime use</li>
                <li><strong className="text-[var(--bda-text)]">Parchment</strong> - Warm, paper-like aesthetic inspired by MTG artifacts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
