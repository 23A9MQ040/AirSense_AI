package com.airsense.ai.service;

import com.airsense.ai.model.AirQuality;
import com.airsense.ai.model.HealthProfile;
import com.airsense.ai.model.RiskPrediction;
import com.airsense.ai.model.User;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class ReportService {

    @Autowired
    private UserService userService;

    @Autowired
    private AirQualityService airQualityService;

    @Autowired
    private HealthRiskService healthRiskService;

    public byte[] generateHealthReport(UUID userId, String city) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        HealthProfile profile = userService.getHealthProfile(userId);
        AirQuality aq = airQualityService.getOrFetchAirQuality(city);
        List<RiskPrediction> risks = healthRiskService.getRiskHistory(userId);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            PdfWriter.getInstance(document, out);
            document.open();

            // Set up fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 24, new Color(16, 185, 129)); // Emerald Theme
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 12, Color.GRAY);
            Font sectionHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(30, 41, 59)); // Slate
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(51, 65, 85));
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 11, new Color(51, 65, 85));
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.WHITE);

            // Title
            Paragraph title = new Paragraph("AirSense AI Health Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            // Subtitle
            Paragraph subtitle = new Paragraph("AI-Powered Personalized Air Quality Monitoring and Health Protection", subtitleFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);
            document.add(subtitle);

            // Divider
            Paragraph divider = new Paragraph("______________________________________________________________________________", subtitleFont);
            divider.setSpacingAfter(20);
            document.add(divider);

            // Section 1: User details & Health profile
            document.add(new Paragraph("1. User & Health Profile", sectionHeaderFont));
            Paragraph details = new Paragraph();
            details.setSpacingBefore(10);
            details.setSpacingAfter(20);
            details.add(new Chunk("Name: ", boldFont)).add(new Chunk(user.getName() + "\n", normalFont));
            details.add(new Chunk("Email: ", boldFont)).add(new Chunk(user.getEmail() + "\n", normalFont));
            details.add(new Chunk("Monitoring City: ", boldFont)).add(new Chunk(city + "\n\n", normalFont));
            
            details.add(new Chunk("Age: ", boldFont)).add(new Chunk(profile.getAge() + "\n", normalFont));
            details.add(new Chunk("Asthma History: ", boldFont)).add(new Chunk((profile.isAsthmaHistory() ? "Yes" : "No") + "\n", normalFont));
            details.add(new Chunk("Allergy Type: ", boldFont)).add(new Chunk(profile.getAllergyType() + "\n", normalFont));
            details.add(new Chunk("Sensitivity Level: ", boldFont)).add(new Chunk(profile.getSensitivityLevel() + "\n", normalFont));
            document.add(details);

            // Section 2: Current Air Quality Status
            document.add(new Paragraph("2. Current Air Quality Environment", sectionHeaderFont));
            Paragraph aqParagraph = new Paragraph();
            aqParagraph.setSpacingBefore(10);
            aqParagraph.setSpacingAfter(20);
            aqParagraph.add(new Chunk("Air Quality Index (AQI): ", boldFont)).add(new Chunk(aq.getAqi() + " (" + getAqiCategory(aq.getAqi()) + ")\n", normalFont));
            aqParagraph.add(new Chunk("PM2.5 Level: ", boldFont)).add(new Chunk(aq.getPm25() + " µg/m³\n", normalFont));
            aqParagraph.add(new Chunk("PM10 Level: ", boldFont)).add(new Chunk(aq.getPm10() + " µg/m³\n", normalFont));
            aqParagraph.add(new Chunk("Last Updated: ", boldFont)).add(new Chunk(aq.getTimestamp().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + "\n", normalFont));
            document.add(aqParagraph);

            // Section 3: Risk Assessment Table
            document.add(new Paragraph("3. Health Risk Assessment Log", sectionHeaderFont));
            
            PdfPTable table = new PdfPTable(3);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10);
            table.setSpacingAfter(20);

            Color headerColor = new Color(16, 185, 129); // Emerald
            
            PdfPCell cell1 = new PdfPCell(new Paragraph("Date/Time", tableHeaderFont));
            cell1.setBackgroundColor(headerColor);
            cell1.setPadding(8);
            table.addCell(cell1);

            PdfPCell cell2 = new PdfPCell(new Paragraph("Calculated Risk Score (0-1)", tableHeaderFont));
            cell2.setBackgroundColor(headerColor);
            cell2.setPadding(8);
            table.addCell(cell2);

            PdfPCell cell3 = new PdfPCell(new Paragraph("Risk Level", tableHeaderFont));
            cell3.setBackgroundColor(headerColor);
            cell3.setPadding(8);
            table.addCell(cell3);

            int count = 0;
            for (RiskPrediction risk : risks) {
                if (count++ >= 5) break; // show top 5 historical risks
                
                table.addCell(new PdfPCell(new Paragraph(risk.getDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")), normalFont)));
                table.addCell(new PdfPCell(new Paragraph(String.valueOf(risk.getRiskScore()), normalFont)));
                
                PdfPCell levelCell = new PdfPCell(new Paragraph(risk.getRiskLevel(), normalFont));
                if ("HIGH".equalsIgnoreCase(risk.getRiskLevel())) {
                    levelCell.setBackgroundColor(new Color(254, 226, 226)); // light red
                } else if ("MEDIUM".equalsIgnoreCase(risk.getRiskLevel())) {
                    levelCell.setBackgroundColor(new Color(254, 243, 199)); // light amber
                } else {
                    levelCell.setBackgroundColor(new Color(209, 250, 229)); // light green
                }
                table.addCell(levelCell);
            }
            
            if (risks.isEmpty()) {
                PdfPCell emptyCell = new PdfPCell(new Paragraph("No risk data logged yet.", normalFont));
                emptyCell.setColspan(3);
                emptyCell.setPadding(10);
                emptyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(emptyCell);
            }
            
            document.add(table);

            // Section 4: Dynamic Medical & Health Advice
            document.add(new Paragraph("4. Personalised Health Recommendations", sectionHeaderFont));
            Paragraph advice = new Paragraph();
            advice.setSpacingBefore(10);
            advice.setSpacingAfter(20);
            
            if (aq.getAqi() > 150) {
                advice.add(new Chunk("Critical Warning: ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.RED)));
                advice.add(new Chunk("Air quality is highly unhealthy. Keep all windows closed, run clean indoor air purifiers, and wear an N95 mask if you must go outdoors. Contact your healthcare provider immediately if you experience breathing difficulties.\n", normalFont));
            } else if (aq.getAqi() > 100) {
                advice.add(new Chunk("Precautionary Notice: ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.ORANGE)));
                advice.add(new Chunk("Air quality is unhealthy for sensitive groups. People with asthma and active allergies should reduce outdoor activity, especially during midday and afternoon when ozone levels can peak.\n", normalFont));
            } else {
                advice.add(new Chunk("General Recommendation: ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(16, 185, 129))));
                advice.add(new Chunk("Air quality is acceptable. Outdoor activities are safe for most individuals. Continue standard health monitoring.\n", normalFont));
            }
            
            if (profile.isAsthmaHistory()) {
                advice.add(new Chunk("\nAsthma Action Item: ", boldFont));
                advice.add(new Chunk("Ensure your quick-relief inhaler is accessible at all times. Keep a log of your daily symptoms and monitor peaks in PM2.5 closely.", normalFont));
            }
            
            document.add(advice);

            // Footer
            Paragraph footer = new Paragraph("Report generated automatically by AirSense AI Platform. Disclaimer: This report is informational and does not replace medical diagnosis.", FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9, Color.GRAY));
            footer.setSpacingBefore(30);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generating health report PDF: " + e.getMessage(), e);
        }
    }

    private String getAqiCategory(int aqi) {
        if (aqi <= 50) return "Good";
        if (aqi <= 100) return "Moderate";
        if (aqi <= 150) return "Unhealthy for Sensitive Groups";
        if (aqi <= 200) return "Unhealthy";
        if (aqi <= 300) return "Very Unhealthy";
        return "Hazardous";
    }
}
