import { useEffect, useState } from "react";
import { usePriceCache } from "../context/PriceCacheContext";
import { normalizeCardName, normalizeSetCode } from "../lib/fetchCardPrices";

export default function DecklistCardPrice({ name, set }) {
  const { getPrice } = usePriceCache();
  const [price, setPrice] = useState({ tcg: "N/A", ck: "N/A" });

  useEffect(() => {
    const cardName = normalizeCardName(name);
    const setCode = normalizeSetCode(set);
    const cacheKey = `${cardName}|${setCode}`;

    console.log(`[DecklistCardPrice] name="${name}" set="${set}"`);
    console.log(`[DecklistCardPrice] normalized: cardName="${cardName}" setCode="${setCode}"`);
    console.log(`[DecklistCardPrice] cache key: "${cacheKey}"`);

    getPrice(cardName, setCode).then(result => {
      console.log(`[DecklistCardPrice] getPrice returned for "${cacheKey}":`, result);
      if (result && typeof result === 'object' && result.tcg && result.ck) {
        console.log(`[DecklistCardPrice] Valid result, setting price`);
        setPrice(result);
      } else {
        console.warn(`[DecklistCardPrice] Invalid result format:`, result);
        setPrice({ tcg: "N/A", ck: "N/A" });
      }
    }).catch(err => {
      console.error(`[DecklistCardPrice] getPrice error:`, err);
      setPrice({ tcg: "N/A", ck: "N/A" });
    });
  }, [name, set, getPrice]);

  return (
    <span>
      TCG: {price.tcg} | CK: {price.ck}
    </span>
  );
}
