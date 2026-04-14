import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
function randNormal(mean, std, rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng(); while (v === 0) v = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function generateDataset() {
  const categories = [
    { name: "FLOP",       n: 500, skipMean: 65, skipStd: 10, savesMean: 0.004, savesStd: 0.003, viewsMean: 4000,    viewsStd: 2000    },
    { name: "MIDDLE",     n: 350, skipMean: 38, skipStd: 8,  savesMean: 0.012, savesStd: 0.005, viewsMean: 150000,  viewsStd: 80000   },
    { name: "VIRAL",      n: 120, skipMean: 26, skipStd: 5,  savesMean: 0.025, savesStd: 0.008, viewsMean: 1500000, viewsStd: 600000  },
    { name: "MEGA_VIRAL", n: 30,  skipMean: 22, skipStd: 4,  savesMean: 0.03,  savesStd: 0.01,  viewsMean: 8000000, viewsStd: 3000000 },
  ];
  const videos: any[] = []; let id = 1;
  for (const cat of categories) {
    for (let i = 0; i < cat.n; i++) {
      videos.push({
        id: id++, category: cat.name,
        skip: +clamp(randNormal(cat.skipMean, cat.skipStd, rand), 5, 95).toFixed(1),
        saves: +clamp(randNormal(cat.savesMean, cat.savesStd, rand), 0.0001, 0.15).toFixed(4),
        views: Math.max(100, Math.round(randNormal(cat.viewsMean, cat.viewsStd, rand))),
      });
    }
  }
  return videos;
}

const DATASET = generateDataset();

const CAT_COLOR: Record<string, string> = {
  FLOP: "#ff4d6d", MIDDLE: "#00d2ff", VIRAL: "#bf5af2", MEGA_VIRAL: "#ffd60a",
};
const CAT_GLOW: Record<string, string> = {
  FLOP: "rgba(255,77,109,0.4)", MIDDLE: "rgba(0,210,255,0.4)",
  VIRAL: "rgba(191,90,242,0.4)", MEGA_VIRAL: "rgba(255,214,10,0.4)",
};
const CAT_LABEL: Record<string, string> = {
  FLOP: "💀 FLOP", MIDDLE: "⚡ MIDDLE", VIRAL: "🔥 VIRAL", MEGA_VIRAL: "👑 MEGA VIRAL",
};
const CATS = ["FLOP", "MIDDLE", "VIRAL", "MEGA_VIRAL"];

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

function downloadCSV(data: any[]) {
  const header = "id,category,skip_rate_24h,saves_per_view_24h,total_views_10d";
  const rows = data.map((r) => `${r.id},${r.category},${r.skip},${r.saves},${r.views}`);
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "1000_videos_simulation.csv"; a.click();
}

function downloadXLS(data: any[]) {
  const header = ["id", "category", "skip_rate_24h(%)", "saves_per_view_24h", "total_views_10d"];
  const catColors: Record<string, string> = { FLOP: "#ff9999", MIDDLE: "#99eeff", VIRAL: "#ee99ff", MEGA_VIRAL: "#ffe066" };
  let html = `<html><head><meta charset="UTF-8"></head><body><table border="1" style="border-collapse:collapse">`;
  html += "<tr>" + header.map((h) => `<th style="background:#1a0a2e;color:white;padding:6px 10px">${h}</th>`).join("") + "</tr>";
  data.forEach((r) => {
    html += `<tr><td style="padding:4px 8px">${r.id}</td><td style="background:${catColors[r.category]};padding:4px 8px;font-weight:bold">${r.category}</td><td style="padding:4px 8px">${r.skip}</td><td style="padding:4px 8px">${r.saves}</td><td style="padding:4px 8px">${r.views.toLocaleString()}</td></tr>`;
  });
  html += "</table></body></html>";
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "1000_videos_simulation.xls"; a.click();
}

const TABS = [
  { id: "skip-views",  label: "📈 Skip vs Views"  },
  { id: "saves-views", label: "💾 Saves vs Views"  },
  { id: "skip-saves",  label: "⚡ Skip vs Saves"   },
  { id: "stats",       label: "🏆 Stats"           },
  { id: "table",       label: "📋 Raw Data"        },
];

const glowStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #05050f; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 2px; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(127,90,255,0.3); } 50% { box-shadow: 0 0 40px rgba(127,90,255,0.6); } }
  .intro-card { animation: fadeIn 0.6s ease forwards; }
  .tab-active { animation: glow 2s ease infinite; }
`;

// ─── Intro Screen ─────────────────────────────────────────────────────────────
function IntroScreen({ onEnter }: { onEnter: (name: string) => void }) {
  const [name, setName] = useState("");
  const [fading, setFading] = useState(false);

  const handleEnter = () => {
    if (!name.trim()) return;
    setFading(true);
    setTimeout(() => onEnter(name.trim()), 500);
  };

  return (
    <div style={{
      background: "#05050f",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'Inter', sans-serif",
      opacity: fading ? 0 : 1,
      transition: "opacity 0.5s ease",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{glowStyle}</style>

      {/* Background glow orbs */}
      <div style={{ position: "absolute", top: "10%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(127,90,255,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,210,255,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="intro-card" style={{ maxWidth: 580, width: "100%", position: "relative", zIndex: 1 }}>

        {/* Badge */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(127,90,255,0.1)", border: "1px solid rgba(127,90,255,0.3)", borderRadius: 20, padding: "6px 16px", marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7f5aff", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#7f5aff", fontWeight: 700, letterSpacing: "0.1em" }}>LIVE SIMULATION</span>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1.1, marginBottom: 8 }}>
            1,000 Video<br />
            <span style={{ background: "linear-gradient(135deg, #7f5aff, #00d2ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Simulation</span>
          </h1>
          <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
            by <span style={{ color: "#666", fontWeight: 600 }}>Enoch Immanuel Wang</span> · Playing with Probability
          </p>
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" }}>
          {[
            { label: "1,000", sub: "videos" },
            { label: "4", sub: "categories" },
            { label: "3", sub: "chart views" },
            { label: "∞", sub: "insights" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#0d0d1e", border: "1px solid #1e1e38", borderRadius: 10, padding: "10px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "#333", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Guide */}
        <div style={{ background: "#0a0a1a", border: "1px solid #1a1a30", borderRadius: 16, padding: "20px 22px", marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>How to use</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "🎛️", text: "Toggle category filters to isolate video performance tiers" },
              { icon: "🖱️", text: "Hover over any dot on the scatter plot to inspect that video's stats" },
              { icon: "📊", text: "Switch chart views to explore different metric relationships" },
              { icon: "🏆", text: "Check Summary Stats for key observations and viral boundaries" },
              { icon: "⬇️", text: "Export the full dataset as CSV or Excel" },
            ].map((s) => (
              <div key={s.icon} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 15 }}>{s.icon}</span>
                <span style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Login */}
        <div style={{ background: "linear-gradient(135deg, #0d0d20, #0a0a18)", border: "1px solid #1e1e3a", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Create account</div>
          <div style={{ fontSize: 12, color: "#333", marginBottom: 16 }}>Enter your name to begin your session</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnter()}
              style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "1px solid #1e1e38", background: "#07071a", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none" }}
            />
            <button onClick={handleEnter} disabled={!name.trim()} style={{
              padding: "11px 24px", borderRadius: 10, border: "none", cursor: name.trim() ? "pointer" : "not-allowed",
              background: name.trim() ? "linear-gradient(135deg, #7f5aff, #5a3adf)" : "#111",
              color: name.trim() ? "#fff" : "#333", fontWeight: 700, fontSize: 13, fontFamily: "inherit",
              boxShadow: name.trim() ? "0 0 20px rgba(127,90,255,0.4)" : "none",
              transition: "all 0.2s ease", whiteSpace: "nowrap",
            }}>
              Enter →
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "#1e1e2e" }}>
          React · TypeScript · Recharts · Simulated data only
        </div>
      </div>
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "rgba(8,8,20,0.98)", border: `1px solid ${CAT_COLOR[d.category]}55`,
      borderRadius: 12, padding: "14px 18px", fontSize: 12,
      boxShadow: `0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px ${CAT_COLOR[d.category]}22, 0 0 20px ${CAT_GLOW[d.category]}`,
    }}>
      <div style={{ color: CAT_COLOR[d.category], fontWeight: 800, marginBottom: 10, fontSize: 10, letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: CAT_COLOR[d.category], boxShadow: `0 0 6px ${CAT_COLOR[d.category]}` }} />
        {d.category}
      </div>
      <div style={{ color: "#333", fontSize: 10, marginBottom: 10 }}>VIDEO #{d.id}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span style={{ color: "#555" }}>Skip rate</span>
          <span style={{ color: "#fff", fontWeight: 700 }}>{d.skip}%</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span style={{ color: "#555" }}>Saves/view</span>
          <span style={{ color: "#fff", fontWeight: 700 }}>{d.saves}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span style={{ color: "#555" }}>Views (10d)</span>
          <span style={{ color: CAT_COLOR[d.category], fontWeight: 700 }}>{fmt(d.views)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [tab, setTab] = useState("skip-views");
  const [visibleCats, setVisibleCats] = useState(new Set(CATS));
  const [explored, setExplored] = useState(new Set(["skip-views"]));

  if (!username) return <IntroScreen onEnter={(n) => setUsername(n)} />;

  const filtered = DATASET.filter((d) => visibleCats.has(d.category));
  const byCategory: Record<string, any[]> = {};
  CATS.forEach((c) => (byCategory[c] = filtered.filter((d) => d.category === c)));

  const toggleCat = (c: string) =>
    setVisibleCats((prev) => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s; });

  const switchTab = (t: string) => {
    setTab(t);
    setExplored((prev) => new Set([...prev, t]));
  };

  const stats = CATS.map((cat) => {
    const d = DATASET.filter((v) => v.category === cat);
    const avg = (key: string) => d.reduce((s, v) => s + v[key], 0) / d.length;
    return { cat, n: d.length, avgSkip: avg("skip").toFixed(1), avgSaves: avg("saves").toFixed(4), avgViews: Math.round(avg("views")) };
  });

  const totalViews = DATASET.reduce((s, d) => s + d.views, 0);
  const xpProgress = Math.round((explored.size / TABS.length) * 100);

  const ScatterPlot = ({ xKey, yKey, xLabel, yLabel, xFmt, yFmt }: any) => (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 20 }}>
        <CartesianGrid strokeDasharray="1 8" stroke="#ffffff06" />
        <XAxis dataKey={xKey} type="number" name={xLabel} stroke="transparent"
          tick={{ fill: "#333", fontSize: 11, fontFamily: "Inter" }}
          tickFormatter={xFmt || ((v: any) => v)}
          label={{ value: xLabel, position: "insideBottom", offset: -30, fill: "#333", fontSize: 11 }} />
        <YAxis dataKey={yKey} type="number" name={yLabel} stroke="transparent"
          tick={{ fill: "#333", fontSize: 10, fontFamily: "Inter" }}
          tickFormatter={yFmt || fmt}
          label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 14, fill: "#333", fontSize: 11 }} width={64} />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 20, fontFamily: "Inter" }} />
        {CATS.filter((c) => visibleCats.has(c)).map((cat) => (
          <Scatter key={cat} name={cat} data={byCategory[cat]} fill={CAT_COLOR[cat]} opacity={0.7} r={3.5} />
        ))}
        {xKey === "skip" && <ReferenceLine x={35} stroke="#ff4d6d33" strokeDasharray="6 4" label={{ value: "skip threshold 35%", fill: "#ff4d6d55", fontSize: 10, position: "top" }} />}
        {yKey === "saves" && xKey === "skip" && <ReferenceLine y={0.01} stroke="#00ff8833" strokeDasharray="6 4" label={{ value: "save threshold 0.01", fill: "#00ff8855", fontSize: 10 }} />}
      </ScatterChart>
    </ResponsiveContainer>
  );

  return (
    <div style={{ background: "#05050f", minHeight: "100vh", color: "#e8e8f0", fontFamily: "'Inter', 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{glowStyle}</style>

      {/* ── Top Bar ── */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #0e0e20", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", background: "rgba(5,5,15,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "#2a2a4a", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>Enoch Immanuel Wang</div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", background: "linear-gradient(135deg, #fff, #666)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            1,000 Video Simulation
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#333", fontWeight: 600, marginBottom: 4, textAlign: "right" }}>EXPLORED {xpProgress}%</div>
            <div style={{ width: 120, height: 5, background: "#0d0d20", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${xpProgress}%`, height: "100%", background: "linear-gradient(90deg, #7f5aff, #00d2ff)", borderRadius: 3, transition: "width 0.4s ease", boxShadow: "0 0 8px rgba(127,90,255,0.6)" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0d0d20", border: "1px solid #1a1a30", borderRadius: 20, padding: "5px 12px" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg, #7f5aff, #00d2ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
              {username[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>{username}</span>
          </div>
          <button onClick={() => setUsername(null)} style={{ background: "transparent", border: "1px solid #1a1a30", color: "#333", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>✕</button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "flex", gap: 10, padding: "16px 24px 0", flexWrap: "wrap" }}>
        {[
          { label: "Total Views", value: fmt(totalViews), color: "#7f5aff" },
          { label: "Videos Simulated", value: "1,000", color: "#00d2ff" },
          { label: "Avg Views", value: fmt(Math.round(totalViews / DATASET.length)), color: "#bf5af2" },
          { label: "Viral Rate", value: "15%", color: "#ffd60a" },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, minWidth: 130, background: "#0a0a18", border: `1px solid ${s.color}22`, borderRadius: 14, padding: "14px 18px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
            <div style={{ fontSize: 9, color: "#333", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Category Filters ── */}
      <div style={{ display: "flex", gap: 8, padding: "14px 24px 0", flexWrap: "wrap", alignItems: "center" }}>
        {CATS.map((c) => {
          const on = visibleCats.has(c);
          return (
            <button key={c} onClick={() => toggleCat(c)} style={{
              padding: "7px 16px", borderRadius: 20,
              border: `1.5px solid ${on ? CAT_COLOR[c] : CAT_COLOR[c] + "33"}`,
              cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", fontFamily: "inherit",
              background: on ? `${CAT_COLOR[c]}18` : "transparent",
              color: on ? CAT_COLOR[c] : CAT_COLOR[c] + "55",
              boxShadow: on ? `0 0 12px ${CAT_GLOW[c]}` : "none",
              transition: "all 0.15s ease",
            }}>
              {CAT_LABEL[c]}
            </button>
          );
        })}
        <span style={{ fontSize: 11, color: "#2a2a4a", marginLeft: 4, fontWeight: 500 }}>{filtered.length.toLocaleString()} videos</span>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 4, padding: "14px 24px 0", flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const isActive = tab === t.id;
          const done = explored.has(t.id);
          return (
            <button key={t.id} onClick={() => switchTab(t.id)} style={{
              padding: "8px 16px", borderRadius: 10, border: `1px solid ${isActive ? "#7f5aff55" : "#1a1a2a"}`,
              cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: isActive ? "rgba(127,90,255,0.15)" : "#0a0a18",
              color: isActive ? "#a585ff" : done ? "#444" : "#2a2a3a",
              boxShadow: isActive ? "0 0 16px rgba(127,90,255,0.25)" : "none",
              transition: "all 0.15s ease",
            }}>
              {t.label}
              {done && !isActive && <span style={{ marginLeft: 5, fontSize: 9, color: "#2a2a4a" }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* ── Chart Panel ── */}
      <div style={{ flex: 1, margin: "14px 24px 24px", background: "#080818", borderRadius: 20, border: "1px solid #10102a", overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column" }}>

        {(tab === "skip-views" || tab === "saves-views" || tab === "skip-saves") && (
          <div style={{ flex: 1, minHeight: 500 }}>
            {tab === "skip-views"  && <ScatterPlot xKey="skip"  yKey="views" xLabel="Skip Rate 24h (%)"  yLabel="Total Views (10d)"  />}
            {tab === "saves-views" && <ScatterPlot xKey="saves" yKey="views" xLabel="Saves/View (24h)"   yLabel="Total Views (10d)"  xFmt={(v: number) => v.toFixed(3)} />}
            {tab === "skip-saves"  && <ScatterPlot xKey="skip"  yKey="saves" xLabel="Skip Rate 24h (%)"  yLabel="Saves/View (24h)"   yFmt={(v: number) => v.toFixed(3)} />}
          </div>
        )}

        {tab === "stats" && (
          <div style={{ padding: "24px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Category", "Count", "Avg Skip Rate", "Avg Saves/View", "Avg Views (10d)"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", color: "#2a2a4a", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #10102a", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.cat} style={{ borderBottom: "1px solid #0a0a18" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ color: CAT_COLOR[s.cat], fontWeight: 800, fontSize: 12, background: `${CAT_COLOR[s.cat]}18`, padding: "5px 12px", borderRadius: 20, border: `1px solid ${CAT_COLOR[s.cat]}33`, boxShadow: `0 0 10px ${CAT_GLOW[s.cat]}` }}>
                        {CAT_LABEL[s.cat]}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#444", fontWeight: 600 }}>{s.n}</td>
                    <td style={{ padding: "14px 16px", color: +s.avgSkip > 50 ? "#ff4d6d" : +s.avgSkip < 30 ? "#00ff88" : "#555", fontWeight: 700 }}>{s.avgSkip}%</td>
                    <td style={{ padding: "14px 16px", color: "#444" }}>{s.avgSaves}</td>
                    <td style={{ padding: "14px 16px", color: CAT_COLOR[s.cat], fontWeight: 700 }}>{fmt(s.avgViews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 24, padding: "20px 22px", background: "#05050f", borderRadius: 14, border: "1px solid #10102a", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ color: "#e8e8f0", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🔬 Key Observations</div>
              {[
                { color: "#ff4d6d", label: "Flop boundary", text: "Skip rate > 50% and saves/view < 0.005 → almost guaranteed extinction" },
                { color: "#bf5af2", label: "Viral boundary", text: "Skip rate < 30% and saves/view > 0.02 → supercritical branching" },
                { color: "#00d2ff", label: "Middle zone", text: "Skip 30–50%, saves 0.005–0.02 → outcome is probabilistic (coin flip territory)" },
              ].map((o) => (
                <div key={o.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 3, minHeight: 40, borderRadius: 2, background: o.color, marginTop: 2 }} />
                  <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
                    <span style={{ color: o.color, fontWeight: 700 }}>{o.label}: </span>{o.text}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: "#1e1e3a", marginTop: 4 }}>Distribution: 500 flops · 350 middle · 120 viral · 30 mega viral</div>
            </div>
          </div>
        )}

        {tab === "table" && (
          <div style={{ overflowX: "auto", overflowY: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  {["#", "Category", "Skip Rate 24h", "Saves/View 24h", "Total Views 10d"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", background: "#080818", color: "#2a2a4a", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #10102a", whiteSpace: "nowrap", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #08081a", background: i % 2 === 0 ? "transparent" : "#05050f" }}>
                    <td style={{ padding: "7px 16px", color: "#1e1e3a" }}>{r.id}</td>
                    <td style={{ padding: "7px 16px" }}>
                      <span style={{ color: CAT_COLOR[r.category], fontWeight: 700, fontSize: 10, background: `${CAT_COLOR[r.category]}18`, padding: "3px 8px", borderRadius: 10 }}>
                        {r.category.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "7px 16px", color: r.skip > 50 ? "#ff4d6d" : r.skip < 30 ? "#00ff88" : "#333", fontWeight: 600 }}>{r.skip}%</td>
                    <td style={{ padding: "7px 16px", color: "#2a2a3a" }}>{r.saves}</td>
                    <td style={{ padding: "7px 16px", color: CAT_COLOR[r.category], fontWeight: 600 }}>{r.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Export ── */}
      <div style={{ display: "flex", gap: 10, padding: "0 24px 24px" }}>
        <button onClick={() => downloadXLS(DATASET)} style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid #00b84622", cursor: "pointer", background: "rgba(0,184,70,0.07)", color: "#00b846", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
          ↓ Export Excel
        </button>
        <button onClick={() => downloadCSV(DATASET)} style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid #4d78ff22", cursor: "pointer", background: "rgba(77,120,255,0.07)", color: "#4d78ff", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
          ↓ Export CSV
        </button>
      </div>
    </div>
  );
}
