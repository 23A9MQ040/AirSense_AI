package com.airsense.ai.controller;

import com.airsense.ai.model.*;
import com.airsense.ai.service.AirQualityService;
import com.airsense.ai.service.HealthRiskService;
import com.airsense.ai.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private UserService userService;

    @Autowired
    private AirQualityService airQualityService;

    @Autowired
    private HealthRiskService healthRiskService;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestParam(defaultValue = "New York") String city) {
        try {
            User user = getAuthenticatedUser();
            AirQuality aq = airQualityService.getOrFetchAirQuality(city);
            RiskPrediction risk = healthRiskService.evaluateRisk(user.getId(), city);
            
            if (!city.equals(user.getLocation())) {
                userService.updateUserLocation(user.getId(), city);
            }

            Map<String, Object> stats = new HashMap<>();
            stats.put("city", aq.getCity());
            stats.put("aqi", aq.getAqi());
            stats.put("pm25", aq.getPm25());
            stats.put("pm10", aq.getPm10());
            stats.put("co", aq.getCo() != null ? aq.getCo() : 0.4);
            stats.put("no2", aq.getNo2() != null ? aq.getNo2() : 12.0);
            stats.put("so2", aq.getSo2() != null ? aq.getSo2() : 4.5);
            stats.put("o3", aq.getO3() != null ? aq.getO3() : 65.0);
            stats.put("temperature", aq.getTemperature() != null ? aq.getTemperature() : 24.0);
            stats.put("humidity", aq.getHumidity() != null ? aq.getHumidity() : 55.0);
            stats.put("windSpeed", aq.getWindSpeed() != null ? aq.getWindSpeed() : 12.0);
            stats.put("risk_level", risk.getRiskLevel());
            stats.put("risk_score", risk.getRiskScore());
            stats.put("timestamp", aq.getTimestamp());
            stats.put("userName", user.getName());
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@RequestParam(defaultValue = "New York") String city) {
        try {
            List<AirQuality> history = airQualityService.getHistoricalData(city);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/forecast")
    public ResponseEntity<?> getForecast(@RequestParam(defaultValue = "New York") String city) {
        try {
            AirQuality current = airQualityService.getOrFetchAirQuality(city);
            double baseAqi = current.getAqi();
            Random rnd = new Random();
            
            List<Map<String, Object>> forecast = new ArrayList<>();
            for (int i = 1; i <= 24; i++) {
                Map<String, Object> point = new HashMap<>();
                double variation = (rnd.nextGaussian() * 15);
                double trend = (i <= 12) ? i * 0.5 : (24 - i) * 0.5;
                double aqiVal = Math.max(0, Math.min(500, baseAqi + variation + trend));
                point.put("hour", i);
                point.put("label", "+" + i + "h");
                point.put("aqi", Math.round(aqiVal));
                point.put("category", aqiCategory((int) aqiVal));
                forecast.add(point);
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("city", city);
            result.put("currentAqi", (int) baseAqi);
            result.put("forecast", forecast);
            result.put("generatedAt", LocalDateTime.now().toString());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/health-profile")
    public ResponseEntity<?> getHealthProfile() {
        try {
            User user = getAuthenticatedUser();
            HealthProfile profile = userService.getHealthProfile(user.getId());
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PutMapping("/health-profile")
    public ResponseEntity<?> updateHealthProfile(@RequestBody HealthProfile profile) {
        try {
            User user = getAuthenticatedUser();
            HealthProfile updated = userService.updateHealthProfile(user.getId(), profile);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/alerts")
    public ResponseEntity<?> getAlerts() {
        try {
            User user = getAuthenticatedUser();
            List<Alert> alerts = healthRiskService.getAlerts(user.getId());
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    private String aqiCategory(int aqi) {
        if (aqi <= 50) return "Good";
        if (aqi <= 100) return "Moderate";
        if (aqi <= 150) return "Unhealthy for Sensitive Groups";
        if (aqi <= 200) return "Unhealthy";
        if (aqi <= 300) return "Very Unhealthy";
        return "Hazardous";
    }
}
