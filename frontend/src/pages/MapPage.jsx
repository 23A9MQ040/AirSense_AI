import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../App';
import { MapPin, Search, Plus, Trash2, ShieldAlert, Thermometer, Wind, Eye } from 'lucide-react';

function MapPage() {
  const { user } = useAuth();
  const [cities, setCities] = useState(['Delhi', 'London', 'New York', 'Beijing', 'Sydney']);
  const [cityData, setCityData] = useState({});
  const [searchCity, setSearchCity] = useState('');
  const [activePollutant, setActivePollutant] = useState('pm25'); // pm25 or pm10
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch stats for a city
  const fetchCityStats = async (cityName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats?city=${cityName}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch for ${cityName}`);
      const data = await response.json();
      return data;
    } catch (err) {
      // Return simulated fallback for map demonstration if API fails
      const mockData = {
        city: cityName.charAt(0).toUpperCase() + cityName.slice(1),
        aqi: cityName.toLowerCase().includes('delhi') ? 210 : (cityName.toLowerCase().includes('london') ? 52 : 75),
        pm25: cityName.toLowerCase().includes('delhi') ? 160.0 : (cityName.toLowerCase().includes('london') ? 12.0 : 24.0),
        pm10: cityName.toLowerCase().includes('delhi') ? 280.0 : (cityName.toLowerCase().includes('london') ? 22.0 : 45.0),
        risk_level: cityName.toLowerCase().includes('delhi') ? 'HIGH' : 'LOW',
        latitude: Math.random() * 140 - 70, // random lat between -70 and 70
        longitude: Math.random() * 360 - 180 // random lon between -180 and 180
      };
      return mockData;
    }
  };

  const loadAllCities = async () => {
    setLoading(true);
    const dataMap = {};
    for (const city of cities) {
      dataMap[city] = await fetchCityStats(city);
    }
    setCityData(dataMap);
    setLoading(false);
  };

  useEffect(() => {
    loadAllCities();
  }, [cities]);

  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!searchCity.trim()) return;
    const cleanCity = searchCity.trim();
    if (cities.includes(cleanCity)) {
      setSearchCity('');
      return;
    }

    setLoading(true);
    const stats = await fetchCityStats(cleanCity);
    setCityData(prev => ({ ...prev, [cleanCity]: stats }));
    setCities(prev => [...prev, cleanCity]);
    setSearchCity('');
    setLoading(false);
  };

  const handleRemoveCity = (cityToRemove) => {
    setCities(prev => prev.filter(c => c !== cityToRemove));
    setCityData(prev => {
      const copy = { ...prev };
      delete copy[cityToRemove];
      return copy;
    });
  };

  const getAqiColor = (aqi) => {
    if (aqi <= 50) return 'bg-emerald-500 text-emerald-100';
    if (aqi <= 100) return 'bg-yellow-500 text-yellow-950';
    if (aqi <= 150) return 'bg-orange-500 text-orange-100';
    if (aqi <= 200) return 'bg-rose-500 text-rose-100';
    return 'bg-purple-600 text-purple-100';
  };

  // Removed mockCoordinates since we dynamically calculate coordinates now

  return (
    <div className="fade-in space-y-8 pb-10">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white m-0">
            Map &amp; <span className="text-gradient-emerald">Hotspots</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Geographical air quality heatmaps and comparison index</p>
        </div>

        {/* Search City to Add */}
        <form onSubmit={handleAddCity} className="flex items-center space-x-2 w-full md:w-fit">
          <div className="relative w-full md:w-56">
            <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="Add city to monitor..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all"
            title="Monitor city"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Mock Map / Hotspots Panel (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Hotspots Heatmap</h3>
              
              {/* Pollutant selector */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActivePollutant('pm25')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activePollutant === 'pm25' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  PM2.5 Heatmap
                </button>
                <button
                  onClick={() => setActivePollutant('pm10')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activePollutant === 'pm10' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  PM10 Heatmap
                </button>
              </div>
            </div>

            {/* Visual SVG Map Container */}
            <div className="relative bg-slate-950 rounded-2xl border border-slate-900 h-96 overflow-hidden flex items-center justify-center">
              
              {/* Abstract Map Background grid */}
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>

              {/* Map Illustration (Standard World Map SVG silhouette) */}
              <svg className="w-full h-full text-slate-800/20 px-8" viewBox="0 0 1000 500" fill="currentColor">
                <path d="M150,150 Q180,120 220,130 T280,180 T350,140 T420,170 T500,120 T600,150 T700,130 T800,190 T900,150 L950,300 Q900,350 800,320 T700,380 T600,350 T500,410 T400,370 T300,420 T200,380 Z" />
              </svg>

              {/* Hotspot Markers */}
              {cities.map((city, idx) => {
                const data = cityData[city];
                if (!data) return null;

                // Dynamically project real GPS coordinates to flat map (Equirectangular)
                const lat = data.latitude || (Math.sin(idx) * 60);
                const lon = data.longitude || (Math.cos(idx) * 120);
                const xPercent = ((lon + 180) / 360) * 100;
                // Add slight vertical offset for map SVG styling alignment
                const yPercent = ((90 - lat) / 180) * 100;
                
                const coords = { x: `${xPercent}%`, y: `${yPercent}%`, scale: 1.2 };

                const value = activePollutant === 'pm25' ? data.pm25 : data.pm10;
                // Determine size based on pollutant value
                const size = Math.max(16, Math.min(60, value * coords.scale * 0.25));

                return (
                  <div
                    key={city}
                    className="absolute group cursor-pointer transition-all duration-300 hover:scale-125"
                    style={{ left: coords.x, top: coords.y }}
                  >
                    {/* Glowing hotspot */}
                    <div
                      className={`rounded-full opacity-60 animate-ping absolute -inset-2 ${
                        data.aqi > 150 ? 'bg-rose-500' : (data.aqi > 100 ? 'bg-orange-500' : 'bg-emerald-500')
                      }`}
                      style={{ width: `${size + 16}px`, height: `${size + 16}px` }}
                    ></div>
                    
                    {/* Hotspot core */}
                    <div
                      className={`rounded-full relative border border-slate-900/60 shadow-lg flex items-center justify-center font-black text-[10px] ${
                        data.aqi > 150 ? 'bg-rose-600 text-white' : (data.aqi > 100 ? 'bg-orange-500 text-slate-950' : 'bg-emerald-500 text-white')
                      }`}
                      style={{ width: `${size}px`, height: `${size}px` }}
                    >
                      {Math.round(value)}
                    </div>

                    {/* Hover detail tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl z-20 w-44 pointer-events-none">
                      <div className="font-bold text-white text-xs">{data.city}</div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>AQI Index:</span>
                        <span className="font-bold text-white">{data.aqi}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{activePollutant.toUpperCase()}:</span>
                        <span className="font-bold text-emerald-400">{value} µg/m³</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Risk Level:</span>
                        <span className={`font-bold ${data.risk_level === 'HIGH' ? 'text-rose-400' : 'text-emerald-400'}`}>{data.risk_level}</span>
                      </div>
                    </div>

                  </div>
                );
              })}

            </div>
          </div>
        </div>

        {/* Comparison Index Sidebar (1 Col) */}
        <div className="space-y-6">
          <div className="glass-panel p-6 border-slate-800 space-y-4">
            <h3 className="font-bold text-lg text-white">City Comparison Index</h3>
            
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {cities.map(city => {
                  const data = cityData[city];
                  if (!data) return null;

                  return (
                    <div key={city} className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl flex items-center justify-between hover:border-slate-800 transition-colors">
                      <div className="text-left space-y-1">
                        <div className="font-bold text-sm text-white flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{data.city}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex space-x-2">
                          <span>PM2.5: {data.pm25}</span>
                          <span>PM10: {data.pm10}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-black ${getAqiColor(data.aqi)}`}>
                          {data.aqi}
                        </div>
                        {city !== user.location && (
                          <button
                            onClick={() => handleRemoveCity(city)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                            title="Remove from monitoring list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}

export default MapPage;
