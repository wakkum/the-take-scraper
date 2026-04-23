import re

with open('/Users/bd/Documents/ai_projects/the-take-scraper/the-take-gui/src/App.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("HelpCircle } from 'lucide-react';", "HelpCircle, Download, BarChart3, Moon, Sun, ArrowUpDown } from 'lucide-react';")

# 2. State
state_injection = """  const [dateTo, setDateTo] = useState<string>(''); // YYYY-MM-DD
  const [showHelp, setShowHelp] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);
"""
content = content.replace("  const [dateTo, setDateTo] = useState<string>(''); // YYYY-MM-DD\n  const [showHelp, setShowHelp] = useState(false);", state_injection)

# 3. CSV Export Function
csv_logic = """
  const exportToCSV = () => {
    const headers = ['Episode Title', 'Published Date', 'URL', 'Guests', 'Tags'];
    const rows = filteredEpisodes.map(ep => [
      `"${ep.episode_title.replace(/"/g, '""')}"`,
      `"${ep.published_date}"`,
      `"${ep.episode_url}"`,
      `"${(ep.guests || []).map(g => g.name).join(', ')}"`,
      `"${(ep.tags || []).join(', ')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "the_take_episodes.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const insights = useMemo(() => {
    if (filteredEpisodes.length === 0) return null;
    const guestCounts = new Map<string, number>();
    const orgCounts = new Map<string, number>();
    
    filteredEpisodes.forEach(ep => {
      ep.guests?.forEach(g => {
        const name = g.name.trim();
        if (name) guestCounts.set(name, (guestCounts.get(name) || 0) + 1);
        const org = g.affiliation?.trim();
        if (org) orgCounts.set(org, (orgCounts.get(org) || 0) + 1);
      });
    });
    
    const sortedGuests = Array.from(guestCounts.entries()).sort((a,b) => b[1]-a[1]);
    const sortedOrgs = Array.from(orgCounts.entries()).sort((a,b) => b[1]-a[1]);
    
    return { 
      topGuest: sortedGuests.length > 0 ? sortedGuests[0] : null, 
      topOrg: sortedOrgs.length > 0 ? sortedOrgs[0] : null 
    };
  }, [filteredEpisodes]);
"""
content = content.replace("  const navigateToEpisode", csv_logic + "\n  const navigateToEpisode")

# 4. Sorting logic inside filteredEpisodes
content = content.replace(
    "return matchesSelectedGuest && matchesSelectedOrg && matchesText && matchesTags && matchesDate;\n    });\n    \n    return results;\n  }, [searchQuery, selectedTags, selectedGuest, selectedOrg, dateMode, filterMonth, dateFrom, dateTo]);",
    "return matchesSelectedGuest && matchesSelectedOrg && matchesText && matchesTags && matchesDate;\n    });\n    \n    results.sort((a, b) => {\n      if (sortOrder === 'oldest') {\n        return new Date(a.published_date).getTime() - new Date(b.published_date).getTime();\n      } else if (sortOrder === 'az') {\n        return a.episode_title.localeCompare(b.episode_title);\n      } else {\n        return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();\n      }\n    });\n    \n    return results;\n  }, [searchQuery, selectedTags, selectedGuest, selectedOrg, dateMode, filterMonth, dateFrom, dateTo, sortOrder]);"
)

# 5. Header Buttons (Dark Mode)
header_buttons = """        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="shrink-0 flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button 
            onClick={() => setShowHelp(!showHelp)} 
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm font-medium transition-colors"
          >
            <HelpCircle size={18} /> {showHelp ? 'Hide Help' : 'How to Use'}
          </button>
        </div>"""
content = re.sub(r"        <button \n          onClick=\{\(\) => setShowHelp\(!showHelp\)\} \n          className=\"shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm font-medium transition-colors\"\n        >\n          <HelpCircle size=\{18\} /> \{showHelp \? 'Hide Help' : 'How to Use'\}\n        </button>", header_buttons, content)

# 6. Sorting UI
sorting_ui = """          <div className="flex items-center gap-2 shrink-0 ml-auto border-l border-gray-200 dark:border-gray-700 pl-4 mt-4 sm:mt-0">
            <ArrowUpDown size={16} className="text-gray-500 dark:text-gray-400" />
            <select 
              value={sortOrder} 
              onChange={e => setSortOrder(e.target.value as any)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 focus:ring-aljazeera focus:border-aljazeera bg-white dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="az">A-Z</option>
            </select>
          </div>
        </div>"""
content = content.replace("            </div>\n          )}\n        </div>", "            </div>\n          )}\n" + sorting_ui)

# 7. Insights UI and Export Button
insights_ui = """      {/* Insights & Export */}
      {insights && (insights.topGuest || insights.topOrg) && (
        <div className="bg-gradient-to-r from-aljazeera/10 to-orange-50 dark:from-aljazeera/20 dark:to-gray-900 border border-aljazeera/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-aljazeera dark:text-orange-400 font-bold">
              <BarChart3 size={20} /> Quick Insights
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {insights.topGuest && (
                <div className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Top Guest:</span> <strong className="text-gray-900 dark:text-white">{insights.topGuest[0]}</strong> <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-600 dark:text-gray-300">{insights.topGuest[1]}x</span>
                </div>
              )}
              {insights.topOrg && (
                <div className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Top Org:</span> <strong className="text-gray-900 dark:text-white">{insights.topOrg[0]}</strong> <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-600 dark:text-gray-300">{insights.topOrg[1]}x</span>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={exportToCSV}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors text-sm font-semibold shadow-sm"
          >
            <Download size={16} /> Export to CSV
          </button>
        </div>
      )}"""
content = content.replace("      {/* Results */}", insights_ui + "\n\n      {/* Results */}")

# 8. Dark mode basic classes (Text and BGs)
content = content.replace("bg-white", "bg-white dark:bg-gray-800")
content = content.replace("bg-gray-50", "bg-gray-50 dark:bg-gray-900")
content = content.replace("border-gray-100", "border-gray-100 dark:border-gray-700")
content = content.replace("border-gray-200", "border-gray-200 dark:border-gray-700")
content = content.replace("text-gray-900", "text-gray-900 dark:text-gray-100")
content = content.replace("text-gray-700", "text-gray-700 dark:text-gray-300")
content = content.replace("text-gray-600", "text-gray-600 dark:text-gray-400")
content = content.replace("text-gray-500", "text-gray-500 dark:text-gray-400")
content = content.replace("text-gray-400", "text-gray-400 dark:text-gray-500")

# 9. Update the body background to match in dark mode
with open('/Users/bd/Documents/ai_projects/the-take-scraper/the-take-gui/src/index.css', 'w') as f:
    f.write('''@import "tailwindcss";
@theme {
  --color-aljazeera: #f48024;
}
body {
  @apply bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-300;
}''')

with open('/Users/bd/Documents/ai_projects/the-take-scraper/the-take-gui/src/App.tsx', 'w') as f:
    f.write(content)
