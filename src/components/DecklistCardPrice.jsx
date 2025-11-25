import { useEffect, useState } from "react";
import { usePriceCache } from "../context/PriceCacheContext";
import { normalizeCardName, normalizeSetCode } from "../lib/fetchCardPrices";

export default function DecklistCardPrice({ name, set }) {
  const { getPrice } = usePriceCache();
  const [price, setPrice] = useState({ tcg: "N/A", ck: "N/A" });

  useEffect(() => {
    const cardName = normalizeCardName(name);
    const setCode = normalizeSetCode(set);
    console.log(`[DECKLIST-COMPONENT] requesting ${cardName}|${setCode}`);
    getPrice(cardName, setCode).then(price => {
      console.log(`[DECKLIST-COMPONENT] resolved ${cardName}|${setCode}:`, price);
      setPrice(price);
    });
  }, [name, set, getPrice]);

  return (
    <span>
      TCG: {price.tcg} | CK: {price.ck}
    </span>
  );
}
