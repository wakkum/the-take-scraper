#!/bin/bash
# run.sh - Execution script for The Take Scraper

# Exit on error
set -e

# Navigate to script directory
cd "$(dirname "$0")"

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Virtual environment not found. Please create one and install dependencies."
    exit 1
fi

# Run the Python script
python3 scraper.py
