import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export const SalesHistoryTab = () => {
  const { get } = useApi();
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSalesHistory();
  }, []);

  const loadSalesHistory = async () => {
    try {
      const data = await get('/api/sales');
      setSales((data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSales = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.sell_price * (sale.quantity || 1)), 0);
  const totalCOGS = sales.reduce((sum, sale) => sum + (sale.purchase_price * (sale.quantity || 1)), 0);
  const totalGrossProfit = totalRevenue - totalCOGS;
  const profitMargin = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100) : 0;

  if (isLoading) {
    return <div className="text-slate-400 text-center py-8">Loading sales history...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <p className="text-slate-400 text-sm mb-1">Total Transactions</p>
          <p className="text-2xl font-bold text-cyan-400">{sales.length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <p className="text-slate-400 text-sm mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-400">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <p className="text-slate-400 text-sm mb-1">Total COGS</p>
          <p className="text-2xl font-bold text-orange-400">${totalCOGS.toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <p className="text-slate-400 text-sm mb-1">Gross Profit</p>
          <p className={`text-2xl font-bold ${totalGrossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${totalGrossProfit.toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <p className="text-slate-400 text-sm mb-1">Profit Margin</p>
          <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Sales List */}
      {sales.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-600 text-center">
          <p className="text-slate-400">No sales recorded yet. Start selling items to track profits!</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-600">
                  <th className="px-4 py-3 text-left text-slate-300 font-semibold">Item</th>
                  <th className="px-4 py-3 text-left text-slate-300 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-semibold">Qty</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-semibold">COGS</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-semibold">Revenue</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-semibold">Gross Profit</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-semibold">Margin %</th>
                  <th className="px-4 py-3 text-left text-slate-300 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const qty = sale.quantity || 1;
                  const cogs = sale.purchase_price * qty;
                  const revenue = sale.sell_price * qty;
                  const grossProfit = revenue - cogs;
                  const margin = revenue > 0 ? ((grossProfit / revenue) * 100) : 0;
                  
                  return (
                    <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 text-slate-200 font-medium">{sale.item_name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          sale.item_type === 'deck' 
                            ? 'bg-teal-600/30 text-teal-300' 
                            : 'bg-blue-600/30 text-blue-300'
                        }`}>
                          {sale.item_type === 'deck' ? 'Deck' : 'Card'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{qty}</td>
                      <td className="px-4 py-3 text-right text-orange-300 font-medium">${cogs.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-blue-300 font-medium">${revenue.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        grossProfit >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${grossProfit.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        margin >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {margin.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
