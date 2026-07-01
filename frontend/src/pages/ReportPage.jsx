import React, { useState } from 'react';
import { useAuth, API_BASE_URL } from '../App';
import { FileDown, MapPin, Sparkles, CheckCircle, ShieldCheck, Heart, AlertCircle } from 'lucide-react';

function ReportPage() {
  const { user } = useAuth();
  const [city, setCity] = useState(user.location || 'Delhi');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleDownload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/report?city=${city}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate health report. Please try again.');
      }

      // Convert response to blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create hidden link to download
      const a = document.createElement('a');
      a.href = url;
      a.download = `airsense_health_report_${city.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(`Report for ${city} successfully generated and downloaded!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in max-w-2xl mx-auto my-6">
      <div className="glass-panel p-8 space-y-6 shadow-2xl border-slate-800">
        
        {/* Header */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-900">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-400">
            <FileDown className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            AI Health Report
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Generate and download a comprehensive clinical PDF log containing your local air statistics and personalized medical actions.
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/25 p-4 rounded-xl text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-xl text-emerald-400 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Info panel */}
        <div className="bg-slate-950/60 border border-slate-900 p-6 rounded-2xl space-y-4 text-left text-xs">
          <h4 className="font-bold text-sm text-slate-200 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>What is included in this report?</span>
          </h4>
          <ul className="space-y-2 text-slate-400 list-disc list-inside">
            <li><strong className="text-slate-300">User Health Profile:</strong> Age, asthma history, and allergy conditions.</li>
            <li><strong className="text-slate-300">Current Air Metrics:</strong> AQI, PM2.5, and PM10 values for the chosen city.</li>
            <li><strong className="text-slate-300">Risk Assessment Log:</strong> Historical risk scores (0.0 to 1.0) and calculated levels.</li>
            <li><strong className="text-slate-300">Personalized Precautions:</strong> Targeted medical guidelines generated for your specific vulnerabilities.</li>
          </ul>
        </div>

        {/* Action Form */}
        <form onSubmit={handleDownload} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 tracking-wider">TARGET MONITORING CITY</label>
            <div className="relative">
              <MapPin className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Delhi, London, New York"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-950/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-sm mt-6"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Generating PDF Report...</span>
              </span>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Generate &amp; Download PDF</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center space-x-1.5 text-[10px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <span>All reports are generated securely and contain your persistent data.</span>
        </div>

      </div>
    </div>
  );
}

export default ReportPage;
