import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { usePriceCache } from "../context/PriceCacheContext";
import { normalizeCardName, normalizeSetCode } from "../lib/fetchCardPrices";

export default function DecklistCardPrice({ name, set, priceType, className }) {
  const { getPrice } = usePriceCache();
  const [price, setPrice] = useState("N/A");
  const [loading, setLoading] = useState(true);

  // Mount log
  useEffect(() => {
    console.log("[DEBUG] DecklistCardPrice mounted with props:", { name, set, priceType });
  }, []);

  // Props change log
  useEffect(() => {
    console.log("[DEBUG] DecklistCardPrice props updated:", { name, set, priceType });
  }, [name, set, priceType]);

  // Main fetch effect
  useEffect(() => {
    if (!name || !set) {
      console.log("[DEBUG] Missing name or set, setting N/A");
      setPrice("N/A");
      setLoading(false);
      return;
    }

    console.log("[DEBUG] DecklistCardPrice starting fetch for:", { name, set, priceType });
    setLoading(true);
    
    const cardName = normalizeCardName(name);
    const setCode = normalizeSetCode(set);
    
    getPrice(cardName, setCode)
      .then(result => {
        console.log("[DEBUG] Price data fetched:", result);
        
        if (!result) {
          console.log("[DEBUG] Result is falsy");
          setPrice("N/A");
          setLoading(false);
          return;
        }
        
        const priceValue = result[priceType];
        console.log("[DEBUG] Extracted priceValue from result[" + priceType + "]:", priceValue);
        
        if (priceValue) {
          console.log("[DEBUG] Setting price to:", priceValue);
          setPrice(priceValue);
        } else {
          console.log("[DEBUG] priceValue is falsy, setting N/A. Available keys:", Object.keys(result));
          setPrice("N/A");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("[DEBUG] getPrice error:", err);
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
