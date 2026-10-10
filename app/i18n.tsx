import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { formatDuration as englishDuration } from "./game/mastery";

export type Language = "en" | "ko";
export const LANGUAGE_KEY = "gt-mastery-language";
export type Message =
  string | { key: string; values: Record<string, string | number> };

// English source strings are stable message keys. User content and saved stat IDs
// never pass through this catalog, so changing languages cannot alter a setup.
export const korean: Record<string, string> = {
  "Guardian Tales Utility": "가디언 테일즈 도우미",
  "Mastery Planner": "숙련도 플래너",
  "Guardian Tales Mastery Planner": "가디언 테일즈 숙련도 플래너",
  "GT Mastery Planner": "GT 숙련도 플래너",
  "Plan Guardian Tales mastery upgrades and estimate their cost.":
    "가디언 테일즈 숙련도 강화 계획을 세우고 필요한 비용을 계산하세요.",
  "Plan Guardian Tales mastery upgrades, calculate Guardian Point costs, find your upgrade route and save setups. Free web and desktop planner.":
    "가디언 테일즈 숙련도 강화, 가디언 포인트 비용 계산, 강화 경로 탐색과 프리셋 저장을 지원하는 무료 웹 및 데스크톱 플래너입니다.",
  Warrior: "전사",
  Ranged: "원거리",
  Tank: "탱커",
  Support: "지원가",
  "ATK Increase": "공격력 증가",
  "HP Increase": "체력 증가",
  "DEF Increase": "방어력 증가",
  "Skill Damage Increase": "기술 피해량 증가",
  ATK: "공격력",
  HP: "체력",
  DEF: "방어력",
  "Skill Damage": "기술 피해량",
  Mastery: "숙련도",
  "Class Mastery": "클래스 숙련도",
  Planner: "플래너",
  "Planner views": "플래너 화면",
  "Target optimizer": "목표 최적화",
  "Estimated levels:": "추정 구간:",
  "costs for levels 71–90 are speculative projections assuming the observed ×2.5 scaling continues after level 70.":
    "71~90레벨의 비용은 70레벨 이후에도 기존의 2.5배 증가 규칙이 유지된다고 가정한 추정치입니다.",
  "Your resources": "보유 자원",
  "Your target budget": "목표 달성 예산",
  "Plan without limits": "자유롭게 강화 계획 세우기",
  "Save preset": "프리셋 저장",
  "Save result": "결과 저장",
  "Reset plan": "계획 초기화",
  "Optimize this plan": "이 계획 최적화",
  "Edit current levels": "현재 레벨 수정",
  "Current Guardian Points": "현재 가디언 포인트",
  "Guardian Points / hour": "시간당 가디언 포인트",
  "Target route cost": "목표 경로 비용",
  "Planned upgrade cost": "계획된 강화 비용",
  "Remaining Guardian Points": "남은 가디언 포인트",
  "Missing Guardian Points": "부족한 가디언 포인트",
  "Time required": "필요 시간",
  "Enough points on": "포인트 확보 예상 일시",
  "Beyond calendar range": "표시 가능한 날짜 범위 초과",
  "Set an income above zero": "시간당 획득량을 0보다 크게 설정하세요",
  "Income unavailable": "획득량 정보 없음",
  "Available now": "지금 가능",
  "Export backup": "백업 내보내기",
  "Import backup": "백업 가져오기",
  "Share setup": "설정 공유",
  "Stored on this device · no account required": "이 기기에 저장 · 계정 불필요",
  "Import planner backup": "플래너 백업 가져오기",
  "Saved presets": "저장된 프리셋",
  "Load {name}": "{name} 불러오기",
  "Rename {name}": "{name} 이름 변경",
  "Delete {name}": "{name} 삭제",
  "Dismiss message": "메시지 닫기",
  "Target setup": "목표 설정",
  "Find the fastest legal route": "조건을 충족하는 최단 경로 찾기",
  "Enter desired levels; mastery prerequisites are added automatically.":
    "원하는 레벨을 입력하세요. 숙련도 선행 조건은 자동으로 추가됩니다.",
  "Reset targets": "목표 초기화",
  "{class} {stat} target": "{class} {stat} 목표 레벨",
  "Route cost": "경로 비용",
  Upgrades: "강화 횟수",
  "Apply this plan": "이 계획 적용",
  "Recommended distribution": "추천 분배",
  "Compare with a saved preset": "저장된 프리셋과 비교",
  "Choose a preset": "프리셋 선택",
  "{cost} more than this target, including prerequisites.":
    "선행 조건을 포함하면 이 목표보다 {cost} 더 필요합니다.",
  "{cost} less than this target, including prerequisites.":
    "선행 조건을 포함하면 이 목표보다 {cost} 적게 필요합니다.",
  "Your upgrade route": "강화 경로",
  "Follow the purchases in order. Times use cumulative cost, your current balance and a constant income; update your resources after collecting points.":
    "표시된 순서대로 강화하세요. 예상 시간은 누적 비용, 현재 잔액 및 일정한 포인트 획득량을 기준으로 계산됩니다. 포인트를 수령한 뒤에는 보유 자원을 갱신하세요.",
  "Your current account already meets these targets.":
    "현재 계정이 이미 모든 목표를 충족합니다.",
  "Mastery cap {cap}": "숙련도 상한 {cap}",
  "{targets} target upgrades · {unlocks} prerequisite upgrades · Total spent: {cost}":
    "목표 강화 {targets}회 · 선행 조건 강화 {unlocks}회 · 누적 비용: {cost}",
  "Unlocks cap {cap}": "상한 {cap} 해제",
  Target: "목표",
  Unlock: "조건 해제",
  "Mastery tracks": "클래스별 숙련도",
  "Shape your next upgrades": "다음 강화 계획 세우기",
  "Shared unlock cap:": "공통 숙련도 상한:",
  ". All classes must reach each gate before any class can cross it.":
    ". 모든 클래스가 해당 단계에 도달해야 다음 단계로 넘어갈 수 있습니다.",
  Locked: "잠김",
  Ready: "강화 가능",
  "{class} mastery": "{class} 숙련도",
  "Initial {level} · Bonus +{bonus}%": "현재 {level} · 추가 효과 +{bonus}%",
  "Maximum level reached": "최대 레벨 도달",
  Next: "다음 강화",
  "Estimated next": "다음 강화 예상 비용",
  "{class} {stat} planned level": "{class} {stat} 계획 레벨",
  "Undo {class} {stat}": "{class} {stat} 감소",
  "Set {class} {stat} level": "{class} {stat} 레벨 설정",
  "Increase {class} {stat}": "{class} {stat} 증가",
  "All classes must reach mastery {cap} to unlock mastery {from}–{to}.":
    "숙련도 {from}~{to} 구간을 해제하려면 모든 클래스가 숙련도 {cap}에 도달해야 합니다.",
  "Clear all saved data": "저장 데이터 모두 삭제",
  build: "빌드",
  "Source & help": "소스 코드 및 도움말",
  "Desktop downloads": "데스크톱 앱 다운로드",
  "Enter the levels already purchased in game. Saving resets planned upgrades.":
    "게임에서 이미 강화한 레벨을 입력하세요. 저장하면 강화 계획이 초기화됩니다.",
  "{class} {stat} current level": "{class} {stat} 현재 레벨",
  Cancel: "취소",
  "Save & reset plan": "저장 및 계획 초기화",
  "Rename preset": "프리셋 이름 변경",
  "Name this preset": "프리셋 이름 지정",
  "Choose a new name.": "새 이름을 입력하세요.",
  "Save the recommended distribution for all four classes.":
    "네 클래스의 추천 분배를 저장합니다.",
  "Save the planned distribution for all four classes.":
    "네 클래스의 계획된 분배를 저장합니다.",
  "Preset name": "프리셋 이름",
  "Delete “{name}”?": "‘{name}’ 프리셋을 삭제할까요?",
  "This removes this preset from this device. Your current plan is kept.":
    "이 기기에서 해당 프리셋을 삭제합니다. 현재 계획은 유지됩니다.",
  "Delete preset": "프리셋 삭제",
  "Clear all saved data?": "저장 데이터를 모두 삭제할까요?",
  "This deletes account levels, resources, targets and all {count} presets on this device. Export a backup first if you want to keep them.":
    "이 기기의 계정 레벨, 자원, 목표 및 프리셋 {count}개를 모두 삭제합니다. 데이터를 보관하려면 먼저 백업을 내보내세요.",
  "Clear everything": "모두 삭제",
  "Restore this backup?": "이 백업을 복원할까요?",
  "Replace this device’s account levels, resources, targets and presets with the backup: {count} presets, {points}, {income} GP/hour. Missing mastery prerequisites are recalculated.":
    "이 기기의 계정 레벨, 자원, 목표 및 프리셋을 백업 데이터로 바꿉니다. 프리셋 {count}개, {points}, 시간당 {income} GP. 누락된 숙련도 선행 조건은 다시 계산됩니다.",
  "Restore backup": "백업 복원",
  "Share this setup": "이 설정 공유",
  "This link includes only the target levels. Your points, income and preset names stay private.":
    "링크에는 목표 레벨만 포함됩니다. 보유 포인트, 획득량 및 프리셋 이름은 공유되지 않습니다.",
  "Setup link": "설정 링크",
  "Copy link": "링크 복사",
  "Shared setup": "공유된 설정",
  "Preview these targets. Your current account and presets are kept; the route will be calculated using your own resources.":
    "공유된 목표를 확인하세요. 현재 계정 정보와 프리셋은 유지되며, 보유 자원을 기준으로 경로가 계산됩니다.",
  "Use as targets": "목표로 사용",
  "Close dialog": "대화상자 닫기",
  "The 10-preset limit is reached. Delete a preset first.":
    "프리셋은 최대 10개까지 저장할 수 있습니다. 기존 프리셋을 먼저 삭제하세요.",
  "Preset saved.": "프리셋을 저장했습니다.",
  "“{name}” loaded for your current account.":
    "현재 계정 기준으로 ‘{name}’ 프리셋을 불러왔습니다.",
  "“{name}” loaded for your current account. Added {count} prerequisite levels to keep it legal.":
    "현재 계정 기준으로 ‘{name}’ 프리셋을 불러왔습니다. 조건을 충족하도록 선행 조건 레벨 {count}개를 추가했습니다.",
  "Import failed: {error}": "가져오기 실패: {error}",
  "All planner levels, targets and presets cleared.":
    "플래너 레벨, 목표 및 프리셋을 모두 삭제했습니다.",
  "Planned upgrades reset to your current levels.":
    "강화 계획을 현재 레벨로 초기화했습니다.",
  "Optimized plan applied.": "최적화된 계획을 적용했습니다.",
  "These class totals break a mastery gate. The highest class must not exceed the next ten-level cap above the lowest class.":
    "클래스별 합계가 숙련도 해제 조건을 충족하지 않습니다. 가장 높은 클래스의 합계는 가장 낮은 클래스 기준의 다음 10단위 상한을 초과할 수 없습니다.",
  "Current levels saved. Plan reset; your optimizer targets were kept.":
    "현재 레벨을 저장하고 계획을 초기화했습니다. 최적화 목표는 유지됩니다.",
  "Backup restored.": "백업을 복원했습니다.",
  "Setup link copied.": "설정 링크를 복사했습니다.",
  "Select the link and copy it manually.": "링크를 선택한 뒤 직접 복사하세요.",
  "Saved locally": "이 기기에 저장됨",
  "Saving paused": "저장 일시 중지",
  "Not saved": "저장되지 않음",
  "Saving…": "저장 중…",
  "Download recovery data": "복구 데이터 다운로드",
  "Browser storage is unavailable. Export a backup to keep your work.":
    "브라우저 저장소를 사용할 수 없습니다. 작업을 보관하려면 백업을 내보내세요.",
  "Saving failed: browser storage is full or unavailable. Export a backup before closing.":
    "저장 실패: 브라우저 저장소가 가득 찼거나 사용할 수 없습니다. 닫기 전에 백업을 내보내세요.",
  "Previous saves imported. Any missing mastery prerequisites were added to your plan; your real account levels were preserved.":
    "이전 저장 데이터를 가져왔습니다. 누락된 숙련도 선행 조건을 계획에 추가했으며, 실제 계정 레벨은 유지했습니다.",
  "Saved data could not be read. Automatic saving is paused to preserve it. Download recovery data, then import a backup or choose Clear all saved data to start again.":
    "저장 데이터를 읽을 수 없습니다. 원본 보호를 위해 자동 저장을 일시 중지했습니다. 복구 데이터를 다운로드한 뒤 백업을 가져오거나 ‘저장 데이터 모두 삭제’를 선택하여 다시 시작하세요.",
  "A backup can contain at most 10 presets.":
    "백업에는 프리셋을 최대 10개까지 포함할 수 있습니다.",
  "One or more presets are invalid.": "유효하지 않은 프리셋이 있습니다.",
  "This is not a valid planner backup. Check its version, resources and current mastery levels.":
    "유효한 플래너 백업이 아닙니다. 버전, 자원 및 현재 숙련도 레벨을 확인하세요.",
  "Invalid legacy data.": "이전 저장 데이터가 올바르지 않습니다.",
  "Backup is too large (maximum 100 KB).":
    "백업 파일이 너무 큽니다(최대 100KB).",
  "Choose a Guardian Tales planner backup JSON file.":
    "가디언 테일즈 플래너 백업 JSON 파일을 선택하세요.",
  "This setup link contains invalid levels.":
    "이 설정 링크에 유효하지 않은 레벨이 포함되어 있습니다.",
  "Invalid JSON backup file.": "백업 파일의 JSON 형식이 올바르지 않습니다.",
  "Unable to read this backup file.": "이 백업 파일을 읽을 수 없습니다.",
  "Current levels do not respect the shared mastery gates.":
    "현재 레벨이 공통 숙련도 해제 조건을 충족하지 않습니다.",
  "A target exceeds the available cost table.":
    "목표가 지원되는 비용표 범위를 초과합니다.",
  "The requested target could not be reached.":
    "요청한 목표에 도달할 수 없습니다.",
  "This reduction would remove a mastery prerequisite. Lower the higher classes first, or reset the plan.":
    "레벨을 낮추면 숙련도 선행 조건을 충족하지 못합니다. 더 높은 클래스의 레벨을 먼저 낮추거나 계획을 초기화하세요.",
  "Mastery gate reached at level {level}. Raise the other classes before continuing.":
    "{level}레벨에서 숙련도 상한에 도달했습니다. 계속하려면 다른 클래스의 레벨을 올리세요.",
  "Targets must be between level 0 and {level}.":
    "목표 레벨은 0~{level} 범위여야 합니다.",
  "A new version is ready.": "새 버전을 사용할 수 있습니다.",
  "Update application": "앱 업데이트",
  "Offline caching is unavailable in this browser. You can keep using the planner online.":
    "이 브라우저에서는 오프라인 캐시를 사용할 수 없습니다. 온라인에서는 계속 이용할 수 있습니다.",
  "Ready for offline use · use your browser’s Install app / Add to Home Screen option to keep it handy.":
    "오프라인 사용 준비 완료 · 브라우저의 ‘앱 설치’ 또는 ‘홈 화면에 추가’ 기능을 이용하세요.",
  "Language preference could not be saved on this device.":
    "이 기기에 언어 설정을 저장할 수 없습니다.",
};

