# The Take Podcast Explorer & Scraper

![The Take Explorer](https://img.shields.io/badge/Status-Active-brightgreen)

## About
This project is an interactive tool and automated data scraper for Al Jazeera's "The Take" podcast. It parses the podcast's RSS feed and uses Google's Gemini 2.5 Flash AI to extract and structure information from every episode description, including:
- **Hosts:** The primary or guest host of the episode.
- **Guests:** Names, affiliations (organizations), and short bios.
- **Production Team:** Producers, sound designers, and staff.
- **Tags:** AI-generated topics, countries, and subjects.

👉 **[Launch the Live Explorer](https://wakkum.github.io/the-take-scraper/)**

The dataset is automatically updated daily via GitHub Actions.

---

## Setup (For Developers)

1. Create a `.env` file in the root of this project folder and add your Gemini API Key:
   ```
   GEMINI_API_KEY=your_actual_key_here
   ```

## Running the Scraper Locally

Per the workspace mandates, use the `run.sh` script to execute the scraper:

```bash
./run.sh
```

## Output

The scraper processes the episodes and outputs the structured data to `the_take_guests.json`, which directly feeds the React-based frontend.
