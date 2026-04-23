# The Take Podcast Scraper

This tool parses the RSS feed for Al Jazeera's podcast "The Take" and uses Gemini 2.5 Flash to automatically extract the names, affiliations, and bios of the guests from the episode descriptions.

## Setup

1. Create a `.env` file in the root of this project folder and add your Gemini API Key:
   ```
   GEMINI_API_KEY=your_actual_key_here
   ```

## Running the Scraper

Per the workspace mandates, use the `run.sh` script to execute the scraper:

```bash
./run.sh
```

## Output

The scraper will process the latest 20 episodes and output the structured data to `the_take_guests.json`.
