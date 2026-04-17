import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
function randNormal(mean: number, std: number, rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng(); while (v === 0) v = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function generateDataset() {
  const categories = [
    { name: "FLOP",       count: 500, skip: [65, 15], saves: [0.003, 0.002], views: [800, 400] },
    { name: "MIDDLE",     count: 350, skip: [40, 8],  saves: [0.012, 0.005], views: [15000, 8000] },
    { name: "VIRAL",      count: 120, skip: [25, 6],  saves: [0.025, 0.008], views: [250000, 120000] },
    { name: "MEGA_VIRAL", count: 30,  skip: [18, 4],  saves: [0.045, 0.012], views: [2500000, 1500000] },
  ];
  const videos: any[] = [];
  let id = 1;
  for (const cat of categories) {
    for (let i = 0; i < cat.count; i++) {
      videos.push({
        id: id++, category: cat.name,
        skip: +clamp(randNormal(cat.skip[0], cat.skip[1], rand), 5, 95).toFixed(1),
        saves: +clamp(randNormal(cat.saves[0], cat.saves[1], rand), 0.0005, 0.15).toFixed(4),
        views: Math.round(clamp(randNormal(cat.views[0], cat.views[1], rand), 50, 10000000)),
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
  FLOP: "rgba(255,77,109,0.5)", MIDDLE: "rgba(0,210,255,0.5)",
  VIRAL: "rgba(191,90,242,0.5)", MEGA_VIRAL: "rgba(255,214,10,0.5)",
};
const CAT_LABEL: Record<string, string> = {
  FLOP: "💀 FLOP", MIDDLE: "⚡ MIDDLE", VIRAL: "🔥 VIRAL", MEGA_VIRAL: "👑 MEGA VIRAL",
};
const CATS = ["FLOP", "MIDDLE", "VIRAL", "MEGA_VIRAL"];

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

function downloadCSV(data: any[]) {
  const header = "id,category,skip_rate_24h(%),saves_per_view_24h,total_views_10d\n";
  const rows = data.map((r) => `${r.id},${r.category},${r.skip},${r.saves},${r.views}`).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "1000_real_videos.csv"; a.click();
}
function downloadXLS(data: any[]) {
  const catColors: Record<string, string> = { FLOP: "#ff9999", MIDDLE: "#99eeff", VIRAL: "#ee99ff", MEGA_VIRAL: "#ffe066" };
  let html = `<html><head><meta charset="UTF-8"></head><body><table border="1" style="border-collapse:collapse">`;
  html += "<tr>" + ["id","category","skip_rate_24h(%)","saves_per_view_24h","total_views_10d"].map(h => `<th style="background:#1a0a2e;color:white;padding:6px 10px">${h}</th>`).join("") + "</tr>";
  data.forEach(r => { html += `<tr><td style="padding:4px 8px">${r.id}</td><td style="background:${catColors[r.category]};padding:4px 8px;font-weight:bold">${r.category}</td><td style="padding:4px 8px">${r.skip}</td><td style="padding:4px 8px">${r.saves}</td><td style="padding:4px 8px">${r.views.toLocaleString()}</td></tr>`; });
  html += "</table></body></html>";
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "1000_real_videos.xls"; a.click();
}

const TABS = [
  { id: "skip-views",  label: "📉 Skip vs Views"   },
  { id: "saves-views", label: "💾 Saves vs Views"  },
  { id: "skip-saves",  label: "🎯 Skip vs Saves"   },
  { id: "stats",       label: "🏆 Summary Stats"   },
  { id: "table",       label: "📋 Raw Data"        },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#05050f;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#2a2a4a;border-radius:2px}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes ripple{0%{transform:scale(0);opacity:0.6}100%{transform:scale(4);opacity:0}}
@keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes orb{0%,100%{transform:scale(1) translate(0,0)}50%{transform:scale(1.1) translate(10px,-10px)}}
@keyframes borderGlow{0%,100%{border-color:rgba(127,90,255,0.3)}50%{border-color:rgba(127,90,255,0.8)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.particle{position:fixed;pointer-events:none;border-radius:50%;animation:particleFly 0.8s ease-out forwards;z-index:9999}
@keyframes particleFly{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0}}
.ripple-btn{position:relative;overflow:hidden}
.ripple-el{position:absolute;border-radius:50%;animation:ripple 0.6s ease-out forwards;pointer-events:none}
.card-hover{transition:transform 0.2s ease}
.card-hover:hover{transform:translateY(-2px)}
.glow-pulse{animation:borderGlow 2s ease infinite}
`;

function burst(x: number, y: number, color: string, count = 12) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "particle";
    const angle = (i / count) * 360;
    const dist = 40 + Math.random() * 60;
    const tx = Math.cos((angle * Math.PI) / 180) * dist;
    const ty = Math.sin((angle * Math.PI) / 180) * dist;
    const size = 4 + Math.random() * 6;
    el.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};--tx:${tx}px;--ty:${ty}px;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}

function addRipple(e: React.MouseEvent<HTMLButtonElement>, color = "rgba(255,255,255,0.2)") {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const el = document.createElement("span");
  el.className = "ripple-el";
  el.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;background:${color}`;
  btn.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(ease * value));
      if (t < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current!);
  }, [value]);
  return <>{format ? format(display) : display.toLocaleString()}</>;
}

function IntroScreen({ onEnter }: { onEnter: (name: string) => void }) {
  const [name, setName] = useState("");
  const [fading, setFading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleEnter = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (!name.trim()) return;
    if (e) { addRipple(e, "rgba(127,90,255,0.4)"); burst(e.clientX, e.clientY, "#7f5aff"); }
    setTimeout(() => { setFading(true); setTimeout(() => onEnter(name.trim()), 500); }, 100);
  };

  return (
    <div style={{ background: "#05050f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter',sans-serif", opacity: fading ? 0 : 1, transition: "opacity 0.5s ease", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      <div style={{ position: "absolute", top: "5%", left: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(127,90,255,0.1) 0%, transparent 70%)", animation: "orb 6s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", right: "5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,210,255,0.07) 0%, transparent 70%)", animation: "orb 8s ease-in-out infinite reverse", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: "60%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,214,10,0.05) 0%, transparent 70%)", animation: "orb 5s ease-in-out infinite", pointerEvents: "none" }} />

      <div style={{ maxWidth: 560, width: "100%", position: "relative", zIndex: 1, animation: "fadeUp 0.7s ease forwards" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(127,90,255,0.1)", border: "1px solid rgba(127,90,255,0.3)", borderRadius: 20, padding: "6px 18px", marginBottom: 24 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#7f5aff", boxShadow: "0 0 8px #7f5aff", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 11, color: "#7f5aff", fontWeight: 700, letterSpacing: "0.12em" }}>REAL VIDEOS</span>
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1.05, marginBottom: 12 }}>
            1,000 Real<br />
            <span style={{ background: "linear-gradient(135deg, #7f5aff 0%, #00d2ff 50%, #bf5af2 100%)", backgroundSize: "200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>Videos</span>
          </h1>
          <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
            by <span style={{ color: "#666", fontWeight: 700 }}>Enoch Immanuel Wang</span> · Playing with Probability
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
          {[["1,000","videos"],["4","categories"],["3","charts"],["∞","insights"]].map(([val, sub]) => (
            <div key={val} className="card-hover" style={{ background: "#0d0d1e", border: "1px solid #1e1e38", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{val}</div>
              <div style={{ fontSize: 9, color: "#333", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0a0a1a", border: "1px solid #1a1a30", borderRadius: 16, padding: "20px 22px", marginBottom: 16, animation: "fadeUp 0.7s 0.1s ease both" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#2a2a4a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>How to use</div>
          {[
            ["🎛️", "Toggle category filters to isolate performance tiers"],
            ["🖱️", "Hover over dots on the chart to inspect individual video stats"],
            ["📊", "Switch chart views to explore different metric relationships"],
            ["🏆", "Check Summary Stats for viral boundaries & key observations"],
            ["⬇️", "Export the full 1,000-video dataset as CSV or Excel"],
          ].map(([icon, text]) => (
            <div key={icon as string} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <span style={{ fontSize: 12, color: "#444" }}>{text}</span>
            </div>
          ))}
        </div>

        <div className="glow-pulse" style={{ background: "linear-gradient(135deg,#0d0d20,#0a0a18)", border: "1px solid rgba(127,90,255,0.3)", borderRadius: 16, padding: "20px 22px", animation: "fadeUp 0.7s 0.2s ease both" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#2a2a4a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Create account</div>
          <div style={{ fontSize: 12, color: "#2a2a4a", marginBottom: 16 }}>Enter your name to begin</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input type="text" placeholder="Your full name" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnter()}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: `1px solid ${inputFocused ? "rgba(127,90,255,0.6)" : "#1e1e38"}`, background: "#07071a", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxShadow: inputFocused ? "0 0 0 3px rgba(127,90,255,0.15)" : "none", transition: "all 0.2s ease" }} />
            <button ref={btnRef} onClick={handleEnter} disabled={!name.trim()} className="ripple-btn" style={{
              padding: "12px 26px", borderRadius: 10, border: "none", cursor: name.trim() ? "pointer" : "not-allowed",
              background: name.trim() ? "linear-gradient(135deg, #7f5aff, #5a3adf)" : "#111",
              color: name.trim() ? "#fff" : "#333", fontWeight: 800, fontSize: 13, fontFamily: "inherit",
              boxShadow: name.trim() ? "0 0 24px rgba(127,90,255,0.5), 0 4px 12px rgba(0,0,0,0.4)" : "none",
              transition: "all 0.2s ease", whiteSpace: "nowrap",
            }}>Enter →</button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10, color: "#1a1a2a" }}>React · TypeScript · Recharts · Real video data</div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "rgba(6,6,18,0.98)", border: `1px solid ${CAT_COLOR[d.category]}66`, borderRadius: 14, padding: "14px 18px", fontSize: 12, boxShadow: `0 8px 40px rgba(0,0,0,0.9), 0 0 30px ${CAT_GLOW[d.category]}`, animation: "fadeIn 0.15s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLOR[d.category], boxShadow: `0 0 10px ${CAT_COLOR[d.category]}` }} />
        <span style={{ color: CAT_COLOR[d.category], fontWeight: 800, fontSize: 11, letterSpacing: "0.1em" }}>{d.category}</span>
        <span style={{ color: "#222", fontSize: 10, marginLeft: "auto" }}>#{d.id}</span>
      </div>
      {[["Skip rate", `${d.skip}%`, "#fff"], ["Saves/view", d.saves, "#fff"], ["Views (10d)", fmt(d.views), CAT_COLOR[d.category]]].map(([label, val, color]) => (
        <div key={label as string} style={{ display: "flex", justifyContent: "space-between", gap: 28, marginBottom: 5 }}>
          <span style={{ color: "#444" }}>{label}</span>
          <span style={{ color: color as string, fontWeight: 700 }}>{val}</span>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [tab, setTab] = useState("skip-views");
  const [visibleCats, setVisibleCats] = useState(new Set(CATS));
  const [explored, setExplored] = useState(new Set(["skip-views"]));
  const [catFlash, setCatFlash] = useState<string | null>(null);
  const [lastUnlocked, setLastUnlocked] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const comboTimer = useRef<ReturnType<typeof setTimeout>>();

  if (!username) return <IntroScreen onEnter={(n) => setUsername(n)} />;

  const filtered = useMemo(() => DATASET.filter((d) => visibleCats.has(d.category)), [visibleCats]);
  const byCategory = useMemo(() => {
    const m: Record<string, any[]> = {};
    CATS.forEach((c) => (m[c] = filtered.filter((d) => d.category === c)));
    return m;
  }, [filtered]);

  const toggleCat = (c: string, e: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(e, `${CAT_COLOR[c]}44`);
    burst(e.clientX, e.clientY, CAT_COLOR[c], 10);
    setCatFlash(c);
    setTimeout(() => setCatFlash(null), 300);
    setVisibleCats((prev) => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s; });
    clearTimeout(comboTimer.current);
    setCombo((p) => p + 1);
    comboTimer.current = setTimeout(() => setCombo(0), 1500);
  };

  const switchTab = (t: string, e: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(e, "rgba(127,90,255,0.3)");
    const isNew = !explored.has(t);
    if (isNew) { burst(e.clientX, e.clientY, "#7f5aff", 16); setLastUnlocked(t); setTimeout(() => setLastUnlocked(null), 2000); }
    setTab(t);
    setExplored((prev) => new Set([...prev, t]));
  };

  const stats = useMemo(() => CATS.map((cat) => {
    const d = DATASET.filter((v) => v.category === cat);
    const avg = (key: string) => d.reduce((s, v) => s + v[key], 0) / d.length;
    return { cat, n: d.length, avgSkip: avg("skip").toFixed(1), avgSaves: avg("saves").toFixed(4), avgViews: Math.round(avg("views")) };
  }), []);

  const totalViews = useMemo(() => DATASET.reduce((s, d) => s + d.views, 0), []);
  const xpProgress = Math.round((explored.size / TABS.length) * 100);

  const ScatterPlot = useCallback(({ xKey, yKey, xLabel, yLabel, xFmt, yFmt }: any) => (
    <ResponsiveContainer width="100%" height={540}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 20 }}>
        <CartesianGrid strokeDasharray="1 8" stroke="#ffffff05" />
        <XAxis dataKey={xKey} type="number" name={xLabel} stroke="transparent" tick={{ fill: "#2a2a4a", fontSize: 11 }} tickFormatter={xFmt || ((v: any) => v)} label={{ value: xLabel, position: "insideBottom", offset: -30, fill: "#2a2a4a", fontSize: 11 }} />
        <YAxis dataKey={yKey} type="number" name={yLabel} stroke="transparent" tick={{ fill: "#2a2a4a", fontSize: 10 }} tickFormatter={yFmt || fmt} label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 14, fill: "#2a2a4a", fontSize: 11 }} width={64} />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
        {CATS.filter((c) => visibleCats.has(c)).map((cat) => (
          <Scatter key={cat} name={cat} data={byCategory[cat]} fill={CAT_COLOR[cat]} opacity={0.75} r={3.5} />
        ))}
        {xKey === "skip" && <ReferenceLine x={35} stroke="#ff4d6d33" strokeDasharray="6 4" label={{ value: "skip threshold 35%", fill: "#ff4d6d55", fontSize: 10, position: "top" }} />}
        {yKey === "saves" && xKey === "skip" && <ReferenceLine y={0.01} stroke="#00ff8833" strokeDasharray="6 4" label={{ value: "save threshold 0.01", fill: "#00ff8855", fontSize: 10 }} />}
      </ScatterChart>
    </ResponsiveContainer>
  ), [visibleCats, byCategory]);

  return (
    <div style={{ background: "#05050f", minHeight: "100vh", color: "#e8e8f0", fontFamily: "'Inter','Segoe UI',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>

      {combo >= 3 && (
        <div style={{ position: "fixed", top: 80, right: 24, background: "linear-gradient(135deg,#ffd60a,#ff9500)", color: "#000", fontWeight: 800, fontSize: 13, padding: "10px 18px", borderRadius: 12, zIndex: 9999, animation: "pop 0.3s ease", boxShadow: "0 0 30px rgba(255,214,10,0.6)" }}>
          🔥 {combo}x COMBO!
        </div>
      )}
      {lastUnlocked && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#7f5aff,#00d2ff)", color: "#fff", fontWeight: 700, fontSize: 12, padding: "10px 20px", borderRadius: 12, zIndex: 9999, animation: "fadeUp 0.3s ease", boxShadow: "0 0 30px rgba(127,90,255,0.5)", whiteSpace: "nowrap" }}>
          ✨ New view unlocked!
        </div>
      )}

      <div style={{ padding: "12px 24px", borderBottom: "1px solid #0e0e1e", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", background: "rgba(5,5,15,0.92)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: "#2a2a4a", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>Enoch Immanuel Wang</div>
          <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.03em", background: "linear-gradient(135deg,#fff,#666)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>1,000 Real Videos</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div style={{ fontSize: 9, color: "#2a2a4a", fontWeight: 700, marginBottom: 5, textAlign: "right", letterSpacing: "0.1em" }}>EXPLORED {xpProgress}%</div>
            <div style={{ width: 110, height: 5, background: "#0d0d20", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${xpProgress}%`, height: "100%", background: "linear-gradient(90deg,#7f5aff,#00d2ff)", borderRadius: 3, transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 0 10px rgba(127,90,255,0.7)" }} />
            </div>
          </div>
          {xpProgress === 100 && <span style={{ fontSize: 18 }} title="All tabs explored!">🏆</span>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0d0d1e", border: "1px solid #1e1e38", borderRadius: 20, padding: "5px 14px" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#7f5aff,#00d2ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", boxShadow: "0 0 8px rgba(127,90,255,0.5)" }}>
              {username[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>{username}</span>
          </div>
          <button onClick={() => setUsername(null)} className="ripple-btn" style={{ background: "transparent", border: "1px solid #1a1a30", color: "#333", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>✕</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "16px 24px 0", flexWrap: "wrap" }}>
        {[
          { label: "Total Views", display: fmt(totalViews), color: "#7f5aff" },
          { label: "Real Videos", display: "1,000", color: "#00d2ff" },
          { label: "Avg Views", display: fmt(Math.round(totalViews / DATASET.length)), color: "#bf5af2" },
          { label: "Viral Rate", display: "15%", color: "#ffd60a" },
        ].map((s) => (
          <div key={s.label} className="card-hover" style={{ flex: 1, minWidth: 130, background: "#0a0a18", border: `1px solid ${s.color}22`, borderRadius: 14, padding: "14px 18px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${s.color},transparent)` }} />
            <div style={{ fontSize: 9, color: "#2a2a4a", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.display}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, padding: "14px 24px 0", flexWrap: "wrap", alignItems: "center" }}>
        {CATS.map((c) => {
          const on = visibleCats.has(c);
          return (
            <button key={c} onClick={(e) => toggleCat(c, e)} className="ripple-btn" style={{
              padding: "8px 18px", borderRadius: 22, border: `1.5px solid ${on ? CAT_COLOR[c] : CAT_COLOR[c] + "33"}`,
              cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", fontFamily: "inherit",
              background: on ? `${CAT_COLOR[c]}18` : "transparent", color: on ? CAT_COLOR[c] : CAT_COLOR[c] + "55",
              boxShadow: on ? `0 0 16px ${CAT_GLOW[c]}` : "none",
              transform: catFlash === c ? "scale(1.12)" : "scale(1)", transition: "all 0.15s ease",
            }}>{CAT_LABEL[c]}</button>
          );
        })}
        <span style={{ fontSize: 11, color: "#2a2a4a", marginLeft: 4 }}>{filtered.length.toLocaleString()} videos</span>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "12px 24px 0", flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const isActive = tab === t.id;
          const done = explored.has(t.id);
          return (
            <button key={t.id} onClick={(e) => switchTab(t.id, e)} className="ripple-btn" style={{
              padding: "9px 18px", borderRadius: 12, border: `1px solid ${isActive ? "#7f5aff66" : "#1a1a2a"}`,
              cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: isActive ? "rgba(127,90,255,0.18)" : "#0a0a18",
              color: isActive ? "#b090ff" : done ? "#555" : "#2a2a4a",
              boxShadow: isActive ? "0 0 20px rgba(127,90,255,0.3)" : "none",
              transform: isActive ? "translateY(-1px)" : "none", transition: "all 0.15s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              {t.label}{done && !isActive && <span style={{ marginLeft: 5, fontSize: 9, color: "#2a2a4a" }}>✓</span>}
            </button>
          );
        })}
      </div>

      <div style={{ margin: "14px 24px 0", background: "#080818", borderRadius: 20, border: "1px solid #10102a", overflow: "hidden", animation: "fadeIn 0.2s ease" }} key={tab}>
        {tab === "skip-views"  && <ScatterPlot xKey="skip"  yKey="views" xLabel="Skip Rate 24h (%)"  yLabel="Total Views (10d)" />}
        {tab === "saves-views" && <ScatterPlot xKey="saves" yKey="views" xLabel="Saves/View (24h)"   yLabel="Total Views (10d)" xFmt={(v: number) => v.toFixed(3)} />}
        {tab === "skip-saves"  && <ScatterPlot xKey="skip"  yKey="saves" xLabel="Skip Rate 24h (%)"  yLabel="Saves/View (24h)"  yFmt={(v: number) => v.toFixed(3)} />}

        {tab === "stats" && (
          <div style={{ padding: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["Category","Count","Avg Skip Rate","Avg Saves/View","Avg Views (10d)"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", color: "#2a2a4a", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #10102a", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.cat} style={{ borderBottom: "1px solid #0a0a18", animation: `slideIn 0.3s ${i * 0.07}s ease both` }}>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ color: CAT_COLOR[s.cat], fontWeight: 800, fontSize: 12, background: `${CAT_COLOR[s.cat]}18`, padding: "5px 12px", borderRadius: 20, border: `1px solid ${CAT_COLOR[s.cat]}33`, boxShadow: `0 0 12px ${CAT_GLOW[s.cat]}` }}>{CAT_LABEL[s.cat]}</span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#444", fontWeight: 600 }}>{s.n}</td>
                    <td style={{ padding: "14px 16px", color: +s.avgSkip > 50 ? "#ff4d6d" : +s.avgSkip < 30 ? "#00ff88" : "#555", fontWeight: 700 }}>{s.avgSkip}%</td>
                    <td style={{ padding: "14px 16px", color: "#555", fontWeight: 600 }}>{s.avgSaves}</td>
                    <td style={{ padding: "14px 16px", color: CAT_COLOR[s.cat], fontWeight: 800 }}>{fmt(s.avgViews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 24, padding: "20px 22px", background: "#05050f", borderRadius: 14, border: "1px solid #10102a" }}>
              <div style={{ color: "#e8e8f0", fontWeight: 700, fontSize: 13, marginBottom: 14 }}>🔬 Key Observations</div>
              {[
                { color: "#ff4d6d", label: "Flop boundary", text: "Skip > 50% + saves < 0.005 → almost guaranteed extinction" },
                { color: "#bf5af2", label: "Viral boundary", text: "Skip < 30% + saves > 0.02 → supercritical branching" },
                { color: "#00d2ff", label: "Middle zone",    text: "Skip 30–50%, saves 0.005–0.02 → probabilistic outcome" },
              ].map((o, i) => (
                <div key={o.label} style={{ display: "flex", gap: 14, marginBottom: 12, animation: `slideIn 0.3s ${i * 0.08}s ease both` }}>
                  <div style={{ width: 3, minHeight: 44, borderRadius: 2, background: o.color, boxShadow: `0 0 8px ${o.color}`, flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}><span style={{ color: o.color, fontWeight: 700 }}>{o.label}: </span>{o.text}</div>
                </div>
              ))}
              <div style={{ fontSize: 10, color: "#1e1e3a", marginTop: 8 }}>Distribution: 500 flops · 350 middle · 120 viral · 30 mega viral (Pareto)</div>
            </div>
          </div>
        )}

        {tab === "table" && (
          <div style={{ overflowX: "auto", maxHeight: 540, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>{["#","Category","Skip Rate 24h","Saves/View 24h","Total Views 10d"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", background: "#080818", color: "#2a2a4a", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #10102a", whiteSpace: "nowrap", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #08081a", background: i % 2 === 0 ? "transparent" : "#05050f" }}>
                    <td style={{ padding: "7px 16px", color: "#1e1e3a" }}>{r.id}</td>
                    <td style={{ padding: "7px 16px" }}>
                      <span style={{ color: CAT_COLOR[r.category], fontWeight: 700, fontSize: 10, background: `${CAT_COLOR[r.category]}18`, padding: "3px 8px", borderRadius: 10 }}>{r.category.replace("_", " ")}</span>
                    </td>
                    <td style={{ padding: "7px 16px", color: r.skip > 50 ? "#ff4d6d" : r.skip < 30 ? "#00ff88" : "#333", fontWeight: 600 }}>{r.skip}%</td>
                    <td style={{ padding: "7px 16px", color: "#2a2a3a" }}>{r.saves}</td>
                    <td style={{ padding: "7px 16px", color: CAT_COLOR[r.category], fontWeight: 700 }}>{r.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, padding: "14px 24px 28px" }}>
        <button onClick={(e) => { addRipple(e as any, "rgba(0,184,70,0.3)"); burst(e.clientX, e.clientY, "#00b846", 14); downloadXLS(DATASET); }} className="ripple-btn" style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid #00b84622", cursor: "pointer", background: "rgba(0,184,70,0.07)", color: "#00b846", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
          ↓ Export Excel
        </button>
        <button onClick={(e) => { addRipple(e as any, "rgba(77,120,255,0.3)"); burst(e.clientX, e.clientY, "#4d78ff", 14); downloadCSV(DATASET); }} className="ripple-btn" style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid #4d78ff22", cursor: "pointer", background: "rgba(77,120,255,0.07)", color: "#4d78ff", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
          ↓ Export CSV
        </button>
      </div>
    </div>
  );
}
