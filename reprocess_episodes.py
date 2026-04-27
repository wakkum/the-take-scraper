import os
import json
import requests
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types
from scraper import fetch_all_episodes_from_api, extract_guests_from_description

load_dotenv()

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_key_here":
        print("Error: Please set your GEMINI_API_KEY in the .env file.")
        return
        
    client = genai.Client(api_key=api_key)
    output_file = "the_take_guests.json"
    
    if not os.path.exists(output_file):
        print(f"Error: {output_file} not found.")
        return

    with open(output_file, 'r', encoding='utf-8') as f:
        existing_data = json.load(f)
        
    # Map by title for easy lookup
    data_map = {ep["episode_title"]: ep for ep in existing_data}
    
    print(f"Loaded {len(existing_data)} episodes from {output_file}.")
    
    # Fetch everything from API to get descriptions
    all_episodes = fetch_all_episodes_from_api()
    
    updated_count = 0
    
    for ep_api in all_episodes:
        title = ep_api.get("Title", "")
        if not title or title not in data_map:
            continue
            
        ep_stored = data_map[title]
        
        # Check if it needs updating (missing hosts or producers)
        # Or if they are empty (some might have been processed with the old schema but saved empty)
        if "hosts" not in ep_stored or "producers" not in ep_stored:
            print(f"Reprocessing: {title}")
            description = ep_api.get("Description", "") or ep_api.get("DescriptionHtml", "")
            
            try:
                extracted = extract_guests_from_description(client, title, description)
                ep_stored["hosts"] = extracted.get("hosts", [])
                ep_stored["producers"] = extracted.get("producers", [])
                # Also update guests and tags while we are at it, as the prompt changed slightly
                ep_stored["guests"] = extracted.get("guests", [])
                ep_stored["tags"] = extracted.get("tags", [])
                
                updated_count += 1
                time.sleep(1) # Rate limit
            except Exception as e:
                print(f"Error processing {title}: {e}")
                
            # Save every 5 updates
            if updated_count % 5 == 0 and updated_count > 0:
                print(f"Checkpoint: Saving {updated_count} updates...")
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(existing_data, f, indent=2, ensure_ascii=False)

    # Final Save
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)
        
    print(f"Done! Updated {updated_count} episodes.")

if __name__ == "__main__":
    main()
