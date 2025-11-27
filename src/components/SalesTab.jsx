import React from 'react';
import PropTypes from 'prop-types';
import { DollarSign } from 'lucide-react';

export const SalesTab = ({
  sales,
  containers,
  decklists,
  inventory,
  calculateDeckCOGS,
}) => {
  return (
    <div className="space-y-6">
      {sales.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Sales History</h2>
          <div className="space-y-2">
            {sales.map((sale) => {
              const salePrice = parseFloat(sale.sale_price) || 0;
              const saleDate = new Date(sale.created_at || sale.sold_date);

              return (
                <div
                  key={sale.id}
                  className="bg-slate-800 border border-slate-600 rounded p-4 flex justify-between items-center hover:bg-slate-700 transition"
                >
                  <div>
                    <div className="font-semibold">Container #{sale.container_id}</div>
                    <div className="text-sm text-slate-400">
                      {saleDate.toLocaleDateString()} at {saleDate.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">
                      ${salePrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-400">Sold</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-emerald-400" />
          Sales Analytics
        </h2>

        {sales.length > 0 ? (
          <>
            <div className="space-y-4">
              {sales.map((sale) => {
                const salePrice = parseFloat(sale.sale_price) || 0;
                const deckCOGS = calculateDeckCOGS(sale.decklist_id);
                const profit = salePrice - deckCOGS;
                const profitPercentage =
                  deckCOGS > 0 ? ((profit / deckCOGS) * 100).toFixed(2) : 0;
                const container = containers.find((c) => c.id === sale.container_id);

                return (
                  <div
                    key={sale.id}
                    className="bg-slate-800 border border-slate-600 p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-lg">
                          {container?.name || 'Unknown Container'}
                        </div>
                        <div className="text-sm text-slate-400">
                          {new Date(sale.sold_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div
                        className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-300'}`}
                      >
                        {profit >= 0 ? '+' : ''} ${profit.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex-1 min-w-[80px] bg-slate-700/50 border border-slate-600 rounded p-3 text-center">
                        <div className="text-slate-400 text-xs mb-1">COGS</div>
                        <div className="font-semibold text-teal-300">
                          ${deckCOGS.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[80px] bg-slate-700/50 border border-slate-600 rounded p-3 text-center">
                        <div className="text-slate-400 text-xs mb-1">Sale</div>
                        <div className="font-semibold text-cyan-300">
                          ${salePrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[80px] bg-slate-700/50 border border-slate-600 rounded p-3 text-center">
                        <div className="text-slate-400 text-xs mb-1">Profit</div>
                        <div
                          className={`font-semibold ${profit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}
                        >
                          {profitPercentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[100px] bg-slate-700/50 p-4 border border-slate-600 rounded text-center">
                  <div className="text-slate-400 text-xs mb-1">Total Sales</div>
                  <div className="text-xl font-bold text-teal-300">{sales.length}</div>
                </div>
                <div className="flex-1 min-w-[100px] bg-slate-700/50 p-4 border border-slate-600 rounded text-center">
                  <div className="text-slate-400 text-xs mb-1">Revenue</div>
                  <div className="text-xl font-bold text-cyan-300">
                    $
                    {sales
                      .reduce((sum, s) => sum + (parseFloat(s.sale_price) || 0), 0)
                      .toFixed(2)}
                  </div>
                </div>
                <div className="flex-1 min-w-[100px] bg-slate-700/50 p-4 border border-slate-600 rounded text-center">
                  <div className="text-slate-400 text-xs mb-1">Profit</div>
                  <div className="text-xl font-bold text-emerald-300">
                    $
                    {sales
                      .reduce(
                        (sum, s) =>
                          sum +
                          ((parseFloat(s.sale_price) || 0) -
                            calculateDeckCOGS(s.decklist_id)),
                        0
                      )
                      .toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-slate-400">
            No sales recorded yet. Sell containers to see analytics here.
          </p>
        )}
      </div>
    </div>
  );
};

SalesTab.propTypes = {
  sales: PropTypes.array.isRequired,
  containers: PropTypes.array.isRequired,
  decklists: PropTypes.array.isRequired,
  inventory: PropTypes.array.isRequired,
  calculateDeckCOGS: PropTypes.func.isRequired,
};

export default SalesTab;
