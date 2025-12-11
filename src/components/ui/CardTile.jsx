import React from 'react';
import PropTypes from 'prop-types';
import Card from './Card';

/**
 * CardTile: small tile used in inventory grid
 * props: title, qty, unique, cost, coverUrl
 */
export default function CardTile({ title, qty, unique, cost, coverUrl }) {
  return (
    <Card className="flex items-start gap-3">
      <div style={{ width: 72, height: 96, borderRadius: 6, overflow: 'hidden', backgroundColor: '#0a0f13' }}>
        {coverUrl ? (
          <img src={coverUrl} alt={title || 'card image'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : null}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted">{qty ?? 0} • {unique ?? 1} unique</div>
        <div className="text-xs mt-2"><strong>{typeof cost === 'number' ? `$${cost.toFixed(2)}` : cost}</strong></div>
      </div>
    </Card>
  );
}

CardTile.propTypes = {
  title: PropTypes.string,
  qty: PropTypes.number,
  unique: PropTypes.number,
  cost: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  coverUrl: PropTypes.string
};
