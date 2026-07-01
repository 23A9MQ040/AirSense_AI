package com.airsense.ai.service;

import com.airsense.ai.model.AirQuality;
import com.airsense.ai.repository.AirQualityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Service
public class AirQualityService {

    @Autowired
    private AirQualityRepository airQualityRepository;

    private final Random random = new Random();

    @Cacheable(value = "airQuality", key = "#city")
    public AirQuality getOrFetchAirQuality(String city) {
        // Look up the latest record for this city from the database
        List<AirQuality> records = airQualityRepository.findByCityOrderByTimestampDesc(city);
        if (!records.isEmpty()) {
            AirQuality latest = records.get(0);
            // If the record is fresh (less than 15 minutes old), return it
            if (latest.getTimestamp().isAfter(LocalDateTime.now().minusMinutes(15))) {
                return latest;
            }
        }
        
        // Fetch or simulate new air quality details
        return fetchFromSource(city);
    }

    @Transactional
    public AirQuality fetchFromSource(String city) {
        AirQuality aq = new AirQuality();
        aq.setCity(city);
        
        // Generate realistic simulated values based on city seed
        int baseAqi = 50;
        String normalizedCity = city.trim().toLowerCase();
        if (normalizedCity.contains("delhi")) baseAqi = 195;
        else if (normalizedCity.contains("beijing")) baseAqi = 140;
        else if (normalizedCity.contains("london")) baseAqi = 45;
        else if (normalizedCity.contains("new york")) baseAqi = 55;
        else if (normalizedCity.contains("san francisco")) baseAqi = 35;
        else if (normalizedCity.contains("mumbai")) baseAqi = 120;
        else baseAqi = 60 + random.nextInt(40);

        int variance = random.nextInt(31) - 15; // -15 to +15
        int finalAqi = Math.max(10, baseAqi + variance);
        aq.setAqi(finalAqi);
        
        // PM2.5 in ug/m3 is roughly proportional to AQI
        double pm25 = finalAqi * 0.35 + (random.nextDouble() * 5);
        aq.setPm25(Math.round(pm25 * 100.0) / 100.0);
        
        // PM10 is usually a bit higher than PM2.5
        double pm10 = pm25 * 1.6 + (random.nextDouble() * 8);
        aq.setPm10(Math.round(pm10 * 100.0) / 100.0);
        
        aq.setTimestamp(LocalDateTime.now());
        
        return airQualityRepository.save(aq);
    }

    public List<AirQuality> getHistoricalData(String city) {
        return airQualityRepository.findByCityOrderByTimestampDesc(city);
    }

    // Schedule background air quality monitoring update every 10 minutes
    @Scheduled(fixedRate = 600000)
    @Transactional
    public void scheduleAirQualityScan() {
        System.out.println("[AirQualityService] Scheduled background air quality check executing...");
        List<String> monitoredCities = List.of("New York", "London", "Delhi", "Beijing", "San Francisco");
        for (String city : monitoredCities) {
            try {
                fetchFromSource(city);
            } catch (Exception e) {
                System.err.println("Failed to fetch air quality for city " + city + ": " + e.getMessage());
            }
        }
    }
}
