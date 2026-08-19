import { useState } from 'react';

/**
 * tokens × price × traffic = the bill. Plus the two levers from Lesson 5.5: cache hit rate on
 * the stable prefix, and the batch share. Prices are yours to type - none are baked in.
 */
export default function Cost() {
  const [requests, setRequests] = useState(50_000);
  const [stable, setStable] = useState(3_500);
  const [variable, setVariable] = useState(3_000);
  const [output, setOutput] = useState(400);
  const [priceIn, setPriceIn] = useState('3.00');
  const [priceCached, setPriceCached] = useState('0.30');
  const [priceOut, setPriceOut] = useState('15.00');
  const [hitRate, setHitRate] = useState(0.9);
  const [batchShare, setBatchShare] = useState(0);
  const [batchDiscount, setBatchDiscount] = useState(0.5);

  const pin = Number.parseFloat(priceIn) || 0;
  const pc = Number.parseFloat(priceCached) || 0;
  const pout = Number.parseFloat(priceOut) || 0;
  const M = 1_000_000;

  const perReqNoCache = ((stable + variable) * pin + output * pout) / M;
  const perReqHit = (stable * pc + variable * pin + output * pout) / M;
  const blended = hitRate * perReqHit + (1 - hitRate) * perReqNoCache;
  const online = requests * (1 - batchShare) * blended;
  const batch = requests * batchShare * blended * (1 - batchDiscount);
  const dayNaive = requests * perReqNoCache;
  const day = online + batch;
  const fmt = (n: number, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="cost">
      <div className="explorer-head">
        <strong>Cost calculator</strong>
        <span className="muted">tokens × price × traffic · caching and batch as levers · prices are yours to enter</span>
      </div>
      <div className="slider-grid">
        <label><span>requests / day <b>{requests.toLocaleString()}</b></span><input type="range" min="1000" max="1000000" step="1000" value={requests} onChange={(e) => setRequests(Number(e.target.value))} /></label>
        <label><span>stable prefix <b>{stable.toLocaleString()}</b> tokens (system, tools, examples)</span><input type="range" min="0" max="20000" step="100" value={stable} onChange={(e) => setStable(Number(e.target.value))} /></label>
        <label><span>variable input <b>{variable.toLocaleString()}</b> tokens (context, question)</span><input type="range" min="0" max="50000" step="100" value={variable} onChange={(e) => setVariable(Number(e.target.value))} /></label>
        <label><span>output <b>{output.toLocaleString()}</b> tokens</span><input type="range" min="1" max="8000" step="10" value={output} onChange={(e) => setOutput(Number(e.target.value))} /></label>
        <label><span>cache hit rate <b>{(hitRate * 100).toFixed(0)}%</b></span><input type="range" min="0" max="1" step="0.05" value={hitRate} onChange={(e) => setHitRate(Number(e.target.value))} /></label>
        <label><span>batch share <b>{(batchShare * 100).toFixed(0)}%</b> at <b>{(batchDiscount * 100).toFixed(0)}%</b> off</span><input type="range" min="0" max="1" step="0.05" value={batchShare} onChange={(e) => setBatchShare(Number(e.target.value))} /><input type="range" min="0" max="0.9" step="0.05" value={batchDiscount} onChange={(e) => setBatchDiscount(Number(e.target.value))} aria-label="batch discount" /></label>
      </div>
      <div className="explorer-controls">
        <label>input $/M <input type="number" step="0.25" min="0" value={priceIn} onChange={(e) => setPriceIn(e.target.value)} aria-label="input price" /></label>
        <label>cached input $/M <input type="number" step="0.05" min="0" value={priceCached} onChange={(e) => setPriceCached(e.target.value)} aria-label="cached input price" /></label>
        <label>output $/M <input type="number" step="0.25" min="0" value={priceOut} onChange={(e) => setPriceOut(e.target.value)} aria-label="output price" /></label>
      </div>
      <div className="stat-row" aria-live="polite">
        <div className="stat"><span className="stat-n">${perReqNoCache.toFixed(4)}</span><span>per request, no cache</span></div>
        <div className="stat"><span className="stat-n">${perReqHit.toFixed(4)}</span><span>per request, cache hit</span></div>
        <div className="stat"><span className="stat-n">${fmt(day)}</span><span>per day</span></div>
        <div className="stat"><span className="stat-n">${fmt(day * 30)}</span><span>per month</span></div>
        <div className="stat"><span className="stat-n">{dayNaive > 0 ? `${((1 - day / dayNaive) * 100).toFixed(0)}%` : '–'}</span><span>saved vs naive</span></div>
      </div>
      <p className="muted small">
        Output tokens usually cost ~5× input — a chatty answer costs more than a long prompt. Move
        "variable input" up to see why retrieval beats stuffing; move "stable prefix" up with a high
        hit rate to see why prompt layout matters. Look prices up on the model reference; they change.
      </p>
    </div>
  );
}
