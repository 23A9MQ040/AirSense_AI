package com.airsense.ai.service;

import com.airsense.ai.model.AirQuality;
import com.airsense.ai.model.Alert;
import com.airsense.ai.model.HealthProfile;
import com.airsense.ai.model.RiskPrediction;
import com.airsense.ai.model.User;
import com.airsense.ai.repository.AlertRepository;
import com.airsense.ai.repository.RiskPredictionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class HealthRiskService {

    @Autowired
    private RiskPredictionRepository riskPredictionRepository;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private AirQualityService airQualityService;

    @Transactional
    public RiskPrediction evaluateRisk(UUID userId, String city) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        HealthProfile profile = userService.getHealthProfile(userId);
        AirQuality aq = airQualityService.getOrFetchAirQuality(city);

        double baseRisk = 0.1;

        // Factor in AQI
        if (aq.getAqi() <= 50) {
            baseRisk += 0.05;
        } else if (aq.getAqi() <= 100) {
            baseRisk += 0.25;
        } else if (aq.getAqi() <= 150) {
            baseRisk += 0.50;
        } else {
            baseRisk += 0.80;
        }

        // Factor in Health Profile
        if (profile.isAsthmaHistory()) {
            baseRisk += 0.20;
        }
        if ("HIGH".equalsIgnoreCase(profile.getSensitivityLevel())) {
            baseRisk += 0.25;
        } else if ("MEDIUM".equalsIgnoreCase(profile.getSensitivityLevel())) {
            baseRisk += 0.15;
        }

        // Factor in age
        if (profile.getAge() > 65 || profile.getAge() < 12) {
            baseRisk += 0.10;
        }

        // Bound risk score between 0.0 and 1.0
        double riskScore = Math.min(1.0, Math.max(0.0, baseRisk));
        
        String riskLevel;
        if (riskScore >= 0.7) {
            riskLevel = "HIGH";
        } else if (riskScore >= 0.4) {
            riskLevel = "MEDIUM";
        } else {
            riskLevel = "LOW";
        }

        RiskPrediction prediction = new RiskPrediction();
        prediction.setUser(user);
        prediction.setRiskScore(Math.round(riskScore * 100.0) / 100.0);
        prediction.setRiskLevel(riskLevel);
        prediction.setDate(LocalDateTime.now());
        
        RiskPrediction savedPrediction = riskPredictionRepository.save(prediction);

        // If risk level is MEDIUM or HIGH, trigger an alert for the user
        if (!"LOW".equals(riskLevel)) {
            triggerAlertIfNecessary(user, riskLevel, aq.getAqi(), city, profile);
        }

        return savedPrediction;
    }

    private void triggerAlertIfNecessary(User user, String riskLevel, int aqi, String city, HealthProfile profile) {
        String msg = String.format("Alert: The Air Quality Index in %s is %d. Due to your health profile (%s sensitivity%s), your predicted health risk level is %s. Please limit heavy outdoor exertion.",
                city, aqi, profile.getSensitivityLevel(), profile.isAsthmaHistory() ? " with asthma history" : "", riskLevel);

        // Check if there was already a similar alert in the last 2 hours to avoid spamming
        List<Alert> recentAlerts = alertRepository.findByUserOrderByTimestampDesc(user);
        if (!recentAlerts.isEmpty()) {
            Alert lastAlert = recentAlerts.get(0);
            if (lastAlert.getTimestamp().isAfter(LocalDateTime.now().minusHours(2))) {
                // Already alert in last 2 hours, skip
                return;
            }
        }

        Alert alert = new Alert();
        alert.setUser(user);
        alert.setMessage(msg);
        alert.setTimestamp(LocalDateTime.now());
        alertRepository.save(alert);
    }

    public List<RiskPrediction> getRiskHistory(UUID userId) {
        return riskPredictionRepository.findByUserIdOrderByDateDesc(userId);
    }

    public List<Alert> getAlerts(UUID userId) {
        return alertRepository.findByUserIdOrderByTimestampDesc(userId);
    }
}
