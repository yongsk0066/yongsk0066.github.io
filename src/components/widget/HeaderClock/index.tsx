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

function HeaderClock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevChars = useRef<string[]>([]);

  useEffect(() => {
    document.getElementById("header-clock-placeholder")?.remove();

    const container = containerRef.current!;
    const chars = INITIAL.split("");

    // Build initial DOM: 8 digit-slots + 2 digit-seps
    chars.forEach((ch) => {
      const slot = document.createElement("span");
      slot.className = ch === ":" ? "digit-sep" : "digit-slot";
      const inner = document.createElement("span");
      inner.textContent = ch;
      slot.appendChild(inner);
      container.appendChild(slot);
    });
    prevChars.current = chars;

    // Map from full string index to digit-slot index (skipping ":" positions)
    const digitIndices = chars
      .map((ch, i) => (ch !== ":" ? i : -1))
      .filter((i) => i !== -1);

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

    // Initial transition: stagger left→right for digit slots only
    const initialTimer = setTimeout(() => {
      const time = formatTime();
      const newChars = time.split("");
      const slots = container.children;

      digitIndices.forEach((charIdx, order) => {
        setTimeout(() => rollSlot(slots[charIdx], newChars[charIdx]), order * 50);
      });

      prevChars.current = newChars;
    }, 100);

    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return <div ref={containerRef} className="header__clock text-sm" />;
}

export default HeaderClock;
