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
      setPrice("N/A");
      setLoading(false);
      return;
    }

    setLoading(true);
    const cardName = normalizeCardName(name);
    const setCode = normalizeSetCode(set);
    
    getPrice(cardName, setCode)
      .then(result => {
        if (result && priceType && result[priceType]) {
          setPrice(result[priceType]);
        } else {
          setPrice("N/A");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(`Price fetch error for ${name}:`, err);
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
