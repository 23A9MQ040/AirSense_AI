# ─────────────────────────────────────────────────
# Stage 1: Build the Spring Boot Application
# ─────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21-jammy AS build

WORKDIR /app

# Copy Maven config first (for layer caching)
COPY backend-java/pom.xml .
RUN mvn dependency:go-offline -q

# Copy source code and build
COPY backend-java/src ./src
RUN mvn clean package -DskipTests -q

# ─────────────────────────────────────────────────
# Stage 2: Runtime — JRE + Python 3.11
# ─────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy

# Install Python 3.11 + pip
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip to avoid wheel compatibility issues
RUN python3 -m pip install --no-cache-dir --upgrade pip

# Install Python AI dependencies
RUN pip3 install --no-cache-dir \
    google-adk \
    google-genai \
    mcp \
    fastmcp \
    python-dotenv

WORKDIR /app

# Copy agents-cli (Python agents and tools)
COPY agents-cli /agents-cli

# Copy mcp-server
COPY mcp-server /mcp-server

# Copy the built Spring Boot JAR
COPY --from=build /app/target/*.jar app.jar

# Expose port (Render uses PORT env var)
EXPOSE 8080

# Run Spring Boot
ENTRYPOINT ["java", "-jar", "app.jar"]
