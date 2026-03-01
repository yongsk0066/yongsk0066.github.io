import { useEffect, useRef } from "react";
import "./styles.css";

const INITIAL = "--:--:--";

function formatTime() {
  return new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function rollSlot(slot: Element, ch: string) {
  const current = slot.querySelector("span:not(.exiting)");
  if (current) {
    current.classList.add("exiting");
    current.addEventListener("transitionend", () => current.remove(), {
      once: true,
    });
  }
  const next = document.createElement("span");
  next.textContent = ch;
  slot.appendChild(next);
}

function buildSlots(container: HTMLElement, chars: string[]) {
  chars.forEach((ch) => {
    const slot = document.createElement("span");
    slot.className = ch === ":" ? "digit-sep" : "digit-slot";
    const inner = document.createElement("span");
    inner.textContent = ch;
    slot.appendChild(inner);
    container.appendChild(slot);
  });
}

function HeaderClock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevChars = useRef<string[]>([]);

  useEffect(() => {
    document.getElementById("header-clock-placeholder")?.remove();

    const container = containerRef.current!;
    const isRemount = (window as any).__headerClockMounted;

    if (isRemount) {
      // Re-mount (page transition): start with current time, no rolling
      const chars = formatTime().split("");
      buildSlots(container, chars);
      prevChars.current = chars;
    } else {
      // First mount: show --:--:-- then stagger-roll to current time
      const chars = INITIAL.split("");
      buildSlots(container, chars);
      prevChars.current = chars;

      const digitIndices = chars
        .map((ch, i) => (ch !== ":" ? i : -1))
        .filter((i) => i !== -1);

      const initialTimer = setTimeout(() => {
        const time = formatTime();
        const newChars = time.split("");
        const slots = container.children;

        digitIndices.forEach((charIdx, order) => {
          setTimeout(
            () => rollSlot(slots[charIdx], newChars[charIdx]),
            order * 50,
          );
        });

        prevChars.current = newChars;
      }, 100);

      (window as any).__headerClockInitialTimer = initialTimer;
      (window as any).__headerClockMounted = true;
    }

    function tick() {
      const newChars = formatTime().split("");
      const slots = container.children;

      newChars.forEach((ch, i) => {
        if (ch === prevChars.current[i]) return;
        const slot = slots[i];
        if (!slot || slot.classList.contains("digit-sep")) return;
        rollSlot(slot, ch);
      });

      prevChars.current = newChars;
    }

    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout((window as any).__headerClockInitialTimer);
      clearInterval(interval);
    };
  }, []);

  return <div ref={containerRef} className="header__clock text-sm" />;
}

export default HeaderClock;
