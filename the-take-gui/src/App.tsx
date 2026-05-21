import { useState, useEffect, useMemo, memo } from 'react';
import { Search, User, Briefcase, Calendar, Tag, ExternalLink, Link, X, ChevronDown, ChevronUp, Sparkles, HelpCircle, Download, BarChart3, Moon, Sun, ArrowUpDown } from 'lucide-react';
import rawData from '../../the_take_guests.json';

interface Guest {
  name: string;
  affiliation?: string;
  bio?: string;
}

interface Episode {
  episode_title: string;
  published_date: string;
  episode_url: string;
  guests: Guest[];
  hosts?: string[];
  producers?: string[];
  tags: string[];
  _searchIndex?: string;
}

// Memoized GuestCard for performance
const GuestCard = memo(({ 
  guest, 
  episodeTitle, 
  appearances, 
  selectedGuest, 
  selectedOrg, 
  setSelectedGuest, 
  setSelectedOrg, 
  navigateToEpisode 
}: { 
  guest: Guest, 
  episodeTitle: string, 
  appearances: string[], 
  selectedGuest: string | null, 
  selectedOrg: string | null, 
  setSelectedGuest: (v: string | null) => void, 
  setSelectedOrg: (v: string | null) => void, 
  navigateToEpisode: (t: string) => void 
}) => {
  const [showAllAppearances, setShowAllAppearances] = useState(false);
  const guestName = guest.name.trim();
  const otherAppearances = appearances.filter(t => t !== episodeTitle);
  const visibleAppearances = showAllAppearances ? otherAppearances : otherAppearances.slice(0, 5);

  return (
    <div className={`bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl p-4 transition-colors ${selectedGuest === guestName ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}>
      <button 
        onClick={() => setSelectedGuest(selectedGuest === guestName ? null : guestName)}
        className="cursor-pointer font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 hover:text-aljazeera transition-colors text-left"
        title={selectedGuest === guestName ? `Clear filter for ${guestName}` : `Click to filter all episodes by ${guestName}`}
      >
        <User size={16} className={selectedGuest === guestName ? 'text-blue-500' : 'text-aljazeera'} /> 
        <span className={selectedGuest === guestName ? 'underline decoration-blue-300 underline-offset-4' : 'underline decoration-transparent hover:decoration-aljazeera/30 underline-offset-4 transition-all'}>
          {guestName}
        </span>
      </button>
      
      {(guest.affiliation || guest.bio) && (
        <div className="mt-2 space-y-1">
          {guest.affiliation && (
            <div className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
              <Briefcase size={14} className={`mt-0.5 shrink-0 ${selectedOrg === guest.affiliation.trim() ? 'text-purple-500' : 'text-gray-400 dark:text-gray-500'}`} />
              <button
                onClick={() => setSelectedOrg(selectedOrg === guest.affiliation!.trim() ? null : guest.affiliation!.trim())}
                className={`cursor-pointer text-left transition-colors ${selectedOrg === guest.affiliation!.trim() ? 'text-purple-700 font-semibold underline decoration-purple-300 underline-offset-4' : 'hover:text-purple-600 hover:underline decoration-transparent hover:decoration-purple-300 underline-offset-4 transition-all'}`}
                title={selectedOrg === guest.affiliation!.trim() ? `Clear filter for ${guest.affiliation}` : `Click to filter all episodes with guests from ${guest.affiliation}`}
              >
                {guest.affiliation}
              </button>
            </div>
          )}
          {guest.bio && <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 italic pl-6">{guest.bio}</p>}
        </div>
      )}

      {otherAppearances.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 flex items-center gap-1 mb-1">
            <Link size={12} /> Also appeared in:
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500 space-y-1 pl-4">
            {visibleAppearances.map((title, i) => (
              <li key={i}>
                <button 
                  onClick={() => navigateToEpisode(title)}
                  className="text-left hover:text-aljazeera hover:underline decoration-aljazeera/30 line-clamp-1 transition-colors"
                  title={`Jump to episode: ${title}`}
                >
                  {title}
                </button>
              </li>
            ))}
          </ul>
          {otherAppearances.length > 5 && (
            <button 
              onClick={() => setShowAllAppearances(!showAllAppearances)}
              className="text-xs text-aljazeera font-medium hover:underline mt-1.5 ml-4 flex items-center gap-1"
            >
              {showAllAppearances ? <><ChevronUp size={12}/> Show less</> : <><ChevronDown size={12}/> +{otherAppearances.length - 5} more episodes</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default function App() {
  const [data, setData] = useState<Episode[]>([]);
  const [isLiveSyncing, setIsLiveSyncing] = useState(true);
  const [liveSyncSuccess, setLiveSyncSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Instantly load embedded historical data as a fallback
    let currentData = (rawData as Episode[]);
    
    // 2. Magic Sync: Fetch latest from GitHub
    const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/wakkum/the-take-scraper/main/the_take_guests.json';
    
    fetch(GITHUB_RAW_URL, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error("Live data not reachable");
        return res.json();
      })
      .then(liveData => {
        if (Array.isArray(liveData) && liveData.length >= currentData.length) {
          currentData = liveData;
          setLiveSyncSuccess(true);
        } else {
          throw new Error("Live data invalid or smaller than embedded data");
        }
      })
      .catch(e => {
        console.log("Live sync failed (offline or network issue). Using embedded historical data.", e);
        setLiveSyncSuccess(false);
      })
      .finally(() => {
        // 3. Pre-process the final data
        const processed = currentData.map(ep => {
          const searchParts = [
            ep.episode_title,
            ...(ep.guests?.map(g => `${g.name || ''} ${g.affiliation || ''} ${g.bio || ''}`) || []),
            ...(ep.hosts || []),
            ...(ep.producers || []),
            ...(ep.tags || [])
          ];
          return {
            ...ep,
            _searchIndex: searchParts.join(' ').toLowerCase()
          };
        });
        setData(processed);
        setIsLiveSyncing(false);
      });
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [highlightedEpisodeTitle, setHighlightedEpisodeTitle] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50); // DOM pagination

  // Date Filter State
  const [dateMode, setDateMode] = useState<'all' | 'month' | 'custom'>('all');
  const [filterMonth, setFilterMonth] = useState<string>(''); // YYYY-MM
  const [dateFrom, setDateFrom] = useState<string>(''); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState<string>(''); // YYYY-MM-DD
  const [showHelp, setShowHelp] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [insightsTopN, setInsightsTopN] = useState<1 | 5 | 10>(1);
  const [insightsYear, setInsightsYear] = useState<string>('all');
  const [excludeAlJazeera, setExcludeAlJazeera] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize based on system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);





  const navigateToEpisode = (title: string) => {
    // Clear all filters so the episode is guaranteed to be in the list
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedGuest(null);
    setSelectedOrg(null);
    setSelectedHost(null);
    setDateMode('all');
    setFilterMonth('');
    setDateFrom('');
    setDateTo('');
    
    // Ensure the target episode is rendered in the DOM
    const targetIndex = data.findIndex(ep => ep.episode_title === title);
    if (targetIndex >= 0) {
      setVisibleCount(Math.max(50, targetIndex + 10));
    }
    
    // Set highlight
    setHighlightedEpisodeTitle(title);

    // Scroll after React re-renders the full list
    setTimeout(() => {
      const element = document.getElementById(`episode-${title}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  useEffect(() => {
    // Clear highlight if user starts searching or filtering manually
    if (searchQuery || selectedTags.length > 0 || selectedGuest || selectedOrg || selectedHost || dateMode !== 'all') {
      setHighlightedEpisodeTitle(null);
    }
    // Reset pagination when filters change
    setVisibleCount(50);
  }, [searchQuery, selectedTags, selectedGuest, selectedOrg, selectedHost, dateMode]);

  // Extract all unique months for the dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    data.forEach(ep => {
      const d = new Date(ep.published_date);
      if (!isNaN(d.getTime())) {
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [data]);

  // Extract and sort all tags by frequency
  const allTagsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach(ep => {
      ep.tags?.forEach(tag => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });
    // Sort by count descending, then alphabetically
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [data]);

  const topTags = allTagsWithCounts.slice(0, 10).map(t => t[0]);
  const remainingTags = allTagsWithCounts.slice(10).map(t => t[0]);
  const visibleTags = showAllTags ? [...topTags, ...remainingTags] : topTags;

  // Extract cross-references for guests
  const guestAppearances = useMemo(() => {
    const map = new Map<string, string[]>(); 
    data.forEach(ep => {
      ep.guests?.forEach(g => {
        const name = g.name.trim();
        if (!map.has(name)) map.set(name, []);
        map.get(name)!.push(ep.episode_title);
      });
    });
    return map;
  }, [data]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredEpisodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    
    const results = data.filter(ep => {
      const matchesSelectedGuest = !selectedGuest || ep.guests?.some(g => g.name.trim() === selectedGuest);
      const matchesSelectedOrg = !selectedOrg || ep.guests?.some(g => g.affiliation?.trim() === selectedOrg);
      const matchesSelectedHost = !selectedHost || ep.hosts?.some(h => h.trim() === selectedHost);

      let matchesText = true;      if (q !== '') {
        const searchTerms = q.split(' ').filter(term => term.length > 0);
        // ALL search terms must be present somewhere in the episode's search index (AND logic)
        matchesText = !!(ep._searchIndex && searchTerms.every(term => ep._searchIndex!.includes(term)));
      }
      
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => ep.tags?.includes(t));

      // Date Filtering Logic
      let matchesDate = true;
      const epDate = new Date(ep.published_date);
      
      if (!isNaN(epDate.getTime())) {
        if (dateMode === 'month' && filterMonth) {
          const epMonthStr = `${epDate.getFullYear()}-${String(epDate.getMonth() + 1).padStart(2, '0')}`;
          matchesDate = epMonthStr === filterMonth;
        } else if (dateMode === 'custom') {
          if (dateFrom) {
            matchesDate = matchesDate && epDate >= new Date(dateFrom);
          }
          if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999); // Include entire end day
            matchesDate = matchesDate && epDate <= end;
          }
        }
      }
      
      if (q === 'emmett till' && (!matchesText || !matchesSelectedGuest)) {
          // Debugging log that the browser can see. 
          // console.log(`Testing ${ep.episode_title}: Text=${matchesText} Guest=${matchesSelectedGuest}`);
      }

      return matchesSelectedHost && matchesSelectedGuest && matchesSelectedOrg && matchesText && matchesTags && matchesDate;
    });
    
    results.sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.published_date).getTime() - new Date(b.published_date).getTime();
      } else if (sortOrder === 'az') {
        return a.episode_title.localeCompare(b.episode_title);
      } else {
        return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
      }
    });
    
    return results;
  }, [data, searchQuery, selectedTags, selectedGuest, selectedOrg, selectedHost, dateMode, filterMonth, dateFrom, dateTo, sortOrder]);

  // Suggest related tags based on filtered episodes (tags that co-occur but aren't currently selected)
  const exportToCSV = () => {
    const headers = ['Episode Title', 'Published Date', 'URL', 'Hosts', 'Guests', 'Producers', 'Tags'];
    const rows = filteredEpisodes.map(ep => [
      `"${ep.episode_title.replace(/"/g, '""')}"`,
      `"${ep.published_date}"`,
      `"${ep.episode_url}"`,
      `"${(ep.hosts || []).join(', ')}"`,
      `"${(ep.guests || []).map(g => g.name).join(', ')}"`,
      `"${(ep.producers || []).join(', ')}"`,
      `"${(ep.tags || []).join(', ')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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

  const insightsYears = useMemo(() => {
    const years = new Set<string>();
    filteredEpisodes.forEach(ep => {
      if (ep.published_date) {
        const y = new Date(ep.published_date).getFullYear();
        if (!isNaN(y)) years.add(String(y));
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [filteredEpisodes]);

  const isAlJazeeraAffiliation = (org?: string | null) => {
    if (!org) return false;
    const o = org.toLowerCase();
    return o.includes('al jazeera') || o.includes('aj+') || o === 'aje' || o.includes('al-jazeera');
  };

  const insights = useMemo(() => {
    if (filteredEpisodes.length === 0) return null;
    const guestCounts = new Map<string, number>();
    const guestOrgs = new Map<string, Map<string, number>>();
    const orgCounts = new Map<string, number>();

    const episodesForInsights = insightsYear === 'all'
      ? filteredEpisodes
      : filteredEpisodes.filter(ep => {
          if (!ep.published_date) return false;
          return String(new Date(ep.published_date).getFullYear()) === insightsYear;
        });

    episodesForInsights.forEach(ep => {
      ep.guests?.forEach(g => {
        const name = g.name.trim();
        const org = g.affiliation?.trim();
        const guestIsAJ = isAlJazeeraAffiliation(org);
        if (name && !(excludeAlJazeera && guestIsAJ)) {
          guestCounts.set(name, (guestCounts.get(name) || 0) + 1);
          if (org) {
            const orgMap = guestOrgs.get(name) || new Map<string, number>();
            orgMap.set(org, (orgMap.get(org) || 0) + 1);
            guestOrgs.set(name, orgMap);
          }
        }
        if (org && !isAlJazeeraAffiliation(org)) {
          orgCounts.set(org, (orgCounts.get(org) || 0) + 1);
        }
      });
    });

    const sortedGuests = Array.from(guestCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, insightsTopN)
      .map(([name, count]) => {
        const orgMap = guestOrgs.get(name);
        const topOrg = orgMap
          ? Array.from(orgMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
          : null;
        return { name, count, org: topOrg };
      });
    const sortedOrgs = Array.from(orgCounts.entries()).sort((a,b) => b[1]-a[1]).slice(0, insightsTopN);

    return { topGuests: sortedGuests, topOrgs: sortedOrgs };
  }, [filteredEpisodes, insightsTopN, insightsYear, excludeAlJazeera]);

  const relatedTags = useMemo(() => {
    if (selectedTags.length === 0) return [];
    
    const counts = new Map<string, number>();
    filteredEpisodes.forEach(ep => {
      ep.tags?.forEach(tag => {
        if (!selectedTags.includes(tag)) {
          counts.set(tag, (counts.get(tag) || 0) + 1);
        }
      });
    });
    
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 related tags
      .map(t => t[0]);
  }, [filteredEpisodes, selectedTags]);

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto space-y-8 font-sans">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <span className="bg-aljazeera text-white px-3 py-1 rounded-lg">The Take</span>
              Guest Explorer
            </h1>
            <div className="hidden sm:flex text-xs font-medium px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 items-center gap-1.5" title={isLiveSyncing ? "Syncing with GitHub..." : liveSyncSuccess ? "Data is up to date with cloud" : "Using offline embedded data"}>
              {isLiveSyncing ? (
                <><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div> Syncing...</>
              ) : liveSyncSuccess ? (
                <><div className="w-2 h-2 rounded-full bg-green-500"></div> Live Data</>
              ) : (
                <><div className="w-2 h-2 rounded-full bg-gray-400"></div> Offline Data</>
              )}
            </div>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            Search and filter the latest podcast episodes based on guest appearances, topics, and affiliations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="shrink-0 flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 shadow-sm transition-colors"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button 
            onClick={() => setShowHelp(!showHelp)} 
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 shadow-sm font-medium transition-colors"
          >
            <HelpCircle size={18} /> {showHelp ? 'Hide Help' : 'How to Use'}
          </button>
        </div>
      </header>

      {/* Help Section */}
      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-blue-900 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><HelpCircle size={20} className="text-blue-600" /> Quick Guide: How to use this tool</h2>
            <button onClick={() => setShowHelp(false)} className="text-blue-400 hover:text-blue-700 transition-colors"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1.5">
              <h3 className="font-bold text-blue-950 flex items-center gap-1.5">🔍 Smart Search</h3>
              <p className="text-blue-800 leading-relaxed">Type any combination of words. The tool searches across episode titles, guest names, affiliations, and AI tags. (e.g., searching "Emmett Till" finds episodes mentioning both words anywhere).</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-blue-950 flex items-center gap-1.5">🏷️ Interactive AI Tags</h3>
              <p className="text-blue-800 leading-relaxed">Click any tag to filter. Selecting multiple tags narrows your results to episodes containing <strong>all</strong> selected tags. The "Related Topics" bar suggests themes that often appear together.</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-blue-950 flex items-center gap-1.5">👤 Guest & Org Filters</h3>
              <p className="text-blue-800 leading-relaxed">Clicking a guest's name or their organization (next to the briefcase icon) will instantly filter the entire database to show only their specific appearances.</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-blue-950 flex items-center gap-1.5">🔗 Cross-References</h3>
              <p className="text-blue-800 leading-relaxed">If a guest has been on the show multiple times, an "Also appeared in" list will display on their card. Click an episode title there to instantly jump to it.</p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <h3 className="font-bold text-blue-950 flex items-center gap-1.5">📅 Date & Sorting</h3>
              <p className="text-blue-800 leading-relaxed">Use the date dropdown to view episodes from a specific month or custom time range. You can also re-order the entire list alphabetically (A-Z) or by oldest/newest using the sort dropdown on the right.</p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <h3 className="font-bold text-blue-950 flex items-center gap-1.5">📊 Quick Insights & Export</h3>
              <p className="text-blue-800 leading-relaxed">Whenever you apply filters, an "Insights" bar appears calculating the most frequent guest and organization within those results. You can also instantly download your currently filtered view as a CSV spreadsheet using the Export button.</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
          <input 
            type="search"
            placeholder="Search for an episode, guest name, or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-aljazeera focus:border-transparent transition-all"
          />
        </div>

        {/* Date Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar size={16} className="text-gray-500 dark:text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Date:</span>
            <select 
              value={dateMode} 
              onChange={e => setDateMode(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-aljazeera focus:border-aljazeera bg-white dark:bg-gray-800"
            >
              <option value="all">All Time</option>
              <option value="month">Specific Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateMode === 'month' && (
            <div className="animate-in fade-in slide-in-from-left-2">
              <select 
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-aljazeera focus:border-aljazeera bg-white dark:bg-gray-800 min-w-[150px]"
              >
                <option value="">Select Month...</option>
                {availableMonths.map(m => {
                  const [y, mm] = m.split('-');
                  const dateObj = new Date(parseInt(y), parseInt(mm) - 1);
                  const label = dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                  return <option key={m} value={m}>{label}</option>;
                })}
              </select>
            </div>
          )}

          {dateMode === 'custom' && (
            <div className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-left-2 flex-wrap">
              <input 
                type="date" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-aljazeera focus:border-aljazeera bg-white dark:bg-gray-800"
              />
              <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">to</span>
              <input 
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-aljazeera focus:border-aljazeera bg-white dark:bg-gray-800"
              />
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0 ml-auto border-l border-gray-200 dark:border-gray-700 dark:border-gray-700 pl-4 mt-4 sm:mt-0">
            <ArrowUpDown size={16} className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
            <select 
              value={sortOrder} 
              onChange={e => setSortOrder(e.target.value as any)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 focus:ring-aljazeera focus:border-aljazeera bg-white dark:bg-gray-800 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="az">A-Z</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
              <Tag size={16} /> Filter by AI-Generated Tags
            </h3>
            
            {/* Show active filter badges */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedHost && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-lg text-sm font-semibold animate-in fade-in zoom-in duration-200">
                  <User size={14} /> Filtering by Host: {selectedHost}
                  <button onClick={() => setSelectedHost(null)} className="ml-1 hover:text-green-900 focus:outline-none" title="Clear host filter">
                    <X size={14} />
                  </button>
                </div>
              )}
              {selectedGuest && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-lg text-sm font-semibold animate-in fade-in zoom-in duration-200">
                  <User size={14} /> Filtering by Guest: {selectedGuest}
                  <button onClick={() => setSelectedGuest(null)} className="ml-1 hover:text-blue-900 focus:outline-none" title="Clear guest filter">
                    <X size={14} />
                  </button>
                </div>
              )}
              {selectedOrg && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1 rounded-lg text-sm font-semibold animate-in fade-in zoom-in duration-200">
                  <Briefcase size={14} /> Filtering by Org: {selectedOrg}
                  <button onClick={() => setSelectedOrg(null)} className="ml-1 hover:text-purple-900 focus:outline-none" title="Clear org filter">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Show active tags first so they are always visible */}
            {selectedTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border bg-aljazeera text-white border-aljazeera shadow-sm"
              >
                {tag} <span className="ml-1 opacity-70 hover:opacity-100">&times;</span>
              </button>
            ))}

            {/* Show remaining visible tags (excluding already selected ones) */}
            {visibleTags.filter(t => !selectedTags.includes(t)).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:border-aljazeera/50 hover:bg-orange-50"
              >
                {tag}
              </button>
            ))}

            {remainingTags.length > 0 && (
              <button 
                onClick={() => setShowAllTags(!showAllTags)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 transition-colors ml-1"
              >
                {showAllTags ? <><ChevronUp size={16}/> Show less</> : <><ChevronDown size={16}/> +{remainingTags.length} more</>}
              </button>
            )}
          </div>

          {/* Related Tags Suggestions */}
          {relatedTags.length > 0 && (
            <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Sparkles size={14} /> Related Topics:
              </span>
              {relatedTags.map(tag => (
                <button
                  key={`related-${tag}`}
                  onClick={() => toggleTag(tag)}
                  className="px-2 py-1 bg-white dark:bg-gray-800 text-indigo-700 border border-indigo-200 rounded-md text-xs font-medium hover:bg-indigo-100 hover:border-indigo-300 transition-colors shadow-sm"
                >
                  + {tag}
                </button>
              ))}
            </div>
          )}

          {(selectedTags.length > 0 || selectedGuest || selectedOrg || selectedHost || dateMode !== 'all') && (
            <button 
              onClick={() => { 
                setSelectedTags([]); 
                setSelectedGuest(null); 
                setSelectedOrg(null); 
                setSelectedHost(null);
                setDateMode('all');
                setFilterMonth('');
                setDateFrom('');
                setDateTo('');
              }} 
              className="mt-3 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-100 underline block"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Insights & Export */}
      {insights && (insights.topGuests.length > 0 || insights.topOrgs.length > 0) && (
        <div className="bg-gradient-to-r from-aljazeera/10 to-orange-50 dark:from-aljazeera/20 dark:to-gray-900 border border-aljazeera/20 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-aljazeera dark:text-orange-400 font-bold">
              <BarChart3 size={20} /> Quick Insights
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                <span>Show:</span>
                <select
                  value={insightsTopN}
                  onChange={e => setInsightsTopN(Number(e.target.value) as 1 | 5 | 10)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
                >
                  <option value={1}>Top 1</option>
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                <span>Year:</span>
                <select
                  value={insightsYear}
                  onChange={e => setInsightsYear(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
                >
                  <option value="all">All</option>
                  {insightsYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeAlJazeera}
                  onChange={e => setExcludeAlJazeera(e.target.checked)}
                  className="accent-aljazeera"
                />
                <span>Exclude Al Jazeera people</span>
              </label>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors text-sm font-semibold shadow-sm"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.topGuests.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Top {insights.topGuests.length === 1 ? 'Guest' : `${insights.topGuests.length} Guests`}
                </div>
                <ol className="space-y-1 text-sm">
                  {insights.topGuests.map(({ name, count, org }, i) => (
                    <li key={name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-400 w-5 text-right">{i + 1}.</span>
                        <button
                          onClick={() => setSelectedGuest(selectedGuest === name ? null : name)}
                          className="font-semibold text-gray-900 dark:text-gray-100 hover:text-aljazeera text-left"
                        >
                          {name}
                        </button>
                        {org && (
                          <button
                            onClick={() => setSelectedOrg(selectedOrg === org ? null : org)}
                            className="text-xs text-gray-500 dark:text-gray-400 hover:text-aljazeera italic"
                            title={`Filter by ${org}`}
                          >
                            ({org})
                          </button>
                        )}
                      </span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-600 dark:text-gray-300">{count}x</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {insights.topOrgs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Top {insights.topOrgs.length === 1 ? 'Org' : `${insights.topOrgs.length} Orgs`}
                </div>
                <ol className="space-y-1 text-sm">
                  {insights.topOrgs.map(([org, count], i) => (
                    <li key={org} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="text-gray-400 w-5 text-right">{i + 1}.</span>
                        <button
                          onClick={() => setSelectedOrg(selectedOrg === org ? null : org)}
                          className="font-semibold text-gray-900 dark:text-gray-100 hover:text-aljazeera text-left"
                        >
                          {org}
                        </button>
                      </span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-600 dark:text-gray-300">{count}x</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          {filteredEpisodes.length} Episodes Found
        </h2>
        
        {filteredEpisodes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 dark:text-gray-500">No episodes match your search criteria.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredEpisodes.slice(0, visibleCount).map((ep) => {
              const isHighlighted = highlightedEpisodeTitle === ep.episode_title;
              
              return (
                <div 
                  key={ep.episode_title} 
                  id={`episode-${ep.episode_title}`}
                  className={`bg-white dark:bg-gray-800 border rounded-2xl p-6 shadow-sm transition-all duration-500 ${
                    isHighlighted 
                      ? 'border-aljazeera ring-2 ring-aljazeera/20 bg-orange-50/10 scale-[1.01] shadow-md' 
                      : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div>
                      <a href={ep.episode_url} target="_blank" rel="noreferrer" className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-aljazeera transition-colors flex items-center gap-2 group">
                        {ep.episode_title}
                        <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        <Calendar size={14} />
                        {new Date(ep.published_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {ep.tags && ep.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {ep.tags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button 
                            key={tag} 
                            onClick={() => toggleTag(tag)}
                            title={`Filter by ${tag}`}
                            className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors border ${
                              isSelected 
                                ? 'bg-aljazeera text-white border-aljazeera' 
                                : 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:border-aljazeera/50 hover:text-aljazeera'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Hosts & Producers */}
                  {(ep.hosts?.length || 0) > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">Host(s)</h4>
                      <div className="flex flex-wrap gap-2">
                        {ep.hosts?.map(host => (
                          <button 
                            key={host} 
                            onClick={() => setSelectedHost(selectedHost === host.trim() ? null : host.trim())}
                            title={selectedHost === host.trim() ? `Clear filter for ${host}` : `Filter episodes hosted by ${host}`}
                            className={`cursor-pointer px-3 py-1 rounded-lg text-sm font-medium border transition-colors ${selectedHost === host.trim() ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800/50'}`}
                          >
                            {host}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(ep.producers?.length || 0) > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">Production Team</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {ep.producers?.join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Guests */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-2">Featured Guests</h4>
                    {(!ep.guests || ep.guests.length === 0) ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 italic">No external guests identified in description.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ep.guests.map((g, gIdx) => (
                          <GuestCard 
                            key={gIdx}
                            guest={g}
                            episodeTitle={ep.episode_title}
                            appearances={guestAppearances.get(g.name.trim()) || []}
                            selectedGuest={selectedGuest}
                            selectedOrg={selectedOrg}
                            setSelectedGuest={setSelectedGuest}
                            setSelectedOrg={setSelectedOrg}
                            navigateToEpisode={navigateToEpisode}
                          />
                        ))}
                      </div>                    )}
                  </div>

                </div>
              );
            })}
            
            {/* Load More Button */}
            {visibleCount < filteredEpisodes.length && (
              <div className="text-center pt-8 pb-12">
                <button
                  onClick={() => setVisibleCount(v => v + 50)}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-semibold shadow-sm hover:bg-aljazeera transition-colors"
                >
                  Load More Episodes
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">Showing {visibleCount} of {filteredEpisodes.length}</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
