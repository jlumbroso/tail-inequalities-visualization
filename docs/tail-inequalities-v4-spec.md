# Tail Inequalities Visualization (v4) — Complete Specification

## 1. Educational Purpose

This visualization teaches four tail probability inequalities — Markov, Chebyshev, Chernoff–Hoeffding, and Talagrand — by inverting the typical pedagogical structure. Instead of presenting formulas and then illustrating them on a distribution, it starts from a concrete experiment (flipping coins and summing results), poses a question ("how likely is this event?"), and then reveals what each inequality can *guarantee* given limited knowledge.

The core pedagogical mechanism is **epistemic scaffolding**: the student sees the "truth" (a simulated histogram), then discovers that each inequality is a tool that converts *assumptions about the random variable* into a *ceiling on the tail probability*. More assumptions buy tighter ceilings. The gap between the ceiling and the truth is the **price of limited knowledge**.

This is a problem-posing approach (Freire): the student is placed in the position of *needing* a bound — not shown the bound and asked to admire it.

### What failed in v1–v3

| Version | Approach | Why it failed |
|---------|----------|---------------|
| v1 | Bell curve with tabs, shaded same tail for each inequality | All four tabs shaded the identical region. The bounds differed only as numbers in a disconnected table. Visually indistinguishable. |
| v2 | Multiple distribution selector + bar chart of bound values | Better numerically, but the bars were semantically disconnected from the distribution shape. Students couldn't see *why* Markov is loose. |
| v3 | Log-scale plot of P(X ≥ kσ) with bound curves as ceiling lines | Mathematically correct — the vertical gap IS the looseness. But still shows the answer alongside the bounds. No epistemic structure. The student never *needs* the bound. Also: all bounds applied to the same scenario (coin flips with full info), so Chernoff always wins and Markov always looks stupid — obscuring that they're tools for *different situations*. |

### What v4 gets right

1. **Simulation-first**: The histogram is the "lab." The question is posed before any bound is shown.
2. **Knowledge toggles**: Checkboxes for Mean, Variance, Independence, Lipschitz. Unchecking one grays out bounds that require it. This makes the assumption→bound connection visceral.
3. **Horizontal bars with truth marker**: Each bound's guarantee is a colored bar; a thin dark line marks the simulation truth. The gap between bar and truth IS the looseness — visible, proportional, immediate.
4. **"Why this value?" expanders**: Clicking reveals the formula with the student's current N and threshold substituted in, the required assumptions, and a dynamic insight comment that adapts to how loose the bound is.
5. **Re-roll button**: The simulation changes, the truth marker moves, but the bounds stay fixed — reinforcing that bounds are *deterministic guarantees*, not empirical estimates.

---

## 2. Color Palette

All colors live in a single `C` object. Use them by name — never hardcode hex values elsewhere.

| Token | Hex | Usage |
|---|---|---|
| `C.bg` | `#f5f0e8` | Page background (Claude beige) |
| `C.bgPanel` | `#ede8df` | Panel/card backgrounds |
| `C.bgCard` | `#e8e2d8` | Nested card surfaces, bar track backgrounds |
| `C.border` | `#d0c8bb` | All borders |
| `C.borderLight` | `#e0d9cf` | Light separators, bar track borders |
| `C.coral` | `#e8865a` | Markov bound, threshold line, tail bars, active slider accent |
| `C.coralDim` | `#f2c4ab` | Question box border |
| `C.coralBg` | `#fdf0e8` | Question box background, Markov detail panel |
| `C.lime` | `#7ab830` | Chernoff bound, knowledge toggle active state |
| `C.limeDim` | `#b8d98a` | Knowledge toggle active border |
| `C.limeBg` | `#f0f7e4` | Chernoff detail panel, insight box background |
| `C.text` | `#2c2416` | Primary text, truth marker line |
| `C.textMid` | `#7a6e60` | Secondary text, stat labels |
| `C.textDim` | `#b0a898` | Tertiary labels, disabled state |
| `C.textFaint` | `#d0c8bb` | Version footer, scale labels |
| `C.blue` | `#3a6bc0` | Chebyshev bound |
| `C.blueDim` | `#a0b8e0` | Reserved |
| `C.purple` | `#8a6aaa` | Talagrand bound |
| `C.purpleDim` | `#c4b0d8` | Reserved |

