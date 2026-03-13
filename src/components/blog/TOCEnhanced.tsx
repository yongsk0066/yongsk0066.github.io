import {
  motion,
  useSpring,
  useMotionValue,
  useMotionValueEvent,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Heading {
  depth: number;
  slug: string;
  text: string;
}

interface TOCEnhancedProps {
  headings: Heading[];
}

// ─── Proximity constants (adapted from DD line-minimap) ──────────────────────

/** Max index distance before the effect falls off completely */
const PROXIMITY_RANGE = 3;

/** Spring config for text property transitions */
const TEXT_SPRING = { stiffness: 400, damping: 35, mass: 0.8 };

/** Spring config for the indicator bar position */
const INDICATOR_SPRING = { stiffness: 300, damping: 30, mass: 0.6 };

// ─── Proximity calculation ───────────────────────────────────────────────────

/**
 * Compute a 0..1 proximity factor from the active index.
 * 0 = far away (beyond PROXIMITY_RANGE), 1 = active item itself.
 *
 * Inspired by DD's `transformScale`:
 *   normalizedDistance = 1 - |distance| / DISTANCE_LIMIT
 *   factor = normalizedDistance^2
 */
function proximityFactor(itemIndex: number, activeIndex: number): number {
  const distance = Math.abs(itemIndex - activeIndex);
  if (distance > PROXIMITY_RANGE) return 0;
  const normalized = 1 - distance / PROXIMITY_RANGE;
  return normalized * normalized; // quadratic falloff like DD
}

// ─── Per-item animated component ─────────────────────────────────────────────

function TOCItem({
  heading,
  index,
  activeIndex,
}: {
  heading: Heading;
  index: number;
  activeIndex: MotionValue<number>;
}) {
  const opacity = useSpring(0.4, TEXT_SPRING);
  const fontWeight = useSpring(400, TEXT_SPRING);
  const scale = useSpring(1, TEXT_SPRING);

  useMotionValueEvent(activeIndex, "change", (latest) => {
    const factor = proximityFactor(index, latest);

    // Active item (factor ≈ 1): full opacity, bold, slight scale-up
    // Adjacent (factor ≈ 0.44): medium opacity/weight
    // Far (factor = 0): dim, normal weight
    opacity.set(0.4 + factor * 0.6);           // 0.4 → 1.0
    fontWeight.set(400 + factor * 200);         // 400 → 600
    scale.set(1 + factor * 0.02);               // 1 → 1.02
  });

  const depthMargin = heading.depth === 3 ? 16 : heading.depth === 4 ? 32 : 0;

  return (
    <motion.li
      className="toc-enhanced-item relative list-none"
      style={{
        marginLeft: depthMargin,
      }}
    >
      <motion.a
        href={`#${heading.slug}`}
        className="toc-enhanced-link block text-xs text-zinc-900 no-underline truncate leading-relaxed"
        style={{
          opacity,
          fontWeight,
          scale,
          transformOrigin: "left center",
        }}
        title={heading.text}
      >
        {heading.text}
      </motion.a>
    </motion.li>
  );
}

// ─── Active section indicator bar ────────────────────────────────────────────

function ActiveIndicator({
  y,
  height,
}: {
  y: MotionValue<number>;
  height: MotionValue<number>;
}) {
  return (
    <motion.div
      className="absolute left-0 w-[2px] rounded-full bg-zinc-900"
      style={{
        y,
        height,
        transformOrigin: "top left",
      }}
    />
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TOCEnhanced({ headings }: TOCEnhancedProps) {
  const filtered = headings.filter((h) => h.depth >= 2 && h.depth <= 4);
  const listRef = useRef<HTMLUListElement>(null);
  const activeIndex = useMotionValue(-1);
  const indicatorY = useSpring(0, INDICATOR_SPRING);
  const indicatorHeight = useSpring(0, INDICATOR_SPRING);
  const [mounted, setMounted] = useState(false);

  // ── Observe headings in the document ───────────────────────────────────────

  const updateIndicator = useCallback(
    (index: number) => {
      if (!listRef.current || index < 0) return;
      const items = listRef.current.querySelectorAll(".toc-enhanced-item");
      const item = items[index] as HTMLElement | undefined;
      if (!item) return;

      const listRect = listRef.current.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      indicatorY.set(itemRect.top - listRect.top);
      indicatorHeight.set(itemRect.height);
    },
    [indicatorY, indicatorHeight],
  );

  useEffect(() => {
    setMounted(true);

    const headingEls = filtered
      .map((h) => document.getElementById(h.slug))
      .filter(Boolean) as HTMLElement[];

    if (headingEls.length === 0) return;

    // Track which headings are currently visible
    const visibleSet = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSet.add(entry.target.id);
          } else {
            visibleSet.delete(entry.target.id);
          }
        });

        // Find the topmost visible heading
        let topIndex = -1;
        for (let i = 0; i < filtered.length; i++) {
          if (visibleSet.has(filtered[i].slug)) {
            topIndex = i;
            break;
          }
        }

        // If nothing visible, find the last heading that's above the viewport
        if (topIndex === -1) {
          for (let i = filtered.length - 1; i >= 0; i--) {
            const el = document.getElementById(filtered[i].slug);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top < 100) {
                topIndex = i;
                break;
              }
            }
          }
        }

        if (topIndex >= 0) {
          activeIndex.set(topIndex);
          updateIndicator(topIndex);
        }
      },
      {
        // Offset to detect headings near the top of the viewport
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      },
    );

    headingEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [filtered, activeIndex, updateIndicator]);

  // Re-calculate indicator position on resize
  useEffect(() => {
    const handleResize = () => {
      const current = Math.round(activeIndex.get());
      if (current >= 0) updateIndicator(current);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeIndex, updateIndicator]);

  if (filtered.length === 0) return null;

  return (
    <nav
      className="relative"
      aria-label="Table of Contents (enhanced)"
      style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.3s ease" }}
    >
      {/* Active indicator bar */}
      <ActiveIndicator y={indicatorY} height={indicatorHeight} />

      {/* TOC list */}
      <ul
        ref={listRef}
        className="relative list-none space-y-1.5 pl-3 m-0"
      >
        {filtered.map((heading, index) => (
          <TOCItem
            key={heading.slug}
            heading={heading}
            index={index}
            activeIndex={activeIndex}
          />
        ))}
      </ul>
    </nav>
  );
}
