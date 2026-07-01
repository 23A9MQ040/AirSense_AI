package com.airsense.ai.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    
    @Column(columnDefinition = "TEXT")
    private String request;
    
    @Column(name = "security_status")
    private String securityStatus; // PASSED, BLOCKED_INJECTION, PII_REDACTED
    
    private LocalDateTime timestamp;
}
