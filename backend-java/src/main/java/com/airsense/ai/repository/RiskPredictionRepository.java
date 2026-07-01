package com.airsense.ai.repository;

import com.airsense.ai.model.RiskPrediction;
import com.airsense.ai.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RiskPredictionRepository extends JpaRepository<RiskPrediction, UUID> {
    List<RiskPrediction> findByUserOrderByDateDesc(User user);
    List<RiskPrediction> findByUserIdOrderByDateDesc(UUID userId);
}
