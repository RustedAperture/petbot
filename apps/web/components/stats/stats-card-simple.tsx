"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "../ui/card";
import { NativeCounterUp } from "../uitripled/native-counter-up-carbon";

const FLASH_DURATION_MS = 1500;

interface StatsCardProps {
  statString: string;
  value: number;
  /** Shows a brief "+1" each time this changes to a new defined value; the initial value never flashes. */
  flashKey?: number;
}

export default function StatsCardSimple({ statString, value, flashKey }: StatsCardProps) {
  const isReducedMotion = useReducedMotion();
  const [activeFlashKey, setActiveFlashKey] = useState<number | null>(null);
  const previousFlashKey = useRef(flashKey);

  useEffect(() => {
    const isNewDefinedKey = flashKey !== undefined && flashKey !== previousFlashKey.current;
    previousFlashKey.current = flashKey;
    if (!isNewDefinedKey) {
      setActiveFlashKey(null);
      return;
    }
    setActiveFlashKey(flashKey);
    const timeout = setTimeout(() => setActiveFlashKey(null), FLASH_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [flashKey]);

  return (
    <Card className="relative mx-auto w-full justify-center dark:bg-linear-to-l from-primary/10 to-50%">
      <CardContent className="flex items-center justify-between gap-1">
        <b>{statString}</b>
        <span className="flex items-center gap-1.5">
          {activeFlashKey !== null && (
            <motion.span
              key={activeFlashKey}
              aria-hidden
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
              initial={{ opacity: isReducedMotion ? 1 : 0 }}
              animate={{ opacity: isReducedMotion ? 1 : [0, 1, 1, 0] }}
              transition={{ duration: FLASH_DURATION_MS / 1000, times: [0, 0.15, 0.7, 1] }}
            >
              +1
            </motion.span>
          )}
          <NativeCounterUp value={value} className="font-normal" />
        </span>
      </CardContent>
    </Card>
  );
}