Looseness ratio colors (same as error percentage in Morris counter):

| Ratio | Color | Meaning |
|---|---|---|
| ≤ 10× | `C.good` = `#5a9a2e` | Tight bound |
| ≤ 100× | `C.ok` = `#c47c1a` | Loose but usable |
| > 100× | `C.bad` = `#c0442a` | Essentially useless |

Additional bound-specific backgrounds:

| Bound | `colorBg` |
|---|---|
| Chebyshev | `#eef2fa` |
| Talagrand | `#f3eff8` |

---

## 3. Typography

- **Body text**: `fontFamily: "'Georgia', serif"` — root and all prose.
- **Numeric readouts**: `fontFamily: "monospace"` — all numbers, formulas, stat values, scale labels, version footer.
- No other fonts.

---

## 4. Math

### 4.1 The Experiment

S = X₁ + X₂ + ... + Xₙ, where each Xᵢ is an independent Bernoulli(1/2) coin flip.

Known quantities:
- **Mean**: μ = E[S] = N/2
- **Variance**: σ² = Var(S) = N/4
- **Standard deviation**: σ = √N / 2
- **Threshold**: t = μ + δ, where δ = (devSigmas) × σ

The question: **P(S ≥ t) = ?**

### 4.2 Simulation

`TRIALS = 12,000` independent runs. Each run: flip N coins, count heads. Empirical tail = (count of runs where sum ≥ t) / TRIALS.

12,000 trials gives roughly ±0.5% precision on a 2% tail, enough to see the structure without being misleading at small probabilities.

### 4.3 Bound Formulas

Each bound takes (N, t) and returns an upper bound on P(S ≥ t).

**Markov** (1889):
```
P(S ≥ t) ≤ E[S] / t = (N/2) / t
```
- Requires: S ≥ 0, known mean.
- Applied via: Markov to the non-negative variable S directly.
- Decay: O(1/t) — linear in the threshold.

