import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

function randNormal(mean, std, rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
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
  const videos: any[] = [];
  let id = 1;
  for (const cat of categories) {
    for (let i = 0; i < cat.n; i++) {
      videos.push({
        id: id++,
        category: cat.name,
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
  FLOP:       "#ff4d6d",
  MIDDLE:     "#00d2ff",
  VIRAL:      "#bf5af2",
  MEGA_VIRAL: "#ffd60a",
};
const CAT_BG: Record<string, string> = {
  FLOP:       "rgba(255,77,109,0.08)",
  MIDDLE:     "rgba(0,210,255,0.08)",
  VIRAL:      "rgba(191,90,242,0.08)",
  MEGA_VIRAL: "rgba(255,214,10,0.08)",
};
const CATS = ["FLOP", "MIDDLE", "VIRAL", "MEGA_VIRAL"];

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

function downloadCSV(data: any[]) {
  const header = "id,category,skip_rate_24h,saves_per_view_24h,total_views_10d";
  const rows = data.map((r) => `${r.id},${r.category},${r.skip},${r.saves},${r.views}`);
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "1000_videos_simulation.csv";
  a.click();
}

function downloadXLS(data: any[]) {
  const header = ["id", "category", "skip_rate_24h(%)", "saves_per_view_24h", "total_views_10d"];
  const catColors: Record<string, string> = { FLOP: "#ff9999", MIDDLE: "#99eeff", VIRAL: "#ee99ff", MEGA_VIRAL: "#ffe066" };
  let html = `<html><head><meta charset="UTF-8"></head><body><table border="1" style="border-collapse:collapse">`;
  html += "<tr>" + header.map((h) => `<th style="background:#1a1a2e;color:white;padding:6px 10px">${h}</th>`).join("") + "</tr>";
  data.forEach((r) => {
    const bg = catColors[r.category];
    html += `<tr><td style="padding:4px 8px">${r.id}</td><td style="background:${bg};padding:4px 8px;font-weight:bold">${r.category}</td><td style="padding:4px 8px">${r.skip}</td><td style="padding:4px 8px">${r.saves}</td><td style="padding:4px 8px">${r.views.toLocaleString()}</td></tr>`;
  });
  html += "</table></body></html>";
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "1000_videos_simulation.xls";
  a.click();
}

const TABS = [
  { id: "skip-views",  label: "Skip vs Views"  },
  { id: "saves-views", label: "Saves vs Views"  },
  { id: "skip-saves",  label: "Skip vs Saves"   },
  { id: "stats",       label: "Summary Stats"   },
  { id: "table",       label: "Raw Table"       },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "rgba(10,10,18,0.97)", border: `1px solid ${CAT_COLOR[d.category]}44`, borderRadius: 12, padding: "12px 16px", fontSize: 12, boxShadow: `0 8px 32px rgba(0,0,0,0.6)` }}>
      <div style={{ color: CAT_COLOR[d.category], fontWeight: 800, marginBottom: 8, fontSize: 10, letterSpacing: "0.1em" }}>{d.category}</div>
      <div style={{ color: "#444", fontSize: 11, marginBottom: 8 }}>Video #{d.id}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ color: "#888", display: "flex", justifyContent: "space-between", gap: 20 }}>Skip rate <span style={{ color: "#fff", fontWeight: 700 }}>{d.skip}%</span></div>
        <div style={{ color: "#888", display: "flex", justifyContent: "space-between", gap: 20 }}>Saves/view <span style={{ color: "#fff", fontWeight: 700 }}>{d.saves}</span></div>
        <div style={{ color: "#888", display: "flex", justifyContent: "space-between", gap: 20 }}>Views (10d) <span style={{ color: CAT_COLOR[d.category], fontWeight: 700 }}>{fmt(d.views)}</span></div>
      </div>
    </div>
  );
};

const ScatterPlot = ({ xKey, yKey, xLabel, yLabel, xFmt, yFmt, visibleCats, byCategory }: any) => (
  <ResponsiveContainer width="100%" height={400}>
    <ScatterChart margin={{ top: 16, right: 24, bottom: 40, left: 16 }}>
      <CartesianGrid strokeDasharray="2 6" stroke="#ffffff05" />
      <XAxis dataKey={xKey} type="number" name={xLabel} stroke="transparent" tick={{ fill: "#333", fontSize: 11 }} tickFormatter={xFmt || ((v: any) => v)} label={{ value: xLabel, position: "insideBottom", offset: -20, fill: "#333", fontSize: 11 }} />
      <YAxis dataKey={yKey} type="number" name={yLabel} stroke="transparent" tick={{ fill: "#333", fontSize: 10 }} tickFormatter={yFmt || fmt} label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 14, fill: "#333", fontSize: 11 }} width={60} />
      <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#ffffff08" }} />
      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
      {CATS.filter((c) => visibleCats.has(c)).map((cat) => (
        <Scatter key={cat} name={cat} data={byCategory[cat]} fill={CAT_COLOR[cat]} opacity={0.65} r={3} />
      ))}
      {xKey === "skip" && <ReferenceLine x={35} stroke="#ff4d6d44" strokeDasharray="5 5" label={{ value: "Skip threshold 35%", fill: "#ff4d6d66", fontSize: 10, position: "top" }} />}
      {yKey === "saves" && xKey === "skip" && <ReferenceLine y={0.01} stroke="#00ff8844" strokeDasharray="5 5" label={{ value: "Save threshold 0.01", fill: "#00ff8866", fontSize: 10 }} />}
    </ScatterChart>
  </ResponsiveContainer>
);

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div style={{ background: "linear-gradient(135deg, #0e0e18 0%, #11111c 100%)", border: "1px solid #18182a", borderRadius: 16, padding: "20px 22px", flex: 1, minWidth: 130 }}>
    <div style={{ fontSize: 10, color: "#333", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: "#e8e8f0", letterSpacing: "-0.02em" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#2a2a3a", marginTop: 5 }}>{sub}</div>}
  </div>
);

export default function App() {
  const [tab, setTab] = useState("skip-views");
  const [visibleCats, setVisibleCats] = useState(new Set(CATS));

  const filtered = useMemo(() => DATASET.filter((d) => visibleCats.has(d.category)), [visibleCats]);
  const byCategory = useMemo(() => {
    const m: Record<string, typeof DATASET> = {};
    CATS.forEach((c) => (m[c] = filtered.filter((d) => d.category === c)));
    return m;
  }, [filtered]);

  const toggleCat = (c: string) =>
    setVisibleCats((prev) => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s; });

  const stats = useMemo(() =>
    CATS.map((cat) => {
      const d = DATASET.filter((v) => v.category === cat);
      const avg = (key: string) => d.reduce((s, v) => s + v[key], 0) / d.length;
      return { cat, n: d.length, avgSkip: avg("skip").toFixed(1), avgSaves: avg("saves").toFixed(4), avgViews: Math.round(avg("views")) };
    }), []);

  const totalViews = DATASET.reduce((s, d) => s + d.views, 0);

  return (
    <div style={{ background: "#060608", minHeight: "100vh", color: "#e8e8f0", fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: "36px 32px", maxWidth: 1100, margin: "0 auto" }}>

      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#2a2a3a", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
          Enoch Immanuel Wang · Playing with Probability
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.03em", margin: 0, background: "linear-gradient(135deg, #e8e8f0 0%, #4a4a6a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          1,000 Video Simulation
        </h1>
        <div style={{ fontSize: 13, color: "#2a2a3a", marginTop: 8 }}>
          Simulated from real Instagram Reel distributions · Skip rate (24h) · Saves/view (24h) · Total views (10d)
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
        <StatCard label="Total Views" value={fmt(totalViews)} sub="across 1,000 videos" />
        <StatCard label="Total Videos" value="1,000" sub="simulated dataset" />
        <StatCard label="Avg Views" value={fmt(Math.round(totalViews / DATASET.length))} sub="per video" />
        <StatCard label="Viral Rate" value="15%" sub="viral + mega viral" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        {CATS.map((c) => {
          const on = visibleCats.has(c);
          return (
            <button key={c} onClick={() => toggleCat(c)} style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${on ? CAT_COLOR[c] : CAT_COLOR[c] + "44"}`, cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "inherit", background: on ? CAT_COLOR[c] : CAT_BG[c], color: on ? "#000" : CAT_COLOR[c] + "cc", transition: "all 0.15s ease" }}>
              {c.replace("_", " ")}
            </button>
          );
        })}
        <span style={{ fontSize: 11, color: "#2a2a3a", marginLeft: 4 }}>{filtered.length.toLocaleString()} videos</span>
      </div>

      <div style={{ display: "flex", gap: 2, marginBottom: 20, padding: "4px", background: "#0c0c14", borderRadius: 12, width: "fit-content", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 15px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: tab === t.id ? "#1c1c2e" : "transparent", color: tab === t.id ? "#e8e8f0" : "#2a2a3a", transition: "all 0.15s ease", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.4)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: "linear-gradient(160deg, #0c0c16 0%, #0e0e1a 100%)", borderRadius: 20, padding: "24px 20px", border: "1px solid #16162a", marginBottom: 24 }}>

        {tab === "skip-views"  && <ScatterPlot xKey="skip"  yKey="views" xLabel="Skip Rate 24h (%)"  yLabel="Total Views (10d)"  visibleCats={visibleCats} byCategory={byCategory} />}
        {tab === "saves-views" && <ScatterPlot xKey="saves" yKey="views" xLabel="Saves/View (24h)"   yLabel="Total Views (10d)"  xFmt={(v: number) => v.toFixed(3)} visibleCats={visibleCats} byCategory={byCategory} />}
        {tab === "skip-saves"  && <ScatterPlot xKey="skip"  yKey="saves" xLabel="Skip Rate 24h (%)"  yLabel="Saves/View (24h)"   yFmt={(v: number) => v.toFixed(3)} visibleCats={visibleCats} byCategory={byCategory} />}

        {tab === "stats" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Category", "Count", "Avg Skip Rate", "Avg Saves/View", "Avg Views (10d)"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", color: "#2a2a3a", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #16162a", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.cat} style={{ borderBottom: "1px solid #0e0e18", background: i % 2 === 0 ? "transparent" : "#0a0a12" }}>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: CAT_BG[s.cat], color: CAT_COLOR[s.cat], fontWeight: 800, fontSize: 11, padding: "4px 10px", borderRadius: 20, letterSpacing: "0.05em", border: `1px solid ${CAT_COLOR[s.cat]}33` }}>
                        {s.cat.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", color: "#444", fontWeight: 600 }}>{s.n}</td>
                    <td style={{ padding: "13px 16px", color: +s.avgSkip > 50 ? "#ff4d6d" : +s.avgSkip < 30 ? "#00ff88" : "#888", fontWeight: 700 }}>{s.avgSkip}%</td>
                    <td style={{ padding: "13px 16px", color: "#555" }}>{s.avgSaves}</td>
                    <td style={{ padding: "13px 16px", color: CAT_COLOR[s.cat], fontWeight: 700 }}>{fmt(s.avgViews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 24, padding: "20px 22px", background: "#0a0a12", borderRadius: 14, fontSize: 12, border: "1px solid #14142a" }}>
              <div style={{ color: "#e8e8f0", fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Key Observations</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ color: "#444", lineHeight: 1.7 }}><span style={{ color: "#ff4d6d", fontWeight: 700 }}>Flop boundary: </span>Skip rate &gt; 50% and saves/view &lt; 0.005 → almost guaranteed extinction</div>
                <div style={{ color: "#444", lineHeight: 1.7 }}><span style={{ color: "#bf5af2", fontWeight: 700 }}>Viral boundary: </span>Skip rate &lt; 30% and saves/view &gt; 0.02 → supercritical branching</div>
                <div style={{ color: "#444", lineHeight: 1.7 }}><span style={{ color: "#00d2ff", fontWeight: 700 }}>Middle zone: </span>Skip 30–50%, saves 0.005–0.02 → outcome is probabilistic (coin flip territory)</div>
                <div style={{ color: "#2a2a3a", marginTop: 4, fontSize: 11 }}>Distribution: 500 flops · 350 middle · 120 viral · 30 mega viral (realistic Instagram Pareto distribution)</div>
              </div>
            </div>
          </div>
        )}

        {tab === "table" && (
          <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  {["#", "Category", "Skip Rate 24h", "Saves/View 24h", "Total Views 10d"].map((h) => (
                    <th key={h} style={{ padding: "9px 14px", background: "#0c0c16", color: "#2a2a3a", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #16162a", whiteSpace: "nowrap", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #0c0c14", background: i % 2 === 0 ? "transparent" : "#0a0a12" }}>
                    <td style={{ padding: "6px 14px", color: "#2a2a3a" }}>{r.id}</td>
                    <td style={{ padding: "6px 14px" }}>
                      <span style={{ color: CAT_COLOR[r.category], fontWeight: 700, fontSize: 10, background: CAT_BG[r.category], padding: "3px 8px", borderRadius: 10, letterSpacing: "0.04em" }}>
                        {r.category.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "6px 14px", color: r.skip > 50 ? "#ff4d6d" : r.skip < 30 ? "#00ff88" : "#444", fontWeight: 600 }}>{r.skip}%</td>
                    <td style={{ padding: "6px 14px", color: "#333" }}>{r.saves}</td>
                    <td style={{ padding: "6px 14px", color: CAT_COLOR[r.category], fontWeight: 600 }}>{r.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => downloadXLS(DATASET)} style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid #162616", cursor: "pointer", background: "rgba(0,180,70,0.07)", color: "#00b846", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
          ↓ Export Excel
        </button>
        <button onClick={() => downloadCSV(DATASET)} style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid #161626", cursor: "pointer", background: "rgba(77,120,255,0.07)", color: "#4d78ff", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
          ↓ Export CSV
        </button>
      </div>

    </div>
  );
}
