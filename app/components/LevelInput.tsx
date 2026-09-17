import { useRef, useState, type KeyboardEvent } from "react";

/** Keep partially typed numbers intact; validate only on blur/Enter. */
export function LevelInput({
  value,
  min = 0,
  max = 90,
  label,
  onCommit,
}: {
  value: number;
  min?: number;
  max?: number;
  label: string;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const cancelled = useRef(false);
  function commit() {
    if (cancelled.current) {
      cancelled.current = false;
      setText(null);
      return;
    }
    const parsed = Number(text ?? value);
    onCommit(
      Number.isFinite(parsed)
        ? Math.max(min, Math.min(max, Math.floor(parsed)))
        : value,
    );
    setText(null);
  }
  function keyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      cancelled.current = true;
      e.currentTarget.blur();
    }
  }
  return (
    <input
      className="level-input"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={text ?? value}
      aria-label={label}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={keyDown}
    />
  );
}
