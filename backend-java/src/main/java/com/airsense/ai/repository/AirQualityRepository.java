package com.airsense.ai.repository;

import com.airsense.ai.model.AirQuality;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AirQualityRepository extends JpaRepository<AirQuality, UUID> {
    Optional<AirQuality> findTopByCityIgnoreCaseOrderByTimestampDesc(String city);
}
