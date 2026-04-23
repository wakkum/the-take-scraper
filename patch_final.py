import json
import os
import requests
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

ORG_ID = "9c074afa-3313-47e8-b802-a9f900789975"
PROGRAM_ID = "09af2160-238f-48b2-b20b-ad4b00ebd8e7"

with open('the_take_guests.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

targets = [ep for ep in data if ep.get('tags') == ['News', 'World', 'Politics']]
target_titles = {ep['episode_title'] for ep in targets}

print(f"Fetching descriptions for {len(target_titles)} episodes...")
descriptions = {}
cursor = "1"
while cursor and len(descriptions) < len(target_titles):
    url = f"https://omny.fm/api/orgs/{ORG_ID}/programs/{PROGRAM_ID}/clips?cursor={cursor}&pageSize=100"
    r = requests.get(url).json()
    for c in r.get("Clips", []):
        if c.get("Title") in target_titles:
            descriptions[c.get("Title")] = c.get("Description", "") or c.get("DescriptionHtml", "")
    cursor = r.get("Cursor")

print("Processing with relaxed schema...")
for ep in data:
    title = ep['episode_title']
    if title in descriptions and ep.get('tags') == ['News', 'World', 'Politics']:
        desc = descriptions[title]
        prompt = f"""
        Extract the guests and generate 5 tags from this podcast description. 
        Respond ONLY with a valid JSON object. Do NOT wrap it in markdown backticks. Do NOT include trailing commas. Ensure all strings have properly escaped quotes.
        Format exactly like this:
        {{
          "guests": [{{"name": "John Doe", "affiliation": "Al Jazeera", "bio": "Reporter"}}],
          "tags": ["Tag 1", "Tag 2", "Tag 3", "Tag 4", "Tag 5"]
        }}
        
        Episode Title: {title}
        Description:
        {desc}
        """
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.1)
            )
            raw = response.text.strip()
            if raw.startswith("```json"): raw = raw[7:]
            if raw.startswith("```"): raw = raw[3:]
            if raw.endswith("```"): raw = raw[:-3]
            
            res = json.loads(raw.strip())
            ep['guests'] = res.get('guests', [])
            ep['tags'] = res.get('tags', [])
            print(f"Success: {title}")
        except Exception as e:
            print(f"Failed: {title}. Error: {e}")

with open('the_take_guests.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print("Finished patching.")
