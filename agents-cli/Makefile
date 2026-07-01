SHELL := /bin/bash

# AirSense AI — Agent CLI Makefile

.PHONY: playground install lint test clean

# Start ADK Agent Playground + MCP Server
playground:
	@echo "🚀 Starting AirSense AI Agent Playground..."
	@echo "📡 Launching MCP Server at http://localhost:8765"
	@cd .. && python -m mcp_server.mcp_server &
	@sleep 2
	@echo "🤖 Starting ADK Playground..."
	@adk web --port 9000 agents_workflow.py

# Install Python dependencies
install:
	pip install google-adk google-genai mcp fastmcp ruff python-dotenv

# Lint Python code  
lint:
	ruff check agents_workflow.py tools_impl.py

# Run tests
test:
	python -m pytest tests/ -v

# Quick test run
run:
	@read -p "City [Delhi]: " city; city=$${city:-Delhi}; \
	read -p "Asthma (true/false) [false]: " asthma; asthma=$${asthma:-false}; \
	read -p "Query [How is the air today?]: " query; query=$${query:-"How is the air today?"}; \
	python agents_workflow.py "$$city" "$$asthma" "$$query"

# Clean cache
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	rm -f *.pyc
