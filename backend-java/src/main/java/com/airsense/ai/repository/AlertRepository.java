package com.airsense.ai.repository;

import com.airsense.ai.model.Alert;
import com.airsense.ai.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<Alert, UUID> {
    List<Alert> findByUserOrderByTimestampDesc(User user);
    List<Alert> findByUserIdOrderByTimestampDesc(UUID userId);
}