export function translate(
  language: Language,
  message: Message | null | undefined,
  values: Record<string, string | number> = {},
): string {
  if (!message) return "";
  if (typeof message !== "string")
    return translate(language, message.key, message.values);
  // The domain engine deliberately remains language independent. Adapt its two
  // numeric messages at the presentation boundary, without changing saved IDs.
  const gate = message.match(
    /^Mastery gate reached at level (\d+)\. Raise the other classes before continuing\.$/,
  );
  const limit = message.match(/^Targets must be between level 0 and (\d+)\.$/);
  if (gate)
    return translate(
      language,
      "Mastery gate reached at level {level}. Raise the other classes before continuing.",
      { level: gate[1] },
    );
  if (limit)
    return translate(language, "Targets must be between level 0 and {level}.", {
      level: limit[1],
    });
  const template = language === "ko" ? (korean[message] ?? message) : message;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined
      ? match
      : key === "error"
        ? translate(language, String(value))
        : String(value);
  });
}

export function localizedDuration(hours: number, language: Language): string {
  if (language === "en") return englishDuration(hours);
  const minutes = Math.ceil(hours * 60),
    days = Math.floor(minutes / 1440),
    h = Math.floor((minutes % 1440) / 60),
    m = minutes % 60;
  return [
    days ? `${days}일` : "",
    h ? `${h}시간` : "",
    m || (!days && !h) ? `${m}분` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const LanguageContext = createContext<{
  language: Language;
  toggle: () => void;
  preferenceError: boolean;
}>({ language: "en", toggle: () => {}, preferenceError: false });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return localStorage.getItem(LANGUAGE_KEY) === "ko" ? "ko" : "en";
    } catch {
      return "en";
    }
  });
  const [preferenceError, setPreferenceError] = useState(false);
  function toggle() {
    const next = language === "en" ? "ko" : "en";
    setLanguage(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
      setPreferenceError(false);
    } catch {
      setPreferenceError(true);
    }
  }
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translate(language, "Guardian Tales Mastery Planner");
    // Keep the original copy so switching back is lossless. Crawlers still see
    // the English HTML; the open page's metadata follows the selected language.
    document
      .querySelectorAll<HTMLMetaElement>(
        'meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]',
      )
      .forEach((meta) => {
        const original = meta.dataset.originalContent ?? meta.content;
        meta.dataset.originalContent = original;
        meta.content = translate(language, original);
      });
  }, [language]);
  return (
    <LanguageContext.Provider value={{ language, toggle, preferenceError }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);
  const locale = context.language === "ko" ? "ko-KR" : "en-US";
  const number = new Intl.NumberFormat(locale);
  return {
    ...context,
    locale,
    number,
    t: (
      message: Message | null | undefined,
      values?: Record<string, string | number>,
    ) => translate(context.language, message, values),
    money: (value: number) => `${number.format(value)} GP`,
    duration: (hours: number) => localizedDuration(hours, context.language),
  };
}
