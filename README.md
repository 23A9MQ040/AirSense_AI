# AirSense AI 🌿

### AI-Powered Personalized Air Quality Monitoring and Health Protection Platform

> Real-time AQI monitoring · Personalized health risk analysis · Multi-agent AI pipeline · PDF health reports

[![Deploy Frontend](https://github.com/23A9MQ040/AirSense_AI/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/23A9MQ040/AirSense_AI/actions/workflows/gh-pages.yml)
[![CI/CD](https://github.com/23A9MQ040/AirSense_AI/actions/workflows/deploy.yml/badge.svg)](https://github.com/23A9MQ040/AirSense_AI/actions/workflows/deploy.yml)

---

## 🌐 Live Application

| Service | URL |
|---------|-----|
| **Frontend (GitHub Pages)** | https://23a9mq040.github.io/AirSense_AI/ |
| **Backend API (Render)** | https://airsense-ai-backend.onrender.com |
| **GitHub Repo** | https://github.com/23A9MQ040/AirSense_AI |

---

## ✨ Features

- 📊 **Real-time AQI Dashboard** — Live pollutant monitoring (PM2.5, PM10, CO, NO2, SO2, O3)
- 🤖 **AI Health Assistant** — Gemini-powered conversational health guidance
- 🗺️ **Interactive Pollution Map** — Leaflet-based AQI map with city comparison
- 📈 **12-Hour AQI Forecast** — Predictive air quality trends
- 🩺 **Personalized Risk Analysis** — Asthma/allergy-aware health risk scoring
- 📄 **PDF Health Reports** — Downloadable AI-generated health reports
- 🔔 **Smart Alerts** — Emergency notifications for hazardous AQI levels
- 🔐 **JWT Authentication** — Secure user accounts with encrypted passwords
- 🛡️ **Security Checkpoint** — PII detection + prompt injection defense

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│             React Frontend (Vite)            │
│  Landing · Dashboard · Assistant · Map · Report │
└──────────────────┬──────────────────────────┘
                   │ HTTPS (JWT Auth)
                   ▼
┌─────────────────────────────────────────────┐
│           Java Spring Boot Backend           │
│  Auth · Dashboard · AI · Report Controllers  │
└──────────────────┬──────────────────────────┘
                   │ ProcessBuilder
                   ▼
┌─────────────────────────────────────────────┐
│          Python ADK Multi-Agent Pipeline     │
│                                             │
│  security_checkpoint()                      │
│       ↓                                     │
│  AirQualityMonitoringAgent ─ get_air_quality, weather_analysis
│       ↓                                     │
│  HealthRiskPredictionAgent ─ predict_health_risk
│       ↓                                     │
│  AIHealthAssistantAgent ─ generate_recommendation
│       ↓                                     │
│  NotificationAgent ─ emergency_alert        │
└──────────────────┬──────────────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
   WAQI API            Open-Meteo API
   (Live AQI)          (Weather)
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Tailwind CSS, Chart.js, Leaflet |
| **Backend** | Java 20, Spring Boot 3.3, Spring Security, Spring Data JPA |
| **Auth** | JWT (jjwt 0.11.5), BCrypt password encryption |
| **Database** | PostgreSQL (prod) / H2 in-memory (dev) |
| **Cache** | Redis (prod) / Simple (dev) |
| **AI Agents** | Google ADK, Gemini 2.5 Flash, Sequential Pipeline |
| **MCP Tools** | WAQI API, Open-Meteo API, Gemini API |
| **PDF** | OpenPDF (iText fork) |
| **Deployment** | Docker, GitHub Actions, Render (backend), GitHub Pages (frontend) |

---

## 🤖 ADK Multi-Agent Architecture

The AI pipeline uses Google's Agent Development Kit (ADK) with 4 specialized agents:

### Agent Flow
```
User Query → security_checkpoint() → AirQualityMonitoringAgent
                                          ↓ ctx.state: {aqi_level, pm25, weather}
                                   HealthRiskPredictionAgent
                                          ↓ ctx.state: {risk_score, risk_level}
                                   AIHealthAssistantAgent
                                          ↓ (conversational response)
                                   NotificationAgent
                                          ↓ (alerts if needed)
                                   → Final Response
```

### MCP Tools
| Tool | Purpose |
|------|---------|
| `get_air_quality(city)` | Fetch AQI, PM2.5, PM10, CO, NO2, SO2, O3 |
| `predict_health_risk(city, asthma, age, activity)` | Calculate risk score 0-100 |
| `generate_health_recommendation(city, asthma)` | Generate indoor/outdoor tips |
| `weather_analysis(city)` | Temperature, humidity, wind speed |
| `emergency_alert(city, asthma)` | Emergency notification if AQI critical |

### Security Checkpoint
- **PII Detection:** Masks email, phone, SSN, credit card numbers
- **Prompt Injection Defense:** Blocks 10+ attack patterns
- **Audit Logging:** All requests logged to SQLite database

---

## 🗂️ Project Structure

```
AirSense_AI/
├── backend-java/
│   ├── src/main/java/com/airsense/ai/
│   │   ├── controller/    (Auth, Dashboard, AI, Report)
│   │   ├── service/       (AirQuality, HealthRisk, User, AI)
│   │   ├── model/         (User, AirQuality, HealthProfile, Alert, RiskPrediction, AuditLog)
│   │   ├── repository/    (JPA Repositories)
│   │   └── security/      (JWT, SecurityConfig, UserDetailsService)
│   ├── Dockerfile
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── pages/         (Landing, Login, Register, Dashboard, Assistant, Map, Report)
│   │   └── App.jsx        (Router, Auth Context)
│   ├── vercel.json
│   └── package.json
├── agents-cli/
│   ├── agents_workflow.py  (4-agent ADK pipeline)
│   ├── tools_impl.py       (5 MCP tools)
│   ├── GEMINI.md           (Agent documentation)
│   └── Makefile
├── mcp-server/
│   └── mcp_server.py
├── docker-compose.yml
├── render.yaml
└── .github/workflows/
    ├── deploy.yml          (CI/CD build & test)
    └── gh-pages.yml        (GitHub Pages deployment)
```

---

## 🚀 Local Development Setup

### Prerequisites
- Java 20+ JDK
- Python 3.11+
- Node.js 20+
- Maven 3.9+

### 1. Clone & Setup
```bash
git clone https://github.com/23A9MQ040/AirSense_AI.git
cd AirSense_AI
```

### 2. Set Environment Variables
```bash
# Create .env in project root
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Backend
```bash
cd backend-java
./mvnw spring-boot:run
# Backend runs at http://localhost:8080
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

### 5. Test AI Agents
```bash
cd agents-cli
make install   # Install Python deps
make run       # Interactive test run
```

### 6. Start Full Stack (Docker)
```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
```

---

## ☁️ Deployment

### Frontend (GitHub Pages) — Automatic
Every push to `main` triggers automatic deployment via GitHub Actions to:
**https://23a9mq040.github.io/AirSense_AI/**

To enable for the first time:
1. Go to **Repository Settings → Pages**
2. Set **Source** to **GitHub Actions**

### Backend (Render.com)
1. Create account at [render.com](https://render.com)
2. Click **New → Blueprint**
3. Connect `23A9MQ040/AirSense_AI` repository
4. Render will auto-detect `render.yaml`
5. Add `GEMINI_API_KEY` in environment variables
6. Click **Apply** — backend deploys automatically

---

## 🔌 API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT token |
| GET | `/api/auth/profile` | Get user profile |

### Dashboard
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/dashboard/stats?city=Delhi` | AQI + risk stats |
| GET | `/api/dashboard/history?city=Delhi` | Historical AQI data |
| GET | `/api/dashboard/forecast?city=Delhi` | 24-hour AQI forecast |
| GET | `/api/dashboard/alerts` | User health alerts |
| GET | `/api/dashboard/health-profile` | Get health profile |
| PUT | `/api/dashboard/health-profile` | Update health profile |

### AI Assistant
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/ai/ask` | Ask AI assistant |

### Reports
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/report/summary?city=Delhi` | Report summary JSON |
| GET | `/api/report/generate?city=Delhi` | Download PDF report |

---

## 🔒 Security

- **JWT Authentication** — Stateless bearer token auth
- **BCrypt Passwords** — Passwords are never stored in plaintext
- **PII Detection** — User inputs are scanned and masked
- **Prompt Injection Defense** — AI inputs are filtered for injection attacks
- **CORS Configuration** — Only whitelisted origins allowed
- **Audit Logging** — All AI interactions logged for compliance

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file for details.

---

*Built with ❤️ using Google ADK, Gemini AI, Spring Boot, React, and Tailwind CSS*
