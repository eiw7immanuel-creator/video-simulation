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

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function generateDataset() {
  const videos = [];
  const categories = [
    { name: "FLOP",       n: 500, skipMean: 65, skipStd: 10, savesMean: 0.004, savesStd: 0.003, viewsMean: 4000,    viewsStd: 2000    },
    { name: "MIDDLE",     n: 350, skipMean: 38, skipStd: 8,  savesMean: 0.012, savesStd: 0.005, viewsMean: 150000,  viewsStd: 80000   },
    { name: "VIRAL",      n: 120, skipMean: 26, skipStd: 5,  savesMean: 0.025, savesStd: 0.008, viewsMean: 1500000, viewsStd: 600000  },
    { name: "MEGA_VIRAL", n: 30,  skipMean: 22, skipStd: 4,  savesMean: 0.03,  savesStd: 0.01,  viewsMean: 8000000, viewsStd: 3000000 },
  ];
  let id = 1;
  for (const cat of categories) {
    for (let i = 0; i < cat.n; i++) {
      const skip = clamp(randNormal(cat.skipMean, cat.skipStd, rand), 5, 95);
      const saves = clamp(randNormal(cat.savesMean, cat.savesStd, rand), 0.0001, 0.15);
      const views = Math.max(100, Math.round(randNormal(cat.viewsMean, cat.viewsStd, rand)));
      videos.push({ id: id++, category: cat.name, skip: +skip.toFixed(1), saves: +saves.toFixed(4), views });
    }
  }
  return videos;
}

const DATASET = generateDataset();

const CAT_COLOR = {
  FLOP: "#ff5252",
  MIDDLE: "#00bcd4",
  VIRAL: "#e040fb",
  MEGA_VIRAL: "#7c4dff",
};
const CATS = ["FLOP", "MIDDLE", "VIRAL", "MEGA_VIRAL"];

const fmt = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

function downloadCSV(data) {
  const header = "id,category,skip_rate_24h,saves_per_view_24h,total_views_10d";
  const rows = data.map((r) => `${r.id},${r.category},${r.skip},${r.saves},${r.views}`);
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "1000_videos_simulation.csv";
  a.click();
}

function downloadXLS(data) {
  const header = ["id", "category", "skip_rate_24h(%)", "saves_per_view_24h", "total_views_10d"];
  const catColors = { FLOP: "#ff9999", MIDDLE: "#99eeff", VIRAL: "#ee99ff", MEGA_VIRAL: "#bb99ff" };
  let html = `<html><head><meta charset="UTF-8"></head><body><table border="1" style="border-collapse:collapse">`;
  html += "<tr>" + header.map((h) => `<th style="background:#6a0dad;color:white;padding:6px 10px">${h}</th>`).join("") + "</tr>";
  data.forEach((r) => {
    const bg = catColors[r.category];
    html += `<tr>
      <td style="padding:4px 8px">${r.id}</td>
      <td style="background:${bg};padding:4px 8px;font-weight:bold">${r.category}</td>
      <td style="padding:4px 8px">${r.skip}</td>
      <td style="padding:4px 8px">${r.saves}</td>
      <td style="padding:4px 8px">${r.views.toLocaleString()}</td>
    </tr>`;
  });
  html += "</table></body></html>";
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "1000_videos_simulation.xls";
  a.click();
}

const TABS = [
  "Scatter: Skip vs Views",
  "Scatter: Saves vs Views",
  "Scatter: Skip vs Saves",
  "Summary Stats",
  "Raw Table",
];

