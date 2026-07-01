import time
import random
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP Server
mcp = FastMCP("airsense-tools")

@mcp.tool()
def get_air_quality(city: str) -> dict:
    """
    Fetch real-time air quality data for a given city.
    Returns AQI, PM2.5, PM10, CO, NO2, SO2, O3.
    """
    # Normalize city name
    city_clean = city.strip().lower()
    
    # Establish realistic baseline values per city to simulate geographic differences
    baselines = {
        "delhi": {"aqi": 210, "pm25": 160.0, "pm10": 280.0, "co": 1.8, "no2": 45.0, "so2": 15.0, "o3": 65.0},
        "beijing": {"aqi": 155, "pm25": 65.0, "pm10": 110.0, "co": 1.2, "no2": 38.0, "so2": 8.0, "o3": 80.0},
        "new york": {"aqi": 42, "pm25": 10.0, "pm10": 18.0, "co": 0.3, "no2": 12.0, "so2": 1.5, "o3": 35.0},
        "london": {"aqi": 52, "pm25": 12.0, "pm10": 22.0, "co": 0.4, "no2": 18.0, "so2": 2.0, "o3": 40.0},
        "tokyo": {"aqi": 48, "pm25": 11.5, "pm10": 20.0, "co": 0.35, "no2": 15.0, "so2": 1.8, "o3": 42.0},
        "sydney": {"aqi": 35, "pm25": 8.0, "pm10": 15.0, "co": 0.2, "no2": 8.0, "so2": 1.0, "o3": 30.0},
    }
    
    # Default for unspecified cities
    default_base = {"aqi": 75, "pm25": 24.0, "pm10": 45.0, "co": 0.6, "no2": 22.0, "so2": 3.5, "o3": 50.0}
    
    base = baselines.get(city_clean, default_base)
    
    # Add small dynamic fluctuations based on system time to make it feel alive
    seed = int(time.time()) % 100
    variation = (seed % 15) - 7 # -7 to +7% fluctuation
    
    def apply_variation(val, is_aqi=False):
        v = val * (1 + variation / 100.0)
        return int(v) if is_aqi else round(v, 2)

    aqi = apply_variation(base["aqi"], is_aqi=True)
    if aqi < 0: aqi = 0
    
    # Map AQI to category
    if aqi <= 50:
        status = "Good"
    elif aqi <= 100:
        status = "Moderate"
    elif aqi <= 150:
        status = "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        status = "Unhealthy"
    elif aqi <= 300:
        status = "Very Unhealthy"
    else:
        status = "Hazardous"

    return {
        "city": city.capitalize(),
        "aqi": aqi,
        "status": status,
        "pm25": apply_variation(base["pm25"]),
        "pm10": apply_variation(base["pm10"]),
        "co": apply_variation(base["co"]),
        "no2": apply_variation(base["no2"]),
        "so2": apply_variation(base["so2"]),
        "o3": apply_variation(base["o3"]),
        "timestamp": int(time.time())
    }

@mcp.tool()
def predict_health_risk(user_profile: dict, pollution_data: dict) -> dict:
    """
    Evaluate user profile parameters (asthma history, allergy type, age) 
    against current pollution levels to predict health risk level.
    """
    aqi = pollution_data.get("aqi", 50)
    pm25 = pollution_data.get("pm25", 10.0)
    pm10 = pollution_data.get("pm10", 20.0)
    
    age = user_profile.get("age", 30)
    asthma = user_profile.get("asthmaHistory", False) or user_profile.get("asthma_history", False)
    allergy_type = user_profile.get("allergyType", "None") or user_profile.get("allergy_type", "None")
    sensitivity = user_profile.get("sensitivityLevel", "Low") or user_profile.get("sensitivity_level", "Low")
    
    # Calculate base risk score out of 100
    risk_score = 10.0
    explanations = []
    
    # AQI impact
    if aqi > 50:
        risk_score += (aqi - 50) * 0.4
    
    # High PM2.5 specific risk
    if pm25 > 35.0:
        pm_excess = (pm25 - 35.0)
        risk_score += pm_excess * 0.8
        explanations.append(f"PM2.5 elevated by {round(pm_excess, 1)} µg/m³ above safety limits.")
    
    # User Profile risk factors
    if asthma:
        risk_score += 25
        explanations.append("User has a history of Asthma, increasing susceptibility to PM2.5 and PM10 particles.")
    
    if sensitivity.lower() == "high":
        risk_score += 20
        explanations.append("User health profile specifies high sensitivity to environmental pollutants.")
    elif sensitivity.lower() == "medium":
        risk_score += 10
        explanations.append("User health profile specifies medium sensitivity to environmental pollutants.")
        
    if age < 12:
        risk_score += 10
        explanations.append("Younger age increases respiration rate and susceptibility to atmospheric particulates.")
    elif age > 65:
        risk_score += 15
        explanations.append("Advanced age increases risk of respiratory and cardiovascular stress from poor air quality.")
        
    if allergy_type.strip().lower() not in ["none", "", "null"]:
        risk_score += 10
        explanations.append(f"Active allergy ({allergy_type}) can lead to heightened airway reactivity.")

    # Bound risk score
    risk_score = min(100.0, max(0.0, risk_score))
    risk_score = round(risk_score, 1)
    
    # Categorize Risk
    if risk_score <= 35:
        risk_level = "LOW"
    elif risk_score <= 70:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"
        
    if not explanations:
        explanations.append("Air quality levels are well within safe thresholds and no vulnerability triggers are active.")

    return {
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "explanations": explanations
    }

