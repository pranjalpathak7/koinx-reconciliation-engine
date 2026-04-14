'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function Dashboard() {
  const [userFile, setUserFile] = useState(null);
  const [exchangeFile, setExchangeFile] = useState(null);
  const [config, setConfig] = useState({ timestamp: 300, quantity: 0.01 });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [result, setResult] = useState(null);
  const [unmatchedData, setUnmatchedData] = useState([]);

  // Dynamically uses the live URL in production, and localhost when the evaluator runs it locally
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
      // 1. Trigger Reconciliation
      const response = await fetch(`${API_BASE_URL}/reconcile`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Reconciliation failed');
      
      // 2. Fetch Unmatched Details
      const unmatchedRes = await fetch(`${API_BASE_URL}/report/${data.runId}/unmatched`);
      const unmatchedJson = await unmatchedRes.json();
      
      // Update state
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
    <main className="min-h-screen bg-[#0a0e17] p-8 text-gray-200 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header with KoinX Logo */}
        <header className="bg-[#111827] p-6 rounded-2xl shadow-2xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            {/* Logo Image */}
            <div className="relative h-8 w-32 md:h-10 md:w-36">
              <Image 
                src="/koinx-logo.svg" 
                alt="KoinX Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            
            {/* Divider (Hidden on mobile) */}
            <div className="h-10 w-px bg-gray-700 hidden md:block"></div>
            
            {/* Title */}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">Reconciliation Engine</h1>
              <p className="text-gray-400 text-xs md:text-sm mt-1">Upload reports to detect mismatches and standardize data.</p>
            </div>
          </div>
        </header>

        {/* Configuration & Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Upload Section */}
          <section className="bg-[#111827] p-6 rounded-2xl shadow-xl border border-gray-800 space-y-4 hover:border-gray-700 transition">
            <h2 className="font-semibold text-lg text-white">Data Sources</h2>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">User Transaction Export</label>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => setUserFile(e.target.files[0])}
                className="w-full text-sm text-gray-300 border border-gray-700 bg-[#0f1522] rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 transition cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Exchange Transaction Export</label>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => setExchangeFile(e.target.files[0])}
                className="w-full text-sm text-gray-300 border border-gray-700 bg-[#0f1522] rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 transition cursor-pointer"
              />
            </div>
          </section>

          {/* Config Section */}
          <section className="bg-[#111827] p-6 rounded-2xl shadow-xl border border-gray-800 space-y-4 hover:border-gray-700 transition">
            <h2 className="font-semibold text-lg text-white">Engine Tolerances</h2>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Timestamp Window (Seconds)</label>
              <input 
                type="number" 
                value={config.timestamp}
                onChange={(e) => setConfig({...config, timestamp: e.target.value})}
                className="w-full p-2.5 bg-[#0f1522] text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Quantity Tolerance (%)</label>
              <input 
                type="number" 
                step="0.01"
                value={config.quantity}
                onChange={(e) => setConfig({...config, quantity: e.target.value})}
                className="w-full p-2.5 bg-[#0f1522] text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
          </section>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end">
          <button 
            onClick={handleRunReconciliation}
            disabled={status === 'loading'}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] disabled:opacity-50 disabled:shadow-none transition-all duration-300"
          >
            {status === 'loading' ? 'Processing Engine...' : 'Run Reconciliation'}
          </button>
        </div>

        {/* Results Section */}
        {status === 'success' && result && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          
          {/* Success Header & Download Button */}
          <section className="bg-[#0b1c14] p-8 rounded-2xl shadow-lg border border-[#143d28]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-xl font-bold text-green-400 tracking-wide">Reconciliation Complete</h2>
                <p className="text-sm text-green-600/80 mt-1 font-mono">Run ID: {result.runId}</p>
              </div>
              <button 
                onClick={handleDownload}
                className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:bg-green-500 transition flex items-center gap-2"
              >
                Download CSV Report
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#111827] p-4 rounded-xl border border-gray-800 text-center shadow-md">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Matched</p>
                <p className="text-3xl font-extrabold text-white mt-1">{result.summary.matched}</p>
              </div>
              <div className="bg-[#111827] p-4 rounded-xl border border-gray-800 text-center shadow-md">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Conflicting</p>
                <p className="text-3xl font-extrabold text-amber-500 mt-1">{result.summary.conflicting}</p>
              </div>
              <div className="bg-[#111827] p-4 rounded-xl border border-gray-800 text-center shadow-md">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">User Only</p>
                <p className="text-3xl font-extrabold text-red-500 mt-1">{result.summary.unmatchedUser}</p>
              </div>
              <div className="bg-[#111827] p-4 rounded-xl border border-gray-800 text-center shadow-md">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Exchange Only</p>
                <p className="text-3xl font-extrabold text-red-500 mt-1">{result.summary.unmatchedExchange}</p>
              </div>
            </div>
          </section>

          {/* Unmatched Record Details */}
          <section className="bg-[#111827] rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 bg-[#0d131f]">
              <h3 className="font-bold text-white">Unmatched Record Details</h3>
              <p className="text-xs text-gray-500 mt-1">Drill-down data fetched from the /unmatched endpoint</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0a0e17] text-gray-400 font-semibold uppercase text-[10px] tracking-widest border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4">Source Category</th>
                    <th className="px-6 py-4">Transaction Reference</th>
                    <th className="px-6 py-4">Reconciliation Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {unmatchedData.length > 0 ? (
                    unmatchedData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            item.category.includes('User') 
                              ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' 
                              : 'bg-purple-900/30 text-purple-400 border border-purple-800/50'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400">
                          {item.snapshot.userTxId !== 'N/A' ? item.snapshot.userTxId : item.snapshot.exchangeTxId}
                        </td>
                        <td className="px-6 py-4 text-gray-500 italic">
                          {item.reason}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
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