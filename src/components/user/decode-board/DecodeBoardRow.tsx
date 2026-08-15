// src/components/user/decode-board/DecodeBoardRow.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { FlapSlot } from "./FlapSlot";
import { TIMING, type DecodePhase, type SlotPhase } from "./constants";

interface DecodeBoardRowProps {
  label: string;
  characters: string[];
  decodePhase: DecodePhase;
  isResolved: boolean;
  onAllLocked?: () => void;
  prefersReducedMotion?: boolean;
}

export function DecodeBoardRow({
  label,
  characters,
  decodePhase,
  isResolved,
  onAllLocked,
  prefersReducedMotion = false,
}: DecodeBoardRowProps) {
  const isOutRow = label.toUpperCase() === "OUT";
  const slotCount = characters.length || 6; // default 6 slots when no chars yet
  const chars = characters.length > 0 ? characters : Array(slotCount).fill("");

  const [slotPhases, setSlotPhases] = useState<SlotPhase[]>(
    Array(slotCount).fill("waiting"),
  );
  const lockedCountRef = useRef(0);
  const staggerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    staggerTimersRef.current.forEach((t) => clearTimeout(t));
    staggerTimersRef.current = [];
  }, []);

  // Manage OUT row staggered phases based on parent decode phase
  useEffect(() => {
    if (!isOutRow) return;

    if (decodePhase === "idle") {
      clearTimers();
      lockedCountRef.current = 0;
      setSlotPhases(Array(slotCount).fill("waiting"));
      return;
    }

    if (decodePhase === "expanding") {
      clearTimers();
      lockedCountRef.current = 0;
      setSlotPhases(Array(slotCount).fill("waiting"));
      return;
    }

    if (decodePhase === "decoding") {
      // Start cycling with stagger
      clearTimers();
      lockedCountRef.current = 0;
      const newPhases = Array(slotCount).fill("waiting") as SlotPhase[];
      setSlotPhases([...newPhases]);

      for (let i = 0; i < slotCount; i++) {
        const timer = setTimeout(() => {
          setSlotPhases((prev) => {
            const next = [...prev];
            next[i] = "cycling";
            return next;
          });
        }, i * TIMING.SLOT_STAGGER_MS);
        staggerTimersRef.current.push(timer);
      }
      return;
    }
  }, [decodePhase, isOutRow, slotCount, clearTimers]);

  // When API resolves during decoding, start locking slots
  useEffect(() => {
    if (!isOutRow || !isResolved || decodePhase !== "resolved") return;

    clearTimers();
    const actualCount = characters.length;

    // Update slot count to match actual characters if needed
    setSlotPhases((prev) => {
      const next = Array(actualCount).fill("cycling") as SlotPhase[];
      return next;
    });

    // Stagger the cycling → decelerating → locked transition for each slot
    const DECELERATION_DURATION_MS = 450; // 100 + 150 + 200 ms

    for (let i = 0; i < actualCount; i++) {
      // First, transition to decelerating
      const decelTimer = setTimeout(() => {
        setSlotPhases((prev) => {
          const next = [...prev];
          next[i] = "decelerating";
          return next;
        });
      }, i * TIMING.SLOT_STAGGER_MS);
      staggerTimersRef.current.push(decelTimer);

      // Then, after deceleration duration, transition to locked
      const lockTimer = setTimeout(() => {
        setSlotPhases((prev) => {
          const next = [...prev];
          next[i] = "locked";
          return next;
        });
      }, i * TIMING.SLOT_STAGGER_MS + DECELERATION_DURATION_MS);
      staggerTimersRef.current.push(lockTimer);
    }
  }, [isResolved, decodePhase, isOutRow, characters.length, clearTimers]);

  const handleSlotLocked = useCallback(() => {
    lockedCountRef.current++;
    if (lockedCountRef.current >= characters.length && onAllLocked) {
      onAllLocked();
    }
  }, [characters.length, onAllLocked]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // For IN row: show chars statically in locked state
  const inRowPhases = chars.map(() => "locked" as SlotPhase);

  const resolvedLabel =
    isOutRow && decodePhase === "resolved" && characters.length > 0;

  return (
    <div className="flex items-center gap-3">
      {/* Row label */}
      <span
        className={`w-20 shrink-0 text-right font-mono text-xs font-semibold
                    uppercase tracking-[0.15em]
                    ${resolvedLabel ? "text-[#FF4D14]" : "text-[#5A5F63]"}`}
      >
        {resolvedLabel ? "resolved" : label}
      </span>

      {/* Flap slots */}
      <div className={`flex gap-1 ${characters.length > 8 ? "flex-wrap" : ""}`}>
        {chars.map((char, i) => (
          <FlapSlot
            key={`${label}-${i}`}
            phase={isOutRow ? (slotPhases[i] ?? "waiting") : (inRowPhases[i] ?? "locked")}
            targetChar={char}
            onLocked={isOutRow ? handleSlotLocked : undefined}
            prefersReducedMotion={prefersReducedMotion}
            isOutput={isOutRow}
          />
        ))}
      </div>
    </div>
  );
}
