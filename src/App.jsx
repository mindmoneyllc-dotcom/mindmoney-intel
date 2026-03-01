import { useState, useEffect, useCallback } from "react";

const CATEGORIES = [
  { id: "geopolitics", label: "GEOPOLITICS", icon: "⚡", color: "#ff4444",
    prompt: `You are a geopolitical intelligence analyst. Based on your knowledge up to early 2026, provide the 5 most significant ongoing geopolitical situations involving the US, Russia, China, NATO, Ukraine, Middle East, and Taiwan. Return ONLY a valid JSON array of 5 objects with keys: "headline", "summary" (2-3 sentences), "region", "urgency" (HIGH/MEDIUM/LOW), "source" (write "Intelligence Brief"). Start with [ end with ]` },
  { id: "business", label: "MARKETS & FINANCE", icon: "📊", color: "#f5a623",
    prompt: `You are a financial analyst. Based on your knowledge up to early 2026, provide the 5 most significant ongoing financial and market developments covering stocks, Fed policy, oil, crypto, and global trade. Return ONLY a valid JSON array of 5 objects with keys: "headline", "summary" (2-3 sentences), "region", "urgency" (HIGH/MEDIUM/LOW), "source" (write "Market Brief"). Start with [ end with ]` },
  { id: "ai", label: "AI & TECH", icon: "🤖", color: "#00d4ff",
    prompt: `You are a technology analyst. Based on your knowledge up to early 2026, provide the 5 most significant ongoing AI and technology developments covering AI models, big tech, regulation, semiconductors, and robotics. Return ONLY a valid JSON array of 5 objects with keys: "headline", "summary" (2-3 sentences), "region", "urgency" (HIGH/MEDIUM/LOW), "source" (write "Tech Brief"). Start with [ end with ]` },
  { id: "macro", label: "MACRO ECONOMICS", icon: "🌐", color: "#7ed321",
    prompt: `You are a macroeconomist. Based on your knowledge up to early 2026, provide the 5 most significant ongoing macroeconomic developments covering inflation, central banks, GDP, labor markets, housing, and emerging markets. Return ONLY a valid JSON array of 5 objects with keys: "headline", "summary" (2-3 sentences), "region", "urgency" (HIGH/MEDIUM/LOW), "source" (write "Macro Brief"). Start with [ end with ]` }
];

const URGENCY_COLORS = { HIGH: "#ff4444", MEDIUM: "#f5a623", LOW: "#7ed321" };

async function fetchNews(cat) {
  const response = await fetch("/api/news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: cat.id, prompt: cat.prompt })
  });

  if (!response.ok) throw new Error(`Server error ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(json.error);

  // Handle live news response
  if (json.type === 'live' && json.data?.content) {
    const text = json.data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/gi, '').trim();
    const start = clean.indexOf('['), end = clean.lastIndexOf(']') + 1;
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(clean.slice(start, end));
      if (Array.isArray(parsed) && parsed.length > 0) return { items: parsed, isLive: true };
    }
  }

  // Handle knowledge response
  if (json.data?.content) {
    const text = json.data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/gi, '').trim();
    const start = clean.indexOf('['), end = clean.lastIndexOf(']') + 1;
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(clean.slice(start, end));
      if (Array.isArray(parsed) && parsed.length > 0) return { items: parsed, isLive: false };
    }
  }

  throw new Error("Could not parse response. Try again.");
}

function NewsCard({ item, accentColor }) {
  const [expanded, setExpanded] = useState(false);
  const timeAgo = item.publishedAt ? new Date(item.publishedAt).toLocaleTimeString() : null;

  return (
    <div onClick={() => setExpanded(!expanded)} style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderLeft: `3px solid ${URGENCY_COLORS[item.urgency] || accentColor}`,
      borderRadius: "2px", padding: "16px 18px", cursor: "pointer", transition: "all 0.2s"
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700, color: "#e8e8e8", lineHeight: 1.4, flex: 1 }}>
          {item.headline}
        </div>
        <div style={{
          fontSize: 9, fontFamily: "'Courier New', monospace", fontWeight: 700,
          color: URGENCY_COLORS[item.urgency] || "#888",
          background: `${URGENCY_COLORS[item.urgency]}18`,
          border: `1px solid ${URGENCY_COLORS[item.urgency]}44`,
          padding: "2px 6px", borderRadius: 2, whiteSpace: "nowrap", flexShrink: 0
        }}>{item.urgency}</div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: expanded ? 10 : 0 }}>
        <span style={{ fontSize: 10, color: accentColor, fontFamily: "'Courier New', monospace", fontWeight: 600 }}>[{item.region}]</span>
        <span style={{ fontSize: 10, color: "#555", fontFamily: "'Courier New', monospace" }}>{item.source}</span>
        {timeAgo && <span style={{ fontSize: 9, color: "#333", fontFamily: "'Courier New', monospace" }}>{timeAgo}</span>}
      </div>
      {expanded && (
        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.7, fontFamily: "Georgia, serif", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 4 }}>
          {item.summary}
        </div>
      )}
    </div>
  );
}

function CategoryPanel({ cat, result, isLoading, error, lastUpdated, onFetch }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${cat.color}33`, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: cat.color, fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: 3, marginBottom: 2 }}>
            {cat.icon} {cat.label}
            {result?.isLive && <span style={{ marginLeft: 10, fontSize: 9, color: "#7ed321", border: "1px solid #7ed32155", padding: "1px 6px", borderRadius: 2 }}>● LIVE</span>}
            {result && !result.isLive && <span style={{ marginLeft: 10, fontSize: 9, color: "#555", border: "1px solid #33333", padding: "1px 6px", borderRadius: 2 }}>AI BRIEF</span>}
          </div>
          {lastUpdated && <div style={{ fontSize: 10, color: "#444", fontFamily: "'Courier New', monospace" }}>UPDATED: {lastUpdated.toLocaleTimeString()}</div>}
        </div>
        <button onClick={() => onFetch(cat)} disabled={isLoading} style={{
          background: isLoading ? "transparent" : `${cat.color}18`, border: `1px solid ${isLoading ? "#333" : cat.color}`,
          color: isLoading ? "#444" : cat.color, fontFamily: "'Courier New', monospace",
          fontSize: 10, fontWeight: 700, padding: "6px 14px", borderRadius: 2,
          cursor: isLoading ? "not-allowed" : "pointer", letterSpacing: 2
        }}>
          {isLoading ? "FETCHING..." : "↺ REFRESH"}
        </button>
      </div>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 64, background: "rgba(255,255,255,0.02)", borderRadius: 2, border: "1px solid rgba(255,255,255,0.05)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
          <div style={{ textAlign: "center", fontSize: 10, color: "#333", fontFamily: "'Courier New', monospace", marginTop: 8, letterSpacing: 2 }}>LOADING INTEL...</div>
        </div>
      )}

      {error && !isLoading && (
        <div style={{ background: "#ff444410", border: "1px solid #ff444430", borderRadius: 2, padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#ff4444", fontFamily: "'Courier New', monospace", marginBottom: 8 }}>⚠ FEED INTERRUPTED</div>
          <div style={{ fontSize: 10, color: "#666", fontFamily: "'Courier New', monospace", marginBottom: 16 }}>{error}</div>
          <button onClick={() => onFetch(cat)} style={{ background: "#ff444418", border: "1px solid #ff4444", color: "#ff4444", fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 700, padding: "6px 16px", borderRadius: 2, cursor: "pointer", letterSpacing: 2 }}>RETRY</button>
        </div>
      )}

      {!isLoading && !error && !result && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.2 }}>{cat.icon}</div>
          <div style={{ fontSize: 11, color: "#333", fontFamily: "'Courier New', monospace", letterSpacing: 3 }}>AWAITING INTEL</div>
        </div>
      )}

      {!isLoading && result?.items && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.items.map((item, i) => <NewsCard key={i} item={item} accentColor={cat.color} />)}
        </div>
      )}
    </div>
  );
}

