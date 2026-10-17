import {
  CLASS_IDS,
  CLASS_NAMES,
  STAT_IDS,
  STAT_NAMES,
  cumulativeStatCost,
  guardianPointsAfterReset,
} from "../game/mastery";
import { useI18n } from "../i18n";
import type { ResetSetup } from "../state";
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
      <div className="target-grid">
        {CLASS_IDS.map((c) => (
          <fieldset key={c}>
            <legend>{t(CLASS_NAMES[c])}</legend>
            {STAT_IDS.map((s) => (
              <label key={s}>
                <span>{t(STAT_NAMES[s])}</span>
                <LevelInput
                  value={setup.levels[c][s]}
                  label={t("{class} {stat} reset level", {
                    class: t(CLASS_NAMES[c]),
                    stat: t(STAT_NAMES[s]),
                  })}
                  onCommit={(value) => {
                    const levels = structuredClone(setup.levels);
                    levels[c][s] = value;
                    onChange({ ...setup, levels });
                  }}
                />
              </label>
            ))}
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
          </fieldset>
        ))}
      </div>
      <p className="reset-account-note">
        {t(
          "This calculator does not change your saved account, plan or optimizer targets.",
        )}
      </p>
    </section>
  );
}
