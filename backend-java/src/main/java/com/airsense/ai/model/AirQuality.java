package com.airsense.ai.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "air_quality")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AirQuality {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    
    @Column(nullable = false)
    private String city;
    
    private int aqi;
    
    private double pm25;
    
    private double pm10;
    
    private Double co;
    
    private Double no2;
    
    private Double so2;
    
    private Double o3;
    
    private Double temperature;
    
    private Double humidity;
    
    private Double windSpeed;
    
    private double latitude;
    
    private double longitude;
    
    private LocalDateTime timestamp;
}
