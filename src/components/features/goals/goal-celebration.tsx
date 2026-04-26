"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

type Props = {
  goalName: string;
  trigger: number; // ID care se schimbă pentru a re-trigger animația
};

export function GoalCelebration({ goalName, trigger }: Props) {
  useEffect(() => {
    if (!trigger) return;

    const duration = 1800;
    const end = Date.now() + duration;
    const colors = ["#10B981", "#F59E0B", "#A855F7", "#EC4899"];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
        scalar: 0.8,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
        scalar: 0.8,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    toast.success(`Felicitări! Ai atins „${goalName}”! 🎉`, {
      duration: 4000,
    });
  }, [trigger, goalName]);

  return null;
}
