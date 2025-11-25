import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { usePriceCache } from "../context/PriceCacheContext";
import { normalizeCardName, normalizeSetCode } from "../lib/fetchCardPrices";

export default function DecklistCardPrice({ name, set, priceType, className }) {
  const { getPrice } = usePriceCache();
  const [price, setPrice] = useState("N/A");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name || !set) {
      console.warn("[DecklistCardPrice] Missing name or set:", { name, set });
      setPrice("N/A");
      setLoading(false);
      return;
    }

    setLoading(true);
    const cardName = normalizeCardName(name);
    const setCode = normalizeSetCode(set);
    
    console.log("[DecklistCardPrice] Fetching price for:", { cardName, setCode, priceType });
    
    getPrice(cardName, setCode)
      .then(result => {
        console.log("[DecklistCardPrice] Price result received:", { result, priceType });
        
        if (!result) {
          console.warn("[DecklistCardPrice] Result is falsy:", result);
          setPrice("N/A");
          setLoading(false);
          return;
        }
        
        const priceValue = result[priceType];
        console.log("[DecklistCardPrice] Extracted price value:", { priceType, priceValue });
        
        if (priceValue) {
          setPrice(priceValue);
        } else {
          console.warn("[DecklistCardPrice] Price not found for type:", priceType, "available keys:", Object.keys(result));
          setPrice("N/A");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(`[DecklistCardPrice] Price fetch error for ${name}|${set}:`, err);
        setPrice("N/A");
        setLoading(false);
      });
  }, [name, set, getPrice, priceType]);

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
