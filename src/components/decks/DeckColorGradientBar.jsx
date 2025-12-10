import React from 'react';
import PropTypes from 'prop-types';

/**
 * DeckColorGradientBar
 * - Renders a tiny, top-aligned horizontal bar that is sliced into equal color segments
 *   using a single CSS linear-gradient. This replaces a solid red top bar with a deck's
 *   color identity expressed using the MTG color pie.
 *
 * Props:
 * - colors: array of color keys (white, blue, black, red, green, colorless) or letters (WUBRG)
 * - height: px height of the bar (default 6)
 * - radius: border-radius applied to the top corners (default 6)
 * - className: extra container classes (Tailwind-friendly)
 *
 * Notes:
 * - Uses tokens.colors.pie[*][500] for each color when available; falls back to the raw key.
 * - Creates an accessible label via aria-label and includes an sr-only span.
 */
export function DeckColorGradientBar({
  colors = ['colorless'],
  height = 6,
  radius = 6,
  className = '',
  debug = false,
  style: styleProp = {}
}) {
  // normalize color keys to 'white','blue','black','red','green','colorless'
  // Prefer CSS variables defined in `src/index.css`. If a key is a hex string it will be used directly.
  const cssVarMap = {
    white: 'var(--mtg-white)',
    blue: 'var(--mtg-blue)',
    black: 'var(--mtg-black)',
    red: 'var(--mtg-red)',
    green: 'var(--mtg-green)',
    colorless: 'var(--mtg-colorless)'
  };
  const normalize = (c) => {
    if (!c) return 'colorless';
    const s = String(c).trim();
    if (s.length === 1) {
      const map = { W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green', C: 'colorless' };
      return map[s.toUpperCase()] || 'colorless';
    }
    const lower = s.toLowerCase();
    if (['white', 'blue', 'black', 'red', 'green', 'colorless'].includes(lower)) return lower;
    if (cssVarMap[lower]) return lower;
    return 'colorless';
  };

  const normalized = colors.length ? colors.map(normalize) : ['colorless'];
  const hexColors = normalized.map((k) => {
    // If the key looks like a hex value, use it directly.
    if (typeof k === 'string' && k.trim().startsWith('#')) return k;
    return cssVarMap[k] || k;
  });

  // Build linear-gradient stops: equal slices
  const n = hexColors.length;
  const slice = 100 / n;
  // e.g. '#111 0% 33.333%, #222 33.333% 66.666%, #333 66.666% 100%'
  const stops = hexColors
    .map((hex, i) => {
      const start = +(i * slice).toFixed(6);
      const end = +((i + 1) * slice).toFixed(6);
      return `${hex} ${start}% ${end}%`;
    })
    .join(', ');

  const style = {
    height: `${height}px`,
    borderTopLeftRadius: `${radius}px`,
    borderTopRightRadius: `${radius}px`,
    background: `linear-gradient(90deg, ${stops})`,
    boxSizing: 'border-box',
    ...(debug ? { outline: '2px solid rgba(220,38,38,0.9)' } : {}),
    ...styleProp
  };

  const ariaLabel = `Deck colors: ${normalized.join(', ')}`;

  return (
    <div className={`w-full ${className}`} role="img" aria-label={ariaLabel}>
      <div style={style} />
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

DeckColorGradientBar.propTypes = {
  colors: PropTypes.arrayOf(PropTypes.string),
  height: PropTypes.number,
  radius: PropTypes.number,
  className: PropTypes.string,
  debug: PropTypes.bool,
  style: PropTypes.object
};

export default DeckColorGradientBar;
