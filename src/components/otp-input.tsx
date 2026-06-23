import { useEffect, useRef } from "react";

export function OtpInput({
  length = 6,
  value,
  onChange,
  autoFocus = true,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  const setAt = (i: number, c: string) => {
    const next = chars.slice();
    next[i] = c;
    onChange(next.join(""));
  };

  return (
    <div className="flex justify-between gap-2">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="otp-input"
          inputMode="numeric"
          maxLength={1}
          value={c}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, v);
            if (v && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (!text) return;
            e.preventDefault();
            onChange(text.padEnd(length, "").slice(0, length));
            refs.current[Math.min(text.length, length - 1)]?.focus();
          }}
        />
      ))}
    </div>
  );
}
