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
      <div style={{
        width: 72,
        height: 96,
        backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '6px',
        backgroundColor: '#0a0f13'
      }} />
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
