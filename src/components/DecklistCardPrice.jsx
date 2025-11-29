import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { usePriceCache } from "../context/PriceCacheContext";

// Simple normalize functions
const normalizeCardName = (name) => (name || "").trim();
const normalizeSetCode = (code) => (code || "").trim().toUpperCase();

/**
 * DecklistCardPrice Component
 * Displays TCG or Card Kingdom price for a specific card
 * 
 * @param {string} name - Card name
 * @param {string} set - Set code (e.g., "M11")
 * @param {string} priceType - Either "tcg" or "ck"
 * @param {string} className - Optional CSS class
 */
export default function DecklistCardPrice({ name, set, priceType, className }) {
  const { getPrice } = usePriceCache();
  const [price, setPrice] = useState("N/A");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name || !set) {
      setPrice("N/A");
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const cardName = normalizeCardName(name);
    const setCode = normalizeSetCode(set);
    
    getPrice(cardName, setCode)
      .then(result => {
        if (!result) {
          setPrice("N/A");
          setLoading(false);
          return;
        }
        
        const priceValue = result[priceType];
        setPrice(priceValue || "N/A");
        setLoading(false);
      })
      .catch(() => {
        setPrice("N/A");
        setLoading(false);
      });
  }, [name, set, priceType, getPrice]);

  return (
    <span className={className}>
      {loading ? "..." : price}
    </span>
  );
}

DecklistCardPrice.propTypes = {
  name: PropTypes.string.isRequired,
  set: PropTypes.string.isRequired,
  priceType: PropTypes.oneOf(["tcg", "ck"]).isRequired,
  className: PropTypes.string,
};
