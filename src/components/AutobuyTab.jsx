import React, { useState } from 'react';
import PropTypes from 'prop-types';

export function AutobuyTab() {
  const [inputText, setInputText] = useState('{}');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body = JSON.parse(inputText);
      const resp = await fetch('/api/autobuy/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      setResult(json);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const loadSample = async () => {
    try {
      const r = await fetch('/api/autobuy/sample');
      const j = await r.json();
      setInputText(JSON.stringify(j, null, 2));
    } catch (e) {
      setResult({ error: 'Failed to load sample: ' + String(e) });
    }
  };

  return (
    <div className="autobuy-tab">
      <h2 className="text-2xl font-semibold mb-4">Autobuy Runner</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2">Input JSON</label>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="w-full h-64 p-2 font-mono text-sm bg-slate-800 text-white"
          />
          <div className="mt-2 flex gap-2">
            <button className="btn-primary" onClick={run} disabled={loading}>
              {loading ? 'Running…' : 'Run Autobuy'}
            </button>
            <button className="btn-secondary" onClick={loadSample} disabled={loading}>
              Load sample
            </button>
          </div>
        </div>
        <div>
          <label className="block mb-2">Result</label>
          <pre className="w-full h-64 p-2 overflow-auto bg-slate-900 text-white text-sm">
            {result ? JSON.stringify(result, null, 2) : 'No result yet.'}
          </pre>
        </div>
      </div>
    </div>
  );
}

AutobuyTab.propTypes = {};

export default AutobuyTab;
