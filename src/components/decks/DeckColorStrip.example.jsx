import React from 'react';
import DeckColorGradientBar from './DeckColorGradientBar';
import { getDeckColorKeys } from './deckUtils';

/**
 * DeckCardWithStripExample
 * - Demonstrates replacing the old full-width red top bar with a multi-color gradient bar.
 * - Integrate the inner JSX into your real DeckCard/DeckItem file in place of the current top bar.
 */

export default function DeckCardWithStripExample({ deck }) {
  const colorKeys = getDeckColorKeys(deck);

  return (
    <article className="relative bg-white rounded-md shadow-elevation-1 overflow-hidden">
      {/* Top gradient strip (replaces previous solid red bar) */}
      <DeckColorGradientBar colors={colorKeys} height={6} radius={8} />

      <div className="p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-neutral-900 truncate">{deck.name}</h3>
          <p className="text-xs text-neutral-500 mt-1 truncate">{deck.format || 'Casual'}</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="text-xs text-neutral-500 hover:text-neutral-700">⋯</button>
        </div>
      </div>

      <div className="p-3 border-t border-neutral-100 text-sm text-neutral-600">
        <div className="flex items-center gap-3">
          <div>{deck.cardCount ?? 0} cards</div>
          <div>{deck.price ? `$${deck.price.toFixed(2)}` : 'Price N/A'}</div>
        </div>
      </div>
    </article>
  );
}
