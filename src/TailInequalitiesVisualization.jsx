import { useState, useMemo, useCallback } from "react";

// ── Claude Code Extended palette ─────────────────────────────────────────────
const C = {
  bg: "#f5f0e8", bgPanel: "#ede8df", bgCard: "#e8e2d8",
  border: "#d0c8bb", borderLight: "#e0d9cf",
  coral: "#e8865a", coralDim: "#f2c4ab", coralBg: "#fdf0e8",
  lime: "#7ab830", limeDim: "#b8d98a", limeBg: "#f0f7e4",
  text: "#2c2416", textMid: "#7a6e60", textDim: "#b0a898", textFaint: "#d0c8bb",
  blue: "#3a6bc0", blueDim: "#a0b8e0",
  purple: "#8a6aaa", purpleDim: "#c4b0d8",
  good: "#5a9a2e", ok: "#c47c1a", bad: "#c0442a",
};
const font = "'Georgia', serif";
const mono = "monospace";

// ── Simulation ───────────────────────────────────────────────────────────────
const TRIALS = 12000;
function simulate(N) {
  const results = new Array(TRIALS);
  for (let t = 0; t < TRIALS; t++) {
    let sum = 0;
    for (let i = 0; i < N; i++) {
      if (Math.random() < 0.5) sum++;
    }
    results[t] = sum;
  }
  return results.sort((a, b) => a - b);
}

// ── Bound definitions ────────────────────────────────────────────────────────
// Each bound: what it needs, what it gives, color
const BOUND_DEFS = [
  {
    id: "markov",
    name: "Markov",
    year: 1889,
    color: C.coral,
    colorBg: C.coralBg,
    requires: ["mean"],
    formula: (N, t) => `E[S]/t = ${(N/2).toFixed(0)}/${t.toFixed(0)}`,
    bound: (N, t) => {
      const mu = N / 2;
      return t > 0 ? Math.min(1, mu / t) : 1;
    },
    formulaShort: "P(S ≥ t) ≤ E[S] / t",
    assumptions: "Non-negative random variable, known mean",
    explanation: "Knows only the expected value. Cannot distinguish a concentrated distribution from a spread-out one. Gives polynomial 1/t decay.",
    insight: (ratio) => ratio > 50
      ? "Essentially useless — might as well say 'it could happen.'"
      : ratio > 5 ? "Very loose. It's a valid guarantee, but not a useful one."
      : "Surprisingly decent here — but only because the threshold is close to the mean.",
  },
  {
    id: "chebyshev",
    name: "Chebyshev",
    year: 1867,
    color: C.blue,
    colorBg: "#eef2fa",
    requires: ["mean", "variance"],
    formula: (N, t) => {
      const mu = N / 2, delta = t - mu;
      return `σ²/δ² = ${(N/4).toFixed(0)}/${(delta*delta).toFixed(0)}`;
    },
    bound: (N, t) => {
      const mu = N / 2, variance = N / 4, delta = t - mu;
      return delta > 0 ? Math.min(1, variance / (delta * delta)) : 1;
    },
    formulaShort: "P(|S−μ| ≥ δ) ≤ σ² / δ²",
    assumptions: "Known mean and variance",
    explanation: "Adding variance knowledge gives quadratic decay. Still works for ANY distribution with finite variance — even heavy-tailed ones where Chernoff fails.",
    insight: (ratio) => ratio > 20
      ? "Still quite loose — variance alone doesn't capture the full shape."
      : ratio > 3 ? "Respectable. This is often 'good enough' for a quick argument."
      : "Surprisingly tight! The distribution isn't far from Chebyshev's worst case.",
  },
  {
    id: "chernoff",
    name: "Chernoff–Hoeffding",
    year: 1952,
    color: C.lime,
    colorBg: C.limeBg,
    requires: ["mean", "independence"],
    formula: (N, t) => {
      const mu = N / 2, delta = t - mu;
      return `exp(−2·${(delta*delta).toFixed(0)}/${N})`;
    },
    bound: (N, t) => {
      const mu = N / 2, delta = t - mu;
      return delta > 0 ? Math.min(1, Math.exp(-2 * delta * delta / N)) : 1;
    },
    formulaShort: "P(S−μ ≥ δ) ≤ exp(−2δ²/N)",
    assumptions: "Independent summands, each bounded in [0,1]",
    explanation: "The qualitative leap: exponential decay. By knowing the random choices are independent and bounded, the tail probability drops exponentially in δ². This is the workhorse of algorithm analysis.",
    insight: (ratio) => ratio > 10
      ? "Loose here — likely because the deviation is small relative to N."
      : ratio > 2 ? "Within an order of magnitude. This is a genuinely useful guarantee."
      : "Very tight! For sums of independent bounded RVs, Chernoff is hard to beat.",
  },
  {
    id: "talagrand",
    name: "Talagrand",
    year: 1995,
    color: C.purple,
    colorBg: "#f3eff8",
    requires: ["mean", "independence", "lipschitz"],
    formula: (N, t) => {
      const mu = N / 2, delta = t - mu;
      return `4·exp(−${(delta*delta).toFixed(0)}/${N})`;
    },
    bound: (N, t) => {
      const mu = N / 2, delta = t - mu;
      // Talagrand convex distance for sum (1-Lipschitz): 4·exp(-δ²/(4·Var)) = 4·exp(-δ²/N)
      return delta > 0 ? Math.min(1, 4 * Math.exp(-delta * delta / N)) : 1;
    },
    formulaShort: "P(f−E[f] ≥ δ) ≤ 4·exp(−δ²/N)",
    assumptions: "Product space, 1-Lipschitz function (not just sums)",
    explanation: "For simple sums, Talagrand is looser than Chernoff — that's expected. Its power is that it works for ANY well-behaved function of many variables, not just sums. When you can't decompose your quantity as a sum, Talagrand is your tool.",
    insight: (ratio) => ratio > 20
      ? "Loose for sums — but Talagrand isn't designed for sums. It handles far more complex quantities."
      : ratio > 3 ? "Decent, considering this bound works for any Lipschitz function, not just sums."
      : "Tight! This is a case where the sum structure doesn't help much beyond Lipschitz.",
  },
];

