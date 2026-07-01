package com.airsense.ai.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "health_profile")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthProfile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    private int age;
    
    @Column(name = "asthma_history")
    private boolean asthmaHistory;
    
    @Column(name = "allergy_type")
    private String allergyType;
    
    @Column(name = "sensitivity_level")
    private String sensitivityLevel; // LOW, MEDIUM, HIGH
}
