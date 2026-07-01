package com.airsense.ai.service;

import com.airsense.ai.model.HealthProfile;
import com.airsense.ai.model.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AIService {

    @Autowired
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private com.airsense.ai.repository.AuditLogRepository auditLogRepository;

    private int lastSyncedAuditLogId = 0;

    @Value("${airsense.agents.path:../agents-cli/agents_workflow.py}")
    private String agentsScriptPath;

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    public Map<String, Object> askAI(UUID userId, String city, String query) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        HealthProfile profile = userService.getHealthProfile(userId);

        Map<String, Object> result = new HashMap<>();
        
        // Prepare command-line invocation
        // Determine script path absolute reference
        File scriptFile = new File(agentsScriptPath);
        if (!scriptFile.exists()) {
            // If relative to working dir fails, try relative to /agents-cli (Docker)
            scriptFile = new File("/agents-cli/agents_workflow.py");
        }

        if (!scriptFile.exists()) {
            return getMockResponse(city, query, profile, "Configuration Error: agent script not found at " + scriptFile.getAbsolutePath());
        }

        try {
            // Setup ProcessBuilder
            String pythonCmd = System.getProperty("os.name").toLowerCase().contains("win") ? "python" : "python3";
            List<String> command = new ArrayList<>(Arrays.asList(pythonCmd, scriptFile.getAbsolutePath(), city, String.valueOf(profile.isAsthmaHistory()), query));
            ProcessBuilder processBuilder = new ProcessBuilder(command);
            
            // Inject API Key into subprocess environment if present
            Map<String, String> env = processBuilder.environment();
            if (geminiApiKey != null && !geminiApiKey.isEmpty()) {
                env.put("GEMINI_API_KEY", geminiApiKey);
            } else {
                // Fallback: Check System Env
                String systemKey = System.getenv("GEMINI_API_KEY");
                if (systemKey != null) {
                    env.put("GEMINI_API_KEY", systemKey);
                }
            }

            Process process = processBuilder.start();

            // Read output
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            // Read error log
            StringBuilder errorOutput = new StringBuilder();
            try (BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                String line;
                while ((line = errorReader.readLine()) != null) {
                    errorOutput.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(45, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                syncAuditLogs();
                return getMockResponse(city, query, profile, "Subprocess timed out after 45 seconds.");
            }

            int exitCode = process.exitValue();
            syncAuditLogs();
            String stdoutStr = output.toString();
            String stderrStr = errorOutput.toString();

            if (exitCode != 0) {
                System.err.println("ADK script failed. Exit code: " + exitCode);
                System.err.println("Stderr: " + stderrStr);
                return getMockResponse(city, query, profile, "ADK agent workflow exited with code: " + exitCode + ". Error: " + stderrStr);
            }

            // Parse stdout to find JSON state block
            Map<String, Object> state = parseJsonState(stdoutStr);
            if (state == null) {
                return getMockResponse(city, query, profile, "Failed to parse workflow state JSON from output: " + stdoutStr);
            }

            // Extract values from state
            result.put("success", true);
            result.put("aqi", state.get("aqi_level"));
            result.put("risk_level", state.get("risk_level"));
            result.put("risk_score", state.get("risk_score"));
            result.put("alerts", state.get("alerts"));
            
            // Extract agent responses
            String response = extractAgentResponse(stdoutStr);
            result.put("response", response);
            return result;

        } catch (Exception e) {
            System.err.println("Error calling Python ADK agents: " + e.getMessage());
            return getMockResponse(city, query, profile, "Internal Execution Error: " + e.getMessage());
        }
    }

    private Map<String, Object> parseJsonState(String stdout) {
        try {
            // Find the JSON block starting with { and ending with }
            int startIdx = stdout.indexOf('{', stdout.indexOf("Final Shared Context State"));
            if (startIdx == -1) {
                startIdx = stdout.indexOf('{');
            }
            int endIdx = stdout.lastIndexOf('}');
            if (startIdx == -1 || endIdx == -1 || startIdx > endIdx) {
                return null;
            }
            String jsonStr = stdout.substring(startIdx, endIdx + 1);
            return objectMapper.readValue(jsonStr, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            System.err.println("JSON Parsing error: " + e.getMessage());
            return null;
        }
    }

    private String extractAgentResponse(String stdout) {
        // Regex to match: [Agent: AIHealthAssistantAgent] -> content
        Pattern pattern = Pattern.compile("\\[Agent:\\s*AIHealthAssistantAgent\\]\\s*->\\s*(.*)", Pattern.DOTALL);
        Matcher matcher = pattern.matcher(stdout);
        if (matcher.find()) {
            String fullMatch = matcher.group(1);
            // If another agent header follows, cut there
            int nextAgentIdx = fullMatch.indexOf("\n[Agent:");
            if (nextAgentIdx != -1) {
                return fullMatch.substring(0, nextAgentIdx).trim();
            }
            // Or if JSON stats follow
            int statsIdx = fullMatch.indexOf("\n--- Pipeline Execution Completed");
            if (statsIdx != -1) {
                return fullMatch.substring(0, statsIdx).trim();
            }
            return fullMatch.trim();
        }
        
        // Fallback: search for last line or any agent dialogue
        return "AirSense AI multi-agent workflow executed successfully, but custom agent response formatting was not resolved.";
    }

    private Map<String, Object> getMockResponse(String city, String query, HealthProfile profile, String debugMessage) {
        Map<String, Object> mock = new HashMap<>();
        mock.put("success", false);
        mock.put("debug_message", debugMessage);
        
        // Generate simulated fallback values
        int mockAqi = 120;
        if (city.toLowerCase().contains("delhi")) mockAqi = 210;
        else if (city.toLowerCase().contains("san francisco")) mockAqi = 32;
        
        mock.put("aqi", mockAqi);
        
        String riskLevel = "MEDIUM";
        double riskScore = 0.55;
        if (profile.isAsthmaHistory() || mockAqi > 150) {
            riskLevel = "HIGH";
            riskScore = 0.85;
        } else if (mockAqi < 50) {
            riskLevel = "LOW";
            riskScore = 0.20;
        }
        
        mock.put("risk_level", riskLevel);
        mock.put("risk_score", riskScore);
        
        List<String> mockAlerts = new ArrayList<>();
        if ("HIGH".equals(riskLevel)) {
            mockAlerts.add("CRITICAL: Extreme pollution risk. Wear protective mask N95 outdoors.");
        }
        mock.put("alerts", mockAlerts);
        
        String mockAnswer = String.format("[Fallback Assistant] The current Air Quality Index (AQI) in %s is %d. " +
                "Given your profile (Asthma: %b, Sensitivity: %s), your estimated health risk is %s. " +
                "I strongly advise reducing intense physical outdoor work or activities today and keeping windows shut.",
                city, mockAqi, profile.isAsthmaHistory(), profile.getSensitivityLevel(), riskLevel);
        
        mock.put("response", mockAnswer);
        return mock;
    }

    private void syncAuditLogs() {
        File sqliteDbFile = new File("e:/AirSense_AI/agents-cli/airsense_audit.db");
        if (!sqliteDbFile.exists()) {
            sqliteDbFile = new File("../agents-cli/airsense_audit.db");
        }
        if (!sqliteDbFile.exists()) {
            sqliteDbFile = new File("/app/agents-cli/airsense_audit.db");
        }
        
        if (!sqliteDbFile.exists()) {
            return;
        }

        String url = "jdbc:sqlite:" + sqliteDbFile.getAbsolutePath();
        String sql = "SELECT id, request, security_status, timestamp FROM audit_logs WHERE id > " + lastSyncedAuditLogId + " ORDER BY id ASC";

        try {
            Class.forName("org.sqlite.JDBC");
            try (java.sql.Connection conn = java.sql.DriverManager.getConnection(url);
                 java.sql.Statement stmt = conn.createStatement();
                 java.sql.ResultSet rs = stmt.executeQuery(sql)) {
                
                while (rs.next()) {
                    int logId = rs.getInt("id");
                    String request = rs.getString("request");
                    String status = rs.getString("security_status");
                    String timestampStr = rs.getString("timestamp");
                    
                    java.time.LocalDateTime timestamp;
                    try {
                        timestamp = java.time.LocalDateTime.parse(timestampStr);
                    } catch (Exception ex) {
                        timestamp = java.time.LocalDateTime.now();
                    }
                    
                    com.airsense.ai.model.AuditLog auditLog = com.airsense.ai.model.AuditLog.builder()
                            .request(request)
                            .securityStatus(status)
                            .timestamp(timestamp)
                            .build();
                    auditLogRepository.save(auditLog);
                    
                    lastSyncedAuditLogId = logId;
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to sync SQLite audit logs to PostgreSQL: " + e.getMessage());
        }
    }
}
