// src/components/user/decode-board/FlapSlot.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { buildCycleSequence, TIMING, type SlotPhase } from "./constants";

interface FlapSlotProps {
  phase: SlotPhase;
  targetChar: string;
  onLocked?: () => void;
  prefersReducedMotion?: boolean;
}

const cycleSequence = buildCycleSequence();
const NBSP = "\u00A0";

export function FlapSlot({ phase, targetChar, onLocked, prefersReducedMotion = false }: FlapSlotProps) {
  const [displayChar, setDisplayChar] = useState(NBSP);
  const [isFlipping, setIsFlipping] = useState(false);
  const cycleIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhaseRef = useRef<SlotPhase>(phase);

  const clearCycling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle phase transitions
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === "waiting") {
      clearCycling();
      setDisplayChar(NBSP);
      return;
    }

    if (phase === "cycling") {
      clearCycling();

      // If reduced motion, skip to locked immediately
      if (prefersReducedMotion) {
        setDisplayChar(targetChar);
        setIsFlipping(false);
        return;
      }

      const interval = TIMING.FLIP_INTERVAL_FAST_MS;
      intervalRef.current = setInterval(() => {
        cycleIndexRef.current =
          (cycleIndexRef.current + 1) % cycleSequence.length;
        setIsFlipping(true);
        const char = cycleSequence[cycleIndexRef.current];
        if (char) setDisplayChar(char);
        // Remove flip class after animation
        setTimeout(() => setIsFlipping(false), 40);
      }, interval);
      return;
    }

    if (phase === "decelerating") {
      clearCycling();
      // Run through a decelerating sequence: 3 flips at increasing intervals
      const intervals = [100, 150, 200];
      let step = 0;

      const decel = () => {
        if (step >= intervals.length) {
          // Final: lock to target
          setDisplayChar(targetChar);
          setIsFlipping(false);
          return;
        }
        cycleIndexRef.current =
          (cycleIndexRef.current + 1) % cycleSequence.length;
        setIsFlipping(true);
        const char = cycleSequence[cycleIndexRef.current];
        if (char) setDisplayChar(char);
        setTimeout(() => setIsFlipping(false), 40);
        step++;
        intervalRef.current = setTimeout(decel, intervals[step - 1]);
      };

      decel();
      return;
    }

    if (phase === "locked") {
      clearCycling();
      setDisplayChar(targetChar);
      setIsFlipping(false);
      if (prevPhase !== "locked" && onLocked) {
        onLocked();
      }
      return;
    }
  }, [phase, targetChar, clearCycling, onLocked, prefersReducedMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearCycling();
  }, [clearCycling]);

  const isLocked = phase === "locked";

  return (
    <div
      data-testid="flap-slot"
      className={`flap-slot relative flex items-center justify-center
                  rounded-sm border
                  ${isLocked
                    ? "locked border-[rgba(255,77,20,0.3)] bg-[#2A2D30]"
                    : "border-[rgba(255,255,255,0.06)] bg-[#2A2D30]"}
                  h-10 w-8 sm:h-12 sm:w-10 md:h-[4.5rem] md:w-14`}
    >
      {/* Crease line */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[rgba(0,0,0,0.4)]" />

      {/* Character */}
      <span
        data-testid="flap-char"
        className={`flap-char select-none font-mono text-xl leading-none
                    sm:text-2xl md:text-4xl
                    ${isFlipping ? "flap-char-flip" : ""}
                    ${isLocked ? "text-[#FF4D14]" : "text-[#C8CCD0]"}`}
      >
        {displayChar}
      </span>
    </div>
  );
}
