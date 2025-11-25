import React from "react";
import PropTypes from "prop-types";
import DecklistCardPrice from "./DecklistCardPrice";

export default function DecklistRow({ card }) {
  if (!card) {
    return null;
  }

  const { quantity, name, set } = card;

  return (
    <div className="flex gap-4 items-center py-2 border-b border-slate-600">
      <div className="w-12">
        <span className="text-slate-300">{quantity}x</span>
      </div>
      <div className="flex-1">
        <span className="text-slate-100">{name}</span>
        {set && <span className="text-slate-500 text-sm ml-2">({set})</span>}
      </div>
      <div className="w-40">
        <DecklistCardPrice key={`price-${name}-${set}-tcg`} name={name} set={set || ""} priceType="tcg" className="text-slate-300 text-sm" />
      </div>
    </div>
  );
}

DecklistRow.propTypes = {
  card: PropTypes.shape({
    quantity: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    set: PropTypes.string,
  }).isRequired,
};
