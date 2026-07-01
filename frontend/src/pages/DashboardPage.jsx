import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../App';
import { 
  Heart, ShieldAlert, ShieldCheck, MapPin, Search, RefreshCw, 
  Activity, Sparkles, User, UserCheck, AlertTriangle, Thermometer, 
  Droplets, Wind as WindIcon, Bell 
} from 'lucide-react';

function DashboardPage() {
  const { user, updateLocation } = useAuth();
  
  // Dashboard states
  const [city, setCity] = useState(user.location || 'Delhi');
  const [searchInput, setSearchInput] = useState(user.location || 'Delhi');
  const [stats, setStats] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Loading & error states
  const [loadingStats, setLoadingStats] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  
  // Health Profile Form states
  const [age, setAge] = useState(25);
  const [asthmaHistory, setAsthmaHistory] = useState(false);
  const [allergyType, setAllergyType] = useState('None');
  const [sensitivityLevel, setSensitivityLevel] = useState('LOW');

  // Fetch all dashboard data
  const fetchDashboardData = async (targetCity) => {
    setLoadingStats(true);
    setStatsError('');
    try {
      const headers = {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json'
      };

      // 1. Fetch Stats
      const statsRes = await fetch(`${API_BASE_URL}/api/dashboard/stats?city=${targetCity}`, { headers });
      if (!statsRes.ok) throw new Error('Failed to fetch air quality stats');
      const statsData = await statsRes.json();
      setStats(statsData);
      
      // Update location in context and localstorage if changed
      if (statsData.city && statsData.city !== user.location) {
        updateLocation(statsData.city);
        setCity(statsData.city);
        setSearchInput(statsData.city);
      }

      // 2. Fetch Health Profile (only once, or refetch to sync)
      const profileRes = await fetch(`${API_BASE_URL}/api/dashboard/health-profile`, { headers });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setHealthProfile(profileData);
        setAge(profileData.age);
        setAsthmaHistory(profileData.asthmaHistory);
        setAllergyType(profileData.allergyType);
        setSensitivityLevel(profileData.sensitivityLevel);
      }

      // 3. Fetch Alerts
      const alertsRes = await fetch(`${API_BASE_URL}/api/dashboard/alerts`, { headers });
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }

      // 4. Fetch History
      const historyRes = await fetch(`${API_BASE_URL}/api/dashboard/history?city=${targetCity}`, { headers });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }

    } catch (err) {
      setStatsError(err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(city);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchDashboardData(searchInput.trim());
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileSuccess('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/health-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          age,
          asthmaHistory,
          allergyType,
          sensitivityLevel
        })
      });

      if (!response.ok) throw new Error('Failed to update health profile');
      const updatedProfile = await response.json();
      setHealthProfile(updatedProfile);
      setProfileSuccess('Profile updated successfully!');
      
      // Immediately recalculate risk stats for the current city
      fetchDashboardData(city);
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Helper to get AQI category styles
  const getAqiConfig = (aqi) => {
    if (aqi <= 50) return { label: 'Good', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', barColor: 'bg-emerald-500' };
    if (aqi <= 100) return { label: 'Moderate', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10', barColor: 'bg-yellow-500' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: 'text-orange-400 border-orange-500/20 bg-orange-500/10', barColor: 'bg-orange-500' };
    if (aqi <= 200) return { label: 'Unhealthy', color: 'text-rose-400 border-rose-500/20 bg-rose-500/10', barColor: 'bg-rose-500' };
    if (aqi <= 300) return { label: 'Very Unhealthy', color: 'text-purple-400 border-purple-500/20 bg-purple-500/10', barColor: 'bg-purple-500' };
    return { label: 'Hazardous', color: 'text-red-500 border-red-500/20 bg-red-500/10', barColor: 'bg-red-700' };
  };

  // Helper to get Risk Level color
  const getRiskConfig = (level) => {
    switch (level?.toUpperCase()) {
      case 'HIGH':
        return { label: 'High Risk Alert', color: 'text-rose-400 bg-rose-500/10 border-rose-500/25', icon: <ShieldAlert className="w-5 h-5 text-rose-400" /> };
      case 'MEDIUM':
        return { label: 'Medium Risk Warning', color: 'text-amber-400 bg-amber-500/10 border-amber-500/25', icon: <AlertTriangle className="w-5 h-5 text-amber-400" /> };
      default:
        return { label: 'Low Risk Status', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: <ShieldCheck className="w-5 h-5 text-emerald-400" /> };
    }
  };

  return (
    <div className="fade-in space-y-8 pb-10">
      
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white m-0">
            Welcome, <span className="text-gradient-emerald">{user.name}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Real-time health risk &amp; pollution tracking dashboard</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full md:w-fit">
          <div className="relative w-full md:w-64">
            <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search city (e.g. Delhi)..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => fetchDashboardData(city)}
            className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-white p-3 rounded-xl transition-all"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {statsError && (
        <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/25 p-4 rounded-xl text-rose-400 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>Error loading city statistics: {statsError}. Showing simulated fallbacks.</span>
        </div>
      )}

      {loadingStats ? (
        <div className="w-full h-80 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-slate-400 text-sm">Fetching live air quality metrics...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Air Quality Info (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* AQI Gauge Display */}
            {stats && (
              <div className="glass-panel p-8 flex flex-col md:flex-row items-center justify-between gap-8 emerald-glow">
                
                {/* Visual Gauge */}
                <div className="relative flex flex-col items-center justify-center">
                  <div className="w-44 h-44 rounded-full border-8 border-slate-800 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">AQI INDEX</span>
                    <span className={`text-6xl font-black tracking-tighter ${getAqiConfig(stats.aqi).color.split(' ')[0]}`}>
                      {stats.aqi}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-1">LAST HOUR</span>
                  </div>
                  {/* Pulse ring if high risk */}
                  {stats.aqi > 150 && (
                    <div className="absolute inset-0 rounded-full border border-rose-500/30 pulse-ring-emerald animate-ping pointer-events-none"></div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div>
                    <div className="text-xs text-slate-400 font-bold tracking-wider">CURRENT ENVIRONMENT</div>
                    <h2 className="text-4xl font-extrabold text-white mt-1">{stats.city || city}</h2>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className={`border text-xs px-3 py-1 rounded-full font-bold ${getAqiConfig(stats.aqi).color}`}>
                      AQI Status: {getAqiConfig(stats.aqi).label}
                    </span>
                    <span className={`border text-xs px-3 py-1 rounded-full font-bold flex items-center space-x-1 ${getRiskConfig(stats.risk_level).color}`}>
                      {getRiskConfig(stats.risk_level).icon}
                      <span className="ml-1">Predicted Risk: {stats.risk_level} ({Math.round(stats.risk_score * 100)}%)</span>
                    </span>
                  </div>

                  <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                    The health prediction agent flags this level as <span className="font-semibold text-white">{stats.risk_level}</span> for your profile sensitivity. We suggest consulting the AI assistant for custom workouts.
                  </p>
                </div>
              </div>
            )}

            {/* Pollutant Breakdowns */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* PM 2.5 */}
                <div className="glass-panel p-6 border-slate-800/80 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <WindIcon className="w-5 h-5" />
                      <h3 className="font-bold text-sm text-slate-200">Fine Particulate (PM2.5)</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">SAFETY LIMIT: 35.0 µg/m³</span>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-black text-white">{stats.pm25}</span>
                    <span className="text-xs text-slate-400">µg/m³</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${stats.pm25 > 35 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (stats.pm25 / 70) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    PM2.5 particles can penetrate deep into lungs and enter the blood system.
                  </p>
                </div>

                {/* PM 10 */}
                <div className="glass-panel p-6 border-slate-800/80 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <WindIcon className="w-5 h-5" />
                      <h3 className="font-bold text-sm text-slate-200">Coarse Particulate (PM10)</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">SAFETY LIMIT: 150.0 µg/m³</span>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-black text-white">{stats.pm10}</span>
                    <span className="text-xs text-slate-400">µg/m³</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${stats.pm10 > 150 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (stats.pm10 / 250) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    PM10 particles include dust, pollen, and mold fragments.
                  </p>
                </div>

              </div>
            )}

            {/* Historical Air Records */}
            {history.length > 0 && (
              <div className="glass-panel p-6 border-slate-800 space-y-4">
                <h3 className="font-bold text-lg text-white">Historical Pollution Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5">Date / Time</th>
                        <th className="py-2.5">AQI</th>
                        <th className="py-2.5">PM2.5</th>
                        <th className="py-2.5">PM10</th>
                        <th className="py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 5).map((record, index) => (
                        <tr key={index} className="border-b border-slate-900/60 hover:bg-slate-900/40 text-slate-300">
                          <td className="py-2.5">{new Date(record.timestamp).toLocaleString()}</td>
                          <td className={`py-2.5 font-bold ${getAqiConfig(record.aqi).color.split(' ')[0]}`}>{record.aqi}</td>
                          <td className="py-2.5">{record.pm25} µg/m³</td>
                          <td className="py-2.5">{record.pm10} µg/m³</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${getAqiConfig(record.aqi).color}`}>
                              {getAqiConfig(record.aqi).label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* Right Sidebar (1 Col): Profile Form & Alerts */}
          <div className="space-y-8">
            
            {/* Health Profile Card */}
            <div className="glass-panel p-6 border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 text-emerald-400 pb-3 border-b border-slate-850">
                <UserCheck className="w-5 h-5" />
                <h3 className="font-bold text-lg text-white font-sans">Your Health Profile</h3>
              </div>

              {profileSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-400 text-xs font-semibold">
                  {profileSuccess}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 tracking-wider">USER AGE</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-y border-slate-900">
                  <div>
                    <label className="text-xs font-bold text-slate-200">Asthma History</label>
                    <div className="text-[10px] text-slate-400">Increase triggers susceptibility</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={asthmaHistory}
                    onChange={(e) => setAsthmaHistory(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-slate-950 border-slate-800 rounded focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 tracking-wider">ALLERGY TYPE</label>
                  <select
                    value={allergyType}
                    onChange={(e) => setAllergyType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="None">No Active Allergy</option>
                    <option value="Pollen">Pollen Allergy</option>
                    <option value="Dust">Dust &amp; Particulates</option>
                    <option value="Mold">Spore / Mold Allergies</option>
                    <option value="Sulfur">Industrial SO2 Smog</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 tracking-wider">SENSITIVITY LEVEL</label>
                  <select
                    value={sensitivityLevel}
                    onChange={(e) => setSensitivityLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LOW">Low Sensitivity</option>
                    <option value="MEDIUM">Medium / Moderate</option>
                    <option value="HIGH">High Sensitivity</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 font-bold border border-slate-800 py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center space-x-2"
                >
                  {updatingProfile ? 'Recalculating Risk...' : 'Update Health Profile'}
                </button>
              </form>
            </div>

            {/* Active Medical Alerts Card */}
            <div className="glass-panel p-6 border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 text-emerald-400 pb-3 border-b border-slate-850">
                <Bell className="w-5 h-5" />
                <h3 className="font-bold text-lg text-white font-sans">Active Health Warnings</h3>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {alerts.length > 0 ? (
                  alerts.slice(0, 3).map((alert, idx) => (
                    <div key={idx} className="bg-slate-950/60 border border-slate-900 p-3.5 rounded-xl space-y-1 text-left text-xs">
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>CRITICAL NOTIFICATION</span>
                        <span>{new Date(alert.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed font-light">{alert.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No active warnings. Air indexes are within healthy bands.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default DashboardPage;
