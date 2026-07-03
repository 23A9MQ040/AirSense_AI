"""
AirSense AI — Full Multi-Agent Workflow
Google ADK-based pipeline with 4 agents, security checkpoint, and ctx.state

Agents:
  1. AirQualityMonitoringAgent  — collects live AQI data
  2. HealthRiskPredictionAgent  — predicts user health risk
  3. AIHealthAssistantAgent     — conversational AI responses
  4. NotificationAgent          — generates alerts

Security:
  - security_checkpoint()  — PII detection + prompt injection detection + audit logging

Usage:
  python agents_workflow.py <city> <asthma_history> "<user_query>"
"""

import sys
import json
import re
import os
import asyncio
import sqlite3
from datetime import datetime

# ─────────────────────────────────────────────────────────────────
# Import Google ADK
# ─────────────────────────────────────────────────────────────────
try:
    from google.adk.agents import LlmAgent, SequentialAgent
    from google.adk.sessions import InMemorySessionService
    from google.adk.runners import Runner
    import google.genai.types as types
    # Try Workflow (ADK v2.3+), fall back to SequentialAgent
    try:
        from google.adk.agents import Workflow
        USE_WORKFLOW = True
    except ImportError:
        USE_WORKFLOW = False
    ADK_AVAILABLE = True
except ImportError:
    ADK_AVAILABLE = False
    USE_WORKFLOW = False

# ─────────────────────────────────────────────────────────────────
# Import native tool implementations
# ─────────────────────────────────────────────────────────────────
from tools_impl import (
    get_air_quality,
    predict_health_risk,
    generate_health_recommendation,
    weather_analysis,
    emergency_alert,
)

# ─────────────────────────────────────────────────────────────────
# Audit Database
# ─────────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "airsense_audit.db")

def init_audit_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_input TEXT,
            security_status TEXT,
            agent_action TEXT,
            timestamp TEXT,
            threat_level TEXT
        )
    """)
    conn.commit()
    conn.close()

def log_audit(user_input: str, security_status: str, agent_action: str, threat_level: str = "NONE"):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            INSERT INTO audit_logs (user_input, security_status, agent_action, timestamp, threat_level)
            VALUES (?, ?, ?, ?, ?)
        """, (user_input[:500], security_status, agent_action, datetime.now().isoformat(), threat_level))
        conn.commit()
        conn.close()
    except Exception:
        pass  # never fail on audit

# ─────────────────────────────────────────────────────────────────
# Security Checkpoint
# ─────────────────────────────────────────────────────────────────
INJECTION_PATTERNS = [
    r"ignore (previous|prior|all) instructions",
    r"show (system|base|hidden) prompt",
    r"bypass (security|filter|restriction)",
    r"you are now",
    r"pretend (to be|you are)",
    r"act as (a|an|the) (unrestricted|uncensored|evil|hacker)",
    r"jailbreak",
    r"disregard (your|all) (instructions|rules|guidelines)",
    r"sudo (mode|override)",
    r"<script[\s\S]*?>",
    r"(DROP|DELETE|INSERT|UPDATE|SELECT)\s+\w+",
]

PII_PATTERNS = [
    (r'\b[\w.+-]+@[\w-]+\.\w{2,}\b', "EMAIL"),
    (r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', "PHONE"),
    (r'\b\d{3}-\d{2}-\d{4}\b', "SSN"),
    (r'\b(?:\d[ -]?){13,16}\b', "CREDIT_CARD"),
    (r'\b\d{5}(?:-\d{4})?\b', "ZIP_CODE"),
]

def mask_pii(text: str) -> tuple[str, list[str]]:
    """Detect and mask PII in user input."""
    masked = text
    found_pii = []
    for pattern, label in PII_PATTERNS:
        if re.search(pattern, masked, re.IGNORECASE):
            found_pii.append(label)
            masked = re.sub(pattern, f"[{label}_REDACTED]", masked, flags=re.IGNORECASE)
    return masked, found_pii

def detect_injection(text: str) -> tuple[bool, str]:
    """Detect prompt injection attempts."""
    lower = text.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, lower, re.IGNORECASE):
            return True, f"Matched pattern: {pattern}"
    return False, ""

