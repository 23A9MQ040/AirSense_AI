import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE_URL } from '../App';
import { 
  Heart, ShieldAlert, ShieldCheck, MapPin, Search, RefreshCw, 
  Activity, Sparkles, AlertTriangle, Thermometer, 
  Droplets, Wind as WindIcon, Bell, TrendingUp, TrendingDown, 
  Clock, CheckCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─── AQI Gauge Component ────────────────────────────────────────
function AQIGauge({ aqi }) {
  const getColor = (v) => {
    if (v <= 50) return '#10b981';
    if (v <= 100) return '#f59e0b';
    if (v <= 150) return '#f97316';
    if (v <= 200) return '#ef4444';
    if (v <= 300) return '#8b5cf6';
    return '#7f1d1d';
  };
  const getLabel = (v) => {
    if (v <= 50) return 'Good';
    if (v <= 100) return 'Moderate';
    if (v <= 150) return 'Unhealthy (Sensitive)';
    if (v <= 200) return 'Unhealthy';
    if (v <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const pct = Math.min(100, (aqi / 400) * 100);
  const color = getColor(aqi);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-24 overflow-hidden">
        <svg viewBox="0 0 200 100" className="w-full">
          <path d="M10,100 A90,90 0 0,1 190,100" fill="none" stroke="#1e293b" strokeWidth="18" />
          <path
            d="M10,100 A90,90 0 0,1 190,100"
            fill="none"
            stroke={color}
            strokeWidth="18"
            strokeDasharray={`${pct * 2.83} 283`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-4xl font-black" style={{ color }}>{aqi}</span>
          <span className="text-xs font-bold" style={{ color }}>AQI</span>
        </div>
      </div>
      <span className="mt-1 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: color + '22', color }}>
        {getLabel(aqi)}
      </span>
    </div>
  );
}

// ─── Risk Badge ─────────────────────────────────────────────────
function RiskBadge({ level }) {
  const cfg = {
    LOW: { color: 'text-emerald-400', bg: 'bg-emerald-950/50 border-emerald-900/40', icon: ShieldCheck },
    MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-950/50 border-amber-900/40', icon: AlertTriangle },
    HIGH: { color: 'text-orange-400', bg: 'bg-orange-950/50 border-orange-900/40', icon: ShieldAlert },
    CRITICAL: { color: 'text-red-400', bg: 'bg-red-950/50 border-red-900/40', icon: ShieldAlert },
  };
  const c = cfg[level] || cfg.MEDIUM;
  const Icon = c.icon;
  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border ${c.bg}`}>
      <Icon className={`w-5 h-5 ${c.color}`} />
      <span className={`font-bold ${c.color}`}>{level}</span>
    </div>
  );
}

// ─── Pollutant Card ─────────────────────────────────────────────
function PollutantCard({ label, value, unit, max, color = '#10b981' }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className="text-sm font-bold text-white">{Number(value).toFixed(1)} <span className="text-xs text-slate-500">{unit}</span></span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Weather Card ───────────────────────────────────────────────
function WeatherCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex flex-col items-center bg-slate-900/50 border border-slate-800 rounded-xl p-3">
      <Icon className={`w-5 h-5 mb-1 ${color}`} />
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user, updateLocation } = useAuth();
  
  const [city, setCity] = useState(user.location || 'Delhi');
  const [searchInput, setSearchInput] = useState(user.location || 'Delhi');
  const [stats, setStats] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [forecast, setForecast] = useState(null);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  
  const [age, setAge] = useState(25);
  const [asthmaHistory, setAsthmaHistory] = useState(false);
  const [allergyType, setAllergyType] = useState('None');
  const [sensitivityLevel, setSensitivityLevel] = useState('LOW');

  const fetchDashboardData = async (targetCity) => {
    setLoadingStats(true);
    setStatsError('');
    try {
      const headers = {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json'
      };

      const [statsRes, profileRes, alertsRes, histRes, forecastRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/dashboard/stats?city=${targetCity}`, { headers }),
        fetch(`${API_BASE_URL}/api/dashboard/health-profile`, { headers }),
        fetch(`${API_BASE_URL}/api/dashboard/alerts`, { headers }),
        fetch(`${API_BASE_URL}/api/dashboard/history?city=${targetCity}`, { headers }),
        fetch(`${API_BASE_URL}/api/dashboard/forecast?city=${targetCity}`, { headers }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const d = await statsRes.value.json();
        setStats(d);
        if (d.city && d.city !== user.location) {
          updateLocation(d.city);
          setCity(d.city);
          setSearchInput(d.city);
        }
      } else {
        throw new Error('Failed to fetch air quality data');
      }

      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const d = await profileRes.value.json();
        setHealthProfile(d);
        setAge(d.age || 25);
        setAsthmaHistory(d.asthmaHistory || false);
        setAllergyType(d.allergyType || 'None');
        setSensitivityLevel(d.sensitivityLevel || 'LOW');
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        setAlerts(await alertsRes.value.json());
      }

      if (histRes.status === 'fulfilled' && histRes.value.ok) {
        setHistory(await histRes.value.json());
      }

      if (forecastRes.status === 'fulfilled' && forecastRes.value.ok) {
        setForecast(await forecastRes.value.json());
      }
    } catch (e) {
      setStatsError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { fetchDashboardData(city); }, [city]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) setCity(searchInput.trim());
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const headers = { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE_URL}/api/dashboard/health-profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ age: Number(age), asthmaHistory, allergyType, sensitivityLevel }),
      });
      if (!res.ok) throw new Error('Update failed');
      setProfileSuccess('Health profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (e) {
      setStatsError('Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Chart data for history
  const histChartData = {
    labels: history.slice(-10).map((h, i) => `${i + 1}`),
    datasets: [{
      label: 'AQI',
      data: history.slice(-10).map(h => h.aqi),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 3,
    }],
  };

  // Chart data for forecast
  const forecastChartData = forecast ? {
    labels: forecast.forecast.slice(0, 12).map(f => f.label),
    datasets: [{
      label: 'Predicted AQI',
      data: forecast.forecast.slice(0, 12).map(f => f.aqi),
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139,92,246,0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 2,
    }],
  } : null;

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 10 } } },
    },
  };

  // Pollutant bar chart
  const pollutantBarData = stats ? {
    labels: ['PM2.5', 'PM10', 'CO×10', 'NO2', 'SO2', 'O3'],
    datasets: [{
      data: [
        stats.pm25, stats.pm10,
        (stats.co || 0.4) * 10,
        stats.no2 || 12,
        stats.so2 || 4.5,
        stats.o3 || 65,
      ],
      backgroundColor: ['#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'],
      borderRadius: 4,
    }],
  } : null;

  if (loadingStats && !stats) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading air quality data...</p>
        </div>
      </div>
    );
  }

  if (statsError && !stats) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="bg-red-950/40 border border-red-900/40 rounded-xl p-6 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-semibold mb-2">Failed to load dashboard</p>
          <p className="text-slate-400 text-sm mb-4">{statsError}</p>
          <button onClick={() => fetchDashboardData(city)} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hello, <span className="text-emerald-400">{user.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-slate-400 text-sm">Your personalized air quality dashboard</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1 text-slate-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>Auto-refresh every 10min</span>
          </span>
          <button
            onClick={() => fetchDashboardData(city)}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-emerald-900/40 hover:text-emerald-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* City Search */}
      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden focus-within:border-emerald-700/50 transition-colors">
          <MapPin className="w-4 h-4 text-slate-500 ml-3 flex-shrink-0" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search city..."
            className="flex-1 bg-transparent text-white px-3 py-2.5 text-sm outline-none placeholder-slate-600"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors flex items-center space-x-1.5">
          <Search className="w-4 h-4" />
          <span>Search</span>
        </button>
      </form>

      {stats && (
        <>
          {/* Top Row: AQI + Risk + Weather */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* AQI Panel */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center">
              <div className="flex items-center space-x-2 mb-3">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">{stats.city}</span>
              </div>
              <AQIGauge aqi={stats.aqi} />
              <p className="text-xs text-slate-500 mt-3">Last updated: {stats.timestamp ? new Date(stats.timestamp).toLocaleTimeString() : 'Just now'}</p>
            </div>

            {/* Health Risk Panel */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center space-x-1">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>Your Health Risk</span>
              </h3>
              <RiskBadge level={stats.risk_level || 'MEDIUM'} />
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Risk Score</span>
                  <span className="text-white font-bold">{stats.risk_score || 0}/100</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${stats.risk_score || 0}%`,
                      backgroundColor: stats.risk_score > 75 ? '#ef4444' : stats.risk_score > 50 ? '#f97316' : stats.risk_score > 25 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
              </div>
              {asthmaHistory && (
                <div className="mt-3 flex items-center space-x-2 text-xs text-amber-400 bg-amber-950/30 rounded-lg px-2 py-1.5 border border-amber-900/30">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>Asthma profile active — personalized risk calculated</span>
                </div>
              )}
            </div>

            {/* Weather Panel */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center space-x-1">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Weather Conditions</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <WeatherCard icon={Thermometer} label="Temp" value={`${stats.temperature || '--'}°C`} color="text-orange-400" />
                <WeatherCard icon={Droplets} label="Humidity" value={`${stats.humidity || '--'}%`} color="text-blue-400" />
                <WeatherCard icon={WindIcon} label="Wind" value={`${stats.windSpeed || '--'} km/h`} color="text-teal-400" />
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center space-x-1">
                <Activity className="w-3 h-3" />
                <span>Conditions affect pollutant dispersion</span>
              </div>
            </div>
          </div>

          {/* Pollutant Cards Row */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">Pollutant Levels</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <PollutantCard label="PM2.5" value={stats.pm25 || 0} unit="μg/m³" max={200} color="#10b981" />
              <PollutantCard label="PM10" value={stats.pm10 || 0} unit="μg/m³" max={400} color="#f59e0b" />
              <PollutantCard label="CO" value={(stats.co || 0.4)} unit="mg/m³" max={10} color="#ef4444" />
              <PollutantCard label="NO2" value={stats.no2 || 12} unit="μg/m³" max={200} color="#8b5cf6" />
              <PollutantCard label="SO2" value={stats.so2 || 4.5} unit="μg/m³" max={100} color="#06b6d4" />
              <PollutantCard label="O3" value={stats.o3 || 65} unit="μg/m³" max={200} color="#f97316" />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* AQI History Chart */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center space-x-1">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>AQI History</span>
              </h3>
              <div className="h-48">
                {history.length > 0 ? (
                  <Line data={histChartData} options={chartOpts} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                    Collecting history data...
                  </div>
                )}
              </div>
            </div>

            {/* Forecast Chart */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>12-Hour AQI Forecast</span>
              </h3>
              <div className="h-48">
                {forecastChartData ? (
                  <Line data={forecastChartData} options={chartOpts} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                    Loading forecast...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pollutant Bar Chart */}
          {pollutantBarData && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-400 mb-4">Pollutant Comparison</h3>
              <div className="h-40">
                <Bar data={pollutantBarData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } } }} />
              </div>
            </div>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center space-x-1">
                <Bell className="w-4 h-4" />
                <span>Health Alerts ({alerts.length})</span>
              </h3>
              <div className="space-y-2">
                {alerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className="flex items-start space-x-2 text-sm text-slate-300 bg-slate-900/60 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Health Profile Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-800/30 transition-colors"
        >
          <h3 className="text-sm font-semibold text-slate-300 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Update Health Profile</span>
          </h3>
          {showProfile ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>
        {showProfile && (
          <form onSubmit={handleUpdateProfile} className="px-5 pb-5 space-y-4 border-t border-slate-800 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Age</label>
                <input
                  type="number" min="1" max="120"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-700/60"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Allergy Type</label>
                <select
                  value={allergyType}
                  onChange={e => setAllergyType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-700/60"
                >
                  {['None', 'Dust', 'Pollen', 'Mold', 'Pet Dander', 'Chemical', 'Multiple'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Sensitivity Level</label>
                <select
                  value={sensitivityLevel}
                  onChange={e => setSensitivityLevel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-700/60"
                >
                  {['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asthmaHistory}
                    onChange={e => setAsthmaHistory(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="ml-3 text-sm text-slate-300">Asthma / Respiratory History</span>
                </label>
              </div>
            </div>
            {profileSuccess && (
              <div className="flex items-center space-x-2 text-emerald-400 text-sm bg-emerald-950/30 border border-emerald-900/30 rounded-xl px-3 py-2">
                <CheckCircle className="w-4 h-4" />
                <span>{profileSuccess}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={updatingProfile}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {updatingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
