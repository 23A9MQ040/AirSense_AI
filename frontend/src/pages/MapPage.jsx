import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE_URL } from '../App';
import { MapPin, Search, RefreshCw, Activity, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

// City comparison data (uses API for real data)
const CITIES = [
  'Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai',
  'Hyderabad', 'Pune', 'New York', 'London', 'Beijing',
  'Shanghai', 'Tokyo', 'Los Angeles', 'Paris', 'Sydney', 'Dubai'
];

function AQICircle({ aqi, size = 'md' }) {
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
    if (v <= 150) return 'USG';
    if (v <= 200) return 'Unhealthy';
    if (v <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };
  const color = getColor(aqi);
  const sz = size === 'sm' ? 'w-12 h-12 text-sm' : 'w-16 h-16 text-lg';
  return (
    <div
      className={`${sz} rounded-full flex flex-col items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: color + '22', border: `2px solid ${color}`, color }}
    >
      <span className="leading-none">{aqi}</span>
      <span className="text-[8px] opacity-70">{getLabel(aqi)}</span>
    </div>
  );
}

export default function MapPage() {
  const { user } = useAuth();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [cityData, setCityData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState(user.location || 'Delhi');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('aqi');
  const [error, setError] = useState('');

  const headers = { 'Authorization': `Bearer ${user.token}` };

  const fetchCityAQI = async (city) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/stats?city=${encodeURIComponent(city)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        return { city, aqi: data.aqi, pm25: data.pm25, pm10: data.pm10, risk_level: data.risk_level };
      }
    } catch (e) {}
    return null;
  };

  const loadCitiesData = async () => {
    setLoading(true);
    setError('');
    // Load current user city first, then a few comparison cities
    const citiesToLoad = [selectedCity, ...CITIES.filter(c => c !== selectedCity).slice(0, 7)];
    const results = await Promise.allSettled(citiesToLoad.map(c => fetchCityAQI(c)));
    const data = {};
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) {
        data[r.value.city] = r.value;
      }
    });
    setCityData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCitiesData();
  }, [selectedCity]);

  const leafletRef = useRef(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    const initMap = async () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        leafletRef.current = L;

        const map = L.map(mapRef.current, {
          center: [20, 77],
          zoom: 4,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      } catch (e) {
        setError('Map failed to load. Showing city comparison instead.');
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Add markers when data loads
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletRef.current || Object.keys(cityData).length === 0) return;

    const CITY_COORDS = {
      'Delhi': [28.6139, 77.2090], 'Mumbai': [19.0760, 72.8777],
      'Bangalore': [12.9716, 77.5946], 'Kolkata': [22.5726, 88.3639],
      'Chennai': [13.0827, 80.2707], 'Hyderabad': [17.3850, 78.4867],
      'Pune': [18.5204, 73.8567], 'New York': [40.7128, -74.0060],
      'London': [51.5074, -0.1278], 'Beijing': [39.9042, 116.4074],
      'Shanghai': [31.2304, 121.4737], 'Tokyo': [35.6762, 139.6503],
      'Los Angeles': [34.0522, -118.2437], 'Paris': [48.8566, 2.3522],
      'Sydney': [-33.8688, 151.2093], 'Dubai': [25.2048, 55.2708],
    };

    const getMarkerColor = (aqi) => {
      if (aqi <= 50) return '#10b981';
      if (aqi <= 100) return '#f59e0b';
      if (aqi <= 150) return '#f97316';
      if (aqi <= 200) return '#ef4444';
      if (aqi <= 300) return '#8b5cf6';
      return '#7f1d1d';
    };

    const L = leafletRef.current;

    try {
      Object.values(cityData).forEach(({ city, aqi }) => {
        const coords = CITY_COORDS[city];
        if (!coords) return;
        const color = getMarkerColor(aqi);
        const icon = L.divIcon({
          html: `<div style="background:${color}22;border:2px solid ${color};color:${color};border-radius:50%;width:44px;height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:bold;font-size:12px;backdrop-filter:blur(4px)">
            <span>${aqi}</span>
          </div>`,
          className: '',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        L.marker(coords, { icon })
          .bindPopup(`<b>${city}</b><br>AQI: ${aqi}`)
          .addTo(mapInstanceRef.current);
      });
    } catch (e) {
      console.error('Failed to add map markers:', e);
    }
  }, [cityData]);

  const sortedCities = Object.values(cityData).sort((a, b) =>
    sortBy === 'aqi' ? b.aqi - a.aqi : a.city.localeCompare(b.city)
  );

  const handleSearchCity = (e) => {
    e.preventDefault();
    if (searchInput.trim()) setSelectedCity(searchInput.trim());
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-emerald-400" />
            <span>AQI Map & City Comparison</span>
          </h1>
          <p className="text-slate-400 text-sm">Real-time pollution hotspots and city rankings</p>
        </div>
        <button onClick={loadCitiesData} className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-emerald-900/40 hover:text-emerald-400 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchCity} className="flex items-center space-x-2">
        <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden focus-within:border-emerald-700/50">
          <Search className="w-4 h-4 text-slate-500 ml-3" />
          <input
            type="text" value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Add city to comparison..."
            className="flex-1 bg-transparent text-white px-3 py-2.5 text-sm outline-none placeholder-slate-600"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors">
          Add City
        </button>
      </form>

      {error && (
        <div className="flex items-center space-x-2 text-amber-400 text-sm bg-amber-950/30 border border-amber-900/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /><span>{error}</span>
        </div>
      )}

      {/* Interactive Map */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">Interactive Pollution Map</h3>
          <p className="text-xs text-slate-500">Colored markers show AQI levels across monitored cities</p>
        </div>
        <div ref={mapRef} className="w-full" style={{ height: '380px', background: '#0f172a' }}>
          {/* Fallback if Leaflet doesn't load */}
          <div className="flex items-center justify-center h-full text-slate-600 text-sm">
            Loading interactive map...
          </div>
        </div>
        {/* AQI Legend */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex flex-wrap gap-3 text-xs">
            {[
              { label: '0-50 Good', color: '#10b981' },
              { label: '51-100 Moderate', color: '#f59e0b' },
              { label: '101-150 USG', color: '#f97316' },
              { label: '151-200 Unhealthy', color: '#ef4444' },
              { label: '201-300 Very Unhealthy', color: '#8b5cf6' },
              { label: '301+ Hazardous', color: '#7f1d1d' },
            ].map(item => (
              <div key={item.label} className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* City Comparison Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">City Comparison</h3>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">Sort by:</span>
            <button
              onClick={() => setSortBy('aqi')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'aqi' ? 'bg-emerald-700/40 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              AQI ↓
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'name' ? 'bg-emerald-700/40 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Name
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Loading city data...</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {sortedCities.map((c, i) => (
              <div key={c.city} className={`flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors ${c.city === selectedCity ? 'bg-emerald-950/10 border-l-2 border-emerald-600' : ''}`}>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-slate-600 w-5 text-right font-mono">#{i + 1}</span>
                  <AQICircle aqi={c.aqi} size="sm" />
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center space-x-1">
                      <span>{c.city}</span>
                      {c.city === selectedCity && <span className="text-xs text-emerald-400">(you)</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      PM2.5: {(c.pm25 || 0).toFixed(1)} · PM10: {(c.pm10 || 0).toFixed(1)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {i === 0 && <TrendingUp className="w-4 h-4 text-red-400" title="Most polluted" />}
                  {i === sortedCities.length - 1 && <TrendingDown className="w-4 h-4 text-emerald-400" title="Cleanest" />}
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    c.risk_level === 'LOW' ? 'bg-emerald-950/50 text-emerald-400' :
                    c.risk_level === 'MEDIUM' ? 'bg-amber-950/50 text-amber-400' :
                    'bg-red-950/50 text-red-400'
                  }`}>{c.risk_level}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
