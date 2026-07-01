import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Wind, AlertCircle, MessageSquare, ArrowRight, Activity, Database, BrainCircuit, HeartHandshake } from 'lucide-react';
import { useAuth } from '../App';

function LandingPage() {
  const { user } = useAuth();

  const agents = [
    {
      name: 'AirQualityMonitoringAgent',
      role: 'Collects real-time PM2.5, PM10, and AQI pollutant data for any city.',
      icon: <Wind className="w-6 h-6 text-emerald-400" />,
      color: 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
    },
    {
      name: 'HealthRiskPredictionAgent',
      role: 'Analyzes live pollution records in conjunction with user health factors (asthma, age, allergies).',
      icon: <Activity className="w-6 h-6 text-cyan-400" />,
      color: 'border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40'
    },
    {
      name: 'AIHealthAssistantAgent',
      role: 'Offers conversational personalized advice, explains triggers, and recommends safety guidelines.',
      icon: <MessageSquare className="w-6 h-6 text-purple-400" />,
      color: 'border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40'
    },
    {
      name: 'NotificationAgent',
      role: 'Triggers alerts, emergency actions, and directions for high-pollution events.',
      icon: <AlertCircle className="w-6 h-6 text-rose-400" />,
      color: 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40'
    }
  ];

  return (
    <div className="fade-in max-w-5xl mx-auto flex flex-col items-center justify-center text-center space-y-16 py-10">
      {/* Hero Header */}
      <div className="space-y-6 max-w-3xl">
        <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400 text-sm font-medium">
          <BrainCircuit className="w-4 h-4" />
          <span>Powered by Google Agent Development Kit (ADK)</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-none text-slate-100">
          Personalized Air Quality &amp; <br />
          <span className="text-gradient-emerald">Health Protection Platform</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 leading-relaxed font-light">
          AirSense AI coordinates specialized AI agents to analyze environmental pollutants, predict personal health risks, and deliver personalized respiratory safety guidelines in real time.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/40 transition-all duration-300"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                <span>Protect Your Lungs Now</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all duration-300"
              >
                <span>Sign In</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Live AQI Preview / Visual Showcase */}
      <div className="w-full max-w-4xl glass-panel p-8 flex flex-col md:flex-row items-center justify-between gap-8 text-left emerald-glow">
        <div className="space-y-4 max-w-md">
          <div className="flex items-center space-x-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg text-xs font-semibold w-fit">
            <ShieldCheck className="w-4 h-4" />
            <span>High Risk Warning Mode Enabled</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Interactive Health Insights</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            The platform combines real-time weather details and chemical pollutant densities (PM2.5, PM10) with your specific medical conditions to compute an accurate risk index.
          </p>
        </div>

        {/* Visual AQI Widget mockup */}
        <div className="w-full md:w-80 glass-panel bg-slate-950/60 p-6 space-y-4 border-slate-800">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-400">MONITORED CITY</span>
              <h3 className="text-lg font-bold text-white">New Delhi, IN</h3>
            </div>
            <span className="text-xs bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2 py-1 rounded-md font-semibold">UNHEALTHY</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-5xl font-black text-rose-500 tracking-tight">210</span>
            <span className="text-xs text-slate-400">AQI INDEX</span>
          </div>
          <div className="border-t border-slate-900 pt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Predicted Health Risk:</span>
              <span className="font-bold text-rose-400">HIGH RISK (85%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Primary Vulnerability:</span>
              <span className="text-slate-200">Asthma History</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Agent Architecture Explanation */}
      <div className="w-full space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-white">Multi-Agent Workflow Coordination</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
            AirSense AI coordinates four specialized agents using a directed workflow graph to secure, analyze, predict, and notify.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent, idx) => (
            <div
              key={idx}
              className={`glass-panel border p-6 flex flex-col items-center text-center space-y-4 transition-all duration-300 cursor-default ${agent.color}`}
            >
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner">
                {agent.icon}
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight text-slate-200">{agent.name}</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{agent.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Policies */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="glass-panel p-6 border-slate-800 text-left space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Database className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-200">PII Data Masking</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Automatically intercepts and redacts personal identifiers (email, phone) with placeholders prior to LLM submission.
          </p>
        </div>

        <div className="glass-panel p-6 border-slate-800 text-left space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <BrainCircuit className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-200">Prompt Injection Block</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Rejects override commands, bypassing keywords, or inspection commands at the security checkpoint node.
          </p>
        </div>

        <div className="glass-panel p-6 border-slate-800 text-left space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <HeartHandshake className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-200">Secure Logs &amp; Audit</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Stores security status transitions inside audit logs to protect personal details while maintaining compliance.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
