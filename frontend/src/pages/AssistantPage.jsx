import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE_URL } from '../App';
import { 
  Send, BrainCircuit, Mic, MicOff, Volume2, VolumeX, 
  Bot, User, Sparkles, ShieldAlert, Heart, Activity, AlertTriangle
} from 'lucide-react';

function AssistantPage() {
  const { user } = useAuth();
  
  // Chat message states
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${user.name}! I am your AirSense Assistant. I can evaluate the air quality in your city, analyze your health risk profile, and offer medical precautions. What city or queries can I assist with today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentCity, setCurrentCity] = useState(user.location || 'Delhi');

  // Speech Recognition & Synthesis states
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Set up Speech Recognition on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    } else {
      alert('Speech Recognition is not supported by your current browser.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Text to Speech
  const speakText = (text) => {
    if (!voiceEnabled) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/\[[^\]]+\]/g, '').trim(); // Remove brackets like [Agent: AirQualityMonitoringAgent]
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: userMessage,
          city: currentCity
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Agent failed to respond.');
      }

      setMessages((prev) => [
        ...prev, 
        { 
          role: 'assistant', 
          text: data.response,
          isMock: !data.success, // Flag if mock response was served
          stats: {
            aqi: data.aqi,
            riskLevel: data.risk_level,
            riskScore: data.risk_score,
            alerts: data.alerts
          }
        }
      ]);

      // Speak the response
      speakText(data.response);

    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `I encountered an error executing the agent pipeline: ${err.message}. Please verify that the Python ADK agents script and MCP servers are configured correctly and that your GEMINI_API_KEY is active.`,
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in max-w-4xl mx-auto flex flex-col h-[calc(100vh-12rem)] min-h-[30rem]">
      
      {/* Page Title & Control Bar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-900">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/25">
            <BrainCircuit className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white font-sans m-0">AI Health Assistant</h2>
            <p className="text-xs text-slate-400">Google ADK Multi-Agent Workflow Core</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          
          {/* City selector */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">City:</span>
            <input
              type="text"
              value={currentCity}
              onChange={(e) => setCurrentCity(e.target.value)}
              className="bg-transparent text-emerald-300 font-bold border-none p-0 text-xs w-16 focus:outline-none focus:ring-0"
              title="Target city for monitoring agent"
            />
          </div>

          {/* Voice toggle */}
          <button
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (voiceEnabled) window.speechSynthesis.cancel();
            }}
            className={`p-2.5 rounded-xl border transition-all ${
              voiceEnabled 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={voiceEnabled ? 'Disable Voice Output' : 'Enable Voice Output'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-grow overflow-y-auto space-y-6 pr-2 mb-4 bg-slate-950/40 rounded-2xl border border-slate-900 p-6 shadow-inner">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start space-x-3 max-w-[85%] ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`p-2 rounded-xl flex-shrink-0 border ${
              msg.role === 'user' 
                ? 'bg-slate-900 border-slate-800 text-slate-300' 
                : 'bg-emerald-950/60 border-emerald-500/20 text-emerald-400'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className="space-y-2">
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed text-left ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-slate-900/80 border border-slate-850 text-slate-200 rounded-tl-none shadow-md'
              }`}>
                {msg.text}
              </div>

              {/* Stats attachment if available */}
              {msg.stats && (
                <div className="bg-slate-950/80 border border-slate-900 p-4 rounded-xl text-xs space-y-3 text-left w-72">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold border-b border-slate-900 pb-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Agent Resolution Statistics</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">AQI INDEX</span>
                      <span className="text-white font-semibold">{msg.stats.aqi}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">RISK LEVEL</span>
                      <span className="text-rose-400 font-bold">{msg.stats.riskLevel}</span>
                    </div>
                  </div>
                  
                  {msg.stats.alerts && msg.stats.alerts.length > 0 && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg flex items-start space-x-1 text-rose-400 text-[10px]">
                      <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{msg.stats.alerts[0]}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Warning tag if mock fallback response served */}
              {msg.isMock && (
                <div className="flex items-center space-x-1 text-amber-500 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2 py-1 text-[10px] w-fit">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Fallback Mode: Model API key unavailable</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900/60 border border-slate-850 px-4 py-3 rounded-2xl rounded-tl-none shadow-md flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input controls form */}
      <form onSubmit={handleSend} className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Listening to voice...' : 'Ask AirSense AI...'}
          disabled={loading || isListening}
          className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl py-4 pl-5 pr-28 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm shadow-xl"
        />

        <div className="absolute right-3 flex items-center space-x-2">
          {/* Voice Speech recognition button */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={loading}
            className={`p-2.5 rounded-xl transition-all ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'text-slate-400 hover:text-white bg-slate-950/40 border border-slate-800'
            }`}
            title={isListening ? 'Stop Speech Recognition' : 'Record Speech Input'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/50 disabled:text-slate-500 text-white p-2.5 rounded-xl shadow-lg transition-all active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
      
    </div>
  );
}

export default AssistantPage;
