import requests

ORG_ID = '9c074afa-3313-47e8-b802-a9f900789975'
PROGRAM_ID = '09af2160-238f-48b2-b20b-ad4b00ebd8e7'

test_titles = [
    'Investigating Sheikh Hasina’s final days in Bangladesh',
    'The biggest rivalry in sports: India and Pakistan in cricket',
    'Palestinians were seeking food in Gaza City. Israeli forces opened fire.'
]

descriptions = {}
cursor = '1'
while cursor and len(descriptions) < len(test_titles):
    url = f"https://omny.fm/api/orgs/{ORG_ID}/programs/{PROGRAM_ID}/clips?cursor={cursor}&pageSize=100"
    r = requests.get(url).json()
    for c in r.get('Clips', []):
        if c.get('Title') in test_titles:
            descriptions[c.get('Title')] = c.get('Description', '')
    cursor = r.get('Cursor')

for t, d in descriptions.items():
    print(f"\n--- TITLE: {t} ---")
    print(d)
