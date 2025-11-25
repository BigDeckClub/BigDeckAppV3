import { useEffect, useState } from "react";
import { usePriceCache } from "../context/PriceCacheContext";
import { normalizeCardName, normalizeSetCode } from "../lib/fetchCardPrices";

export default function DecklistCardPrice({ name, set }) {
  const { getPrice } = usePriceCache();
  const [price, setPrice] = useState({ tcg: "N/A", ck: "N/A" });

  useEffect(() => {
    const cardName = normalizeCardName(name);
    const setCode = normalizeSetCode(set);

    getPrice(cardName, setCode).then(setPrice);
  }, [name, set, getPrice]);

  return (
    <span>
      TCG: {price.tcg} | CK: {price.ck}
    </span>
  );
}
