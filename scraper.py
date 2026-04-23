import os
import sys
import json
import requests
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Omny API endpoints for "The Take"
ORG_ID = "9c074afa-3313-47e8-b802-a9f900789975"
PROGRAM_ID = "09af2160-238f-48b2-b20b-ad4b00ebd8e7"

def fetch_all_episodes_from_api():
    print("Fetching all episodes via Omny API pagination...")
    all_clips = []
    cursor = "1"
    
    while cursor:
        url = f"https://omny.fm/api/orgs/{ORG_ID}/programs/{PROGRAM_ID}/clips?cursor={cursor}&pageSize=100"
        print(f"Fetching page (cursor: {cursor})...")
        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            clips = data.get("Clips", [])
            if not clips:
                break
                
            all_clips.extend(clips)
            cursor = data.get("Cursor")
            time.sleep(0.5) # gentle rate limiting for their API
        except Exception as e:
            print(f"Error fetching from Omny API: {e}")
            break
            
    print(f"Total episodes retrieved from API: {len(all_clips)}")
    return all_clips

def extract_guests_from_description(client, episode_title, description):
    print(f"Analyzing episode: {episode_title}...")
    
    prompt = f"""
    You are a research assistant. Analyze the following podcast episode description.
    1. Extract the names of any guests featured in the episode, along with their affiliation (who they work for) and a short bio or title if mentioned. Do not include the host (e.g., Malika Bilal).
    2. Generate 3 to 5 relevant tags (topics, countries, subjects) for the episode.

    Episode Title: {episode_title}
    Description:
    {description}
    """
    
    try:
        # Wrap the API call to ensure it doesn't hang indefinitely
        import concurrent.futures
        
        def do_generate():
            return client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "guests": types.Schema(
                                type=types.Type.ARRAY,
                                items=types.Schema(
                                    type=types.Type.OBJECT,
                                    properties={
                                        "name": types.Schema(type=types.Type.STRING, description="The name of the guest"),
                                        "affiliation": types.Schema(type=types.Type.STRING, description="Who they work for, or their main organization"),
                                        "bio": types.Schema(type=types.Type.STRING, description="A brief bio or title (e.g., Senior Correspondent, Author)"),
                                    },
                                    required=["name"]
                                )
                            ),
                            "tags": types.Schema(
                                type=types.Type.ARRAY,
                                items=types.Schema(type=types.Type.STRING),
                                description="3 to 5 tags representing the main topics"
                            )
                        },
                        required=["guests", "tags"]
                    ),
                    temperature=0.1,
                ),
            )
            
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(do_generate)
            # 30 second hard timeout per episode
            response = future.result(timeout=30)
            
        response_text = response.text or ""
        
        # Clean up the response text in case the model wrapped it in markdown code blocks
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        return json.loads(response_text)
    except Exception as e:
        print(f"Error calling Gemini API for episode '{episode_title}': {e}\nRaw Response: {response.text if 'response' in locals() else 'No response'}")
        return {"guests": [], "tags": []}

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_key_here":
        print("Error: Please set your GEMINI_API_KEY in the .env file.")
        sys.exit(1)
        
    client = genai.Client(api_key=api_key)
    
    # Check if we already have the 750 episode file so we don't re-process everything
    output_file = "the_take_guests.json"
    existing_results = []
    processed_titles = set()
    
    if os.path.exists(output_file):
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                existing_results = json.load(f)
                processed_titles = {ep["episode_title"] for ep in existing_results}
                print(f"Loaded {len(existing_results)} previously processed episodes from file.")
        except Exception as e:
            print(f"Could not load existing file: {e}")

    # Fetch all from API
    episodes = fetch_all_episodes_from_api()
    
    results = existing_results.copy()
    new_count = 0
    
    for ep in episodes:
        title = ep.get("Title", "")
        if not title:
            continue
            
        if title in processed_titles:
            continue # Skip episodes we already spent API quota on!
            
        description = ep.get("Description", "") or ep.get("DescriptionHtml", "")
        published_date = ep.get("PublishedUtc", "")
        link = ep.get("PublishedUrl", "")
        
        # Add a small delay to respect API rate limits
        time.sleep(1)
        
        try:
            extracted = extract_guests_from_description(client, title, description)
            results.append({
                "episode_title": title,
                "published_date": published_date,
                "episode_url": link,
                "guests": extracted.get("guests", []),
                "tags": extracted.get("tags", [])
            })
            new_count += 1
            processed_titles.add(title)
        except Exception as e:
            print(f"Critial error processing {title}: {e}")
            time.sleep(5) # Backoff on error
            
        # Save every 10 episodes to prevent data loss on crash
        if new_count > 0 and new_count % 10 == 0:
            print(f"Checkpoint: Saving {len(results)} total episodes to disk...")
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
        
    # Final Save
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
        
    print(f"\nDone! Extracted {new_count} new episodes. Total database is now {len(results)} episodes.")

if __name__ == "__main__":
    main()
