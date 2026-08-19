"use client";

import { useEffect, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "failed";
interface CopyState {
  readonly value: string | null;
  readonly status: CopyStatus;
}

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copyState, setCopyState] = useState<CopyState>({
    value: null,
    status: "idle",
  });
  const resetTimer = useRef<number | null>(null);
  const status = copyState.value === value ? copyState.status : "idle";

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copy(): Promise<void> {
    const requestedValue = value;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(requestedValue);
      setCopyState({ value: requestedValue, status: "copied" });
    } catch {
      setCopyState({ value: requestedValue, status: "failed" });
    }
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setCopyState((current) =>
        current.value === requestedValue
          ? { value: requestedValue, status: "idle" }
          : current,
      );
      resetTimer.current = null;
    }, 1400);
  }

  return (
    <button
      className="copy-button"
      type="button"
      onClick={() => void copy()}
      aria-live="polite"
    >
      {status === "copied"
        ? "Copied"
        : status === "failed"
          ? "Copy failed"
          : label}
    </button>
  );
}
