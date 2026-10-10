import { useEffect, useMemo, useRef, useState } from "react";
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
  editPlan,
  hoursUntilAffordable,
  isLegalDistribution,
  isSpeculativeCost,
  optimizeTarget,
  routeStages,
  targetDate,
  totalPlannedCost,
  unlockedCap,
  upgradeCost,
  type ClassId,
  type Levels,
  type StatId,
} from "./game/mastery";
import {
  LEGACY_KEY,
  LEGACY_PRESETS_KEY,
  PRESET_LIMIT,
  newSnapshot,
  parseBackup,
  parseSetupHash,
  serializeBackup,
  setupHash,
  type Snapshot,
  type Preset,
} from "./state";
import { usePlanner } from "./usePlanner";
import { Modal } from "./components/Modal";
import { LevelInput } from "./components/LevelInput";
import { OfflineStatus } from "./pwa";
import { useI18n, korean, type Message } from "./i18n";
import warriorIcon from "../Assets/warrior.svg";
import rangedIcon from "../Assets/ranged.svg";
import tankIcon from "../Assets/tank.svg";
import supportIcon from "../Assets/support.svg";

const ICONS = {
  warrior: warriorIcon,
  ranged: rangedIcon,
  tank: tankIcon,
  support: supportIcon,
};
const clone = (levels: Levels) => structuredClone(levels);
function download(text: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Icon({ id }: { id: ClassId }) {
  return (
    <span className={`class-icon icon-${id}`} aria-hidden="true">
      <img src={ICONS[id]} alt="" />
    </span>
  );
}
function Distribution({ levels }: { levels: Levels }) {
  const { t } = useI18n();
  return (
    <div className="distribution-grid">
      {CLASS_IDS.map((c) => (
        <article className={`distribution-card class-${c}`} key={c}>
          <div className="class-header">
            <Icon id={c} />
            <h3>{t(CLASS_NAMES[c])}</h3>
            <small>
              {t("Mastery")} {classTotal(levels, c)}
            </small>
          </div>
          <dl>
            {STAT_IDS.map((s) => (
              <div key={s}>
                <dt>{t(STAT_NAMES[s].replace(" Increase", ""))}</dt>
                <dd>{levels[c][s]}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}

export default function Home() {
  const {
    t,
    language,
    locale,
    toggle,
    preferenceError,
    number,
    money,
    duration: formatDuration,
  } = useI18n();
  const duration = (cost: number, points: number, income: number) => {
    const hours = hoursUntilAffordable(deficitFor(points - cost), income);
    return hours === null
      ? t("Income unavailable")
      : hours === 0
        ? t("Available now")
        : formatDuration(hours);
  };
  const { data, setData, loaded, blocked, setBlocked, saveError, saveStatus } =
    usePlanner();
  const { guardianPoints, income, initial, planned, targets, presets } = data;
  const [tab, setTab] = useState<"planner" | "optimizer">("planner");
  const [notice, setNotice] = useState<Message | null>(
    loaded.blocked ? null : (loaded.warning ?? null),
  );
  const [draft, setDraft] = useState<Levels | null>(null);
  const [editorError, setEditorError] = useState("");
  const [presetName, setPresetName] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Preset | null>(null);
  const [clearing, setClearing] = useState(false);
  const [imported, setImported] = useState<Snapshot | null>(null);
  const [comparison, setComparison] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shared, setShared] = useState<Levels | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [clock, setClock] = useState(() => new Date());
  const optimization = useMemo(
    () => optimizeTarget(initial, targets),
    [initial, targets],
  );
  const stages = useMemo(
    () => routeStages(initial, optimization.steps),
    [initial, optimization.steps],
  );
  const comparingPreset = presets.find((p) => p.id === comparison);
  const alternative = useMemo(
    () =>
      comparingPreset ? optimizeTarget(initial, comparingPreset.levels) : null,
    [initial, comparingPreset],
  );
  const activePlan = tab === "optimizer" ? optimization.plan : planned;
  const cost =
    tab === "optimizer"
      ? optimization.cost
      : totalPlannedCost(initial, planned);
  const remaining = guardianPoints - cost;
  const deficit = deficitFor(remaining);
  const eta = deficit > 0 ? targetDate(clock, deficit, income) : null;
  const cap = unlockedCap(planned);
  const totals = classTotals(planned);
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    function readLink() {
      try {
        setShared(parseSetupHash(location.hash));
      } catch (error) {
        setNotice((error as Error).message);
      }
    }
    readLink();
    window.addEventListener("hashchange", readLink);
    return () => window.removeEventListener("hashchange", readLink);
  }, []);
  function patch(values: Partial<Snapshot>) {
    setData((old) => ({ ...old, ...values }));
  }
  function changeLevel(c: ClassId, s: StatId, value: number) {
    const result = editPlan(initial, planned, c, s, value);
    patch({ planned: result.plan });
    setNotice(result.message ?? null);
  }
  function savePreset() {
    if (!renaming && presets.length >= PRESET_LIMIT) {
      setNotice("The 10-preset limit is reached. Delete a preset first.");
      return;
    }
    const name = presetName?.trim();
    if (!name) return;
    setData((old) => ({
      ...old,
      presets: renaming
        ? old.presets.map((p) => (p.id === renaming ? { ...p, name } : p))
        : [
            ...old.presets,
            { id: crypto.randomUUID(), name, levels: clone(activePlan) },
          ].slice(0, PRESET_LIMIT),
    }));
    setPresetName(null);
    setRenaming(null);
    setNotice("Preset saved.");
  }
  function loadPreset(preset: Preset) {
    const result = optimizeTarget(initial, preset.levels);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    patch({ planned: result.plan });
    setTab("planner");
    const fillers = result.steps.filter((s) => s.reason === "unlock").length;
    setNotice({
      key: fillers
        ? "“{name}” loaded for your current account. Added {count} prerequisite levels to keep it legal."
        : "“{name}” loaded for your current account.",
      values: { name: preset.name, count: fillers },
    });
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000)
        throw new Error("Backup is too large (maximum 100 KB).");
      setImported(parseBackup(await file.text()));
    } catch (error) {
      const reason =
        error instanceof SyntaxError
          ? "Invalid JSON backup file."
          : error instanceof Error && Object.hasOwn(korean, error.message)
            ? error.message
            : "Unable to read this backup file.";
      setNotice({ key: "Import failed: {error}", values: { error: reason } });
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function closeShared() {
    setShared(null);
    history.replaceState(null, "", location.pathname + location.search);
  }
  function clearAll() {
    try {
      localStorage.removeItem(LEGACY_KEY);
      localStorage.removeItem(LEGACY_PRESETS_KEY);
    } catch {
      /* Save status reports unavailable storage. */
    }
    const fresh = newSnapshot();
    fresh.guardianPoints = 0;
    fresh.income = 0;
    setData(fresh);
    setBlocked(false);
    setClearing(false);
    setComparison("");
    setNotice("All planner levels, targets and presets cleared.");
  }
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">GT</div>
        <div>
          <p className="eyebrow">{t("Guardian Tales Utility")}</p>
          <h1>
            {t("Mastery Planner")} <small>v{__APP_VERSION__}</small>
          </h1>
        </div>
        <span
          className={`save-state ${blocked || saveError ? "save-error" : ""}`}
          role="status"
        >
          <i />
          {t(saveStatus)}
        </span>
        <button
          type="button"
          className="ghost-button language-toggle"
          onClick={toggle}
          aria-label={language === "en" ? "Switch to Korean" : "영어로 전환"}
        >
          <span
            lang="en"
            className={language === "en" ? "selected-language" : ""}
          >
            English
          </span>
          <span aria-hidden="true"> / </span>
          <span
            lang="ko"
            className={language === "ko" ? "selected-language" : ""}
          >
            한국어
          </span>
        </button>
      </header>
      {preferenceError && (
        <p role="status" className="storage-warning">
          {t("Language preference could not be saved on this device.")}
        </p>
      )}
      {(blocked || saveError) && (
        <aside className="storage-warning" role="alert">
          <p>{t(saveError ?? loaded.warning)}</p>
          {loaded.recovery && (
            <button
              className="ghost-button"
              onClick={() =>
                download(loaded.recovery!, "guardian-mastery-recovery.json")
              }
            >
              {t("Download recovery data")}{" "}
            </button>
          )}
        </aside>
      )}
      <OfflineStatus />
      <nav className="tabs" aria-label={t("Planner views")}>
        <button
          aria-current={tab === "planner" ? "page" : undefined}
          className={tab === "planner" ? "active" : ""}
          onClick={() => setTab("planner")}
        >
          {t("Planner")}{" "}
        </button>
        <button
          aria-current={tab === "optimizer" ? "page" : undefined}
          className={tab === "optimizer" ? "active" : ""}
          onClick={() => setTab("optimizer")}
        >
          {t("Target optimizer")}{" "}
        </button>
      </nav>
      <div className="speculative-note" role="note">
        <strong>{t("Estimated levels:")}</strong>{" "}
        {t(
          "costs for levels 71–90 are speculative projections assuming the observed ×2.5 scaling continues after level 70.",
        )}{" "}
      </div>
      <section className={`summary-card ${remaining < 0 ? "is-negative" : ""}`}>
        <div className="summary-heading">
          <div>
            <p className="eyebrow">{t("Your resources")}</p>
            <h2>
              {tab === "optimizer"
                ? t("Your target budget")
                : t("Plan without limits")}
            </h2>
          </div>
          <div className="actions">
            <button
              className="preset-save-button"
              disabled={presets.length >= PRESET_LIMIT || !!optimization.error}
              onClick={() => {
                setRenaming(null);
                setPresetName("");
              }}
            >
              {t(tab === "optimizer" ? "Save result" : "Save preset")} (
              {presets.length}/10)
            </button>
            {tab === "planner" && (
              <>
                <button
                  className="ghost-button"
                  onClick={() => {
                    patch({ planned: clone(initial) });
                    setNotice("Planned upgrades reset to your current levels.");
                  }}
                >
                  {t("Reset plan")}{" "}
                </button>
                <button
                  className="ghost-button"
                  onClick={() => {
                    patch({ targets: clone(planned) });
                    setTab("optimizer");
                  }}
                >
                  {t("Optimize this plan")}{" "}
                </button>
              </>
            )}
            <button
              className="primary-button"
              onClick={() => {
                setDraft(clone(initial));
                setEditorError("");
              }}
            >
              {t("Edit current levels")}{" "}
            </button>
          </div>
        </div>
        <div className="summary-grid">
          <label>
            <span>{t("Current Guardian Points")}</span>
            <input
              inputMode="numeric"
              value={guardianPoints}
              onChange={(e) =>
                patch({
                  guardianPoints: Math.min(
                    Number.MAX_SAFE_INTEGER,
                    Number(e.target.value.replace(/\D/g, "")) || 0,
                  ),
                })
              }
            />
          </label>
          <label>
            <span>{t("Guardian Points / hour")}</span>
            <input
              inputMode="numeric"
              value={income}
              onChange={(e) =>
                patch({
                  income: Math.min(
                    Number.MAX_SAFE_INTEGER,
                    Number(e.target.value.replace(/\D/g, "")) || 0,
                  ),
                })
              }
            />
          </label>
          <div className="metric">
            <span>
              {tab === "optimizer"
                ? t("Target route cost")
                : t("Planned upgrade cost")}
            </span>
            <strong title={money(cost)}>{money(cost)}</strong>
          </div>
          <div className="metric highlight">
            <span>{t("Remaining Guardian Points")}</span>
            <strong title={money(remaining)}>{money(remaining)}</strong>
          </div>
        </div>
        {deficit > 0 && (
          <div className="deficit-strip">
            <div>
              <span>{t("Missing Guardian Points")}</span>
              <strong>{money(deficit)}</strong>
            </div>
            <div>
              <span>{t("Time required")}</span>
              <strong>{duration(cost, guardianPoints, income)}</strong>
            </div>
            <div>
              <span>{t("Enough points on")}</span>
              <strong>
                {eta
                  ? eta.toLocaleString(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : income > 0
                    ? t("Beyond calendar range")
                    : t("Set an income above zero")}
              </strong>
            </div>
          </div>
        )}
        <div className="data-toolbar">
          <button
            onClick={() =>
              download(
                serializeBackup(data),
                `guardian-mastery-backup-${new Date().toISOString().slice(0, 10)}.json`,
              )
            }
          >
            {t("Export backup")}{" "}
          </button>
          <button onClick={() => fileInput.current?.click()}>
            {t("Import backup")}{" "}
          </button>
          <button
            onClick={() =>
              setShareLink(
                `https://jikolr.github.io/GT-mastery-planner/${setupHash(tab === "optimizer" ? targets : planned)}`,
              )
            }
          >
            {t("Share setup")}{" "}
          </button>
          <span>{t("Stored on this device · no account required")}</span>
          <input
            hidden
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            aria-label={t("Import planner backup")}
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </div>
        {presets.length > 0 && (
          <div className="preset-shelf">
            <div>
              <span>{t("Saved presets")}</span>
              <small>{presets.length}/10</small>
            </div>
            <div className="preset-list">
              {presets.map((p) => (
                <div className="preset-chip" key={p.id}>
                  <button
                    onClick={() => loadPreset(p)}
                    title={t("Load {name}", { name: p.name })}
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => {
                      setRenaming(p.id);
                      setPresetName(p.name);
                    }}
                    aria-label={t("Rename {name}", { name: p.name })}
                  >
                    ✎
                  </button>
                  <button
                    className="preset-delete"
                    onClick={() => setDeleting(p)}
                    aria-label={t("Delete {name}", { name: p.name })}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      {notice && (
        <div className="notice" role="status">
          <p>{t(notice)}</p>
          <button
            onClick={() => setNotice(null)}
            aria-label={t("Dismiss message")}
          >
            ×
          </button>
        </div>
      )}
      {tab === "optimizer" ? (
        <section className="optimizer-panel">
          <div className="mastery-intro">
            <div>
              <p className="eyebrow">{t("Target setup")}</p>
              <h2>{t("Find the fastest legal route")}</h2>
            </div>
            <div className="optimizer-intro-actions">
              <p>
                {t(
                  "Enter desired levels; mastery prerequisites are added automatically.",
                )}{" "}
              </p>
              <button
                className="ghost-button"
                onClick={() => patch({ targets: clone(initial) })}
              >
                {t("Reset targets")}{" "}
              </button>
            </div>
          </div>
          <div className="target-grid">
            {CLASS_IDS.map((c) => (
              <fieldset key={c}>
                <legend>{t(CLASS_NAMES[c])}</legend>
                {STAT_IDS.map((s) => (
                  <label key={s}>
                    <span>{t(STAT_NAMES[s])}</span>
                    <LevelInput
                      value={targets[c][s]}
                      label={t("{class} {stat} target", {
                        class: t(CLASS_NAMES[c]),
                        stat: t(STAT_NAMES[s]),
                      })}
                      onCommit={(value) => {
                        const next = clone(targets);
                        next[c][s] = value;
                        patch({ targets: next });
                      }}
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          {optimization.error ? (
            <p role="alert">{t(optimization.error)}</p>
          ) : (
            <>
              <div className="optimizer-result">
                <div>
                  <span>{t("Route cost")}</span>
                  <strong>{money(optimization.cost)}</strong>
                </div>
                <div>
                  <span>{t("Upgrades")}</span>
                  <strong>{optimization.steps.length}</strong>
                </div>
                <div>
                  <span>{t("Time required")}</span>
                  <strong>
                    {duration(optimization.cost, guardianPoints, income)}
                  </strong>
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    patch({ planned: clone(optimization.plan) });
                    setTab("planner");
                    setNotice("Optimized plan applied.");
                  }}
                >
                  {t("Apply this plan")}{" "}
                </button>
              </div>
              <div className="route-list">
                <h3>{t("Recommended distribution")}</h3>
                <Distribution levels={optimization.plan} />
              </div>
              <div className="comparison">
                <label>
                  {t("Compare with a saved preset")}{" "}
                  <select
                    value={comparingPreset ? comparison : ""}
                    onChange={(e) => setComparison(e.target.value)}
                  >
                    <option value="">{t("Choose a preset")}</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                {alternative && (
                  <div>
                    <p>
                      <strong>{comparingPreset?.name}</strong>:{" "}
                      {money(alternative.cost)} ·{" "}
                      {duration(alternative.cost, guardianPoints, income)}
                    </p>
                    <p>
                      {t(
                        alternative.cost >= optimization.cost
                          ? "{cost} more than this target, including prerequisites."
                          : "{cost} less than this target, including prerequisites.",
                        {
                          cost: money(
                            Math.abs(alternative.cost - optimization.cost),
                          ),
                        },
                      )}
                    </p>
                    <Distribution levels={alternative.plan} />
                  </div>
                )}
              </div>
              <section className="journey">
                <h3>{t("Your upgrade route")}</h3>
                <p className="muted">
                  {t(
                    "Follow the purchases in order. Times use cumulative cost, your current balance and a constant income; update your resources after collecting points.",
                  )}{" "}
                </p>
                {stages.length === 0 ? (
                  <p>
                    {t("Your current account already meets these targets.")}
                  </p>
                ) : (
                  stages.map((stage, i) => (
                    <details
                      key={stage.cap}
                      className="route-stage"
                      open={stages.length === 1 ? true : undefined}
                    >
                      <summary>
                        <strong>
                          {i + 1}. {t("Mastery cap {cap}", { cap: stage.cap })}
                        </strong>
                        <span>{money(stage.cost)}</span>
                        <span>
                          {duration(
                            stage.cumulativeCost,
                            guardianPoints,
                            income,
                          )}
                        </span>
                      </summary>
                      <div className="stage-content">
                        <p>
                          {t(
                            "{targets} target upgrades · {unlocks} prerequisite upgrades · Total spent: {cost}",
                            {
                              targets: stage.targetCount,
                              unlocks: stage.unlockCount,
                              cost: money(stage.cumulativeCost),
                            },
                          )}
                          {stage.resultingCap > stage.cap &&
                            ` · ${t("Unlocks cap {cap}", { cap: stage.resultingCap })}`}
                        </p>
                        <ol>
                          {stage.steps.map((step, j) => (
                            <li key={j}>
                              <span className={`step-reason ${step.reason}`}>
                                {step.reason === "target"
                                  ? t("Target")
                                  : t("Unlock")}
                              </span>
                              <span>
                                {t(CLASS_NAMES[step.classId])} ·{" "}
                                {t(
                                  STAT_NAMES[step.statId].replace(
                                    " Increase",
                                    "",
                                  ),
                                )}{" "}
                                {step.destination - 1} → {step.destination}
                              </span>
                              <strong>
                                {isSpeculativeCost(step.destination)
                                  ? "≈ "
                                  : ""}
                                {money(step.cost)}
                              </strong>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </details>
                  ))
                )}
              </section>
            </>
          )}
        </section>
      ) : (
        <>
          <section className="mastery-intro">
            <div>
              <p className="eyebrow">{t("Mastery tracks")}</p>
              <h2>{t("Shape your next upgrades")}</h2>
            </div>
            <p>
              {t("Shared unlock cap:")} <b>{cap}</b>
              {t(
                ". All classes must reach each gate before any class can cross it.",
              )}{" "}
            </p>
          </section>
          <div className="class-grid">
            {CLASS_IDS.map((c) => {
              const total = totals[c],
                locked = total >= cap;
              return (
                <article
                  className={`class-card class-${c} ${locked ? "locked" : ""}`}
                  key={c}
                >
                  <div className="class-header">
                    <Icon id={c} />
                    <div>
                      <h3>{t(CLASS_NAMES[c])}</h3>
                      <p>
                        {t("Class Mastery")} <strong>{total}</strong> / {cap}
                      </p>
                    </div>
                    <span className="ready-pill">
                      {locked ? t("Locked") : t("Ready")}
                    </span>
                  </div>
                  <div
                    className="progress"
                    role="progressbar"
                    aria-label={t("{class} mastery", {
                      class: t(CLASS_NAMES[c]),
                    })}
                    aria-valuenow={total}
                    aria-valuemin={0}
                    aria-valuemax={cap}
                  >
                    <span
                      style={{
                        width: `${Math.min(100, (total / cap) * 100)}%`,
                      }}
                    />
                  </div>
                  {STAT_IDS.map((s) => {
                    const level = planned[c][s],
                      check = canUpgrade(planned, c, s);
                    const sliderMax = Math.max(
                      initial[c][s],
                      Math.min(MAX_LEVEL, level + Math.max(0, cap - total)),
                    );
                    const nextCost = upgradeCost(level + 1);
                    return (
                      <div className="stat-row" key={s}>
                        <div className="stat-info">
                          <strong>{t(STAT_NAMES[s])}</strong>
                          <span>
                            {t("Initial {level} · Bonus +{bonus}%", {
                              level: initial[c][s],
                              bonus: bonusPercent(s, level).toFixed(1),
                            })}
                          </span>
                          <small>
                            {nextCost === null
                              ? t("Maximum level reached")
                              : `${t(isSpeculativeCost(level + 1) ? "Estimated next" : "Next")}: ${money(nextCost)}`}
                          </small>
                          <input
                            key={`${c}-${s}-${sliderMax}`}
                            className="level-slider"
                            type="range"
                            min={initial[c][s]}
                            max={sliderMax}
                            value={level}
                            aria-label={t("{class} {stat} planned level", {
                              class: t(CLASS_NAMES[c]),
                              stat: t(STAT_NAMES[s]),
                            })}
                            onChange={(e) =>
                              changeLevel(c, s, Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="stepper">
                          <button
                            disabled={level <= initial[c][s]}
                            onClick={() => changeLevel(c, s, level - 1)}
                            aria-label={t("Undo {class} {stat}", {
                              class: t(CLASS_NAMES[c]),
                              stat: t(STAT_NAMES[s]),
                            })}
                          >
                            −
                          </button>
                          <LevelInput
                            value={level}
                            min={initial[c][s]}
                            label={t("Set {class} {stat} level", {
                              class: t(CLASS_NAMES[c]),
                              stat: t(STAT_NAMES[s]),
                            })}
                            onCommit={(v) => changeLevel(c, s, v)}
                          />
                          <button
                            className={!check.allowed ? "blocked" : ""}
                            disabled={level === MAX_LEVEL}
                            onClick={() => changeLevel(c, s, level + 1)}
                            aria-label={t("Increase {class} {stat}", {
                              class: t(CLASS_NAMES[c]),
                              stat: t(STAT_NAMES[s]),
                            })}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <p
                    className={`lock-hint ${locked ? "" : "reserved"}`}
                    aria-hidden={!locked}
                  >
                    {t(
                      "All classes must reach mastery {cap} to unlock mastery {from}–{to}.",
                      { cap, from: cap + 1, to: cap + 10 },
                    )}
                  </p>
                </article>
              );
            })}
          </div>
        </>
      )}
      <footer>
        <button onClick={() => setClearing(true)}>
          {t("Clear all saved data")}
        </button>
        <span>
          v{__APP_VERSION__} · {t("build")} {__BUILD_ID__}
        </span>
        <a
          href="https://github.com/Jikolr/GT-mastery-planner"
          target="_blank"
          rel="noreferrer"
        >
          {t("Source & help")}{" "}
        </a>
        <a
          href="https://github.com/Jikolr/GT-mastery-planner/releases"
          target="_blank"
          rel="noreferrer"
        >
          {t("Desktop downloads")}{" "}
        </a>
      </footer>
      {draft && (
        <Modal title={t("Edit current levels")} onClose={() => setDraft(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isLegalDistribution(draft)) {
                setEditorError(
                  "These class totals break a mastery gate. The highest class must not exceed the next ten-level cap above the lowest class.",
                );
                return;
              }
              patch({ initial: clone(draft), planned: clone(draft) });
              setDraft(null);
              setNotice(
                "Current levels saved. Plan reset; your optimizer targets were kept.",
              );
            }}
          >
            <p className="modal-copy">
              {t(
                "Enter the levels already purchased in game. Saving resets planned upgrades.",
              )}{" "}
            </p>
            <div className="level-editor">
              {CLASS_IDS.map((c) => (
                <fieldset key={c}>
                  <legend>{t(CLASS_NAMES[c])}</legend>
                  {STAT_IDS.map((s) => (
                    <label key={s}>
                      <span>{t(STAT_NAMES[s])}</span>
                      <LevelInput
                        value={draft[c][s]}
                        label={t("{class} {stat} current level", {
                          class: t(CLASS_NAMES[c]),
                          stat: t(STAT_NAMES[s]),
                        })}
                        onCommit={(v) => {
                          const next = clone(draft);
                          next[c][s] = v;
                          setDraft(next);
                        }}
                      />
                    </label>
                  ))}
                  <strong>
                    {t("Mastery")} {classTotal(draft, c)}
                  </strong>
                </fieldset>
              ))}
            </div>
            {editorError && (
              <p role="alert" className="form-error">
                {t(editorError)}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setDraft(null)}
              >
                {t("Cancel")}{" "}
              </button>
              <button className="primary-button" type="submit">
                {t("Save & reset plan")}{" "}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {presetName !== null && (
        <Modal
          title={renaming ? t("Rename preset") : t("Name this preset")}
          onClose={() => setPresetName(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePreset();
            }}
          >
            <p className="modal-copy">
              {renaming
                ? t("Choose a new name.")
                : t(
                    tab === "optimizer"
                      ? "Save the recommended distribution for all four classes."
                      : "Save the planned distribution for all four classes.",
                  )}
            </p>
            <label className="preset-name-field">
              {t("Preset name")}{" "}
              <input
                autoFocus
                required
                maxLength={40}
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={!presetName.trim()}
              >
                {t("Save preset")}{" "}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={t("Delete “{name}”?", { name: deleting.name })}
          onClose={() => setDeleting(null)}
        >
          <p className="modal-copy">
            {t(
              "This removes this preset from this device. Your current plan is kept.",
            )}{" "}
          </p>
          <div className="modal-actions">
            <button className="ghost-button" onClick={() => setDeleting(null)}>
              {t("Cancel")}{" "}
            </button>
            <button
              className="danger-button"
              onClick={() => {
                patch({ presets: presets.filter((p) => p.id !== deleting.id) });
                setDeleting(null);
              }}
            >
              {t("Delete preset")}{" "}
            </button>
          </div>
        </Modal>
      )}
      {clearing && (
        <Modal
          title={t("Clear all saved data?")}
          onClose={() => setClearing(false)}
        >
          <p className="modal-copy">
            {t(
              "This deletes account levels, resources, targets and all {count} presets on this device. Export a backup first if you want to keep them.",
              { count: presets.length },
            )}
          </p>
          <div className="modal-actions">
            <button
              className="ghost-button"
              onClick={() =>
                download(serializeBackup(data), "guardian-mastery-backup.json")
              }
            >
              {t("Export backup")}{" "}
            </button>
            <button className="ghost-button" onClick={() => setClearing(false)}>
              {t("Cancel")}{" "}
            </button>
            <button className="danger-button" onClick={clearAll}>
              {t("Clear everything")}{" "}
            </button>
          </div>
        </Modal>
      )}
      {imported && (
        <Modal
          title={t("Restore this backup?")}
          onClose={() => setImported(null)}
        >
          <p className="modal-copy">
            {t(
              "Replace this device’s account levels, resources, targets and presets with the backup: {count} presets, {points}, {income} GP/hour. Missing mastery prerequisites are recalculated.",
              {
                count: imported.presets.length,
                points: money(imported.guardianPoints),
                income: number.format(imported.income),
              },
            )}
          </p>
          <Distribution levels={imported.planned} />
          <div className="modal-actions">
            <button className="ghost-button" onClick={() => setImported(null)}>
              {t("Cancel")}{" "}
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setData(imported);
                setBlocked(false);
                setImported(null);
                setComparison("");
                setNotice("Backup restored.");
              }}
            >
              {t("Restore backup")}{" "}
            </button>
          </div>
        </Modal>
      )}
      {shareLink && (
        <Modal title={t("Share this setup")} onClose={() => setShareLink(null)}>
          <p className="modal-copy">
            {t(
              "This link includes only the target levels. Your points, income and preset names stay private.",
            )}{" "}
          </p>
          <label className="preset-name-field">
            {t("Setup link")}{" "}
            <input
              readOnly
              value={shareLink}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <div className="modal-actions">
            <button
              className="primary-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareLink);
                  setNotice("Setup link copied.");
                } catch {
                  setNotice("Select the link and copy it manually.");
                }
              }}
            >
              {t("Copy link")}{" "}
            </button>
          </div>
        </Modal>
      )}
      {shared && (
        <Modal title={t("Shared setup")} onClose={closeShared}>
          <p className="modal-copy">
            {t(
              "Preview these targets. Your current account and presets are kept; the route will be calculated using your own resources.",
            )}{" "}
          </p>
          <Distribution levels={shared} />
          <div className="modal-actions">
            <button className="ghost-button" onClick={closeShared}>
              {t("Cancel")}{" "}
            </button>
            <button
              className="primary-button"
              onClick={() => {
                patch({ targets: shared });
                setTab("optimizer");
                closeShared();
              }}
            >
              {t("Use as targets")}{" "}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
