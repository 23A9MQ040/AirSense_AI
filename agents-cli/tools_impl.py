"""
AirSense AI — MCP Tool Implementations
Native Python tools for the ADK agent pipeline.

Tools:
  1. get_air_quality(city)           → Live AQI data (WAQI API fallback to simulation)
  2. predict_health_risk(...)        → AI-powered health risk prediction
  3. generate_health_recommendation  → Personalized health advice
  4. weather_analysis(city)          → Weather data (Open-Meteo API)
  5. emergency_alert(city, asthma)   → Emergency notifications
"""

import os
import json
import math
import random
import urllib.request
import urllib.parse
from datetime import datetime

WAQI_TOKEN = os.environ.get("WAQI_TOKEN", "demo")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# ─────────────────────────────────────────────────────────────────
# City coordinate lookup (major cities worldwide)
# ─────────────────────────────────────────────────────────────────
CITY_COORDS = {
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "kolkata": (22.5726, 88.3639),
    "chennai": (13.0827, 80.2707),
    "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567),
    "ahmedabad": (23.0225, 72.5714),
    "new york": (40.7128, -74.0060),
    "los angeles": (34.0522, -118.2437),
    "london": (51.5074, -0.1278),
    "paris": (48.8566, 2.3522),
    "beijing": (39.9042, 116.4074),
    "shanghai": (31.2304, 121.4737),
    "tokyo": (35.6762, 139.6503),
    "sydney": (-33.8688, 151.2093),
    "dubai": (25.2048, 55.2708),
    "singapore": (1.3521, 103.8198),
}

def _get_coords(city: str) -> tuple:
    return CITY_COORDS.get(city.lower().strip(), (28.6139, 77.2090))

def _simulate_aqi(city: str) -> dict:
    """Simulate realistic AQI data when API is unavailable."""
    seed = sum(ord(c) for c in city.lower()) + datetime.now().hour
    random.seed(seed)
    
    # Different cities have different pollution profiles
    base_values = {
        "delhi": 180, "new delhi": 180, "mumbai": 120,
        "beijing": 160, "shanghai": 110, "los angeles": 80,
        "london": 55, "new york": 65, "paris": 60,
        "sydney": 30, "singapore": 45, "tokyo": 50,
    }
    base = base_values.get(city.lower().strip(), 90)
    variation = random.randint(-20, 30)
    aqi = max(5, min(400, base + variation))
    
    pm25 = round(aqi * 0.45 + random.uniform(-5, 5), 1)
    pm10 = round(aqi * 0.7 + random.uniform(-8, 8), 1)
    
    return {
        "city": city,
        "aqi": aqi,
        "aqi_category": _aqi_category(aqi),
        "pm25": pm25,
        "pm10": pm10,
        "co": round(random.uniform(0.2, 2.5), 2),
        "no2": round(random.uniform(5, 80), 1),
        "so2": round(random.uniform(1, 30), 1),
        "o3": round(random.uniform(20, 120), 1),
        "latitude": _get_coords(city)[0],
        "longitude": _get_coords(city)[1],
        "source": "simulated",
        "timestamp": datetime.now().isoformat(),
    }

