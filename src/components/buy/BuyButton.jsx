import React, { useState, useRef, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { ShoppingCart, Copy, ExternalLink } from 'lucide-react';
import { MARKETPLACES, getPreferredMarketplace, buildCartUrl, buildClipboardText } from '../../utils/marketplaceUrls';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';

/**
 * BuyButton - Small reusable button for buying individual cards
 */
export const BuyButton = memo(function BuyButton({
  card,
  quantity = 1,
  size = 'sm',
  variant = 'icon',
}) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const cardData = [{ name: card.name || card, quantity }];

  const handleCopy = async (marketplaceKey) => {
    const text = buildClipboardText(marketplaceKey, cardData);
    try {
      await navigator.clipboard.writeText(text);
      showToast(`📋 Copied ${quantity}x ${card.name || card}`, TOAST_TYPES.SUCCESS);
      setIsOpen(false);
    } catch {
      showToast('Failed to copy to clipboard', TOAST_TYPES.ERROR);
    }
  };

  const handleOpenMarketplace = (marketplaceKey) => {
    const url = buildCartUrl(marketplaceKey, cardData);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      showToast(`🔗 Opening ${MARKETPLACES[marketplaceKey].name}...`, TOAST_TYPES.SUCCESS);
      setIsOpen(false);
    }
  };

  const handleQuickBuy = () => {
    const preferred = getPreferredMarketplace();
    handleOpenMarketplace(preferred);
  };

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (variant === 'icon') {
    return (
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={`${sizeClasses[size]} text-slate-400 hover:text-teal-400 hover:bg-teal-600/20 rounded transition-colors`}
          title="Buy this card"
        >
          <ShoppingCart className={iconSizes[size]} />
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[180px] py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-700">
              {quantity}x {card.name || card}
            </div>
            {Object.entries(MARKETPLACES).map(([key, marketplace]) => (
              <button
                key={key}
                onClick={() => handleOpenMarketplace(key)}
                className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
              >
                <span>{marketplace.icon}</span>
                <span>{marketplace.name}</span>
                <ExternalLink className="w-3 h-3 ml-auto text-slate-500" />
              </button>
            ))}
            <div className="border-t border-slate-700 mt-1 pt-1">
              <button
                onClick={() => handleCopy(getPreferredMarketplace())}
                className="w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-700 flex items-center gap-2"
              >
                <Copy className="w-3 h-3" />
                <span>Copy to clipboard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full button variant
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleQuickBuy();
      }}
      className={`${sizeClasses[size]} bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white rounded transition-all flex items-center gap-1`}
      title="Buy this card"
    >
      <ShoppingCart className={iconSizes[size]} />
      <span className="text-xs">Buy</span>
    </button>
  );
});

BuyButton.propTypes = {
  /** Card object or card name string */
  card: PropTypes.oneOfType([
    PropTypes.shape({
      name: PropTypes.string.isRequired,
    }),
    PropTypes.string,
  ]).isRequired,
  /** Quantity to buy */
  quantity: PropTypes.number,
  /** Button size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Button variant */
  variant: PropTypes.oneOf(['icon', 'button']),
};

export default BuyButton;
