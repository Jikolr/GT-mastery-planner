import {
  CLASS_IDS,
  CLASS_NAMES,
  MAX_LEVEL,
  STAT_IDS,
  STAT_NAMES,
  bonusPercent,
  cumulativeStatCost,
  guardianPointsAfterReset,
  sanitizeLevel,
  upgradeCost,
  type ClassId,
  type StatId,
} from "../game/mastery";
import { useI18n } from "../i18n";
import type { ResetSetup } from "../state";
import { ClassIcon } from "./ClassIcon";
import { LevelInput } from "./LevelInput";

export function ResetCalculator({
  setup,
  onChange,
  onUseAccount,
  onUsePlan,
}: {
  setup: ResetSetup;
  onChange: (setup: ResetSetup) => void;
  onUseAccount: () => void;
  onUsePlan: () => void;
}) {
  const { t, money } = useI18n();
  const invested = guardianPointsAfterReset(setup.levels, 0);
  const total = guardianPointsAfterReset(setup.levels, setup.guardianPoints);

  function changeLevel(classId: ClassId, statId: StatId, requested: number) {
    const levels = structuredClone(setup.levels);
    levels[classId][statId] = sanitizeLevel(requested);
    onChange({ ...setup, levels });
  }

  return (
    <section
      className="reset-calculator summary-card"
      aria-labelledby="reset-heading"
    >
      <div className="summary-heading">
        <div>
          <p className="eyebrow">{t("Reset calculator")}</p>
          <h2 id="reset-heading">{t("Calculate your points after a reset")}</h2>
        </div>
        <div className="actions">
          <button className="ghost-button" onClick={onUseAccount}>
            {t("Use saved account")}
          </button>
          <button className="ghost-button" onClick={onUsePlan}>
            {t("Use planner distribution")}
          </button>
        </div>
      </div>
      <p className="reset-description">
        {t(
          "Enter your current distribution and unspent Guardian Points to see your total after a reset.",
        )}
      </p>
      <div className="summary-grid reset-budget">
        <label>
          <span>{t("Unspent Guardian Points")}</span>
          <input
            inputMode="numeric"
            value={setup.guardianPoints}
            onChange={(event) =>
              onChange({
                ...setup,
                guardianPoints: Math.min(
                  Number.MAX_SAFE_INTEGER,
                  Number(event.target.value.replace(/\D/g, "")) || 0,
                ),
              })
            }
          />
        </label>
        <div className="metric reset-invested">
          <span>{t("Points invested")}</span>
          <strong>{money(invested)}</strong>
        </div>
        <div className="metric reset-total">
          <span id="reset-points-label">
            {t("Guardian Points after reset")}
          </span>
          <output aria-labelledby="reset-points-label">{money(total)}</output>
        </div>
      </div>
      <h3 className="reset-distribution-heading">
        {t("Current distribution")}
      </h3>
      <div className="class-grid">
        {CLASS_IDS.map((c) => (
          <article
            className={`class-card class-${c}`}
            role="group"
            aria-labelledby={`reset-${c}-heading`}
            key={c}
          >
            <div className="class-header">
              <ClassIcon id={c} />
              <h3 id={`reset-${c}-heading`}>{t(CLASS_NAMES[c])}</h3>
            </div>
            {STAT_IDS.map((s) => {
              const level = setup.levels[c][s];
              const nextCost = upgradeCost(level + 1);
              const label = t("{class} {stat} reset level", {
                class: t(CLASS_NAMES[c]),
                stat: t(STAT_NAMES[s]),
              });
              return (
                <div className="stat-row" key={s}>
                  <div className="stat-info">
                    <strong>{t(STAT_NAMES[s])}</strong>
                    <span>
                      {t("Bonus +{bonus}%", {
                        bonus: bonusPercent(s, level).toFixed(1),
                      })}
                    </span>
                    <small>
                      {nextCost === null
                        ? t("Maximum level reached")
                        : `${t("Next")}: ${money(nextCost)}`}
                    </small>
                    <input
                      className="level-slider"
                      type="range"
                      min={0}
                      max={MAX_LEVEL}
                      value={level}
                      aria-label={label}
                      onChange={(event) =>
                        changeLevel(c, s, Number(event.target.value))
                      }
                    />
                  </div>
                  <div className="stepper">
                    <button
                      disabled={level === 0}
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
                      label={label}
                      onCommit={(value) => changeLevel(c, s, value)}
                    />
                    <button
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
            <div className="reset-class-cost">
              <span>
                {t("Invested in {class}", { class: t(CLASS_NAMES[c]) })}
              </span>
              <strong>
                {money(
                  STAT_IDS.reduce(
                    (sum, s) => sum + cumulativeStatCost(0, setup.levels[c][s]),
                    0,
                  ),
                )}
              </strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
