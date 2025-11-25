import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { usePriceCache } from "../context/PriceCacheContext";
import { normalizeCardName, normalizeSetCode } from "../lib/fetchCardPrices";

export default function InventoryCardPrice({ name, set, className }) {
  const { getPrice } = usePriceCache();
  const [price, setPrice] = useState({ tcg: "N/A", ck: "N/A" });

  useEffect(() => {
    const cardName = normalizeCardName(name);
    const setCode = normalizeSetCode(set);
    getPrice(cardName, setCode).then(price => {
      setPrice(price);
    });
  }, [name, set, getPrice]);

  return (
    <span className={className}>
      TCG: {price.tcg} | CK: {price.ck}
    </span>
  );
}

InventoryCardPrice.propTypes = {
  name: PropTypes.string.isRequired,
  set: PropTypes.string.isRequired,
  className: PropTypes.string,
};
