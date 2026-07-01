import os
import sys
import asyncio
import sqlite3
import json
import re
from datetime import datetime
from typing import Generator, Any, Optional

# Add the project root to path just in case
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from google.adk import Workflow, Context, Runner
from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool
from google.adk.tools.mcp_tool import McpToolset, StdioConnectionParams
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.adk.workflow._base_node import START
from google.genai.types import Content, Part
from mcp import StdioServerParameters

# Initialize SQLite database for Audit Logs
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "airsense_audit.db"))

def init_audit_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            request TEXT,
            security_status TEXT,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()

def log_audit(user_id: str, status: str, request: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_logs (user_id, request, security_status, timestamp) VALUES (?, ?, ?, ?)",
            (user_id, request, status, datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Audit log writing error: {e}", file=sys.stderr)

# PII Detection and Prompt Injection Detection
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_REGEX = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")

INJECTION_KEYWORDS = [
    "ignore previous instructions", 
    "system override", 
    "override rules", 
    "developer mode", 
    "bypass security", 
    "show system prompt"
]

def contains_pii(text: str) -> bool:
    return bool(EMAIL_REGEX.search(text) or PHONE_REGEX.search(text))

def redact_pii(text: str) -> str:
    redacted = EMAIL_REGEX.sub("[EMAIL]", text)
    redacted = PHONE_REGEX.sub("[PHONE]", redacted)
    return redacted

def contains_injection(text: str) -> bool:
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in INJECTION_KEYWORDS)

# ----------------- Workflow Nodes -----------------

def security_checkpoint(ctx: Context, node_input: str):
    """
    Mandatory Security Checkpoint Node.
    Analyzes input for PII or prompt injection.
    """
    user_id = ctx.user_id or "anonymous_user"
    
    # 1. Check for prompt injection
    if contains_injection(node_input):
        log_audit(user_id, "BLOCKED_INJECTION", node_input)
        ctx.route = "fail"
        return "BLOCKED_INJECTION"
        
    # 2. Check for PII
    if contains_pii(node_input):
        redacted = redact_pii(node_input)
        log_audit(user_id, "PII_REDACTED", redacted)
        ctx.state["latest_input"] = redacted
        ctx.route = "pass"
        return redacted

    # 3. Passed validation
    log_audit(user_id, "PASSED", node_input)
    ctx.state["latest_input"] = node_input
    ctx.route = "pass"
    return node_input

def block_response(ctx: Context, node_input: str):
    """
    Handler for security violation blocks.
    """
    return "SECURITY BLOCK: Your request was blocked by the security checkpoint due to policy violations (prompt injection detected)."

# ----------------- Tool Setup -----------------
from tools_impl import get_air_quality, predict_health_risk, generate_health_recommendation, weather_analysis, emergency_alert

# ----------------- Agent Definitions -----------------

# 1. AirQualityMonitoringAgent
air_quality_agent = LlmAgent(
    name="AirQualityMonitoringAgent",
    model="gemini-2.5-flash",
    instruction=(
        "You are the Air Quality Monitoring Agent. Your responsibility is to fetch real-time air quality data "
        "for the requested city. Use the get_air_quality tool. Once you get the air quality data, store the "
        "following keys in ctx.state:\n"
        "- 'aqi_level': the integer AQI value\n"
        "- 'pm25_level': PM2.5 concentration\n"
        "- 'pm10_level': PM10 concentration\n"
        "- 'city_name': name of the city\n"
        "After fetching and saving, output a short summary of the air quality status."
    ),
    tools=[get_air_quality]
)

# 2. HealthRiskPredictionAgent
health_risk_agent = LlmAgent(
    name="HealthRiskPredictionAgent",
    model="gemini-2.5-flash",
    instruction=(
        "You are the Health Risk Prediction Agent. Your responsibility is to analyze the user's health profile "
        "(age, asthma history, allergies, sensitivity) in conjunction with the air quality data stored in ctx.state. "
        "Use the predict_health_risk tool to run the predictive model. Once you receive the results, save:\n"
        "- 'risk_level': LOW, MEDIUM, or HIGH\n"
        "- 'risk_score': numeric risk score\n"
        "in ctx.state. Provide a brief explanation of the primary health risks."
    ),
    tools=[predict_health_risk]
)

# 3. AIHealthAssistantAgent
health_assistant_agent = LlmAgent(
    name="AIHealthAssistantAgent",
    model="gemini-2.5-flash",
    instruction=(
        "You are the AirSense Assistant. Your role is to answer user queries about their health risk "
        "and explain pollution impacts. Use the generate_health_recommendation tool to retrieve personalized "
        "advice. Synthesize your final response using this advice, the user profile, and the AQI stats. "
        "Use the AgentTools to query AirQualityMonitoringAgent and HealthRiskPredictionAgent if you need fresh data."
    ),
    tools=[generate_health_recommendation, AgentTool(agent=air_quality_agent), AgentTool(agent=health_risk_agent)]
)

# 4. NotificationAgent
notification_agent = LlmAgent(
    name="NotificationAgent",
    model="gemini-2.5-flash",
    instruction=(
        "You are the Notification Agent. Review the risk_level and health profile in ctx.state. "
        "If risk_level is HIGH, use the emergency_alert tool to fetch actions. Prepare a clear alert message "
        "and save it in ctx.state under 'alerts' as a list. Summarize the active warning notifications."
    ),
    tools=[emergency_alert]
)

# ----------------- Workflow Definition -----------------

workflow = Workflow(
    name="airsense_pipeline",
    edges=[
        (START, security_checkpoint),
        (security_checkpoint, {
            "pass": air_quality_agent,
            "fail": block_response
        }),
        (air_quality_agent, health_risk_agent),
        (health_risk_agent, health_assistant_agent),
        (health_assistant_agent, notification_agent)
    ]
)

# ----------------- CLI Execution & Runner -----------------

session_service = InMemorySessionService()
runner = Runner(agent=workflow, session_service=session_service, app_name="AirSense", auto_create_session=True)

async def run_pipeline(user_id: str, session_id: str, prompt: str, user_profile: dict):
    # Initialize the session state with user profile
    state_delta = {
        "user_profile": user_profile,
        "aqi_level": None,
        "risk_level": "LOW",
        "risk_score": 0.0,
        "alerts": []
    }
    
    new_msg = Content(parts=[Part.from_text(text=prompt)])
    
    print("\n--- Starting AirSense AI Agent Workflow Pipeline ---")
    print(f"User Request: {prompt}")
    
    # We run the runner.run_async generator to stream events
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_msg,
        state_delta=state_delta
    ):
        # We can print model output events or state transitions
        if hasattr(event, "type") and event.type == "model_response":
            print(f"\n[Agent: {event.agent_name}] -> {event.text}")
        elif hasattr(event, "text") and event.text:
            print(event.text, end="", flush=True)
            
    # Retrieve updated session state
    session = await session_service.get_session(user_id=user_id, session_id=session_id, app_name="AirSense")
    print("\n--- Pipeline Execution Completed ---")
    print("Final Shared Context State (ctx.state):")
    print(json.dumps(session.state, indent=2))
    return session.state

def main():
    init_audit_db()
    if len(sys.argv) < 3:
        print("Usage: python agents_workflow.py <city> <has_asthma_true_or_false> [query]")
        print("Example: python agents_workflow.py Delhi True 'Can I run outside today?'")
        sys.exit(1)
        
    city = sys.argv[1]
    has_asthma = sys.argv[2].lower() == "true"
    query = sys.argv[3] if len(sys.argv) > 3 else f"Evaluate air quality in {city}"
    
    user_profile = {
        "age": 28,
        "asthmaHistory": has_asthma,
        "allergyType": "Pollen",
        "sensitivityLevel": "High" if has_asthma else "Medium"
    }
    
    asyncio.run(run_pipeline(
        user_id="user_123",
        session_id="session_456",
        prompt=f"City: {city}. Query: {query}",
        user_profile=user_profile
    ))

if __name__ == "__main__":
    main()
