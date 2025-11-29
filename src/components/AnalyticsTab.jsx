import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { BarChart3, TrendingUp, Package, DollarSign } from 'lucide-react';

export const AnalyticsTab = ({ inventory }) => {
  const [marketValues, setMarketValues] = useState({ cardkingdom: 0, tcgplayer: 0 });

  useEffect(() => {
    const fetchMarketValues = async () => {
      try {
        const response = await fetch('/api/analytics/market-values');
        const data = await response.json();
        setMarketValues(data || { cardkingdom: 0, tcgplayer: 0 });
      } catch (error) {
        console.error('Failed to fetch market values:', error);
      }
    };
    fetchMarketValues();
  }, []);

  // Calculate analytics
  const totalCards = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (parseFloat(item.purchase_price) || 0)), 0);
  const uniqueCards = inventory.length;
  const avgPricePerCard = uniqueCards > 0 ? (inventory.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / uniqueCards).toFixed(2) : 0;

  // Group by folder
  const byFolder = inventory.reduce((acc, item) => {
    const folder = item.folder || 'Uncategorized';
    if (!acc[folder]) acc[folder] = { count: 0, value: 0 };
    acc[folder].count += item.quantity || 0;
    acc[folder].value += (item.quantity || 0) * (parseFloat(item.purchase_price) || 0);
    return acc;
  }, {});

  // Group by set
  const bySet = inventory.reduce((acc, item) => {
    const set = item.set || 'Unknown';
    if (!acc[set]) acc[set] = { count: 0, value: 0 };
    acc[set].count += item.quantity || 0;
    acc[set].value += (item.quantity || 0) * (parseFloat(item.purchase_price) || 0);
    return acc;
  }, {});

  // Top 5 most valuable cards
  const topCards = [...inventory]
    .sort((a, b) => ((b.quantity || 0) * (parseFloat(b.purchase_price) || 0)) - ((a.quantity || 0) * (parseFloat(a.purchase_price) || 0)))
    .slice(0, 5);

  return (
    <div className="flex-1 p-6 bg-slate-900 overflow-y-auto">
      <h2 className="text-2xl font-bold text-teal-300 mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6" />
        Analytics
      </h2>

      {/* Key Metrics - Purchase */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Purchase Value</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <div className="text-slate-400 text-xs font-semibold mb-1">Total Cards</div>
            <div className="text-2xl font-bold text-teal-300">{totalCards}</div>
          </div>
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <div className="text-slate-400 text-xs font-semibold mb-1">Unique Cards</div>
            <div className="text-2xl font-bold text-blue-300">{uniqueCards}</div>
          </div>
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <div className="text-slate-400 text-xs font-semibold mb-1">Total Paid</div>
            <div className="text-2xl font-bold text-green-300">${totalValue.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <div className="text-slate-400 text-xs font-semibold mb-1">Avg Price/Card</div>
            <div className="text-2xl font-bold text-amber-300">${avgPricePerCard}</div>
          </div>
        </div>
      </div>

      {/* Key Metrics - Market Values */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Current Market Value</h3>
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-slate-400 text-xs font-semibold mb-2">Card Kingdom Value</div>
              <div className="text-2xl font-bold text-purple-300">${marketValues.cardkingdom.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs font-semibold mb-2">TCGPlayer Value</div>
              <div className="text-2xl font-bold text-pink-300">${marketValues.tcgplayer.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards by Folder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-teal-300" />
            By Folder
          </h3>
          <div className="space-y-2">
            {Object.entries(byFolder).map(([folder, data]) => (
              <div key={folder} className="flex justify-between items-center text-sm p-2 bg-slate-700/30 rounded">
                <span className="text-slate-300">{folder}</span>
                <div className="flex gap-3">
                  <span className="text-teal-300 font-semibold">{data.count} cards</span>
                  <span className="text-amber-300">${data.value.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cards */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-300" />
            Top 5 Valuable
          </h3>
          <div className="space-y-2">
            {topCards.map((card, idx) => (
              <div key={card.id} className="flex justify-between items-center text-sm p-2 bg-slate-700/30 rounded">
                <span className="text-slate-300">{idx + 1}. {card.name}</span>
                <div className="text-amber-300 font-semibold">${((card.quantity || 0) * (parseFloat(card.purchase_price) || 0)).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Value by Set */}
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-300" />
          Value by Set
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(bySet)
            .sort((a, b) => b[1].value - a[1].value)
            .map(([set, data]) => (
              <div key={set} className="p-2 bg-slate-700/30 rounded text-sm">
                <div className="font-semibold text-slate-100">{set}</div>
                <div className="text-xs text-slate-400">{data.count} cards • ${data.value.toFixed(2)}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

AnalyticsTab.propTypes = {
  inventory: PropTypes.array.isRequired,
};