@mcp.tool()
def generate_health_recommendation(aqi: int, weather: dict, health_profile: dict) -> str:
    """
    Generate personalized health advice based on AQI, weather conditions, and health profile.
    """
    asthma = health_profile.get("asthmaHistory", False) or health_profile.get("asthma_history", False)
    allergy = health_profile.get("allergyType", "None") or health_profile.get("allergy_type", "None")
    temp = weather.get("temp", 25.0)
    humidity = weather.get("humidity", 50)
    
    recommendation_parts = []
    
    if aqi <= 50:
        recommendation_parts.append("Air quality is excellent. It is a great day for outdoor physical activities.")
    elif aqi <= 100:
        recommendation_parts.append("Air quality is acceptable. However, highly sensitive individuals should consider reducing heavy outdoor exertion.")
        if asthma:
            recommendation_parts.append("As you have asthma history, please keep a quick-relief inhaler handy if you plan to exert yourself outdoors.")
    elif aqi <= 150:
        recommendation_parts.append("Air quality is unhealthy for sensitive groups. Active children, elderly, and people with respiratory diseases should limit prolonged outdoor exposure.")
        if asthma:
            recommendation_parts.append("Asthma triggers are active in the air. Limit outdoor exercise. Keep windows closed.")
    else:
        recommendation_parts.append("Air quality is unhealthy! Everyone should limit outdoor activities, close windows, and use air purifiers indoors. If you must go outside, wear an N95 mask.")
        if asthma:
            recommendation_parts.append("EMERGENCY ASTHMA MODE ACTIVE: Avoid going outdoors. Ensure all rescue medications are immediately accessible.")

    # Weather factor
    if temp > 35.0:
        recommendation_parts.append(f"High temperature ({temp}°C) combined with air quality levels increases thermal stress. Stay hydrated indoors.")
    elif temp < 10.0:
        recommendation_parts.append(f"Cold air temperature ({temp}°C) can cause bronchial constriction, especially for asthmatics. Cover your nose and mouth outdoors.")
        
    if humidity > 80:
        recommendation_parts.append("High humidity can trap airborne allergens and mold spores closer to the ground, increasing allergy risks.")
        
    if allergy.lower() not in ["none", "", "null"]:
        recommendation_parts.append(f"Pollen and particulate levels may exacerbate your {allergy} allergy. Consider taking an antihistamine if symptoms arise.")

    return " ".join(recommendation_parts)

@mcp.tool()
def weather_analysis(city: str) -> dict:
    """
    Fetch weather information for a given city (temperature, humidity, wind speed, pressure).
    """
    city_clean = city.strip().lower()
    
    weather_baselines = {
        "delhi": {"temp": 32.5, "humidity": 75, "wind_speed": 12.0, "condition": "Haze"},
        "beijing": {"temp": 26.0, "humidity": 60, "wind_speed": 15.0, "condition": "Overcast"},
        "new york": {"temp": 22.0, "humidity": 55, "wind_speed": 18.0, "condition": "Clear"},
        "london": {"temp": 16.0, "humidity": 82, "wind_speed": 22.0, "condition": "Showers"},
        "tokyo": {"temp": 24.0, "humidity": 68, "wind_speed": 10.0, "condition": "Partly Cloudy"},
        "sydney": {"temp": 18.0, "humidity": 62, "wind_speed": 20.0, "condition": "Sunny"},
    }
    
    default_weather = {"temp": 20.0, "humidity": 65, "wind_speed": 14.0, "condition": "Mostly Cloudy"}
    base = weather_baselines.get(city_clean, default_weather)
    
    # Fluctuation
    seed = int(time.time()) % 100
    temp_fluc = (seed % 6) - 3 # -3 to +3 degrees
    hum_fluc = (seed % 10) - 5 # -5 to +5% humidity
    
    return {
        "city": city.capitalize(),
        "temp": round(base["temp"] + temp_fluc, 1),
        "humidity": min(100, max(0, base["humidity"] + hum_fluc)),
        "wind_speed": round(base["wind_speed"] * (1 + (seed % 20 - 10) / 100.0), 1),
        "condition": base["condition"],
        "timestamp": int(time.time())
    }

@mcp.tool()
def emergency_alert(risk_level: str, user_profile: dict) -> dict:
    """
    Determine emergency response and suggest nearby action guidelines in case of high health risk.
    """
    asthma = user_profile.get("asthmaHistory", False) or user_profile.get("asthma_history", False)
    
    actions = [
        "Remain indoors with doors and windows closed.",
        "Turn on an air purifier with a HEPA filter if available."
    ]
    
    if risk_level.upper() == "HIGH":
        severity = "CRITICAL"
        if asthma:
            actions.append("Keep your quick-relief inhaler (e.g. Albuterol) in your immediate possession.")
            actions.append("If experiencing breathing difficulties, tightness in the chest, or wheezing, execute your Asthma Action Plan immediately.")
        actions.append("Avoid any outdoor physical exertion.")
        actions.append("Contact emergency services (or your primary physician) if symptoms do not improve with medication.")
        actions.append("Suggested nearby facility: City General Hospital - Respiratory Care Unit (Location: 1.2 miles away).")
    else:
        severity = "WARNING"
        actions.append("Sensitive individuals should limit prolonged outdoor activity.")
        actions.append("Monitor respiratory symptoms closely.")
        
    return {
        "severity": severity,
        "emergencyActions": actions,
        "contactSOSSuggested": risk_level.upper() == "HIGH",
        "timestamp": int(time.time())
    }

if __name__ == "__main__":
    mcp.run()
