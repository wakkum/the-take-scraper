import json
import os
import requests
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

ORG_ID = "9c074afa-3313-47e8-b802-a9f900789975"
PROGRAM_ID = "09af2160-238f-48b2-b20b-ad4b00ebd8e7"

def main():
    with open('the_take_guests.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Find the episodes we applied the generic fallback tags to
    targets = [ep for ep in data if ep.get('tags') == ['News', 'World', 'Politics']]
    target_titles = {ep['episode_title'] for ep in targets}

    print(f"Found {len(target_titles)} episodes to re-process.")

    if not target_titles:
        return

    print("Fetching their descriptions from the Omny API...")
    descriptions = {}
    cursor = "1"
    while cursor:
        url = f"https://omny.fm/api/orgs/{ORG_ID}/programs/{PROGRAM_ID}/clips?cursor={cursor}&pageSize=100"
        r = requests.get(url).json()
        clips = r.get("Clips", [])
        if not clips: break
        
        for c in clips:
            title = c.get("Title")
            if title in target_titles:
                descriptions[title] = c.get("Description", "") or c.get("DescriptionHtml", "")
                
        if len(descriptions) >= len(target_titles):
            break # Found them all
            
        cursor = r.get("Cursor")

    print(f"Successfully fetched {len(descriptions)} descriptions. Running Gemini extraction with retry logic...")

    def extract(title, desc, retries=3):
        prompt = f"""
        You are a research assistant. Analyze the following podcast episode description.
        1. Extract the names of any guests featured in the episode, along with their affiliation (who they work for) and a short bio or title if mentioned. Do not include the host (e.g., Malika Bilal).
        2. Generate 3 to 5 relevant tags (topics, countries, subjects) for the episode.

        Episode Title: {title}
        Description:
        {desc}
        """
        
        for attempt in range(retries):
            try:
                response = client.models.generate_content(
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
                
                response_text = response.text or ""
                response_text = response_text.strip()
                if response_text.startswith("```json"): response_text = response_text[7:]
                if response_text.startswith("```"): response_text = response_text[3:]
                if response_text.endswith("```"): response_text = response_text[:-3]
                response_text = response_text.strip()
                return json.loads(response_text)
            except Exception as e:
                print(f"  [!] Attempt {attempt + 1} failed for '{title}': {e}")
                if attempt < retries - 1:
                    print("      -> Waiting 15 seconds to respect API quota before retrying...")
                    time.sleep(15)
                else:
                    return None

    success_count = 0
    for ep in data:
        if ep['episode_title'] in descriptions and ep.get('tags') == ['News', 'World', 'Politics']:
            print(f"Re-processing: {ep['episode_title']}")
            desc = descriptions[ep['episode_title']]
            res = extract(ep['episode_title'], desc)
            if res:
                ep['guests'] = res.get('guests', [])
                # Only overwrite tags if it actually gave us real ones
                if res.get('tags'):
                    ep['tags'] = res.get('tags', [])
                print(f"  -> Success: {len(ep['guests'])} guests, {len(ep['tags'])} tags")
                success_count += 1
            else:
                print("  -> Failed completely.")
            
            # Base delay between successful requests
            time.sleep(2)

    with open('the_take_guests.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print(f"\nDone! Successfully re-processed {success_count} episodes.")

if __name__ == "__main__":
    main()