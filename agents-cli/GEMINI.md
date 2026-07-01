# AirSense AI — Agent Documentation (GEMINI.md)

## Project Overview

**AirSense AI** is an AI-powered air quality monitoring and personalized health protection platform. It uses Google's Agent Development Kit (ADK) to orchestrate a multi-agent pipeline that collects real-time pollution data, predicts health risks, and delivers personalized health guidance.

**Live URL:** https://23a9mq040.github.io/AirSense_AI/  
**API Backend:** https://airsense-ai-backend.onrender.com  
**Repository:** https://github.com/23A9MQ040/AirSense_AI

---

## Architecture: Multi-Agent Pipeline

```
User Request
     │
     ▼
security_checkpoint()
  ├─ PII Detection (email, phone, SSN masking)
  ├─ Prompt Injection Detection
  └─ Audit Logging → airsense_audit.db
     │
     ▼ [If PASSED]
     │
     ▼
AirQualityMonitoringAgent (LlmAgent)
  Tools: get_air_quality(), weather_analysis()
  Output → ctx.state: {aqi_level, pm25, pm10, weather}
     │
     ▼
HealthRiskPredictionAgent (LlmAgent)
  Tools: predict_health_risk()
  Output → ctx.state: {risk_score, risk_level, factors}
     │
     ▼
AIHealthAssistantAgent (LlmAgent)
  Tools: generate_health_recommendation()
  Generates personalized user response
     │
     ▼
NotificationAgent (LlmAgent)
  Tools: emergency_alert()
  Generates alerts if AQI > thresholds
     │
     ▼
Final Response → Java Backend → React Frontend
```

---

## Agent Definitions

### 1. AirQualityMonitoringAgent
- **Model:** gemini-2.5-flash
- **Responsibility:** Collect real-time pollution data
- **Tools:** `get_air_quality()`, `weather_analysis()`
- **ctx.state keys written:**
  - `aqi_level` — current AQI value
  - `pm25` — PM2.5 concentration
  - `pm10` — PM10 concentration
  - `weather_condition` — weather description

### 2. HealthRiskPredictionAgent
- **Model:** gemini-2.5-flash
- **Responsibility:** Predict personalized health risk
- **Tools:** `predict_health_risk()`
- **Inputs from ctx.state:** `aqi_level`, `asthma_history`, `city`
- **ctx.state keys written:**
  - `risk_score` — numerical score 0-100
  - `risk_level` — LOW / MEDIUM / HIGH / CRITICAL

### 3. AIHealthAssistantAgent
- **Model:** gemini-2.5-flash
- **Responsibility:** Answer user health questions conversationally
- **Tools:** `generate_health_recommendation()`
- **Uses all ctx.state values** to craft personalized responses

### 4. NotificationAgent
- **Model:** gemini-2.5-flash
- **Responsibility:** Generate alerts and notifications
- **Tools:** `emergency_alert()`
- **Output:** Alert severity, message, emergency actions

---

## MCP Tools

### `get_air_quality(city: str) → dict`
Fetch real-time AQI data. Uses WAQI API with simulation fallback.
```json
{
  "city": "Delhi",
  "aqi": 185,
  "aqi_category": "Unhealthy",
  "pm25": 83.2,
  "pm10": 129.5,
  "co": 1.2,
  "no2": 45.3,
  "so2": 12.1,
  "o3": 68.4,
  "source": "waqi",
  "timestamp": "2026-07-01T10:00:00"
}
```

### `predict_health_risk(city, asthma_history, age, activity_level) → dict`
Predict personalized health risk.
```json
{
  "risk_score": 72,
  "risk_level": "HIGH",
  "explanation": "Risk increased because PM2.5 elevated by 45% above WHO standard; asthma history increases sensitivity.",
  "factors": ["PM2.5 elevated", "asthma history"],
  "recommendations": ["Carry inhaler", "Avoid outdoor activity"]
}
```

### `generate_health_recommendation(city, asthma_history) → dict`
Generate personalized health advice.
```json
{
  "recommendations": ["Stay indoors", "Use N95 mask"],
  "indoor_tips": ["Run HEPA purifier"],
  "outdoor_tips": ["Limit to 30 min max"],
  "diet_tips": ["Eat antioxidants", "Drink plenty of water"],
  "urgency_level": "high"
}
```

### `weather_analysis(city) → dict`
Get weather conditions affecting air quality.
```json
{
  "temperature": 32.5,
  "humidity": 75.0,
  "wind_speed": 4.2,
  "condition": "Partly Cloudy",
  "aqi_impact": ["Calm winds trapping pollutants"]
}
```

### `emergency_alert(city, asthma_history) → dict`
Generate emergency alerts.
```json
{
  "alert_needed": true,
  "severity": "HIGH",
  "message": "⚠️ SERIOUS AIR QUALITY ALERT in Delhi!",
  "actions": ["Stay indoors", "Run air purifier"],
  "emergency_contacts": [{"name": "Ambulance", "number": "108"}]
}
```

---

## Security Policies

### PII Detection
The `security_checkpoint()` function detects and masks:
- Email addresses → `[EMAIL_REDACTED]`
- Phone numbers → `[PHONE_REDACTED]`
- SSN → `[SSN_REDACTED]`
- Credit card numbers → `[CREDIT_CARD_REDACTED]`
- ZIP codes → `[ZIP_CODE_REDACTED]`

### Prompt Injection Detection
Blocked patterns include:
- "ignore previous instructions"
- "show system prompt"
- "bypass security"
- "jailbreak"
- SQL injection patterns
- Script injection patterns

### Audit Logging
All requests are logged to `airsense_audit.db` (SQLite):
```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY,
    user_input TEXT,
    security_status TEXT,   -- CLEAN, PII_MASKED, BLOCKED
    agent_action TEXT,
    timestamp TEXT,
    threat_level TEXT        -- NONE, LOW, HIGH
);
```

---

## Development Workflow

### Quick Start
```bash
# Install dependencies
make install

# Run a quick test
make run

# Start playground
make playground

# Lint code
make lint
```

### Environment Variables
```bash
GEMINI_API_KEY=your_key_here     # Required for AI-powered analysis
WAQI_TOKEN=demo                  # Optional: WAQI API token for live data
```

### Testing
```bash
# Test air quality tool
python -c "from tools_impl import get_air_quality; print(get_air_quality('Delhi'))"

# Test full pipeline
python agents_workflow.py "Delhi" "true" "Is it safe to go outside today?"
```

---

## ctx.state Usage

The agents share state through a dictionary that flows through the pipeline:
```python
ctx.state = {
    "city": "Delhi",
    "aqi_level": 185,          # Set by AirQualityMonitoringAgent
    "pm25": 83.2,              # Set by AirQualityMonitoringAgent
    "weather_condition": "...", # Set by AirQualityMonitoringAgent
    "risk_score": 72,          # Set by HealthRiskPredictionAgent
    "risk_level": "HIGH",      # Set by HealthRiskPredictionAgent
    "asthma_history": True,    # User profile (input)
    "user_query": "...",       # Original user question (input)
}
```

---

## Deployment

- **Backend:** Deployed on Render.com using Docker
- **Frontend:** Deployed on GitHub Pages
- **Database:** PostgreSQL (production) / H2 (development)
- **Cache:** Redis (production) / Simple (development)

---

*AirSense AI — Protecting health through AI-powered air quality intelligence.*
