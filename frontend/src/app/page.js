'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [userFile, setUserFile] = useState(null);
  const [exchangeFile, setExchangeFile] = useState(null);
  const [config, setConfig] = useState({ timestamp: 300, quantity: 0.01 });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [result, setResult] = useState(null);
  const [unmatchedData, setUnmatchedData] = useState([]);

  // Replace this with your actual Render URL later
  const API_BASE_URL = 'https://koinx-engine-backend.onrender.com/api'; 

  const handleRunReconciliation = async (e) => {
    e.preventDefault();
    if (!userFile || !exchangeFile) {
      alert('Please upload both CSV files.');
      return;
    }

    setStatus('loading');
    const formData = new FormData();
    formData.append('userFile', userFile);
    formData.append('exchangeFile', exchangeFile);
    formData.append('timestampToleranceSeconds', config.timestamp);
    formData.append('quantityTolerancePct', config.quantity);

    try {
      // 1. Trigger Reconciliation (Assignment Requirement #1) 
      const response = await fetch(`${API_BASE_URL}/reconcile`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Reconciliation failed');
      
      // 2. Fetch Unmatched Details (Assignment Requirement #4) 
      // We use the runId returned from the first call to immediately fetch detailed reasons
      const unmatchedRes = await fetch(`${API_BASE_URL}/report/${data.runId}/unmatched`);
      const unmatchedJson = await unmatchedRes.json();
      
      // Update state with both the summary and the detailed unmatched list
      setUnmatchedData(unmatchedJson.unmatched || []);
      setResult(data);
      setStatus('success');
    } catch (error) {
      console.error('Reconciliation Error:', error);
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!result?.runId) return;
    window.open(`${API_BASE_URL}/report/${result.runId}`, '_blank');
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">KoinX Reconciliation Engine</h1>
            <p className="text-gray-500 text-sm mt-1">Upload reports to detect mismatches and generate standardized outputs.</p>
          </div>
        </header>

        {/* Configuration & Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Upload Section */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-semibold text-lg">Data Sources</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Transaction Export</label>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => setUserFile(e.target.files[0])}
                className="w-full text-sm border border-gray-200 rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-blue file:text-white hover:file:bg-blue-700 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Transaction Export</label>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => setExchangeFile(e.target.files[0])}
                className="w-full text-sm border border-gray-200 rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-blue file:text-white hover:file:bg-blue-700 transition"
              />
            </div>
          </section>

          {/* Config Section */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-semibold text-lg">Engine Tolerances</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp Window (Seconds)</label>
              <input 
                type="number" 
                value={config.timestamp}
                onChange={(e) => setConfig({...config, timestamp: e.target.value})}
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Tolerance (%)</label>
              <input 
                type="number" 
                step="0.01"
                value={config.quantity}
                onChange={(e) => setConfig({...config, quantity: e.target.value})}
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>
          </section>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end">
          <button 
            onClick={handleRunReconciliation}
            disabled={status === 'loading'}
            className="bg-brand-dark text-white px-8 py-3 rounded-xl font-medium shadow-md hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {status === 'loading' ? 'Processing Engine...' : 'Run Reconciliation'}
          </button>
        </div>

        {/* Results Section */}
        {status === 'success' && result && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          {/* Success Header & Download Button (Requirement #2: GET /report/:runId) */}
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-green-100 bg-green-50/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-xl font-bold text-green-800">Reconciliation Complete</h2>
                <p className="text-sm text-green-600 mt-1">Run ID: {result.runId}</p>
              </div>
              <button 
                onClick={handleDownload}
                className="bg-brand-blue text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-blue-700 transition flex items-center gap-2"
              >
                Download CSV Report
              </button>
            </div>

            {/* Summary Stats (Requirement #3: GET /report/:runId/summary) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Matched</p>
                <p className="text-3xl font-extrabold text-brand-dark mt-1">{result.summary.matched}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Conflicting</p>
                <p className="text-3xl font-extrabold text-amber-500 mt-1">{result.summary.conflicting}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">User Only</p>
                <p className="text-3xl font-extrabold text-red-500 mt-1">{result.summary.unmatchedUser}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Exchange Only</p>
                <p className="text-3xl font-extrabold text-red-500 mt-1">{result.summary.unmatchedExchange}</p>
              </div>
            </div>
          </section>

          {/* Unmatched Record Details (Requirement #4: GET /report/:runId/unmatched) */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-brand-dark">Unmatched Record Details</h3>
              <p className="text-xs text-gray-500">Drill-down data fetched from the /unmatched endpoint</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Source Category</th>
                    <th className="px-6 py-4">Transaction Reference</th>
                    <th className="px-6 py-4">Reconciliation Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unmatchedData.length > 0 ? (
                    unmatchedData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                            item.category.includes('User') ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                          {item.snapshot.userTxId !== 'N/A' ? item.snapshot.userTxId : item.snapshot.exchangeTxId}
                        </td>
                        <td className="px-6 py-4 text-gray-500 italic">
                          {item.reason}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-10 text-center text-gray-400">
                        No unmatched records found for this run.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      </div>
    </main>
  );
}