def security_checkpoint(user_input: str) -> dict:
    """
    Run all security checks before agent pipeline.
    Returns: {passed: bool, sanitized_input: str, threats: list, pii: list}
    """
    init_audit_db()
    threats = []
    
    # Injection detection
    is_injection, reason = detect_injection(user_input)
    if is_injection:
        threats.append({"type": "PROMPT_INJECTION", "detail": reason})
        log_audit(user_input, "BLOCKED", "security_checkpoint", "HIGH")
        return {
            "passed": False,
            "sanitized_input": user_input,
            "threats": threats,
            "pii": [],
            "message": "⛔ Request blocked: Potential prompt injection detected."
        }
    
    # PII detection + masking
    sanitized, pii_found = mask_pii(user_input)
    if pii_found:
        threats.append({"type": "PII_DETECTED", "detail": pii_found})
    
    status = "PII_MASKED" if pii_found else "CLEAN"
    log_audit(user_input, status, "security_checkpoint", "LOW" if pii_found else "NONE")
    
    return {
        "passed": True,
        "sanitized_input": sanitized,
        "threats": threats,
        "pii": pii_found,
        "message": "Security check passed."
    }

# ─────────────────────────────────────────────────────────────────
# Agent Functions (Native ADK-compatible tool wrappers)
# ─────────────────────────────────────────────────────────────────
def adk_get_air_quality(city: str) -> dict:
    """Tool for AirQualityMonitoringAgent: Get real-time AQI data for a city."""
    return get_air_quality(city)

def adk_predict_health_risk(city: str, asthma_history: bool, age: int = 30, activity_level: str = "moderate") -> dict:
    """Tool for HealthRiskPredictionAgent: Predict health risk based on AQI and user profile."""
    return predict_health_risk(city, asthma_history, age, activity_level)

def adk_generate_recommendation(city: str, asthma_history: bool) -> dict:
    """Tool for AIHealthAssistantAgent: Generate personalized health recommendations."""
    return generate_health_recommendation(city, asthma_history)

def adk_weather_analysis(city: str) -> dict:
    """Tool for AirQualityMonitoringAgent: Get weather conditions that affect air quality."""
    return weather_analysis(city)

def adk_emergency_alert(city: str, asthma_history: bool) -> dict:
    """Tool for NotificationAgent: Determine if emergency alert is needed based on AQI."""
    return emergency_alert(city, asthma_history)

# ─────────────────────────────────────────────────────────────────
# Full ADK Multi-Agent Pipeline
# ─────────────────────────────────────────────────────────────────
APP_NAME = "airsense_ai"
MODEL = "gemini-2.5-flash"

async def run_adk_pipeline(city: str, asthma_history: bool, user_query: str) -> dict:
    """Run the full 4-agent ADK pipeline."""
    if not ADK_AVAILABLE:
        raise ImportError("google-adk not installed")
    
    session_service = InMemorySessionService()
    
    # Shared context state
    session = await session_service.create_session(
        app_name=APP_NAME,
        user_id="system",
        session_id="pipeline_session",
        state={
            "city": city,
            "asthma_history": asthma_history,
            "user_query": user_query,
        }
    )
    
    # Agent 1: AirQualityMonitoringAgent
    air_quality_agent = LlmAgent(
        name="AirQualityMonitoringAgent",
        model=MODEL,
        description="Collects real-time air quality data and weather conditions.",
        instruction=f"""You are the AirQualityMonitoringAgent for AirSense AI.
Your task:
1. Use the adk_get_air_quality tool to fetch AQI data for {city}
2. Use the adk_weather_analysis tool to get weather conditions
3. Store key findings in your response as JSON

City to monitor: {city}
Provide a concise JSON summary of: aqi, pm25, pm10, weather, and aqi_category.""",
        tools=[adk_get_air_quality, adk_weather_analysis],
    )
    
    # Agent 2: HealthRiskPredictionAgent
    health_risk_agent = LlmAgent(
        name="HealthRiskPredictionAgent",
        model=MODEL,
        description="Analyzes user health profile and predicts personalized health risk.",
        instruction=f"""You are the HealthRiskPredictionAgent for AirSense AI.
Your task:
1. Use adk_predict_health_risk to evaluate health risk
2. Consider asthma_history={asthma_history} in your analysis
3. Provide risk level (LOW/MEDIUM/HIGH) with explanation

City: {city}, Asthma History: {asthma_history}
Provide concise risk assessment JSON: risk_level, risk_score, explanation.""",
        tools=[adk_predict_health_risk],
    )
    
    # Agent 3: AIHealthAssistantAgent
    assistant_agent = LlmAgent(
        name="AIHealthAssistantAgent",
        model=MODEL,
        description="Conversational AI assistant that answers health questions about air quality.",
        instruction=f"""You are the AIHealthAssistantAgent for AirSense AI — a friendly, expert health assistant.
Your task:
1. Use adk_generate_recommendation to get personalized advice
2. Answer the user's question: "{user_query}"
3. Provide clear, actionable health guidance

Consider: City={city}, Asthma={asthma_history}
Be compassionate, clear, and helpful. Include specific recommendations.""",
        tools=[adk_generate_recommendation],
    )
    
    # Agent 4: NotificationAgent
    notification_agent = LlmAgent(
        name="NotificationAgent",
        model=MODEL,
        description="Generates health alerts and notifications based on AQI levels.",
        instruction=f"""You are the NotificationAgent for AirSense AI.
Your task:
1. Use adk_emergency_alert to check if an emergency alert is needed
2. Generate appropriate notification message
3. Determine alert severity level

City: {city}, Asthma History: {asthma_history}
Provide alert JSON: alert_needed, severity, message, actions.""",
        tools=[adk_emergency_alert],
    )
    
    # Sequential pipeline (use Workflow if available, else SequentialAgent fallback)
    if USE_WORKFLOW:
        try:
            pipeline = Workflow(
                name="AirSensePipeline",
                sub_agents=[air_quality_agent, health_risk_agent, assistant_agent, notification_agent],
                description="Full AirSense AI processing pipeline",
            )
        except Exception:
            pipeline = SequentialAgent(
                name="AirSensePipeline",
                sub_agents=[air_quality_agent, health_risk_agent, assistant_agent, notification_agent],
                description="Full AirSense AI processing pipeline",
            )
    else:
        pipeline = SequentialAgent(
            name="AirSensePipeline",
            sub_agents=[air_quality_agent, health_risk_agent, assistant_agent, notification_agent],
            description="Full AirSense AI processing pipeline",
        )
    
    runner = Runner(
        agent=pipeline,
        app_name=APP_NAME,
        session_service=session_service,
    )
    
    # Run
    content = types.Content(role="user", parts=[types.Part(text=user_query)])
    final_response = ""
    async for event in runner.run_async(
        user_id="system",
        session_id="pipeline_session",
        new_message=content,
    ):
        if hasattr(event, "is_final_response") and event.is_final_response():
            if event.content and event.content.parts:
                final_response = event.content.parts[0].text
    
    return {
        "response": final_response,
        "pipeline": "AirSensePipeline",
        "agents": ["AirQualityMonitoringAgent", "HealthRiskPredictionAgent", "AIHealthAssistantAgent", "NotificationAgent"],
        "city": city,
        "asthma_history": asthma_history,
    }

