package com.airsense.ai.service;

import com.airsense.ai.model.HealthProfile;
import com.airsense.ai.model.User;
import com.airsense.ai.repository.HealthProfileRepository;
import com.airsense.ai.repository.UserRepository;
import com.airsense.ai.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HealthProfileRepository healthProfileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsService userDetailsService;

    @Transactional
    public User registerUser(User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already in use");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);

        // Initialize default health profile
        HealthProfile healthProfile = new HealthProfile();
        healthProfile.setUser(savedUser);
        healthProfile.setAge(25);
        healthProfile.setAsthmaHistory(false);
        healthProfile.setAllergyType("None");
        healthProfile.setSensitivityLevel("LOW");
        healthProfileRepository.save(healthProfile);

        return savedUser;
    }

    public Map<String, Object> authenticateUser(String email, String password) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));
        
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        String token = jwtUtils.generateToken(userDetails);
        
        User user = userRepository.findByEmail(email).orElseThrow();

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("id", user.getId().toString());
        response.put("location", user.getLocation());
        
        return response;
    }

    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional
    public User updateUserLocation(UUID userId, String location) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setLocation(location);
        return userRepository.save(user);
    }

    public HealthProfile getHealthProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return healthProfileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Health profile not found"));
    }

    @Transactional
    public HealthProfile updateHealthProfile(UUID userId, HealthProfile updatedProfile) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        HealthProfile existingProfile = healthProfileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Health profile not found"));
        
        existingProfile.setAge(updatedProfile.getAge());
        existingProfile.setAsthmaHistory(updatedProfile.isAsthmaHistory());
        existingProfile.setAllergyType(updatedProfile.getAllergyType());
        existingProfile.setSensitivityLevel(updatedProfile.getSensitivityLevel());
        
        return healthProfileRepository.save(existingProfile);
    }
}
