#!/bin/bash
# Development server startup script for Olympus MVP API

# Change to the directory containing this script, then to the project root
cd "$(dirname "$0")/.."

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Check if dependencies are installed
if [ ! -d ".venv/lib" ] && [ ! -d "venv/lib" ]; then
    echo "Virtual environment not found or dependencies not installed."
    echo "Please run: poetry install"
    exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
    echo "Loading environment variables from .env..."
    export $(cat .env | grep -v '#' | xargs)
fi

# Start the development server
echo "Starting Olympus MVP API development server..."
echo "Server will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn app.main:app --reload --host ${HOST:-0.0.0.0} --port ${PORT:-8000}