package com.airsense.ai.controller;

import com.airsense.ai.model.*;
import com.airsense.ai.service.AirQualityService;
import com.airsense.ai.service.HealthRiskService;
import com.airsense.ai.service.UserService;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/report")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private UserService userService;

    @Autowired
    private AirQualityService airQualityService;

    @Autowired
    private HealthRiskService healthRiskService;

    @GetMapping("/generate")
    public ResponseEntity<byte[]> generateReport(@RequestParam(defaultValue = "New York") String city) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            HealthProfile profile = userService.getHealthProfile(user.getId());
            AirQuality aq = airQualityService.getOrFetchAirQuality(city);
            RiskPrediction risk = healthRiskService.evaluateRisk(user.getId(), city);
            List<AirQuality> history = airQualityService.getHistoricalData(city);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document doc = new Document(PageSize.A4, 50, 50, 70, 50);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            // Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, Color.decode("#064e3b"));
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.decode("#065f46"));
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 11, Color.DARK_GRAY);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.BLACK);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY);
            
            // Title
            Paragraph title = new Paragraph("AirSense AI — Personal Health Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(5);
            doc.add(title);
            
            Paragraph subtitle = new Paragraph("AI-Powered Air Quality & Health Risk Analysis", 
                    FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 11, Color.GRAY));
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(15);
            doc.add(subtitle);
            
            // Divider
            doc.add(new Paragraph("─────────────────────────────────────────────────", smallFont));
            
            // Report metadata
            Paragraph meta = new Paragraph(
                "Generated: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm")) + 
                "  |  City: " + city + "  |  User: " + user.getName(), smallFont);
            meta.setAlignment(Element.ALIGN_CENTER);
            meta.setSpacingAfter(20);
            doc.add(meta);

            // Section: Current AQI
            Paragraph aqiHeader = new Paragraph("📊 Current Air Quality Summary", headerFont);
            aqiHeader.setSpacingAfter(8);
            doc.add(aqiHeader);

            PdfPTable aqiTable = new PdfPTable(2);
            aqiTable.setWidthPercentage(100);
            aqiTable.setSpacingAfter(20);
            addTableRow(aqiTable, "City", city, normalFont, boldFont);
            addTableRow(aqiTable, "AQI", String.valueOf(aq.getAqi()) + " — " + aqiCategory(aq.getAqi()), normalFont, boldFont);
            addTableRow(aqiTable, "PM2.5", String.format("%.1f μg/m³", aq.getPm25()), normalFont, boldFont);
            addTableRow(aqiTable, "PM10", String.format("%.1f μg/m³", aq.getPm10()), normalFont, boldFont);
            addTableRow(aqiTable, "CO", aq.getCo() != null ? String.format("%.2f mg/m³", aq.getCo()) : "N/A", normalFont, boldFont);
            addTableRow(aqiTable, "NO2", aq.getNo2() != null ? String.format("%.1f μg/m³", aq.getNo2()) : "N/A", normalFont, boldFont);
            addTableRow(aqiTable, "SO2", aq.getSo2() != null ? String.format("%.1f μg/m³", aq.getSo2()) : "N/A", normalFont, boldFont);
            addTableRow(aqiTable, "O3", aq.getO3() != null ? String.format("%.1f μg/m³", aq.getO3()) : "N/A", normalFont, boldFont);
            doc.add(aqiTable);

            // Section: Health Risk
            Paragraph riskHeader = new Paragraph("🩺 Personalized Health Risk Assessment", headerFont);
            riskHeader.setSpacingAfter(8);
            doc.add(riskHeader);
            
            PdfPTable riskTable = new PdfPTable(2);
            riskTable.setWidthPercentage(100);
            riskTable.setSpacingAfter(20);
            addTableRow(riskTable, "Risk Level", risk.getRiskLevel(), normalFont, boldFont);
            addTableRow(riskTable, "Risk Score", risk.getRiskScore() + "/100", normalFont, boldFont);
            addTableRow(riskTable, "Asthma History", profile.isAsthmaHistory() ? "Yes" : "No", normalFont, boldFont);
            addTableRow(riskTable, "Allergy Type", profile.getAllergyType() != null ? profile.getAllergyType() : "None", normalFont, boldFont);
            addTableRow(riskTable, "Age", profile.getAge() > 0 ? String.valueOf(profile.getAge()) : "Not Set", normalFont, boldFont);
            doc.add(riskTable);

            // Section: Recommendations
            Paragraph recHeader = new Paragraph("💡 AI Health Recommendations", headerFont);
            recHeader.setSpacingAfter(8);
            doc.add(recHeader);
            
            String[] recommendations = getRecommendations(aq.getAqi(), risk.getRiskLevel(), profile);
            for (String rec : recommendations) {
                Paragraph recPara = new Paragraph("• " + rec, normalFont);
                recPara.setSpacingAfter(5);
                doc.add(recPara);
            }

            // Section: Historical Trend
            if (!history.isEmpty()) {
                doc.add(Chunk.NEWLINE);
                Paragraph histHeader = new Paragraph("📈 Recent AQI History", headerFont);
                histHeader.setSpacingAfter(8);
                doc.add(histHeader);
                
                PdfPTable histTable = new PdfPTable(3);
                histTable.setWidthPercentage(100);
                histTable.setSpacingAfter(20);
                
                PdfPCell h1 = new PdfPCell(new Phrase("Timestamp", boldFont));
                PdfPCell h2 = new PdfPCell(new Phrase("AQI", boldFont));
                PdfPCell h3 = new PdfPCell(new Phrase("Category", boldFont));
                h1.setBackgroundColor(Color.decode("#d1fae5"));
                h2.setBackgroundColor(Color.decode("#d1fae5"));
                h3.setBackgroundColor(Color.decode("#d1fae5"));
                histTable.addCell(h1); histTable.addCell(h2); histTable.addCell(h3);
                
                int count = 0;
                for (AirQuality haq : history) {
                    if (count++ >= 10) break;
                    histTable.addCell(new Phrase(haq.getTimestamp() != null ? 
                        haq.getTimestamp().format(DateTimeFormatter.ofPattern("MMM dd HH:mm")) : "N/A", normalFont));
                    histTable.addCell(new Phrase(String.valueOf(haq.getAqi()), normalFont));
                    histTable.addCell(new Phrase(aqiCategory(haq.getAqi()), normalFont));
                }
                doc.add(histTable);
            }

            // Footer
            doc.add(new Paragraph("─────────────────────────────────────────────────", smallFont));
            Paragraph footer = new Paragraph(
                "⚠️ Disclaimer: This report is generated by an AI system and is for informational purposes only. " +
                "It does not constitute medical advice. Please consult a qualified healthcare provider for medical decisions.", smallFont);
            footer.setSpacingBefore(5);
            doc.add(footer);
            
            Paragraph poweredBy = new Paragraph("Powered by AirSense AI | Gemini AI | google-adk", smallFont);
            poweredBy.setAlignment(Element.ALIGN_CENTER);
            poweredBy.setSpacingBefore(10);
            doc.add(poweredBy);
            
            doc.close();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", 
                "airsense-health-report-" + city.replace(" ", "_") + ".pdf");
            
            return ResponseEntity.ok().headers(headers).body(baos.toByteArray());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getReportSummary(@RequestParam(defaultValue = "New York") String city) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            AirQuality aq = airQualityService.getOrFetchAirQuality(city);
            RiskPrediction risk = healthRiskService.evaluateRisk(user.getId(), city);
            HealthProfile profile = userService.getHealthProfile(user.getId());
            List<AirQuality> history = airQualityService.getHistoricalData(city);
            
            double avgAqi = history.stream().mapToInt(AirQuality::getAqi).average().orElse(aq.getAqi());
            
            java.util.Map<String, Object> summary = new java.util.HashMap<>();
            summary.put("city", city);
            summary.put("currentAqi", aq.getAqi());
            summary.put("avgAqi", Math.round(avgAqi));
            summary.put("riskLevel", risk.getRiskLevel());
            summary.put("riskScore", risk.getRiskScore());
            summary.put("historyCount", history.size());
            summary.put("recommendations", getRecommendations(aq.getAqi(), risk.getRiskLevel(), profile));
            summary.put("generatedAt", LocalDateTime.now().toString());
            
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            java.util.Map<String, String> err = new java.util.HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
    
    private void addTableRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBackgroundColor(Color.decode("#f0fdf4"));
        labelCell.setPadding(6);
        table.addCell(labelCell);
        
        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setPadding(6);
        table.addCell(valueCell);
    }
    
    private String aqiCategory(int aqi) {
        if (aqi <= 50) return "Good";
        if (aqi <= 100) return "Moderate";
        if (aqi <= 150) return "Unhealthy for Sensitive Groups";
        if (aqi <= 200) return "Unhealthy";
        if (aqi <= 300) return "Very Unhealthy";
        return "Hazardous";
    }
    
    private String[] getRecommendations(int aqi, String riskLevel, HealthProfile profile) {
        if (aqi <= 50) {
            return new String[]{
                "Air quality is excellent today. Enjoy outdoor activities freely.",
                "Great day for exercise, running, or cycling outdoors.",
                "No special precautions needed for healthy individuals."
            };
        } else if (aqi <= 100) {
            return new String[]{
                "Air quality is acceptable. Unusually sensitive individuals may experience mild discomfort.",
                profile.isAsthmaHistory() ? "Carry your inhaler as a precaution." : "Healthy individuals can engage in normal outdoor activities.",
                "Stay hydrated and take breaks if exercising outdoors."
            };
        } else if (aqi <= 150) {
            return new String[]{
                "Sensitive groups (children, elderly, asthmatics) should limit prolonged outdoor activity.",
                profile.isAsthmaHistory() ? "HIGH ALERT: Keep rescue inhaler accessible at all times." : "Active individuals may experience mild symptoms.",
                "Consider wearing an N95 mask if you must spend extended time outdoors.",
                "Close windows and use air purifiers indoors."
            };
        } else if (aqi <= 200) {
            return new String[]{
                "UNHEALTHY: Reduce all outdoor activity. Everyone may experience health effects.",
                "Asthmatics and elderly should remain indoors as much as possible.",
                "Use N95/KN95 masks if outdoor exposure is unavoidable.",
                "Run HEPA air purifiers at home. Seal window gaps.",
                "Drink plenty of water to flush inhaled pollutants from your system."
            };
        } else {
            return new String[]{
                "⚠️ VERY UNHEALTHY / HAZARDOUS: Avoid all outdoor activity.",
                "Stay indoors with windows sealed. Do not exercise outdoors.",
                "Wear N95 mask and goggles if outdoor exposure is absolutely necessary.",
                "Seek emergency medical care if experiencing chest tightness, difficulty breathing, or wheezing.",
                "Consider evacuating the area if air quality remains at this level for over 24 hours."
            };
        }
    }
}