# ─────────────────────────────────────────────────────────────────
# Fallback: Native (non-ADK) pipeline for environments w/o ADK
# ─────────────────────────────────────────────────────────────────
def run_native_pipeline(city: str, asthma_history: bool, user_query: str) -> dict:
    """Fallback: Run the agent pipeline using native tool calls + Gemini API."""
    try:
        import google.genai as genai
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set")
        client = genai.Client(api_key=api_key)
    except Exception as e:
        return run_mock_pipeline(city, asthma_history, user_query, str(e))
    
    # Step 1: AirQualityMonitoringAgent
    aq_data = get_air_quality(city)
    weather_data = weather_analysis(city)
    
    # Step 2: HealthRiskPredictionAgent
    risk_data = predict_health_risk(city, asthma_history, 30, "moderate")
    
    # Step 3: Generate recommendations
    rec_data = generate_health_recommendation(city, asthma_history)
    
    # Step 4: NotificationAgent
    alert_data = emergency_alert(city, asthma_history)
    
    # ctx.state simulation
    ctx_state = {
        "aqi_level": aq_data.get("aqi", 0),
        "city": city,
        "pm25": aq_data.get("pm25", 0),
        "risk_score": risk_data.get("risk_score", 0),
        "risk_level": risk_data.get("risk_level", "UNKNOWN"),
        "asthma_history": asthma_history,
    }
    
    # AIHealthAssistantAgent — answer user question with context
    aqi = aq_data.get("aqi", 0)
    risk_level = risk_data.get("risk_level", "UNKNOWN")
    temp = weather_data.get("temperature", "N/A")
    humidity = weather_data.get("humidity", "N/A")
    recommendations = rec_data.get("recommendations", [])
    alert_needed = alert_data.get("alert_needed", False)
    
    prompt = f"""You are AirSense Assistant — an expert AI health advisor specializing in air quality and respiratory health.

CURRENT ENVIRONMENTAL DATA (from AirQualityMonitoringAgent):
- City: {city}
- AQI: {aqi} ({aq_category(aqi)})
- PM2.5: {aq_data.get('pm25', 'N/A')} μg/m³
- PM10: {aq_data.get('pm10', 'N/A')} μg/m³
- Temperature: {temp}°C
- Humidity: {humidity}%
- Weather: {weather_data.get('condition', 'N/A')}

HEALTH RISK ASSESSMENT (from HealthRiskPredictionAgent):
- Risk Level: {risk_level}
- Risk Score: {risk_data.get('risk_score', 'N/A')}/100
- User Asthma History: {asthma_history}
- Risk Explanation: {risk_data.get('explanation', 'N/A')}

RECOMMENDATIONS (from RecommendationAgent):
{chr(10).join(f'• {r}' for r in recommendations[:5])}

ALERT STATUS (from NotificationAgent):
- Emergency Alert: {"⚠️ YES" if alert_needed else "No"}
- Alert Message: {alert_data.get('message', 'None')}

USER QUESTION: {user_query}

Instructions:
- Answer the user's specific question clearly and empathetically
- Use the environmental data above to give personalized advice
- Be specific and actionable, not generic
- If asthma history is true, give asthma-specific guidance
- Format with clear paragraphs, no excessive bullet points
- End with one specific actionable tip for today"""

    try:
        resp = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        assistant_response = resp.text
    except Exception:
        assistant_response = f"I'm having trouble connecting to the AI service right now. However, based on current data: AQI in {city} is {aqi} ({aq_category(aqi)}). {'; '.join(recommendations[:2]) if recommendations else 'Stay safe and monitor air quality.'}"
    
    return {
        "response": assistant_response,
        "pipeline": "NativePipeline",
        "agents": ["AirQualityMonitoringAgent", "HealthRiskPredictionAgent", "AIHealthAssistantAgent", "NotificationAgent"],
        "context_state": ctx_state,
        "air_quality": aq_data,
        "risk": risk_data,
        "alert": alert_data,
        "city": city,
        "asthma_history": asthma_history,
    }

