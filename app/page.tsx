"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CLASS_IDS,
  CLASS_NAMES,
  MAX_LEVEL,
  STAT_IDS,
  STAT_NAMES,
  bonusPercent,
  canUpgrade,
  classTotal,
  classTotals,
  deficitFor,
  emptyLevels,
  formatDuration,
  hoursUntilAffordable,
  isSpeculativeCost,
  optimizeTarget,
  targetDate,
  totalPlannedCost,
  unlockedCap,
  upgradeCost,
  type ClassId,
  type Levels,
  type StatId,
} from "./game/mastery";

const STORAGE_KEY = "gt-mastery-planner-v1";
const PRESETS_KEY = "gt-mastery-presets-v1";
const number = new Intl.NumberFormat();
const money = (value: number) => `${number.format(value)} GP`;
const clone = (levels: Levels): Levels => structuredClone(levels);
type Saved = {
  guardianPoints: number;
  income: number;
  initial: Levels;
  planned: Levels;
};
type Notice = { type: "lock" | "cost" | "ok"; text: string } | null;
type Preset = { id: string; name: string; levels: Levels };
// Kept as a standalone reference component for a possible future documentation view.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Guide() {
  const bands = [
    ["0–9", "80,000", "×2"],
    ["10–19", "160,000", "×2"],
    ["20–29", "320,000", "×2"],
    ["30–39", "640,000", "×2.5"],
    ["40–49", "1,600,000", "×2.5"],
    ["50–59", "4,000,000", "×2.5"],
    ["60–69", "10,000,000", "×2.5"],
    ["70–79", "25,000,000", "×2.5"],
    ["80–89", "62,500,000", "projected"],
  ];
  return (
    <section className="technical-report">
      <header>
        <p className="eyebrow">Technical reference</p>
        <h2>How the planner works</h2>
        <p>
          This chapter documents the cost curve, mastery gates, optimizer
          search, route construction and ETA calculation used by the
          application.
        </p>
      </header>
      <article>
        <h3>1. Meaning of an upgrade cost</h3>
        <p>
          The displayed price is the amount required to move from the current
          level L to L+1. Therefore level 53 means the next purchase is 53→54.
          Costs are attached to destination steps and the total for a plan is
          the sum of every intermediate purchase; levels cannot be skipped.
        </p>
        <div className="formula">C(L)=B × (1 + 0.05 × (L mod 10))</div>
        <p>
          B is the starting price of the current ten-level block. Inside a
          block, every following upgrade adds 5% of B. For example, the 50–59
          block starts at 4,000,000 GP, so 53→54 costs 4,000,000×1.15=4,600,000
          GP.
        </p>
      </article>
      <article>
        <h3>2. How the base price evolves</h3>
        <table>
          <thead>
            <tr>
              <th>Current-level block</th>
              <th>Starting cost B</th>
              <th>Next-block rule</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((row) => (
              <tr key={row[0]}>
                {row.map((cell) => (
                  <td key={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Up to level 39 the base doubles each decade. Starting with the 40–49
          block, the observed regime changes to ×2.5 per decade. Values beyond
          the recorded cost table are projections, not confirmed game data.
        </p>
      </article>
      <article>
        <h3>3. Worked examples</h3>
        <h4>Level 60→61</h4>
        <p>
          B=10,000,000 and r=0, therefore C(60)=10,000,000 GP. At 61→62, r=1 and
          the price becomes 10,500,000 GP.
        </p>
        <h4>Level 70→71</h4>
        <p>
          The post-40 block exponent is floor((70−40)/10)=3.
          B=1,600,000×2.5³=25,000,000. Since 70 mod 10=0, the internal
          multiplier is 1, giving exactly 25,000,000 GP.
        </p>
        <h4>Level 80→81 projection</h4>
        <p>
          The next theoretical base is 25,000,000×2.5=62,500,000 GP. This
          remains an estimate until the game confirms costs above level 69.
        </p>
      </article>
      <article>
        <h3>4. Shared mastery gate</h3>
        <p>
          Each class mastery is ATK+HP+DEF+Skill Damage. The shared cap is
          controlled by the lowest class total:
        </p>
        <div className="formula">cap=(floor(min(class totals)/10)+1)×10</div>
        <p>
          If the lowest class is mastery 23, the cap is 30. A class already at
          30 cannot buy mastery point 31 until every class reaches 30. Guardian
          Point balance never changes this legality check; it only affects
          affordability and ETA.
        </p>
      </article>
      <article>
        <h3>5. Target optimizer algorithm</h3>
        <ol>
          <li>
            Clone current levels so the calculation never mutates the saved
            account state.
          </li>
          <li>
            Clamp every requested stat to 0–69 and replace targets below current
            levels with the current level, because the planner never downgrades.
          </li>
          <li>
            Scan unmet targets and apply a target upgrade when{" "}
            <em>canUpgrade</em> says it is legal.
          </li>
          <li>
            If all unmet targets are mastery-locked, find a class whose total is
            below the shared cap.
          </li>
          <li>
            Inside that class, select the available stat with the cheapest next
            destination-level cost and add it as an unlock filler.
          </li>
          <li>
            Recalculate totals and cap after every single level, then repeat
            until all targets are reached.
          </li>
        </ol>
        <p>
          Every route entry records class, stat, destination level, GP cost and
          whether the step serves the requested target or only unlocks a gate.
        </p>
      </article>
      <article>
        <h3>6. Why the route is considered fastest</h3>
        <p>
          Time is proportional to total GP cost at a fixed GP/hour rate. Upgrade
          order does not change the price of a given final distribution, so the
          optimizer prioritizes requested stats and only introduces filler
          points when a gate makes them mandatory. Among eligible fillers it
          takes the cheapest next purchase.
        </p>
        <p>
          This is a deterministic greedy strategy. It minimizes immediate filler
          cost and produces a legal route, but it is not presented as a proof of
          global optimality for every hypothetical future rule or tie case.
        </p>
      </article>
      <article>
        <h3>7. Cost, deficit and ETA</h3>
        <div className="formula">
          route cost=Σ upgrade cost · deficit=max(0,route cost−current GP) ·
          ETA=deficit÷GP/hour
        </div>
        <p>
          If the deficit is zero, the target is affordable now. If GP/hour is
          zero while a deficit exists, no finite ETA can be calculated. The
          displayed target date adds the computed duration to the current system
          time.
        </p>
      </article>
      <article>
        <h3>8. Limits and assumptions</h3>
        <ul>
          <li>Confirmed costs currently stop at individual stat level 69.</li>
          <li>
            Projections from level 70 onward assume the ×2.5 decade pattern
            continues.
          </li>
          <li>
            The optimizer models mastery gates and GP costs only; it does not
            model unlisted game prerequisites or future balance changes.
          </li>
          <li>
            Tied filler choices follow the stable class/stat order in the
            program.
          </li>
        </ul>
      </article>
    </section>
  );
}

function safeSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [guardianPoints, setGuardianPoints] = useState(12500000);
  const [income, setIncome] = useState(11808);
  const [initial, setInitial] = useState<Levels>(emptyLevels);
  const [planned, setPlanned] = useState<Levels>(emptyLevels);
  const [draft, setDraft] = useState<Levels>(emptyLevels);
  const [editing, setEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [clock, setClock] = useState(() => new Date());
  const [tab, setTab] = useState<"planner" | "optimizer">("planner");
  const [targets, setTargets] = useState<Levels>(emptyLevels);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetDialog, setPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = safeSaved();
      try {
        setPresets(
          JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "[]") as Preset[],
        );
      } catch {
        setPresets([]);
      }
      if (saved) {
        setGuardianPoints(saved.guardianPoints);
        setIncome(saved.income);
        setInitial(saved.initial);
        setPlanned(saved.planned);
        setDraft(saved.initial);
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (hydrated)
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ guardianPoints, income, initial, planned }),
      );
  }, [guardianPoints, income, initial, planned, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }, [presets, hydrated]);
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const cost = useMemo(
    () => totalPlannedCost(initial, planned),
    [initial, planned],
  );
  const remaining = guardianPoints - cost;
  const deficit = deficitFor(remaining);
  const hours = hoursUntilAffordable(deficit, income);
  const eta = deficit > 0 ? targetDate(clock, deficit, income) : null;
  const cap = unlockedCap(planned);
  const totals = classTotals(planned);
  const optimization = useMemo(
    () => optimizeTarget(initial, targets),
    [initial, targets],
  );
  const optimizerDeficit = deficitFor(guardianPoints - optimization.cost);
  const optimizerHours = hoursUntilAffordable(optimizerDeficit, income);

  function add(classId: ClassId, statId: StatId) {
    const check = canUpgrade(planned, classId, statId);
    if (!check.allowed) {
      if (check.reason === "cost-unavailable")
        setNotice({
          type: "cost",
          text: `Upgrade cost for level ${planned[classId][statId] + 1} is not available yet.`,
        });
      else {
        const names = (check.blockers ?? [])
          .map((id) => `${CLASS_NAMES[id]} → Mastery ${check.cap}`)
          .join(", ");
        setNotice({
          type: "lock",
          text: `${CLASS_NAMES[classId]} cannot exceed mastery ${check.cap} yet. Requires: ${names}.`,
        });
      }
      return;
    }
    setPlanned((old) => {
      const next = clone(old);
      next[classId][statId]++;
      return next;
    });
    setNotice(null);
  }
  function subtract(classId: ClassId, statId: StatId) {
    if (planned[classId][statId] <= initial[classId][statId]) return;
    setPlanned((old) => {
      const next = clone(old);
      next[classId][statId]--;
      return next;
    });
    setNotice(null);
  }
  function slideTo(classId: ClassId, statId: StatId, target: number) {
    setPlanned((old) => {
      const next = clone(old);
      const bounded = Math.max(
        initial[classId][statId],
        Math.min(MAX_LEVEL, Math.floor(target)),
      );
      while (next[classId][statId] < bounded) {
        const check = canUpgrade(next, classId, statId);
        if (!check.allowed) break;
        next[classId][statId]++;
      }
      if (next[classId][statId] > bounded) next[classId][statId] = bounded;
      return next;
    });
    setNotice(null);
  }
  function openEditor() {
    setDraft(clone(initial));
    setEditing(true);
  }
  function confirmEditor() {
    setInitial(clone(draft));
    setPlanned(clone(draft));
    setEditing(false);
    setNotice({
      type: "ok",
      text: "Current levels saved. Your previous plan was reset.",
    });
  }
  function resetPlan() {
    setPlanned(clone(initial));
    setNotice({
      type: "ok",
      text: "Planned upgrades reset to your current levels.",
    });
  }
  function clearAll() {
    const blank = emptyLevels();
    setGuardianPoints(0);
    setIncome(0);
    setInitial(blank);
    setPlanned(clone(blank));
    setDraft(clone(blank));
    setPresets([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PRESETS_KEY);
    setNotice({ type: "ok", text: "All planner data cleared." });
  }
  function openOptimizer() {
    setTargets(clone(planned));
    setTab("optimizer");
  }
  function savePreset() {
    if (presets.length >= 10) {
      setNotice({
        type: "cost",
        text: "Preset limit reached (10). Delete one before saving another.",
      });
      return;
    }
    setPresetName("");
    setPresetDialog(true);
  }
  function confirmPreset() {
    const name = presetName.trim().slice(0, 40);
    if (!name) return;
    setPresets((old) => [
      ...old,
      { id: crypto.randomUUID(), name, levels: clone(planned) },
    ]);
    setPresetDialog(false);
    setPresetName("");
    setNotice({ type: "ok", text: `Preset “${name}” saved.` });
  }
  function loadPreset(preset: Preset) {
    const next = clone(initial);
    for (const c of CLASS_IDS)
      for (const s of STAT_IDS)
        next[c][s] = Math.max(initial[c][s], preset.levels[c][s]);
    setPlanned(next);
    setTab("planner");
    setNotice({ type: "ok", text: `Preset “${preset.name}” loaded.` });
  }
  function deletePreset(id: string) {
    setPresets((old) => old.filter((p) => p.id !== id));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">GT</div>
        <div>
          <p className="eyebrow">Guardian Tales Utility</p>
          <h1>
            Mastery Planner <small>v0.3</small>
          </h1>
        </div>
        <span className="save-state">
          <i /> Saved locally
        </span>
      </header>
      <nav className="tabs">
        <button
          className={tab === "planner" ? "active" : ""}
          onClick={() => setTab("planner")}
        >
          Planner
        </button>
        <button
          className={tab === "optimizer" ? "active" : ""}
          onClick={openOptimizer}
        >
          Target optimizer
        </button>
      </nav>
      <div className="speculative-note" role="note">
        <strong>Estimated levels:</strong> costs for levels 71–90 are
        speculative projections assuming the observed ×2.5 scaling continues
        after level 70.
      </div>
      <section className={`summary-card ${remaining < 0 ? "is-negative" : ""}`}>
        <div className="summary-heading">
          <div>
            <p className="eyebrow">Your resources</p>
            <h2>Plan without limits</h2>
          </div>
          <div className="actions">
            <button
              className="preset-save-button"
              onClick={savePreset}
              disabled={presets.length >= 10}
            >
              Save preset ({presets.length}/10)
            </button>
            <button className="ghost-button" onClick={resetPlan}>
              Reset plan
            </button>
            <button className="ghost-button" onClick={openOptimizer}>
              Find fastest route
            </button>
            <button className="primary-button" onClick={openEditor}>
              Edit current levels
            </button>
          </div>
        </div>
        {presets.length > 0 && (
          <div className="preset-shelf">
            <div>
              <span>Saved presets</span>
              <small>{presets.length}/10</small>
            </div>
            <div className="preset-list">
              {presets.map((preset) => (
                <div className="preset-chip" key={preset.id}>
                  <button
                    onClick={() => loadPreset(preset)}
                    title={`Load ${preset.name}`}
                  >
                    {preset.name}
                  </button>
                  <button
                    className="preset-delete"
                    onClick={() => deletePreset(preset.id)}
                    aria-label={`Delete ${preset.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="summary-grid">
          <label>
            <span>Current Guardian Points</span>
            <input
              inputMode="numeric"
              value={guardianPoints}
              onChange={(e) =>
                setGuardianPoints(
                  Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0),
                )
              }
            />
          </label>
          <label>
            <span>Guardian Points / hour</span>
            <input
              inputMode="numeric"
              value={income}
              onChange={(e) =>
                setIncome(
                  Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0),
                )
              }
            />
          </label>
          <div className="metric">
            <span>Planned upgrade cost</span>
            <strong>{money(cost)}</strong>
          </div>
          <div className="metric highlight">
            <span>Remaining Guardian Points</span>
            <strong>
              {remaining < 0 ? "−" : ""}
              {money(Math.abs(remaining))}
            </strong>
          </div>
        </div>
        {deficit > 0 && (
          <div className="deficit-strip">
            <div>
              <span>Missing Guardian Points</span>
              <strong>{money(deficit)}</strong>
            </div>
            {hours === null ? (
              <div className="eta-error">
                <span>Unable to calculate ETA</span>
                <strong>Income must be greater than 0.</strong>
              </div>
            ) : (
              <>
                <div>
                  <span>Time required</span>
                  <strong>{formatDuration(hours)}</strong>
                </div>
                <div>
                  <span>Enough points on</span>
                  <strong>
                    {eta?.toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </strong>
                </div>
              </>
            )}
          </div>
        )}
      </section>
      {notice && (
        <div className={`notice ${notice.type}`} role="status">
          <span>
            {notice.type === "lock" ? "◆" : notice.type === "cost" ? "!" : "✓"}
          </span>
          <p>{notice.text}</p>
          <button onClick={() => setNotice(null)} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
      {tab === "optimizer" && (
        <section className="optimizer-panel">
          <div className="mastery-intro">
            <div>
              <p className="eyebrow">Target setup</p>
              <h2>Find the fastest legal route</h2>
            </div>
            <div className="optimizer-intro-actions">
              <p>
                Enter desired levels; mastery fillers are added automatically.
              </p>
              <button
                className="ghost-button"
                onClick={() => setTargets(clone(initial))}
              >
                Reset targets
              </button>
            </div>
          </div>
          <div className="target-grid">
            {CLASS_IDS.map((c) => (
              <fieldset key={c}>
                <legend>{CLASS_NAMES[c]}</legend>
                {STAT_IDS.map((s) => (
                  <label key={s}>
                    <span>{STAT_NAMES[s]}</span>
                    <input
                      type="number"
                      min="0"
                      max={MAX_LEVEL}
                      value={targets[c][s]}
                      onChange={(e) =>
                        setTargets((old) => {
                          const n = clone(old);
                          n[c][s] = Math.max(
                            0,
                            Math.min(
                              MAX_LEVEL,
                              Math.floor(Number(e.target.value) || 0),
                            ),
                          );
                          return n;
                        })
                      }
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className="optimizer-result">
            <div>
              <span>Route cost</span>
              <strong>{money(optimization.cost)}</strong>
            </div>
            <div>
              <span>Upgrades</span>
              <strong>{optimization.steps.length}</strong>
            </div>
            <div>
              <span>Time required</span>
              <strong>
                {optimizerHours === null
                  ? "Income unavailable"
                  : formatDuration(optimizerHours)}
              </strong>
            </div>
            <button
              className="primary-button"
              onClick={() => {
                setPlanned(clone(optimization.plan));
                setTab("planner");
                setNotice({ type: "ok", text: "Optimized route applied." });
              }}
            >
              Apply this plan
            </button>
          </div>
          <div className="route-list">
            <h3>Recommended distribution</h3>
            {CLASS_IDS.map((c) => (
              <p key={c}>
                <span
                  className={`distribution-icon icon-${c}`}
                  aria-hidden="true"
                >
                  {c === "warrior"
                    ? "⚔"
                    : c === "ranged"
                      ? "🏹"
                      : c === "tank"
                        ? "🛡"
                        : "✦"}
                </span>
                <b>{CLASS_NAMES[c]}</b> —{" "}
                {STAT_IDS.map(
                  (s) =>
                    `${STAT_NAMES[s].replace(" Increase", "")} ${optimization.plan[c][s]}`,
                ).join(" · ")}
              </p>
            ))}
          </div>
        </section>
      )}
      <section
        className={`mastery-intro ${tab === "optimizer" ? "hidden" : ""}`}
      >
        <div>
          <p className="eyebrow">Mastery tracks</p>
          <h2>Shape your next upgrades</h2>
        </div>
        <p>
          The current shared unlock cap is <b>{cap}</b>. Guardian Point balance
          never blocks planning; mastery gates always do.
        </p>
      </section>
      <div className={`class-grid ${tab === "optimizer" ? "hidden" : ""}`}>
        {CLASS_IDS.map((classId, index) => {
          const total = totals[classId],
            locked = total >= cap;
          return (
            <article
              className={`class-card class-${index} ${locked ? "locked" : ""}`}
              key={classId}
            >
              <div className="class-header">
                <div
                  className={`class-icon icon-${classId}`}
                  aria-hidden="true"
                >
                  {classId === "warrior"
                    ? "⚔"
                    : classId === "ranged"
                      ? "🏹"
                      : classId === "tank"
                        ? "🛡"
                        : "✦"}
                </div>
                <div>
                  <h3>{CLASS_NAMES[classId]}</h3>
                  <p>
                    Class Mastery <strong>{total}</strong> / {cap}
                  </p>
                </div>
                <span className="ready-pill">
                  {locked ? "Locked" : "Ready"}
                </span>
              </div>
              <div className="progress">
                <span
                  style={{ width: `${Math.min(100, (total / cap) * 100)}%` }}
                />
              </div>
              {STAT_IDS.map((statId) => {
                const level = planned[classId][statId];
                const check = canUpgrade(planned, classId, statId);
                const sliderMax = Math.max(
                  initial[classId][statId],
                  Math.min(MAX_LEVEL, level + Math.max(0, cap - total)),
                );
                return (
                  <div className="stat-row" key={statId}>
                    <div className="stat-info">
                      <strong>{STAT_NAMES[statId]}</strong>
                      <span>
                        Initial {initial[classId][statId]} · Bonus +
                        {bonusPercent(statId, level).toFixed(1)}%
                      </span>
                      <small>
                        {upgradeCost(level + 1) === null
                          ? "Next cost unavailable"
                          : `${isSpeculativeCost(level + 1) ? "Estimated next" : "Next"}: ${money(upgradeCost(level + 1)!)}`}
                      </small>
                      <input
                        key={`${classId}-${statId}-${sliderMax}`}
                        className="level-slider"
                        type="range"
                        min={initial[classId][statId]}
                        max={sliderMax}
                        value={level}
                        onChange={(e) =>
                          slideTo(classId, statId, Number(e.target.value))
                        }
                        aria-label={`${STAT_NAMES[statId]} planned level`}
                        aria-valuemax={sliderMax}
                      />
                    </div>
                    <div className="stepper">
                      <button
                        onClick={() => subtract(classId, statId)}
                        disabled={level <= initial[classId][statId]}
                        aria-label={`Undo ${CLASS_NAMES[classId]} ${STAT_NAMES[statId]}`}
                      >
                        −
                      </button>
                      <input
                        className="level-input"
                        type="number"
                        min={initial[classId][statId]}
                        max={sliderMax}
                        value={level}
                        onChange={(e) =>
                          slideTo(classId, statId, Number(e.target.value))
                        }
                        aria-label={`Set ${CLASS_NAMES[classId]} ${STAT_NAMES[statId]} level`}
                      />
                      <button
                        onClick={() => add(classId, statId)}
                        className={!check.allowed ? "blocked" : ""}
                        aria-label={`Increase ${CLASS_NAMES[classId]} ${STAT_NAMES[statId]}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              {locked && (
                <p className="lock-hint">
                  All classes must reach mastery {cap} to unlock levels{" "}
                  {cap + 1}–{cap + 10}.
                </p>
              )}
            </article>
          );
        })}
      </div>
      <footer>
        <button onClick={clearAll}>Clear all saved data</button>
        <span>
          Levels 71–90 use speculative costs based on the observed ×2.5 scaling
          pattern.
        </span>
      </footer>
      {presetDialog && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal preset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-title"
          >
            <div className="modal-head">
              <div>
                <p className="eyebrow">Saved setup</p>
                <h2 id="preset-title">Name this preset</h2>
              </div>
              <button onClick={() => setPresetDialog(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="modal-copy">
              This saves the complete planned distribution for all four classes.
            </p>
            <label className="preset-name-field">
              <span>Preset name</span>
              <input
                autoFocus
                maxLength={40}
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmPreset();
                }}
                placeholder="Example: Warrior ATK + SD"
              />
            </label>
            <div className="modal-actions">
              <button
                className="ghost-button"
                onClick={() => setPresetDialog(false)}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={confirmPreset}
                disabled={!presetName.trim()}
              >
                Save preset
              </button>
            </div>
          </section>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
          >
            <div className="modal-head">
              <div>
                <p className="eyebrow">Real account state</p>
                <h2 id="edit-title">Edit current levels</h2>
              </div>
              <button onClick={() => setEditing(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="modal-copy">
              Enter each stat’s real level. Saving resets all planned upgrades
              so the plan stays consistent.
            </p>
            <div className="level-editor">
              {CLASS_IDS.map((classId) => (
                <fieldset key={classId}>
                  <legend>{CLASS_NAMES[classId]}</legend>
                  {STAT_IDS.map((statId) => (
                    <label key={statId}>
                      <span>{STAT_NAMES[statId]}</span>
                      <input
                        type="number"
                        min="0"
                        max={MAX_LEVEL}
                        value={draft[classId][statId]}
                        onChange={(e) =>
                          setDraft((old) => {
                            const next = clone(old);
                            next[classId][statId] = Math.max(
                              0,
                              Math.min(
                                MAX_LEVEL,
                                Math.floor(Number(e.target.value) || 0),
                              ),
                            );
                            return next;
                          })
                        }
                      />
                    </label>
                  ))}
                  <strong>Mastery {classTotal(draft, classId)}</strong>
                </fieldset>
              ))}
            </div>
            <div className="modal-actions">
              <button
                className="ghost-button"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button className="primary-button" onClick={confirmEditor}>
                Save & reset plan
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
