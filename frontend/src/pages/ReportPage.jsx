import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../App';
import {
  FileDown, Activity, ShieldAlert, MapPin, Sparkles,
  AlertTriangle, CheckCircle, TrendingUp, RefreshCw, Clock
} from 'lucide-react';

function RiskBadge({ level }) {
  const colors = {
    LOW: 'bg-emerald-950/50 border-emerald-900/40 text-emerald-400',
    MEDIUM: 'bg-amber-950/50 border-amber-900/40 text-amber-400',
    HIGH: 'bg-orange-950/50 border-orange-900/40 text-orange-400',
    CRITICAL: 'bg-red-950/50 border-red-900/40 text-red-400',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[level] || colors.MEDIUM}`}>
      {level} RISK
    </span>
  );
}

function AQIBadge({ aqi }) {
  const getColor = (v) => {
    if (v <= 50) return 'bg-emerald-950/50 border-emerald-900/40 text-emerald-400';
    if (v <= 100) return 'bg-yellow-950/50 border-yellow-900/40 text-yellow-400';
    if (v <= 150) return 'bg-orange-950/50 border-orange-900/40 text-orange-400';
    if (v <= 200) return 'bg-red-950/50 border-red-900/40 text-red-400';
    return 'bg-purple-950/50 border-purple-900/40 text-purple-400';
  };
  const getLabel = (v) => {
    if (v <= 50) return 'Good';
    if (v <= 100) return 'Moderate';
    if (v <= 150) return 'Unhealthy (Sensitive)';
    if (v <= 200) return 'Unhealthy';
    return 'Very Unhealthy+';
  };
  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border ${getColor(aqi)}`}>
      <span className="text-2xl font-black">{aqi}</span>
      <div>
        <div className="text-xs font-bold opacity-80">AQI</div>
        <div className="text-xs">{getLabel(aqi)}</div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { user } = useAuth();
  const [city, setCity] = useState(user.location || 'Delhi');
  const [searchInput, setSearchInput] = useState(user.location || 'Delhi');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const headers = { 'Authorization': `Bearer ${user.token}` };

  const fetchSummary = async (targetCity) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/report/summary?city=${targetCity}`, { headers });
      if (!res.ok) throw new Error('Failed to load report summary');
      setSummary(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(city); }, [city]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) setCity(searchInput.trim());
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/report/generate?city=${city}`, { headers });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `airsense-health-report-${city.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (e) {
      setError('PDF generation failed: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <FileDown className="w-6 h-6 text-emerald-400" />
            <span>Health Report</span>
          </h1>
          <p className="text-slate-400 text-sm">AI-generated personalized air quality health analysis</p>
        </div>
        <button
          onClick={() => fetchSummary(city)}
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-emerald-900/40 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* City Search */}
      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden focus-within:border-emerald-700/50">
          <MapPin className="w-4 h-4 text-slate-500 ml-3" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Enter city for report..."
            className="flex-1 bg-transparent text-white px-3 py-2.5 text-sm outline-none placeholder-slate-600"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors">
          Generate
        </button>
      </form>

      {error && (
        <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-950/30 border border-red-900/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {downloadSuccess && (
        <div className="flex items-center space-x-2 text-emerald-400 text-sm bg-emerald-950/30 border border-emerald-900/30 rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Report downloaded successfully!</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-48">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Generating report...</p>
          </div>
        </div>
      ) : summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
              <MapPin className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="text-2xl font-bold text-white">{summary.city}</p>
              <p className="text-xs text-slate-400">Monitoring Location</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
              <AQIBadge aqi={summary.currentAqi} />
              <p className="text-xs text-slate-400 mt-2">Current AQI</p>
              <p className="text-xs text-slate-500">Avg: {summary.avgAqi}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
              <RiskBadge level={summary.riskLevel} />
              <p className="text-xs text-slate-400 mt-2">Health Risk Score</p>
              <p className="text-2xl font-bold text-white mt-1">{summary.riskScore}<span className="text-sm text-slate-500">/100</span></p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>AI Health Recommendations</span>
            </h3>
            <div className="space-y-2">
              {(summary.recommendations || []).map((rec, i) => (
                <div key={i} className="flex items-start space-x-3 text-sm text-slate-300 bg-slate-800/50 rounded-xl px-3 py-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* History summary */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-300">Data Summary</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-purple-400">{summary.historyCount}</p>
                <p className="text-xs text-slate-400">Data Points</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{summary.avgAqi}</p>
                <p className="text-xs text-slate-400">Average AQI</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{summary.riskScore}/100</p>
                <p className="text-xs text-slate-400">Risk Score</p>
              </div>
            </div>
          </div>

          {/* Report Generation Info */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-400">Generated: {new Date(summary.generatedAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Your personalized PDF report includes: full pollutant analysis, health risk assessment with explanations, 
              AI recommendations, historical AQI trend, and emergency guidance tailored to your health profile.
            </p>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-900/20"
            >
              {downloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Download Full PDF Report</span>
                </>
              )}
            </button>
            <p className="text-xs text-slate-600 text-center mt-2">
              ⚠️ For informational purposes only — not a substitute for medical advice.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
