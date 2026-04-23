#!/bin/bash
# run_daily.sh - Daily cron-friendly updater

# Navigate to script directory
cd "$(dirname "$0")"

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Virtual environment not found."
    exit 1
fi

# Load env variables safely for cron
set -a
source .env
set +a

# Run the update script
python3 daily_update.py