export default function NewsDashboard() {
  const [activeTab, setActiveTab] = useState("geopolitics");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [lastUpdated, setLastUpdated] = useState({});

  const fetchCategory = useCallback(async (cat) => {
    setLoading(prev => ({ ...prev, [cat.id]: true }));
    setErrors(prev => ({ ...prev, [cat.id]: null }));
    try {
      const result = await fetchNews(cat);
      setResults(prev => ({ ...prev, [cat.id]: result }));
      setLastUpdated(prev => ({ ...prev, [cat.id]: new Date() }));
    } catch (e) {
      setErrors(prev => ({ ...prev, [cat.id]: e.message }));
    } finally {
      setLoading(prev => ({ ...prev, [cat.id]: false }));
    }
  }, []);

  const activeCat = CATEGORIES.find(c => c.id === activeTab);

  const handleTabChange = (cat) => {
    setActiveTab(cat.id);
    if (!results[cat.id] && !loading[cat.id]) fetchCategory(cat);
  };

  useEffect(() => { fetchCategory(CATEGORIES[0]); }, []);

  const now = new Date();

  return (
    <div style={{ minHeight: "100vh", background: "#080808", backgroundImage: `radial-gradient(ellipse at 20% 0%, rgba(255,68,68,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(0,212,255,0.03) 0%, transparent 60%)`, color: "#e0e0e0" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:0.25}50%{opacity:0.55}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:2px}`}</style>

      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 6, color: "#fff", fontFamily: "'Courier New', monospace" }}>MIND MONEY LLC<span style={{ color: "#ff4444" }}> INTEL</span></div>
          <div style={{ fontSize: 9, color: "#333", letterSpacing: 4, marginTop: 3, fontFamily: "'Courier New', monospace" }}>GLOBAL INTELLIGENCE DASHBOARD</div>
        </div>
        <div style={{ textAlign: "right", fontFamily: "'Courier New', monospace" }}>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: 2 }}>{now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</div>
          <div style={{ fontSize: 11, color: "#ff4444", letterSpacing: 2, marginTop: 2 }}><span style={{ animation: "blink 1s infinite" }}>●</span> LIVE FEED</div>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.4)", overflowX: "auto" }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => handleTabChange(cat)} style={{
            padding: "14px 22px", background: activeTab === cat.id ? `${cat.color}10` : "transparent",
            border: "none", borderBottom: activeTab === cat.id ? `2px solid ${cat.color}` : "2px solid transparent",
            color: activeTab === cat.id ? cat.color : "#444", fontFamily: "'Courier New', monospace",
            fontSize: 10, fontWeight: 700, letterSpacing: 2, cursor: "pointer", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 6
          }}>
            {cat.icon} {cat.label}
            {loading[cat.id] && <span style={{ animation: "blink 0.8s infinite", color: cat.color }}>●</span>}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 24px" }}>
        <CategoryPanel cat={activeCat} result={results[activeCat.id]} isLoading={loading[activeCat.id]} error={errors[activeCat.id]} lastUpdated={lastUpdated[activeCat.id]} onFetch={fetchCategory} />
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "16px 32px", display: "flex", justifyContent: "space-between", fontFamily: "'Courier New', monospace", fontSize: 9, color: "#222", letterSpacing: 2 }}>
        <span>MIND MONEY LLC © 2026</span>
        <span>POWERED BY CLAUDE AI + NEWSAPI</span>
        <span>CLICK ANY CARD TO EXPAND</span>
      </div>
    </div>
  );
}
