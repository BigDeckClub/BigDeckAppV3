import React, { memo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { EXTERNAL_APIS } from '../../config/api';

// MTG card aspect ratio constants (standard card dimensions)
const CARD_ASPECT_WIDTH = 488;
const CARD_ASPECT_HEIGHT = 680;
const CARD_ASPECT_RATIO = `${CARD_ASPECT_WIDTH}/${CARD_ASPECT_HEIGHT}`;

/**
 * Get card image URL from Scryfall
 * @param {string} cardName - Name of the card
 * @param {string} setCode - Set code (optional)
 * @param {string} imageUri - Direct image URI if available
 * @returns {string} - Scryfall image URL
 */
function getCardImageUrl(cardName, setCode, imageUri) {
  // If we have a direct image URI, use it
  if (imageUri) {
    return imageUri;
  }
  
  // Use Scryfall's named lookup for reliability
  const encodedName = encodeURIComponent(cardName.split('//')[0].trim());
  // If we have a set code, include it for more accurate results
  if (setCode) {
    return `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodedName}&set=${setCode.toLowerCase()}&format=image&version=normal`;
  }
  return `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodedName}&format=image&version=normal`;
}

/**
 * Calculate tooltip position based on target element and viewport
 * Prefers right side, flips to left if near edge
 * @param {DOMRect} targetRect - Target element's bounding rectangle
 * @param {number} tooltipWidth - Width of tooltip
 * @param {number} tooltipHeight - Height of tooltip
 * @returns {Object} - Position style object
 */
function calculatePosition(targetRect, tooltipWidth = 250, tooltipHeight = 349) {
  if (!targetRect) return { top: 0, left: 0 };
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12; // Gap between tooltip and target
  
  let left, top;
  
  // Prefer right side
  const rightPosition = targetRect.right + margin;
  const leftPosition = targetRect.left - tooltipWidth - margin;
  
  // Check if right side has enough space
  if (rightPosition + tooltipWidth <= viewportWidth - margin) {
    left = rightPosition;
  } else if (leftPosition >= margin) {
    // Fall back to left side
    left = leftPosition;
  } else {
    // Center horizontally if neither side works
    left = Math.max(margin, (viewportWidth - tooltipWidth) / 2);
  }
  
  // Vertical positioning - try to center with target, but keep in viewport
  const centerY = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
  top = Math.max(margin, Math.min(centerY, viewportHeight - tooltipHeight - margin));
  
  return { top, left };
}

/**
 * CardPreviewTooltip - A floating tooltip showing MTG card image on hover
 * Uses React Portal to render at document body level for proper z-index
 */
export const CardPreviewTooltip = memo(function CardPreviewTooltip({
  isVisible,
  cardName,
  setCode,
  imageUri,
  targetRect
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  
  // Tooltip dimensions (maintain card aspect ratio)
  const tooltipWidth = 250;
  const tooltipHeight = Math.round(tooltipWidth * (CARD_ASPECT_HEIGHT / CARD_ASPECT_WIDTH));
  
  // Reset image state when card changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [cardName, setCode, imageUri]);
  
  // Calculate position when visible or targetRect changes
  useEffect(() => {
    if (isVisible && targetRect) {
      setPosition(calculatePosition(targetRect, tooltipWidth, tooltipHeight));
    }
  }, [isVisible, targetRect, tooltipWidth, tooltipHeight]);
  
  // Don't render if not visible or no card name
  if (!isVisible || !cardName) {
    return null;
  }
  
  const imageUrl = getCardImageUrl(cardName, setCode, imageUri);
  
  const tooltip = (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none animate-fadeIn"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${tooltipWidth}px`,
        animation: 'fadeIn 150ms ease-out'
      }}
      role="tooltip"
      aria-label={`Card preview: ${cardName}`}
    >
      <div 
        className="bg-slate-800/95 border border-slate-600 rounded-lg shadow-2xl overflow-hidden"
        style={{
          aspectRatio: CARD_ASPECT_RATIO
        }}
      >
        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-slate-700/80 animate-pulse" />
        )}
        
        {/* Error state */}
        {imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-700/80 text-slate-400 p-4">
            <span className="text-xs text-center">Image not available</span>
          </div>
        )}
        
        {/* Card image */}
        {!imageError && (
          <img
            src={imageUrl}
            alt={cardName}
            className={`w-full h-full object-cover transition-opacity duration-150 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="eager"
          />
        )}
      </div>
    </div>
  );
  
  // Render using portal to body for proper z-index
  return createPortal(tooltip, document.body);
});

CardPreviewTooltip.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  cardName: PropTypes.string,
  setCode: PropTypes.string,
  imageUri: PropTypes.string,
  targetRect: PropTypes.shape({
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number
  })
};

export default CardPreviewTooltip;
