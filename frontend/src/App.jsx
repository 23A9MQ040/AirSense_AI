import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { Wind, ShieldAlert, BrainCircuit, FileDown, LogOut, User as UserIcon, LogIn, UserPlus, Menu, X, Map as MapIcon } from 'lucide-react';

// Export API Base URL — uses env variable in production (Render backend)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Auth Context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('airsense_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('airsense_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('airsense_user');
  };

  const updateLocation = (newLocation) => {
    if (user) {
      const updated = { ...user, location: newLocation };
      setUser(updated);
      localStorage.setItem('airsense_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateLocation }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Imports of pages (we will write these next)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AssistantPage from './pages/AssistantPage';
import ReportPage from './pages/ReportPage';
import MapPage from './pages/MapPage';

function Navigation() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass-panel sticky top-0 z-50 rounded-none border-t-0 border-x-0 bg-slate-950/80 backdrop-blur-lg px-4 sm:px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 group">
          <Wind className="w-8 h-8 text-emerald-400 group-hover:rotate-90 transition-transform duration-500" />
          <span className="text-2xl font-bold tracking-tight font-sans text-gradient-emerald">
            AirSense <span className="text-white font-medium text-lg">AI</span>
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="hover:text-emerald-400 transition-colors">Home</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="hover:text-emerald-400 transition-colors flex items-center space-x-1">
                <span>Dashboard</span>
              </Link>
              <Link to="/assistant" className="hover:text-emerald-400 transition-colors flex items-center space-x-1">
                <BrainCircuit className="w-4 h-4 text-emerald-400" />
                <span>AI Assistant</span>
              </Link>
              <Link to="/map" className="hover:text-emerald-400 transition-colors flex items-center space-x-1">
                <MapIcon className="w-4 h-4 text-emerald-400" />
                <span>Map Hotspots</span>
              </Link>
              <Link to="/report" className="hover:text-emerald-400 transition-colors flex items-center space-x-1">
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>Health Report</span>
              </Link>
              <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Logged in as</div>
                  <div className="text-sm font-semibold text-emerald-300">{user.name}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-slate-900 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-slate-800 hover:border-rose-900/60 p-2.5 rounded-xl transition-all duration-300"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all duration-300"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-400 hover:text-white p-2"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-slate-800 flex flex-col space-y-3 px-2 pb-2">
          <Link to="/" onClick={() => setIsOpen(false)} className="hover:text-emerald-400 transition-colors py-1">Home</Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setIsOpen(false)} className="hover:text-emerald-400 transition-colors py-1">Dashboard</Link>
              <Link to="/assistant" onClick={() => setIsOpen(false)} className="hover:text-emerald-400 transition-colors py-1 flex items-center space-x-2">
                <BrainCircuit className="w-4 h-4 text-emerald-400" />
                <span>AI Assistant</span>
              </Link>
              <Link to="/map" onClick={() => setIsOpen(false)} className="hover:text-emerald-400 transition-colors py-1 flex items-center space-x-2">
                <MapIcon className="w-4 h-4 text-emerald-400" />
                <span>Map Hotspots</span>
              </Link>
              <Link to="/report" onClick={() => setIsOpen(false)} className="hover:text-emerald-400 transition-colors py-1 flex items-center space-x-2">
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>Health Report</span>
              </Link>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">User</div>
                  <div className="text-sm font-semibold text-emerald-300">{user.name}</div>
                </div>
                <button
                  onClick={() => { handleLogout(); setIsOpen(false); }}
                  className="flex items-center space-x-2 text-rose-400 hover:text-rose-300 py-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col space-y-2 pt-2 border-t border-slate-800">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-slate-300 border border-slate-800 hover:bg-slate-900 transition-all duration-300"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white transition-all duration-300"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 flex flex-col">
          <Navigation />
          
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/assistant" 
                element={
                  <ProtectedRoute>
                    <AssistantPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/report" 
                element={
                  <ProtectedRoute>
                    <ReportPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/map" 
                element={
                  <ProtectedRoute>
                    <MapPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
            <p>© 2026 AirSense AI Platform. All rights reserved.</p>
            <p className="mt-1 text-slate-600">Disclaimer: Information provided is purely advisory and does not replace medical diagnosis.</p>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