def run_mock_pipeline(city: str, asthma_history: bool, user_query: str, error: str = "") -> dict:
    """Emergency mock pipeline when all else fails."""
    mock_aqi = 95
    mock_risk = "MEDIUM" if not asthma_history else "HIGH"
    
    response = f"""**AirSense AI — Offline Mode**

I'm currently operating in limited mode due to a configuration issue.

📍 **City:** {city}
📊 **Estimated AQI:** ~{mock_aqi} (Moderate)
🩺 **Health Risk:** {mock_risk}
{'⚠️ **Asthma Alert:** As an asthma patient, carry your inhaler.' if asthma_history else ''}

**For your question:** "{user_query}"

Based on estimated moderate air quality levels:
- If you're planning outdoor activities, consider checking a local weather app for the latest AQI
- {'As an asthma patient, always carry your rescue inhaler.' if asthma_history else 'Healthy individuals can proceed with normal activities with caution.'}
- Stay hydrated and limit strenuous outdoor activity during peak pollution hours (7-9 AM, 5-8 PM)

*Note: Please ensure the GEMINI_API_KEY environment variable is set for AI-powered analysis.*"""
    
    return {
        "response": response,
        "pipeline": "MockPipeline",
        "agents": [],
        "error": error,
        "city": city,
    }

def aq_category(aqi: int) -> str:
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Moderate"
    if aqi <= 150: return "Unhealthy for Sensitive Groups"
    if aqi <= 200: return "Unhealthy"
    if aqi <= 300: return "Very Unhealthy"
    return "Hazardous"

# ─────────────────────────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: agents_workflow.py <city> <asthma_history> <query>"}))
        sys.exit(1)
    
    city = sys.argv[1]
    asthma_history = sys.argv[2].lower() in ("true", "1", "yes")
    user_query = sys.argv[3]
    
    # Security checkpoint (runs before all agents)
    sec_result = security_checkpoint(user_query)
    if not sec_result["passed"]:
        print(json.dumps({
            "response": sec_result["message"],
            "security": "BLOCKED",
            "pipeline": "SecurityCheckpoint",
        }))
        sys.exit(0)
    
    # Use sanitized input
    safe_query = sec_result["sanitized_input"]
    pii_detected = bool(sec_result["pii"])
    
    # Run pipeline
    result = None
    
    # Try ADK pipeline first, fall back to native
    if ADK_AVAILABLE and os.environ.get("GEMINI_API_KEY"):
        try:
            result = asyncio.run(run_adk_pipeline(city, asthma_history, safe_query))
        except Exception:
            result = None
    
    if result is None:
        result = run_native_pipeline(city, asthma_history, safe_query)
    
    # Add security metadata
    result["security_checkpoint"] = {
        "passed": True,
        "pii_detected": pii_detected,
        "threats_found": len(sec_result["threats"]),
    }
    
    print(json.dumps(result, ensure_ascii=True))

if __name__ == "__main__":
    main()