def _fetch_waqi(city: str) -> dict | None:
    """Fetch from World Air Quality Index API."""
    try:
        encoded_city = urllib.parse.quote(city)
        url = f"https://api.waqi.info/feed/{encoded_city}/?token={WAQI_TOKEN}"
        req = urllib.request.Request(url, headers={"User-Agent": "AirSenseAI/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        
        if data.get("status") != "ok":
            return None
        
        d = data["data"]
        iaqi = d.get("iaqi", {})
        
        return {
            "city": city,
            "aqi": int(d.get("aqi", 0)) if str(d.get("aqi", "")).isdigit() else 0,
            "aqi_category": _aqi_category(int(d.get("aqi", 0)) if str(d.get("aqi", "")).isdigit() else 0),
            "pm25": iaqi.get("pm25", {}).get("v", 0),
            "pm10": iaqi.get("pm10", {}).get("v", 0),
            "co": iaqi.get("co", {}).get("v", 0),
            "no2": iaqi.get("no2", {}).get("v", 0),
            "so2": iaqi.get("so2", {}).get("v", 0),
            "o3": iaqi.get("o3", {}).get("v", 0),
            "latitude": d.get("city", {}).get("geo", [0, 0])[0],
            "longitude": d.get("city", {}).get("geo", [0, 0])[1],
            "source": "waqi",
            "timestamp": datetime.now().isoformat(),
        }
    except Exception:
        return None

# ─────────────────────────────────────────────────────────────────
# Tool 1: get_air_quality
# ─────────────────────────────────────────────────────────────────
def get_air_quality(city: str) -> dict:
    """
    Fetch real-time air quality data for a city.
    
    Args:
        city: City name (e.g., "Delhi", "New York")
    
    Returns:
        dict with: aqi, pm25, pm10, co, no2, so2, o3, aqi_category, timestamp
    """
    result = _fetch_waqi(city)
    if result is None or result.get("aqi", 0) == 0:
        result = _simulate_aqi(city)
    return result

# ─────────────────────────────────────────────────────────────────
# Tool 2: predict_health_risk
# ─────────────────────────────────────────────────────────────────
def predict_health_risk(city: str, asthma_history: bool, age: int = 30, activity_level: str = "moderate") -> dict:
    """
    Predict personalized health risk based on AQI and user profile.
    
    Args:
        city: City name
        asthma_history: True if user has asthma/respiratory conditions
        age: User's age (affects sensitivity score)
        activity_level: "low", "moderate", or "high"
    
    Returns:
        dict with: risk_score, risk_level, explanation, recommendations
    """
    aq = get_air_quality(city)
    aqi = aq.get("aqi", 0)
    pm25 = aq.get("pm25", 0)
    
    # Base risk from AQI (0-40 scale)
    if aqi <= 50:
        base_risk = 5
    elif aqi <= 100:
        base_risk = 20
    elif aqi <= 150:
        base_risk = 45
    elif aqi <= 200:
        base_risk = 65
    elif aqi <= 300:
        base_risk = 80
    else:
        base_risk = 95
    
    # Modifiers
    asthma_multiplier = 1.4 if asthma_history else 1.0
    age_multiplier = 1.3 if age > 60 or age < 12 else (1.15 if age > 50 else 1.0)
    activity_multiplier = {"low": 0.8, "moderate": 1.0, "high": 1.3}.get(activity_level, 1.0)
    pm25_bonus = min(20, pm25 * 0.3) if pm25 > 35 else 0
    
    risk_score = min(100, int(base_risk * asthma_multiplier * age_multiplier * activity_multiplier + pm25_bonus))
    
    if risk_score <= 25:
        risk_level = "LOW"
    elif risk_score <= 55:
        risk_level = "MEDIUM"
    elif risk_score <= 80:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"
    
    # Explanation with contributing factors
    factors = []
    if aqi > 100:
        factors.append(f"AQI of {aqi} is above safe levels")
    if pm25 > 35:
        change_pct = round((pm25 - 12) / 12 * 100)
        factors.append(f"PM2.5 elevated by {change_pct}% above WHO standard")
    if asthma_history:
        factors.append("asthma/respiratory conditions increase sensitivity")
    if age > 60:
        factors.append("age above 60 increases vulnerability")
    if activity_level == "high":
        factors.append("high activity level increases pollution intake")
    
    explanation = f"Risk score {risk_score}/100 ({risk_level}). " + (
        "Contributing factors: " + "; ".join(factors) + "." if factors else "Current air quality poses minimal health risk."
    )
    
    recommendations = _get_recommendations(aqi, asthma_history, risk_level)
    
    return {
        "city": city,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "explanation": explanation,
        "factors": factors,
        "recommendations": recommendations,
        "aqi": aqi,
        "pm25": pm25,
        "timestamp": datetime.now().isoformat(),
    }

# ─────────────────────────────────────────────────────────────────
# Tool 3: generate_health_recommendation
# ─────────────────────────────────────────────────────────────────
def generate_health_recommendation(city: str, asthma_history: bool) -> dict:
    """
    Generate personalized health recommendations based on current air quality.
    
    Args:
        city: City name
        asthma_history: True if user has asthma/respiratory conditions
    
    Returns:
        dict with: recommendations list, urgency_level, indoor_tips, outdoor_tips
    """
    aq = get_air_quality(city)
    aqi = aq.get("aqi", 0)
    
    general = _get_recommendations(aqi, asthma_history, "")
    
    indoor_tips = [
        "Keep windows closed during high pollution hours (7-9 AM, 5-8 PM)",
        "Run a HEPA air purifier in your bedroom and main living area",
        "Use an air quality monitor to track indoor PM2.5 levels",
        "Avoid smoking, candles, and incense indoors during high AQI days",
    ]
    
    outdoor_tips = []
    if aqi <= 100:
        outdoor_tips = [
            "Safe for outdoor activities — enjoy the fresh air!",
            "Best exercise times: early morning (6-8 AM) or evening (after 7 PM)",
            "No special precautions needed for healthy individuals",
        ]
    elif aqi <= 150:
        outdoor_tips = [
            "Sensitive groups should shorten outdoor activities",
            "Avoid outdoor exercise during peak traffic hours",
            "Wear N95 mask if outdoors for more than 1 hour",
        ]
        if asthma_history:
            outdoor_tips.append("⚠️ Carry your rescue inhaler at all times today")
    else:
        outdoor_tips = [
            "Minimize all outdoor activities — postpone if possible",
            "If you must go out, wear N95/KN95 mask and limit exposure to 30 min max",
            "Shower and change clothes immediately after outdoor exposure",
        ]
        if asthma_history:
            outdoor_tips.insert(0, "🚨 ASTHMA ALERT: Stay indoors. High risk of attack.")
    
    diet_tips = [
        "Eat antioxidant-rich foods: berries, leafy greens, citrus fruits",
        "Drink 8-10 glasses of water to help flush inhaled particles",
        "Ginger and turmeric teas can help reduce respiratory inflammation",
    ]
    
    return {
        "city": city,
        "aqi": aqi,
        "aqi_category": _aqi_category(aqi),
        "recommendations": general,
        "indoor_tips": indoor_tips,
        "outdoor_tips": outdoor_tips,
        "diet_tips": diet_tips,
        "urgency_level": "high" if aqi > 150 else ("medium" if aqi > 100 else "low"),
        "timestamp": datetime.now().isoformat(),
    }

# ─────────────────────────────────────────────────────────────────
# Tool 4: weather_analysis
# ─────────────────────────────────────────────────────────────────
def weather_analysis(city: str) -> dict:
    """
    Fetch weather conditions that affect air quality.
    
    Args:
        city: City name
    
    Returns:
        dict with: temperature, humidity, wind_speed, condition, aqi_impact
    """
    lat, lon = _get_coords(city)
    
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
            f"&timezone=auto"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "AirSenseAI/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        
        current = data.get("current", {})
        temp = current.get("temperature_2m", 25)
        humidity = current.get("relative_humidity_2m", 55)
        wind_speed = current.get("wind_speed_10m", 10)
        weather_code = current.get("weather_code", 0)
        
        condition = _weather_code_to_condition(weather_code)
        
        # Determine AQI impact from weather
        aqi_impact = []
        if wind_speed > 20:
            aqi_impact.append("Strong winds dispersing pollutants (positive)")
        elif wind_speed < 5:
            aqi_impact.append("Calm winds trapping pollutants near ground (negative)")
        if humidity > 80:
            aqi_impact.append("High humidity worsening particle suspension (negative)")
        if temp > 35:
            aqi_impact.append("High temperature increasing ozone formation (negative)")
        if "rain" in condition.lower():
            aqi_impact.append("Rain washing out pollutants (positive)")
        
        return {
            "city": city,
            "temperature": round(temp, 1),
            "humidity": round(humidity, 1),
            "wind_speed": round(wind_speed, 1),
            "condition": condition,
            "aqi_impact": aqi_impact,
            "source": "open-meteo",
            "timestamp": datetime.now().isoformat(),
        }
    except Exception:
        # Simulated fallback
        return {
            "city": city,
            "temperature": round(20 + random.uniform(-5, 15), 1),
            "humidity": round(50 + random.uniform(-20, 30), 1),
            "wind_speed": round(5 + random.uniform(0, 20), 1),
            "condition": "Partly Cloudy",
            "aqi_impact": ["Moderate wind conditions"],
            "source": "simulated",
            "timestamp": datetime.now().isoformat(),
        }

# ─────────────────────────────────────────────────────────────────
# Tool 5: emergency_alert
# ─────────────────────────────────────────────────────────────────
def emergency_alert(city: str, asthma_history: bool) -> dict:
    """
    Generate emergency health alert based on current AQI and user profile.
    
    Args:
        city: City name
        asthma_history: True if user has asthma
    
    Returns:
        dict with: alert_needed, severity, message, actions, emergency_contacts
    """
    aq = get_air_quality(city)
    aqi = aq.get("aqi", 0)
    
    alert_needed = aqi > 150 or (asthma_history and aqi > 100)
    
    if aqi > 300 or (asthma_history and aqi > 200):
        severity = "CRITICAL"
        message = f"🚨 CRITICAL AIR QUALITY EMERGENCY in {city}! AQI={aqi} is at hazardous levels."
        actions = [
            "Stay indoors immediately — seal all windows and doors",
            "Call emergency services if experiencing chest tightness or difficulty breathing",
            "Use rescue inhaler immediately if asthma symptoms appear",
            "Move to a filtered/air-conditioned indoor space",
            "Contact nearest hospital if symptoms worsen",
        ]
    elif aqi > 200 or (asthma_history and aqi > 150):
        severity = "HIGH"
        message = f"⚠️ SERIOUS AIR QUALITY ALERT in {city}! AQI={aqi} poses significant health risks."
        actions = [
            "Avoid all outdoor activities",
            "Run HEPA air purifiers indoors",
            "Wear N95 mask if outdoor exposure is unavoidable",
            "Take prescribed asthma medication if applicable",
            "Monitor symptoms closely",
        ]
    elif alert_needed:
        severity = "MEDIUM"
        message = f"⚡ AIR QUALITY WARNING in {city}. AQI={aqi} — sensitive groups at risk."
        actions = [
            "Sensitive groups (asthma, elderly, children) should stay indoors",
            "Reduce outdoor physical activity",
            "Keep windows closed",
            "Carry inhaler if prescribed",
        ]
    else:
        severity = "LOW"
        message = f"✅ Air quality in {city} is acceptable. AQI={aqi}."
        actions = ["No special precautions needed", "Enjoy outdoor activities with normal care"]
    
    nearby_hospitals = [
        {"name": "Emergency Services", "number": "112"},
        {"name": "Ambulance", "number": "108"},
        {"name": "Health Helpline", "number": "104"},
    ]
    
    return {
        "city": city,
        "aqi": aqi,
        "alert_needed": alert_needed,
        "severity": severity,
        "message": message,
        "actions": actions,
        "emergency_contacts": nearby_hospitals,
        "asthma_specific": asthma_history,
        "timestamp": datetime.now().isoformat(),
    }

# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────
def _aqi_category(aqi: int) -> str:
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Moderate"
    if aqi <= 150: return "Unhealthy for Sensitive Groups"
    if aqi <= 200: return "Unhealthy"
    if aqi <= 300: return "Very Unhealthy"
    return "Hazardous"

def _get_recommendations(aqi: int, asthma: bool, risk_level: str) -> list:
    recs = []
    if aqi <= 50:
        recs = ["Air quality is excellent — perfect for outdoor activities", "No health precautions needed", "Great day to exercise outdoors"]
    elif aqi <= 100:
        recs = ["Air quality is acceptable for most people", "Unusually sensitive individuals may want to limit prolonged outdoor exertion"]
        if asthma:
            recs.append("Carry your inhaler as a precaution on moderate AQI days")
    elif aqi <= 150:
        recs = ["Sensitive groups (asthma, elderly, children) should reduce outdoor activity", "Active individuals may experience symptoms with prolonged outdoor exposure", "Consider wearing a mask for extended outdoor activity"]
        if asthma:
            recs.insert(0, "⚠️ ASTHMA ALERT: Limit outdoor time and carry rescue inhaler")
    elif aqi <= 200:
        recs = ["Everyone should reduce prolonged outdoor exertion", "Sensitive groups should avoid outdoor activities", "Use N95/KN95 masks for any necessary outdoor exposure", "Run air purifiers indoors and keep windows sealed"]
        if asthma:
            recs.insert(0, "🚨 Stay indoors. Take preventive asthma medication as advised by your doctor")
    else:
        recs = ["HEALTH EMERGENCY: Avoid all outdoor activities", "Stay indoors with filtered/air-conditioned air", "Seek immediate medical attention if experiencing breathing difficulty", "Seal gaps around windows and doors"]
        if asthma:
            recs.insert(0, "🆘 CRITICAL: Use emergency inhaler and call your doctor immediately")
    return recs

def _weather_code_to_condition(code: int) -> str:
    if code == 0: return "Clear Sky"
    if code in (1, 2, 3): return "Partly Cloudy"
    if code in (45, 48): return "Foggy"
    if code in (51, 53, 55): return "Drizzle"
    if code in (61, 63, 65): return "Rainy"
    if code in (71, 73, 75): return "Snowy"
    if code in (95, 96, 99): return "Thunderstorm"
    return "Overcast"
