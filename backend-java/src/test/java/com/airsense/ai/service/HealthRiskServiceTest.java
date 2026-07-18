package com.airsense.ai.service;

import com.airsense.ai.model.*;
import com.airsense.ai.repository.AlertRepository;
import com.airsense.ai.repository.RiskPredictionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HealthRiskServiceTest {

    @Mock
    private RiskPredictionRepository riskPredictionRepository;

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private UserService userService;

    @Mock
    private AirQualityService airQualityService;

    @InjectMocks
    private HealthRiskService healthRiskService;

    private UUID userId;
    private User user;
    private HealthProfile profile;
    private AirQuality airQuality;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder()
                .id(userId)
                .name("Alice")
                .email("alice@example.com")
                .password("password")
                .location("Delhi")
                .build();
        
        profile = HealthProfile.builder()
                .id(UUID.randomUUID())
                .user(user)
                .age(28)
                .asthmaHistory(true)
                .sensitivityLevel("HIGH")
                .allergyType("Pollen")
                .build();

        airQuality = AirQuality.builder()
                .id(UUID.randomUUID())
                .city("Delhi")
                .aqi(160)
                .pm25(110.0)
                .pm10(200.0)
                .build();
    }

    @Test
    void testEvaluateRisk_HighAqi_Asthma_HighSensitivity() {
        // Arrange
        when(userService.findById(userId)).thenReturn(Optional.of(user));
        when(userService.getHealthProfile(userId)).thenReturn(profile);
        when(airQualityService.getOrFetchAirQuality("Delhi")).thenReturn(airQuality);
        when(riskPredictionRepository.save(any(RiskPrediction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(alertRepository.findByUserOrderByTimestampDesc(any(User.class))).thenReturn(new ArrayList<>());

        // Act
        RiskPrediction result = healthRiskService.evaluateRisk(userId, "Delhi");

        // Assert
        assertNotNull(result);
        assertEquals("HIGH", result.getRiskLevel());
        // baseRisk = 0.1
        // AQI > 150 -> +0.80
        // Asthma -> +0.20
        // High Sensitivity -> +0.25
        // Total = 1.35, bounded to 1.0
        assertEquals(100, result.getRiskScore());
        
        verify(riskPredictionRepository, times(1)).save(any(RiskPrediction.class));
        verify(alertRepository, times(1)).save(any(Alert.class));
    }
}
