# AirSense AI ADK Agent Specifications

This document defines the agent architecture, MCP tools, and security policies for the AirSense AI environment.

## Multi-Agent Architecture

The agent system is built using Google's **Agent Development Kit (ADK)** and coordinates four specialized agents using a directed workflow graph:

1. **AirQualityMonitoringAgent**: Collects current city-level air quality indexes (AQI, PM2.5, PM10) using FastMCP.
2. **HealthRiskPredictionAgent**: Analyzes the combination of live pollution and user health factors (asthma, age, allergies) to predict categorical risk.
3. **AIHealthAssistantAgent**: Offers personalized health recommendations and interacts with users.
4. **NotificationAgent**: Triggers alerts and safety directions for high-risk conditions.

---

## Agent Workflow Graph

```
[START] ──> security_checkpoint()
                 │
                 ├── [pass] ──> AirQualityMonitoringAgent ──> HealthRiskPredictionAgent ──> AIHealthAssistantAgent ──> NotificationAgent
                 │
                 └── [fail] ──> block_response()
```

- **Shared Context (`ctx.state`)**: Variables such as `user_profile`, `aqi_level`, `risk_level`, `risk_score`, and `alerts` are passed downstream.

---

## MCP Tools Interface

The agents interface with the following FastMCP tools registered in `mcp_server.py`:
- `get_air_quality(city: str)`: Real-time AQI and pollutant concentrations.
- `predict_health_risk(user_profile: dict, pollution_data: dict)`: Asthma/allergy susceptibility calculation.
- `generate_health_recommendation(aqi: int, weather: dict, health_profile: dict)`: Customized indoor/outdoor guidelines.
- `weather_analysis(city: str)`: Climate stats.
- `emergency_alert(risk_level: str, user_profile: dict)`: Standardized clinical safety instructions.

---

## Security Policies

1. **PII Masking**: Automatically flags and replaces email addresses and telephone numbers with `[EMAIL]` and `[PHONE]` placeholders before sending prompts to the models.
2. **Prompt Injection Prevention**: Rejects any prompts containing command overrides, bypass instructions, or system prompt inspection keywords.
3. **Logging**: Security status transitions (`PASSED`, `BLOCKED_INJECTION`, `PII_REDACTED`) are stored inside the local SQLite database `airsense_audit.db` and synchronized to the main backend audit logs database.
