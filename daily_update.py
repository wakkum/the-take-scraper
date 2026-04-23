import json
import os
import requests
import feedparser
import concurrent.futures
from datetime import datetime, timezone
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("GEMINI_API_KEY missing!")
    exit(1)
client = genai.Client(api_key=api_key)

RSS_URL = "https://www.omnycontent.com/d/playlist/9c074afa-3313-47e8-b802-a9f900789975/09af2160-238f-48b2-b20b-ad4b00ebd8e7/b86dddc1-67a5-41c2-a13c-ad4b00ebd8f5/podcast.rss"
JSON_FILE = "the_take_guests.json"

def fetch_rss():
    response = requests.get(RSS_URL, timeout=15)
    response.raise_for_status()
    return feedparser.parse(response.content)

def extract(title, desc):
    prompt = f"""
    Extract the guests and generate 5 tags from this podcast description. 
    Respond ONLY with a valid JSON object.
    {{
      "guests": [{{"name": "Name", "affiliation": "Org", "bio": "Bio"}}],
      "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"]
    }}
    
    Episode Title: {title}
    Description:
    {desc}
    """
    
    def do_generate():
        return client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )
        
    try:
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(do_generate)
            response = future.result(timeout=30)
            
        raw = response.text.strip()
        if raw.startswith("```json"): raw = raw[7:]
        if raw.startswith("```"): raw = raw[3:]
        if raw.endswith("```"): raw = raw[:-3]
        return json.loads(raw.strip())
    except Exception as e:
        print(f"Error for '{title}': {e}")
        return None

def main():
    # 1. Load existing data
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = []
        
    existing_titles = {ep['episode_title'] for ep in data}
    
    # 2. Fetch latest RSS
    print("Checking for new episodes...")
    feed = fetch_rss()
    
    new_episodes = []
    
    # Check the first 10 episodes in the feed (in case they published a few over a weekend)
    for ep in feed.entries[:10]:
        title = ep.title
        if title in existing_titles:
            continue
            
        print(f"Found new episode: {title}")
        desc = ep.get('content', [{'value': ep.get('description', '')}])[0]['value']
        
        extracted = extract(title, desc)
        
        new_ep_data = {
            "episode_title": title,
            "published_date": ep.published, # Keep RSS published format, we can parse it in JS
            "episode_url": ep.link,
            "guests": extracted.get('guests', []) if extracted else [],
            "tags": extracted.get('tags', []) if extracted else []
        }
        new_episodes.append(new_ep_data)
        
    if not new_episodes:
        print("No new episodes found. Up to date.")
        return
        
    # 3. Prepend new episodes to the dataset
    data = new_episodes + data
    
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully added {len(new_episodes)} new episodes to the database.")
    
    # 4. Automatically rebuild the embedded HTML file
    os.system("./the-take-gui/build-embedded.sh")

if __name__ == "__main__":
    main()
