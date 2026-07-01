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
    
    private double co;
    
    private double no2;
    
    private double so2;
    
    private double o3;
    
    private double latitude;
    
    private double longitude;
    
    private LocalDateTime timestamp;
}
