package com.airsense.ai.controller;

import com.airsense.ai.model.*;
import com.airsense.ai.service.AirQualityService;
import com.airsense.ai.service.HealthRiskService;
import com.airsense.ai.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
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
            
            // Sync user city if not matching
            if (!city.equals(user.getLocation())) {
                userService.updateUserLocation(user.getId(), city);
            }

            Map<String, Object> stats = new HashMap<>();
            stats.put("city", aq.getCity());
            stats.put("aqi", aq.getAqi());
            stats.put("pm25", aq.getPm25());
            stats.put("pm10", aq.getPm10());
            stats.put("risk_level", risk.getRiskLevel());
            stats.put("risk_score", risk.getRiskScore());
            stats.put("timestamp", aq.getTimestamp());
            
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
}
