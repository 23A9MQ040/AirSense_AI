package com.airsense.ai.repository;

import com.airsense.ai.model.HealthProfile;
import com.airsense.ai.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface HealthProfileRepository extends JpaRepository<HealthProfile, UUID> {
    Optional<HealthProfile> findByUser(User user);
    Optional<HealthProfile> findByUserId(UUID userId);
}