export default function App() {
  const [tab, setTab] = useState("Scatter: Skip vs Views");
  const [visibleCats, setVisibleCats] = useState(new Set(CATS));

  const filtered = useMemo(() => DATASET.filter((d) => visibleCats.has(d.category)), [visibleCats]);
  const byCategory = useMemo(() => {
    const m = {};
    CATS.forEach((c) => (m[c] = filtered.filter((d) => d.category === c)));
    return m;
  }, [filtered]);

  const toggleCat = (c) =>
    setVisibleCats((prev) => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s; });

  const stats = useMemo(() =>
    CATS.map((cat) => {
      const d = DATASET.filter((v) => v.category === cat);
      const avg = (key) => d.reduce((s, v) => s + v[key], 0) / d.length;
      return { cat, n: d.length, avgSkip: avg("skip").toFixed(1), avgSaves: avg("saves").toFixed(4), avgViews: Math.round(avg("views")) };
    }), []);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
        <div style={{ color: CAT_COLOR[d.category], fontWeight: 700, marginBottom: 4 }}>{d.category}</div>
        <div style={{ color: "#aaa" }}>Video #{d.id}</div>
        <div style={{ color: "#ddd" }}>Skip rate: <b>{d.skip}%</b></div>
        <div style={{ color: "#ddd" }}>Saves/view: <b>{d.saves}</b></div>
        <div style={{ color: "#ddd" }}>Views (10d): <b>{fmt(d.views)}</b></div>
      </div>
    );
  };

  const ScatterPlot = ({ xKey, yKey, xLabel, yLabel, xFmt, yFmt }) => (
    <ResponsiveContainer width="100%" height={380}>
      <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
        <XAxis dataKey={xKey} type="number" name={xLabel} stroke="#333" tick={{ fill: "#666", fontSize: 11 }} tickFormatter={xFmt || ((v) => v)} label={{ value: xLabel, position: "insideBottom", offset: -15, fill: "#555", fontSize: 11 }} />
        <YAxis dataKey={yKey} type="number" name={yLabel} stroke="#333" tick={{ fill: "#666", fontSize: 10 }} tickFormatter={yFmt || fmt} label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 10, fill: "#555", fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
        {CATS.filter((c) => visibleCats.has(c)).map((cat) => (
          <Scatter key={cat} name={cat} data={byCategory[cat]} fill={CAT_COLOR[cat]} opacity={0.6} r={3} />
        ))}
        {xKey === "skip" && <ReferenceLine x={35} stroke="#ff5252" strokeDasharray="5 5" label={{ value: "Skip threshold 35%", fill: "#ff5252", fontSize: 10, position: "top" }} />}
        {yKey === "saves" && xKey === "skip" && <ReferenceLine y={0.01} stroke="#69f0ae" strokeDasharray="5 5" label={{ value: "Saves threshold 0.01", fill: "#69f0ae", fontSize: 10 }} />}
      </ScatterChart>
    </ResponsiveContainer>
  );

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", fontFamily: "'Segoe UI', sans-serif", padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>
          Enoch Immanuel Wang · Playing with Probability
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>1,000 Video Simulation Dataset</h1>
        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
          Simulated from real Instagram Reel distributions · Skip rate (24h) · Saves/view (24h) · Total views (10d)
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {CATS.map((c) => (
          <button key={c} onClick={() => toggleCat(c)} style={{ padding: "6px 14px", borderRadius: 16, border: `2px solid ${CAT_COLOR[c]}`, cursor: "pointer", fontSize: 12, fontWeight: 700, background: visibleCats.has(c) ? CAT_COLOR[c] : "transparent", color: visibleCats.has(c) ? "#fff" : CAT_COLOR[c] }}>
            {c}
          </button>
        ))}
        <span style={{ fontSize: 11, color: "#555", alignSelf: "center", marginLeft: 8 }}>{filtered.length} videos shown</span>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: tab === t ? "#7c4dff" : "#1a1a1a", color: tab === t ? "#fff" : "#666" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ background: "#111", borderRadius: 12, padding: 16 }}>
        {tab === "Scatter: Skip vs Views" && <ScatterPlot xKey="skip" yKey="views" xLabel="Skip Rate 24h (%)" yLabel="Total Views (10d)" />}
        {tab === "Scatter: Saves vs Views" && <ScatterPlot xKey="saves" yKey="views" xLabel="Saves/View (24h)" yLabel="Total Views (10d)" xFmt={(v) => v.toFixed(3)} />}
        {tab === "Scatter: Skip vs Saves" && <ScatterPlot xKey="skip" yKey="saves" xLabel="Skip Rate 24h (%)" yLabel="Saves/View (24h)" yFmt={(v) => v.toFixed(3)} />}

        {tab === "Summary Stats" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Category", "Count", "Avg Skip Rate", "Avg Saves/View", "Avg Views (10d)"].map((h) => (
                    <th key={h} style={{ padding: "8px 14px", background: "#1a1a1a", color: "#777", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #333" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.cat} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "10px 14px", color: CAT_COLOR[s.cat], fontWeight: 700 }}>{s.cat}</td>
                    <td style={{ padding: "10px 14px", color: "#bbb" }}>{s.n}</td>
                    <td style={{ padding: "10px 14px", color: s.avgSkip > 50 ? "#ff5252" : s.avgSkip < 30 ? "#69f0ae" : "#bbb" }}>{s.avgSkip}%</td>
                    <td style={{ padding: "10px 14px", color: "#bbb" }}>{s.avgSaves}</td>
                    <td style={{ padding: "10px 14px", color: CAT_COLOR[s.cat] }}>{fmt(s.avgViews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 20, padding: 16, background: "#1a1a1a", borderRadius: 10, fontSize: 12, color: "#888", lineHeight: 1.8 }}>
              <div style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>Key Observations</div>
              <div>🔴 <b style={{ color: "#ff5252" }}>Flop boundary:</b> Skip rate &gt; 50% and saves/view &lt; 0.005 → almost guaranteed extinction</div>
              <div>🟣 <b style={{ color: "#e040fb" }}>Viral boundary:</b> Skip rate &lt; 30% and saves/view &gt; 0.02 → supercritical branching</div>
              <div>🔵 <b style={{ color: "#00bcd4" }}>Middle zone:</b> Skip 30–50%, saves 0.005–0.02 → outcome is probabilistic (coin flip territory)</div>
              <div style={{ marginTop: 8 }}>📊 Distribution: 500 flops · 350 middle · 120 viral · 30 mega viral (realistic Instagram Pareto distribution)</div>
            </div>
          </div>
        )}

        {tab === "Raw Table" && (
          <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead style={{ position: "sticky", top: 0 }}>
                <tr>
                  {["#", "Category", "Skip Rate 24h (%)", "Saves/View 24h", "Total Views 10d"].map((h) => (
                    <th key={h} style={{ padding: "7px 12px", background: "#1a1a1a", color: "#888", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #333", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #111", background: i % 2 === 0 ? "#0d0d0d" : "#111" }}>
                    <td style={{ padding: "5px 12px", color: "#555" }}>{r.id}</td>
                    <td style={{ padding: "5px 12px", color: CAT_COLOR[r.category], fontWeight: 700 }}>{r.category}</td>
                    <td style={{ padding: "5px 12px", color: r.skip > 50 ? "#ff5252" : r.skip < 30 ? "#69f0ae" : "#bbb" }}>{r.skip}%</td>
                    <td style={{ padding: "5px 12px", color: "#bbb" }}>{r.saves}</td>
                    <td style={{ padding: "5px 12px", color: CAT_COLOR[r.category] }}>{r.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={() => downloadXLS(DATASET)} style={{ padding: "10px 22px", borderRadius: 20, border: "none", cursor: "pointer", background: "#1e7e34", color: "#fff", fontWeight: 700, fontSize: 13 }}>
          ⬇ Download Excel (.xls)
        </button>
        <button onClick={() => downloadCSV(DATASET)} style={{ padding: "10px 22px", borderRadius: 20, border: "none", cursor: "pointer", background: "#1565c0", color: "#fff", fontWeight: 700, fontSize: 13 }}>
          ⬇ Download CSV
        </button>
      </div>
    </div>
  );
}