**Chebyshev** (1867):
```
P(|S − μ| ≥ δ) ≤ σ² / δ²  =  (N/4) / (t − N/2)²
```
- Requires: known mean and variance.
- One-sided tail: technically the one-sided bound is σ²/(σ²+δ²), but we use the two-sided form 1/k² for pedagogy (it's the standard textbook form, and the factor-of-2 refinement would add noise without insight).
- Decay: O(1/δ²) — quadratic in the deviation.

**Chernoff–Hoeffding** (1952/1963):
```
P(S − μ ≥ δ) ≤ exp(−2δ² / N)
```
- Requires: independent summands, each bounded in [0,1].
- This is the Hoeffding form (cleaner for bounded RVs). The multiplicative Chernoff form exp(−μδ²/3) is equivalent up to constants.
- Decay: exp(−Θ(δ²/N)) — exponential in the deviation squared.

**Talagrand** (1995):
```
P(f − E[f] ≥ δ) ≤ 4·exp(−δ² / N)
```
- Requires: product space, f is 1-Lipschitz (changing one coordinate changes f by at most 1).
- For the sum f(X) = X₁ + ... + Xₙ, the sum is 1-Lipschitz, and the convex distance form gives this bound.
- The constant 4 (vs 1 in Chernoff) and the factor in the exponent (1 vs 2) make Talagrand looser *for sums*. This is the key pedagogical point: Talagrand is *not* better than Chernoff for sums. It's a tool for *non-sum* quantities (e.g., the diameter of a random graph, the length of the longest increasing subsequence).
- Decay: exp(−Θ(δ²/N)) — same exponential character, different constants.

### 4.4 Looseness Ratio

For each bound B:
```
ratio = B(N, t) / empiricalTail
```

This measures how many times larger the guarantee is than the truth. A ratio of 1× means the bound is tight; 100× means the bound overpromises by two orders of magnitude.

---

## 5. State Architecture

```
N: number             // Number of coins. Range [10, 200], step 10. Default 100.
devSigmas: number     // Deviation in units of σ. Range [0.5, 4.5], step 0.25. Default 2.
rollCount: number     // Incremented on re-roll to force re-simulation. Default 0.
knowledge: {          // Which facts the student "knows." All default true.
  mean: boolean,
  variance: boolean,
  independence: boolean,
  lipschitz: boolean,
}
expandedBound: string | null  // ID of the currently expanded "why this value?" panel, or null.
```

### Derived values (not state — recomputed from state):

```
mu = N / 2
sigma = √N / 2
delta = devSigmas × sigma
threshold = mu + delta
simData = simulate(N)          // Recomputed when N or rollCount changes.
empiricalTail = count(simData ≥ threshold) / TRIALS
histogram = bin(simData)        // Bins from (μ − 4.5σ) to (μ + 4.5σ)
boundsWithValues = BOUND_DEFS.map(b => {
  value: b.bound(N, threshold),
  enabled: b.requires.every(r => knowledge[r]),
  ratio: value / empiricalTail
})
```

---

## 6. Simulation Function

```javascript
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
  return results.sort((a, b) => a - b);  // sorted for efficient tail counting
}
```

Sort is for convenience; tail counting uses `.filter(r => r >= threshold).length`.

---

## 7. Bound Definitions Data Structure

Each bound is an object:

```javascript
{
  id: string,            // "markov" | "chebyshev" | "chernoff" | "talagrand"
  name: string,          // Display name
  year: number,          // Year of publication
  color: string,         // C.coral | C.blue | C.lime | C.purple
  colorBg: string,       // Light background for detail panel
  requires: string[],    // Subset of ["mean", "variance", "independence", "lipschitz"]
  formula: (N, t) => string,       // Human-readable computation with current values
  bound: (N, t) => number,         // The actual bound function, returns probability ∈ [0, 1]
  formulaShort: string,            // Generic formula string
  assumptions: string,             // What the bound needs, in words
  explanation: string,             // Prose explaining the bound's character
  insight: (ratio) => string,      // Dynamic comment based on current looseness ratio
}
```

The `requires` array is the key mechanism: a bound is `enabled` only if every element of `requires` is true in `knowledge`. This creates the dependency structure:

| Bound | requires |
|---|---|
| Markov | `["mean"]` |
| Chebyshev | `["mean", "variance"]` |
| Chernoff | `["mean", "independence"]` |
| Talagrand | `["mean", "independence", "lipschitz"]` |

Note: Chernoff does NOT require variance — it uses independence + boundedness instead. This is pedagogically important: Chernoff and Chebyshev are *not* ordered on the same axis.

---

## 8. Layout Structure (top to bottom)

```
┌─────────────────────────────────────────────────┐
│  HEADER                                         │
│  Title: "What Can You Prove?"                   │
│  Subtitle: problem framing in prose             │
├─────────────────────────────────────────────────┤
│  EXPERIMENT CONTROLS            [bgPanel]       │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ Coins(N) │  │ Deviation(δ) │  │ ↻ re-roll│  │
│  │ slider   │  │ slider       │  │          │  │
│  └──────────┘  └──────────────┘  └──────────┘  │
│  ─────────────────────────────────────────────  │
│  μ = 50    σ = 5.00    σ² = 25.0    t = 60.0   │
├─────────────────────────────────────────────────┤
│  HISTOGRAM                      [bgPanel]       │
│  12,000 simulated trials — distribution of sums │
│  ┌─────────────────────────────────────────────┐│
│  │  ▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐█▐█▐                     ││
│  │  ▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐█▐█▐  ← coral = in tail  ││
│  │  ▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐█▐█▐                     ││
│  │         μ=50    ┊t=60                       ││
│  └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│  THE QUESTION                   [coralBg]       │
│  "How likely is S ≥ 60?"                        │
│  "(i.e., deviating by 2.0σ above the mean)"    │
├─────────────────────────────────────────────────┤
│  WHAT YOU KNOW                  [bgPanel]       │
│  ☑ Mean — powers All                           │
│  ☑ Variance — powers Chebyshev                  │
│  ☑ Independence — powers Chernoff               │
│  ☑ Lipschitz — powers Talagrand                 │
├─────────────────────────────────────────────────┤
│  GUARANTEES VS. REALITY         [bgPanel]       │
│                                                 │
│  Simulation (truth)    2.30%     276 / 12,000   │
│  ──────────────────────────────────────────────  │
│  Markov  1889   ≤ 83.3%                 36.2×  │
│  ████████████████████████████████████│          │
│  ▸ why this value?                              │
│                                                 │
│  Chebyshev  1867   ≤ 25.0%             10.9×   │
│  ██████████████│                                │
│  ▸ why this value?                              │
│                                                 │
│  Chernoff  1952   ≤ 1.8%                0.8×   │
│  █│                                             │
│  ▸ why this value?                              │
│                                                 │
│  Talagrand  1995   ≤ 7.3%               3.2×   │
│  ████│                                          │
│  ▸ why this value?                              │
│                                                 │
│  0%      25%      50%      75%      100%        │
├─────────────────────────────────────────────────┤
│  INSIGHT BOX                    [limeBg]        │
│  "The tradeoff: assumptions ↔ tightness"        │
│  Prose explanation of the pedagogical point     │
├─────────────────────────────────────────────────┤
│  v4 — simulation-first, knowledge-ladder        │
└─────────────────────────────────────────────────┘
```

---

## 9. Histogram Component

SVG-based. ViewBox: `0 0 660 160`. Padding: top 10, right 20, bottom 28, left 40.

### Bins
- Range: from `max(0, floor(μ − 4.5σ))` to `min(N, ceil(μ + 4.5σ))`.
- One bin per integer value of S.
- Bar width: `max(1, plotWidth / nBins − 1)`.
- Bar height: proportional to count, normalized to max bin count.
- Corner radius: 1px.

### Bar coloring
- Bins where `value < threshold`: fill `C.textDim`, opacity 0.35.
- Bins where `value ≥ threshold`: fill `C.coral`, opacity 0.8.

### Threshold line
- Vertical dashed line at threshold position.
- Stroke: `C.coral`, width 2, dasharray "4,3".
- Label above: `"t = {threshold}"` in mono, coral, bold.

### Mean marker
- Short tick below histogram at μ position.
- Label: `"μ={mu}"` in mono, textMid.

### Tail annotation
- Top-right: `"tail: {empiricalTail}% of trials"` in mono, coral.

---

## 10. Knowledge Toggles

Four checkboxes in a horizontal flex row. Each is a `<label>` containing:
- Native checkbox with `accentColor: C.lime`.
- Bold label text.
- Monospace annotation: `"— powers {bound name}"`.

### Toggle styling
- **Active** (checked): background `C.limeBg`, border `1.5px solid C.limeDim`.
- **Inactive** (unchecked): background `C.bgCard`, border `1.5px solid C.borderLight`.
- Transition: `all 0.2s`.

### Knowledge-to-bound dependency
Toggling a knowledge item immediately enables/disables the bounds that require it. A disabled bound shows at opacity 0.3 with italicized "— not enough knowledge" replacing its values.

---

## 11. Comparison Bars (Guarantees vs. Reality)

### Truth row (top, separated by 2px border)
- Label: "Simulation" with "(truth)" dim annotation.
- Value: empirical tail percentage in mono, bold, 1rem.
- Right-aligned: raw count "276 / 12,000 trials".

### Bound rows (one per BOUND_DEF)

Each row has three layers:

**Label line:**
- Bound name in its color, bold, 0.9rem. Year in textDim, 0.72rem.
- Bound value: `"≤ {value}%"` in mono.
- Right-aligned: looseness ratio `"{ratio}× loose"` in error-colored mono.

**Bar:**
- Track: full-width `C.bgCard` rectangle, height 22px, border `C.borderLight`, radius 4px.
- Fill: colored rectangle from left edge, width proportional to `value / 1.0 * 100%`. Fill color: `{bound.color}30` (30% opacity). Left border: 3px solid `{bound.color}`.
- Truth marker: 2px-wide dark vertical line at `empiricalTail / 1.0 * 100%` position. On the first bar only, a `"← actual"` label appears above the truth marker.

**Expander button:**
- `"▸ why this value?"` / `"▾ less"` — underlined, textDim, 0.72rem.
- Clicking toggles `expandedBound` state.

### Expanded detail panel
- Background: `bound.colorBg`. Left border: 3px solid `bound.color`. Radius: 0 6px 6px 0.
- Contents (top to bottom):
  1. Formula in mono, bound color, bold: `"P(S ≥ t) ≤ E[S] / t"`
  2. Substituted computation in mono, textMid: `"= 50/60 = 83.3333%"`
  3. Assumptions in prose.
  4. Explanation paragraph.
  5. Dynamic insight sentence, color-coded by ratio severity.

### Scale footer
- Flex row: "0%", "25%", "50%", "75%", "100%" in mono textFaint, 0.65rem.

---

## 12. Experiment Controls

### Coins (N) slider
- Range: 10 to 200, step 10.
- Default: 100.
- Accent color: `C.coral`.
- Readout: mono, bold, 0.9rem.
- Changing N triggers full re-simulation.

### Deviation (δ) slider
- Range: 0.5σ to 4.5σ, step 0.25.
- Default: 2.0.
- Readout: `"2.0σ = 10.0"` — showing both σ-units and absolute value.
- Accent color: `C.coral`.

### Re-roll button
- Style: bgCard background, border, rounded.
- Text: "↻ re-roll".
- Increments `rollCount`, forcing `simulate()` to re-run with new random seed.
- Bounds remain unchanged (deterministic). Only the histogram and empirical tail change.
- This reinforces: bounds are guarantees, not estimates.

### Stats summary row
- Below controls, separated by borderLight.
- Four items in monospace: μ, σ, σ², threshold t.
- μ, σ, σ² in textMid with bold values. Threshold t in coral.

---

## 13. Insight Box

- Background: `C.limeBg`. Border: `1.5px solid C.lime` at 40% opacity. Radius 8px.
- Title: bold, 0.88rem: "The tradeoff: assumptions ↔ tightness"
- Body: prose in 0.82rem, textMid, line-height 1.55. References TRIALS count, emphasizes "proof vs. simulation" framing, and directs student to use knowledge toggles.

---

## 14. Dynamic Insight Text

Each bound has an `insight(ratio)` function that returns a sentence adapting to the current looseness:

**Markov:**
- ratio > 50: "Essentially useless — might as well say 'it could happen.'"
- ratio > 5: "Very loose. It's a valid guarantee, but not a useful one."
- else: "Surprisingly decent here — but only because the threshold is close to the mean."

**Chebyshev:**
- ratio > 20: "Still quite loose — variance alone doesn't capture the full shape."
- ratio > 3: "Respectable. This is often 'good enough' for a quick argument."
- else: "Surprisingly tight! The distribution isn't far from Chebyshev's worst case."

**Chernoff:**
- ratio > 10: "Loose here — likely because the deviation is small relative to N."
- ratio > 2: "Within an order of magnitude. This is a genuinely useful guarantee."
- else: "Very tight! For sums of independent bounded RVs, Chernoff is hard to beat."

**Talagrand:**
- ratio > 20: "Loose for sums — but Talagrand isn't designed for sums. It handles far more complex quantities."
- ratio > 3: "Decent, considering this bound works for any Lipschitz function, not just sums."
- else: "Tight! This is a case where the sum structure doesn't help much beyond Lipschitz."

---

## 15. Responsive Behavior

- Max width: 780px, centered.
- Flex-wrap on controls and knowledge toggles for narrow screens.
- SVG histogram uses viewBox for fluid scaling.
- Comparison bars use percentage widths.

---

## 16. Initial State

On first render:
- N = 100, devSigmas = 2.0 (threshold = 60, δ = 10).
- All knowledge toggled on.
- 12,000 trials simulated.
- No bound expanded.
- Expected empirical tail: ~2.3% (varies by random seed).
- Expected looseness at these settings: Markov ~36×, Chebyshev ~11×, Chernoff ~0.8×, Talagrand ~3.2×.

These defaults are chosen so that on first load the student immediately sees the full spectrum: Markov obviously useless, Chebyshev mediocre, Chernoff surprisingly tight, Talagrand decent but not as good as Chernoff for this scenario.

---

## 17. What Makes This Work Pedagogically

### The Freire inversion
v1–v3 showed the distribution and asked students to appreciate how the bounds relate to it. That's the banking model: "here is knowledge, receive it." v4 poses a question ("how likely is S ≥ 60?"), withholds the formula, and lets the student discover that each inequality is a tool that earns a better answer through stronger assumptions.

### The knowledge toggles are the lecture
The most important interaction is not the sliders — it's unchecking "Independence" and watching Chernoff disappear while Chebyshev remains. This teaches, without any words, that Chebyshev's power is universality (it works without independence), while Chernoff's power is tightness (it works only with independence). They are not ranked — they are *complementary tools for different situations*.

### Re-roll teaches the bound/estimate distinction
Students often confuse "the bound says ≤ 25%" with "the probability is about 25%." Re-rolling shows the empirical tail jumping around (1.8%, 2.5%, 2.1%) while the bounds stay fixed. The bound is a *ceiling*, not an estimate.

### "Why this value?" defeats formula memorization
Instead of displaying the formula in the abstract, the expander shows the formula with the student's current numbers substituted. This connects the symbolic form to a specific computation, which is the step most students cannot perform after a traditional lecture.

### Talagrand's intentional looseness is a feature
For sums, Talagrand is always worse than Chernoff. A banking-model lecture would present this as a deficiency. Here, it's visible and explained: "For simple sums, Talagrand is looser — that's expected. Its power is that it works for ANY well-behaved function of many variables, not just sums." This teaches tool selection, not tool ranking.

---

## 18. Version History

| Version | File | Approach | Key insight / failure |
|---|---|---|---|
| v1 | `tail_inequalities_v1.jsx` | Bell curve + tabs per inequality, shaded same tail | All tabs looked identical — shading the same PDF region doesn't show bound differences |
| v2 | `tail_inequalities_v2.jsx` | Multiple distributions + bar chart of bound values | Numerically better, but bars disconnected from distributions. Still shows answer before posing question |
| v3 | `tail_inequalities_v3.jsx` | Log-scale tail probability plot, bounds as ceiling curves | Mathematically correct. But student never needs the bound — truth always visible. No epistemic structure |
| v4 | `tail_inequalities_v4.jsx` | Simulation-first, knowledge toggles, comparison bars with truth marker | The breakthrough: question before answer, knowledge as prerequisite, visible cost of ignorance |

---

## 19. Known Limitations and Ideas for v5

1. **Single scenario**: All four bounds always apply to coin flips (independent bounded summands). In real algorithm analysis, you reach for Chebyshev *specifically* when you don't have independence. v5 could offer multiple scenarios where different bounds shine.

2. **No progressive revelation**: Currently all bounds are visible at once. A problem-posing activity could hide them initially and let students "unlock" each one by identifying which assumptions hold.

3. **No worst-case distributions**: Markov's bound is tight for a specific 2-point distribution. Showing the adversarial distribution that *saturates* each bound would make the looseness feel inevitable rather than arbitrary.

4. **Static histogram**: The histogram is generated once per roll. An animated accumulation (trials appearing one by one) could build intuition for the law of large numbers before the tail question is posed.

5. **No connection to algorithms**: The coin-flip experiment is clean but abstract. Connecting to specific algorithms (Bloom filter false positive rate → Chernoff; Morris counter accuracy → Chebyshev; random graph connectivity → Talagrand) would complete the pedagogical arc.
