import re
with open('/Users/bd/Documents/ai_projects/the-take-scraper/the-take-gui/src/App.tsx', 'r') as f:
    content = f.read()

# Extract CSV and insights blocks
csv_block_match = re.search(r"  const exportToCSV = \(\) => \{.*?\n  \};\n", content, re.DOTALL)
insights_block_match = re.search(r"  const insights = useMemo\(\(\) => \{.*?\n  \}, \[filteredEpisodes\]\);\n", content, re.DOTALL)

if csv_block_match and insights_block_match:
    csv_block = csv_block_match.group(0)
    insights_block = insights_block_match.group(0)
    
    # Remove them from current position
    content = content.replace(csv_block, "")
    content = content.replace(insights_block, "")
    
    # Insert them after filteredEpisodes
    insert_point = content.find("  const relatedTags = useMemo(() => {")
    content = content[:insert_point] + csv_block + "\n" + insights_block + "\n" + content[insert_point:]

with open('/Users/bd/Documents/ai_projects/the-take-scraper/the-take-gui/src/App.tsx', 'w') as f:
    f.write(content)
