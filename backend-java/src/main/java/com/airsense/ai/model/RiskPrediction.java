package com.airsense.ai.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "risk_prediction")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskPrediction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(name = "risk_score")
    private int riskScore;
    
    @Column(name = "risk_level")
    private String riskLevel; // LOW, MEDIUM, HIGH
    
    private LocalDateTime date;
}
