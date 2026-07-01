package com.airsense.ai.controller;

import com.airsense.ai.model.User;
import com.airsense.ai.service.AIService;
import com.airsense.ai.service.ReportService;
import com.airsense.ai.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Autowired
    private UserService userService;

    @Autowired
    private AIService aiService;

    @Autowired
    private ReportService reportService;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }

    @PostMapping("/chat")
    public ResponseEntity<?> askAI(@RequestBody Map<String, String> request) {
        try {
            User user = getAuthenticatedUser();
            String query = request.get("query");
            String city = request.getOrDefault("city", user.getLocation() != null ? user.getLocation() : "New York");

            if (query == null || query.trim().isEmpty()) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Query must not be empty");
                return ResponseEntity.badRequest().body(response);
            }

            Map<String, Object> aiResult = aiService.askAI(user.getId(), city, query);
            return ResponseEntity.ok(aiResult);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/report")
    public ResponseEntity<byte[]> downloadReport(@RequestParam(defaultValue = "New York") String city) {
        try {
            User user = getAuthenticatedUser();
            byte[] pdfBytes = reportService.generateHealthReport(user.getId(), city);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "airsense_health_report_" + city.replace(" ", "_") + ".pdf");
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);
        } catch (Exception e) {
            System.err.println("Error downloading PDF: " + e.getMessage());
            return ResponseEntity.status(500).body(null);
        }
    }
}