// ── Main component ───────────────────────────────────────────────────────────
export default function TailInequalitiesV4() {
  const [N, setN] = useState(100);
  const [devSigmas, setDevSigmas] = useState(2);
  const [rollCount, setRollCount] = useState(0);
  const [knowledge, setKnowledge] = useState({
    mean: true, variance: true, independence: true, lipschitz: true,
  });
  const [expandedBound, setExpandedBound] = useState(null);

  const toggleKnowledge = (key) => setKnowledge((k) => ({ ...k, [key]: !k[key] }));

  // Simulation data
  const simData = useMemo(() => simulate(N), [N, rollCount]);

  // Derived values
  const mu = N / 2;
  const sigma = Math.sqrt(N) / 2;
  const delta = devSigmas * sigma;
  const threshold = mu + delta;

  // Empirical tail probability
  const empiricalTail = useMemo(() => {
    const count = simData.filter((r) => r >= threshold).length;
    return count / simData.length;
  }, [simData, threshold]);

  // Histogram bins
  const histogram = useMemo(() => {
    const binMin = Math.max(0, Math.floor(mu - 4.5 * sigma));
    const binMax = Math.min(N, Math.ceil(mu + 4.5 * sigma));
    const bins = [];
    for (let v = binMin; v <= binMax; v++) {
      bins.push({ value: v, count: 0 });
    }
    for (const r of simData) {
      const idx = r - binMin;
      if (idx >= 0 && idx < bins.length) bins[idx].count++;
    }
    const maxCount = Math.max(...bins.map((b) => b.count));
    return { bins, binMin, binMax, maxCount };
  }, [simData, mu, sigma, N]);

  // Compute all bounds
  const boundsWithValues = useMemo(() => {
    return BOUND_DEFS.map((b) => {
      const value = b.bound(N, threshold);
      const enabled = b.requires.every((r) => knowledge[r]);
      const ratio = empiricalTail > 0 ? value / empiricalTail : Infinity;
      return { ...b, value, enabled, ratio };
    });
  }, [N, threshold, knowledge, empiricalTail]);

  // ── Histogram SVG ──────────────────────────────────────────────────────────
  const HIST = { W: 660, H: 160, pad: { top: 10, right: 20, bottom: 28, left: 40 } };
  const histPlotW = HIST.W - HIST.pad.left - HIST.pad.right;
  const histPlotH = HIST.H - HIST.pad.top - HIST.pad.bottom;

  const renderHistogram = () => {
    const { bins, binMin, binMax, maxCount } = histogram;
    const nBins = bins.length;
    const barW = Math.max(1, histPlotW / nBins - 1);
    const threshX = HIST.pad.left + ((threshold - binMin) / (binMax - binMin)) * histPlotW;

    return (
      <svg viewBox={`0 0 ${HIST.W} ${HIST.H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Bars */}
        {bins.map((bin, i) => {
          const x = HIST.pad.left + (i / nBins) * histPlotW;
          const h = maxCount > 0 ? (bin.count / maxCount) * histPlotH : 0;
          const inTail = bin.value >= threshold;
          return (
            <rect key={i} x={x} y={HIST.pad.top + histPlotH - h}
              width={barW} height={h} rx={1}
              fill={inTail ? C.coral : C.textDim}
              opacity={inTail ? 0.8 : 0.35}
            />
          );
        })}
        {/* Threshold line */}
        <line x1={threshX} x2={threshX}
          y1={HIST.pad.top - 4} y2={HIST.pad.top + histPlotH + 2}
          stroke={C.coral} strokeWidth={2} strokeDasharray="4,3"
        />
        <text x={threshX} y={HIST.pad.top - 8}
          textAnchor="middle" fontSize={11} fontFamily={mono}
          fill={C.coral} fontWeight={700}>
          t = {threshold.toFixed(0)}
        </text>
        {/* Mean marker */}
        <line x1={HIST.pad.left + ((mu - histogram.binMin) / (histogram.binMax - histogram.binMin)) * histPlotW}
          x2={HIST.pad.left + ((mu - histogram.binMin) / (histogram.binMax - histogram.binMin)) * histPlotW}
          y1={HIST.pad.top + histPlotH + 2} y2={HIST.pad.top + histPlotH + 10}
          stroke={C.textMid} strokeWidth={1.5}
        />
        <text x={HIST.pad.left + ((mu - histogram.binMin) / (histogram.binMax - histogram.binMin)) * histPlotW}
          y={HIST.pad.top + histPlotH + 22}
          textAnchor="middle" fontSize={10} fontFamily={mono} fill={C.textMid}>
          μ={mu.toFixed(0)}
        </text>
        {/* Tail annotation */}
        <text x={HIST.W - HIST.pad.right} y={HIST.pad.top + 14}
          textAnchor="end" fontSize={11} fontFamily={mono} fill={C.coral}>
          tail: {(empiricalTail * 100).toFixed(2)}% of trials
        </text>
      </svg>
    );
  };

  // ── Comparison bar rendering ───────────────────────────────────────────────
  const renderBar = (bound, idx) => {
    const barMaxPct = 1; // 100%
    const widthPct = Math.min(bound.value / barMaxPct, 1) * 100;
    const truthPct = Math.min(empiricalTail / barMaxPct, 1) * 100;
    const isActive = bound.enabled;
    const isExpanded = expandedBound === bound.id;

    return (
      <div key={bound.id} style={{
        opacity: isActive ? 1 : 0.3,
        transition: "opacity 0.3s",
        marginBottom: idx < boundsWithValues.length - 1 ? "0.5rem" : 0,
      }}>
        {/* Label row */}
        <div style={{
          display: "flex", alignItems: "baseline", gap: "0.5rem",
          marginBottom: "3px",
        }}>
          <span style={{
            fontWeight: 700, fontSize: "0.9rem", color: bound.color,
            minWidth: 140,
          }}>
            {bound.name}
            <span style={{ fontWeight: 400, fontSize: "0.72rem", color: C.textDim, marginLeft: 6 }}>
              {bound.year}
            </span>
          </span>
          {isActive && (
            <>
              <span style={{ fontFamily: mono, fontSize: "0.82rem", color: C.text, fontWeight: 600 }}>
                ≤ {bound.value >= 0.01
                  ? (bound.value * 100).toFixed(1) + "%"
                  : (bound.value * 100).toExponential(1) + "%"}
              </span>
              {empiricalTail > 0 && (
                <span style={{
                  fontFamily: mono, fontSize: "0.72rem", fontWeight: 600,
                  color: bound.ratio > 100 ? C.bad : bound.ratio > 10 ? C.ok : C.good,
                  marginLeft: "auto",
                }}>
                  {bound.ratio >= 1000 ? `${(bound.ratio/1000).toFixed(1)}k` : bound.ratio.toFixed(1)}× loose
                </span>
              )}
            </>
          )}
          {!isActive && (
            <span style={{ fontSize: "0.8rem", color: C.textDim, fontStyle: "italic" }}>
              — not enough knowledge
            </span>
          )}
        </div>

        {/* Bar */}
        {isActive && (
          <div style={{ position: "relative", height: 22, marginBottom: 2 }}>
            {/* Background track */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 22,
              background: C.bgCard, borderRadius: 4, border: `1px solid ${C.borderLight}`,
            }} />
            {/* Bound bar */}
            <div style={{
              position: "absolute", top: 2, left: 2, height: 18,
              width: `calc(${widthPct}% - 4px)`,
              minWidth: widthPct > 0 ? 4 : 0,
              background: `${bound.color}30`,
              borderLeft: `3px solid ${bound.color}`,
              borderRadius: 3,
              transition: "width 0.3s",
            }} />
            {/* Truth marker */}
            {empiricalTail > 0 && (
              <div style={{
                position: "absolute", top: 0, height: 22,
                left: `${truthPct}%`,
                width: 2, background: C.text,
                borderRadius: 1,
              }}>
                {idx === 0 && (
                  <div style={{
                    position: "absolute", top: -16, left: -20,
                    fontSize: "0.65rem", fontFamily: mono, color: C.text,
                    fontWeight: 600, whiteSpace: "nowrap",
                  }}>
                    ← actual
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expandable detail */}
        {isActive && (
          <button
            onClick={() => setExpandedBound(isExpanded ? null : bound.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.72rem", color: C.textDim, padding: "2px 0",
              fontFamily: font, textDecoration: "underline",
              textDecorationColor: C.borderLight,
            }}
          >
            {isExpanded ? "▾ less" : "▸ why this value?"}
          </button>
        )}
        {isExpanded && isActive && (
          <div style={{
            background: bound.colorBg, borderLeft: `3px solid ${bound.color}`,
            padding: "0.6rem 0.8rem", borderRadius: "0 6px 6px 0",
            marginTop: 4, fontSize: "0.82rem", lineHeight: 1.5,
          }}>
            <div style={{ fontFamily: mono, fontSize: "0.78rem", color: bound.color, fontWeight: 600, marginBottom: 4 }}>
              {bound.formulaShort}
            </div>
            <div style={{ fontFamily: mono, fontSize: "0.75rem", color: C.textMid, marginBottom: 6 }}>
              = {bound.formula(N, threshold)} = {(bound.value * 100).toFixed(4)}%
            </div>
            <div style={{ color: C.textMid, fontSize: "0.8rem", marginBottom: 4 }}>
              <strong>Assumes:</strong> {bound.assumptions}
            </div>
            <div style={{ color: C.textMid, fontSize: "0.8rem", marginBottom: 4 }}>
              {bound.explanation}
            </div>
            <div style={{
              color: bound.ratio > 50 ? C.bad : bound.ratio > 5 ? C.ok : C.good,
              fontSize: "0.8rem", fontWeight: 600,
            }}>
              {bound.insight(bound.ratio)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      fontFamily: font, background: C.bg, color: C.text,
      minHeight: "100vh", padding: "1.75rem 1.5rem",
      maxWidth: 780, margin: "0 auto",
    }}>
      {/* ── Header ── */}
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.2rem", letterSpacing: "-0.02em" }}>
        What Can You Prove?
      </h1>
      <p style={{ color: C.textMid, fontSize: "0.88rem", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
        Flip <strong>N coins</strong> and sum them. The simulation knows the answer.
        But in a proof, you don't get to simulate — you only get <strong>facts</strong>.
        Each inequality turns limited knowledge into a guarantee. How tight is that guarantee?
      </p>

      {/* ── Experiment controls ── */}
      <div style={{
        background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "0.85rem 1rem", marginBottom: "0.75rem",
      }}>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* N control */}
          <div style={{ flex: "1 1 180px" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Coins (N)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 4 }}>
              <input type="range" min={10} max={200} step={10} value={N}
                onChange={(e) => setN(+e.target.value)}
                style={{ flex: 1, accentColor: C.coral }}
              />
              <span style={{ fontFamily: mono, fontSize: "0.9rem", fontWeight: 700, minWidth: 36, textAlign: "right" }}>{N}</span>
            </div>
          </div>

          {/* Deviation control */}
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Deviation from mean (δ)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 4 }}>
              <input type="range" min={0.5} max={4.5} step={0.25} value={devSigmas}
                onChange={(e) => setDevSigmas(+e.target.value)}
                style={{ flex: 1, accentColor: C.coral }}
              />
              <span style={{ fontFamily: mono, fontSize: "0.85rem", fontWeight: 700, minWidth: 80, textAlign: "right" }}>
                {devSigmas.toFixed(1)}σ
                <span style={{ fontSize: "0.7rem", fontWeight: 400, color: C.textDim }}> = {delta.toFixed(1)}</span>
              </span>
            </div>
          </div>

          {/* Re-roll */}
          <div style={{ flex: "0 0 auto", alignSelf: "flex-end" }}>
            <button
              onClick={() => setRollCount((c) => c + 1)}
              style={{
                background: C.bgCard, border: `1.5px solid ${C.border}`, borderRadius: 6,
                padding: "6px 14px", cursor: "pointer", fontFamily: font,
                fontSize: "0.82rem", color: C.textMid,
              }}
            >
              ↻ re-roll
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div style={{
          display: "flex", gap: "1.5rem", marginTop: "0.6rem", paddingTop: "0.5rem",
          borderTop: `1px solid ${C.borderLight}`,
          fontFamily: mono, fontSize: "0.78rem", color: C.textMid, flexWrap: "wrap",
        }}>
          <span>μ = E[S] = <strong style={{ color: C.text }}>{mu.toFixed(0)}</strong></span>
          <span>σ = <strong style={{ color: C.text }}>{sigma.toFixed(2)}</strong></span>
          <span>σ² = <strong style={{ color: C.text }}>{(sigma*sigma).toFixed(1)}</strong></span>
          <span>threshold t = <strong style={{ color: C.coral }}>{threshold.toFixed(1)}</strong></span>
        </div>
      </div>

      {/* ── Histogram ── */}
      <div style={{
        background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "0.5rem 0.5rem 0.25rem", marginBottom: "0.75rem",
      }}>
        <div style={{
          fontSize: "0.7rem", fontWeight: 700, color: C.textMid, textTransform: "uppercase",
          letterSpacing: "0.06em", padding: "0 0.5rem", marginBottom: 2,
        }}>
          {TRIALS.toLocaleString()} simulated trials — distribution of sums
        </div>
        {renderHistogram()}
      </div>

      {/* ── The question ── */}
      <div style={{
        background: C.coralBg, border: `1.5px solid ${C.coralDim}`,
        borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "0.75rem",
        textAlign: "center",
      }}>
        <span style={{ fontSize: "1rem" }}>
          How likely is <strong style={{ fontFamily: mono }}>S ≥ {threshold.toFixed(0)}</strong> ?
        </span>
        <span style={{ fontSize: "0.85rem", color: C.textMid, marginLeft: "0.5rem" }}>
          (i.e., deviating by {devSigmas.toFixed(1)}σ above the mean)
        </span>
      </div>

      {/* ── What you know (knowledge toggles) ── */}
      <div style={{
        background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "0.75rem 1rem", marginBottom: "0.75rem",
      }}>
        <div style={{
          fontSize: "0.7rem", fontWeight: 700, color: C.textMid,
          textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem",
        }}>
          What you know (toggle to see which bounds require which facts)
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { key: "mean", label: "Mean", detail: `E[S] = ${mu.toFixed(0)}`, who: "All" },
            { key: "variance", label: "Variance", detail: `σ² = ${(sigma*sigma).toFixed(1)}`, who: "Chebyshev" },
            { key: "independence", label: "Independence", detail: "Flips are independent", who: "Chernoff" },
            { key: "lipschitz", label: "Lipschitz structure", detail: "Sum is 1-Lipschitz", who: "Talagrand" },
          ].map((k) => (
            <label key={k.key} style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              cursor: "pointer", padding: "5px 10px",
              background: knowledge[k.key] ? C.limeBg : C.bgCard,
              border: `1.5px solid ${knowledge[k.key] ? C.limeDim : C.borderLight}`,
              borderRadius: 6, fontSize: "0.82rem",
              transition: "all 0.2s",
            }}>
              <input type="checkbox" checked={knowledge[k.key]}
                onChange={() => toggleKnowledge(k.key)}
                style={{ accentColor: C.lime }}
              />
              <span style={{ fontWeight: 600 }}>{k.label}</span>
              <span style={{ fontFamily: mono, fontSize: "0.7rem", color: C.textDim }}>
                — powers {k.who}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ── The answers (comparison bars) ── */}
      <div style={{
        background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "1rem 1.25rem", marginBottom: "0.75rem",
      }}>
        <div style={{
          fontSize: "0.7rem", fontWeight: 700, color: C.textMid,
          textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem",
        }}>
          Guarantees vs. reality
        </div>

        {/* Simulation truth */}
        <div style={{
          display: "flex", alignItems: "baseline", gap: "0.5rem",
          padding: "0.5rem 0", borderBottom: `2px solid ${C.border}`,
          marginBottom: "0.75rem",
        }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: C.text, minWidth: 140 }}>
            Simulation
            <span style={{ fontWeight: 400, fontSize: "0.72rem", color: C.textDim, marginLeft: 6 }}>
              (truth)
            </span>
          </span>
          <span style={{
            fontFamily: mono, fontSize: "1rem", fontWeight: 700,
            color: C.text,
          }}>
            {empiricalTail > 0.0001
              ? (empiricalTail * 100).toFixed(2) + "%"
              : empiricalTail === 0
                ? "0% (none in " + TRIALS.toLocaleString() + " trials)"
                : (empiricalTail * 100).toExponential(1) + "%"}
          </span>
          <span style={{ fontSize: "0.75rem", color: C.textDim, marginLeft: "auto" }}>
            {simData.filter((r) => r >= threshold).length} / {TRIALS.toLocaleString()} trials
          </span>
        </div>

        {/* Bound bars */}
        {boundsWithValues.map((b, i) => renderBar(b, i))}

        {/* Scale */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: "0.5rem", paddingTop: "0.4rem",
          borderTop: `1px solid ${C.borderLight}`,
          fontFamily: mono, fontSize: "0.65rem", color: C.textFaint,
        }}>
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── Pedagogical insight ── */}
      <div style={{
        background: C.limeBg, border: `1.5px solid ${C.lime}40`,
        borderRadius: 8, padding: "0.85rem 1.1rem",
      }}>
        <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.3rem" }}>
          The tradeoff: assumptions ↔ tightness
        </div>
        <p style={{ fontSize: "0.82rem", color: C.textMid, margin: 0, lineHeight: 1.55 }}>
          In algorithm analysis you can't run {TRIALS.toLocaleString()} simulations — you need a
          {" "}<strong>proof</strong>. Each inequality is a tool that converts <em>knowledge about
          your random variable</em> into a <em>guarantee about its tail</em>. More assumptions
          buy tighter bounds. Uncheck the knowledge toggles above to see what happens when you know
          less — bounds that need that knowledge disappear entirely. The gap between each bound and
          the simulation truth is the <strong>price of limited knowledge</strong>.
        </p>
      </div>

      <div style={{
        marginTop: "0.75rem", fontSize: "0.68rem", color: C.textFaint,
        textAlign: "center", fontFamily: mono,
      }}>
        v4 — simulation-first, knowledge-ladder approach
      </div>
    </div>
  );
}
