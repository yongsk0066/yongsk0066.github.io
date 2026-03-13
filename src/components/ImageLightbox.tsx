import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";

// --- Spring configs (DD: simulating-physics) ---
// Close is snappier than open (DD: "exit should be faster than entry")
const OPEN_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
const CLOSE_SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };
const INSTANT = { duration: 0 };

// --- Thresholds ---
const VELOCITY_DISMISS = 500; // px/s — fast drag dismisses immediately
const DISTANCE_DISMISS = 150; // px — slow drag past this distance dismisses
const DRAG_THRESHOLD = 3; // px — movement threshold before drag registers (DD: gesture conflicts)

// --- Rubber banding (DD: dampen function) ---
function dampen(val: number, max: number): number {
  const abs = Math.abs(val);
  if (abs > max) {
    const extra = abs - max;
    return Math.sign(val) * (max + Math.sqrt(extra) * 3);
  }
  return val;
}

// --- Contained gesture helpers (DD: contained-gestures) ---
const gesture = {
  start: () => {
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    const style = document.createElement("style");
    style.id = "lightbox-gesture";
    style.textContent =
      "body > *:not(#lightbox-overlay) { pointer-events: none !important; }";
    document.head.appendChild(style);
  },
  end: () => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.getElementById("lightbox-gesture")?.remove();
  },
};

export function ImageLightbox() {
  const [activeImage, setActiveImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Drag motion values
  const dragY = useMotionValue(0);
  const dragX = useMotionValue(0);
  const dragDistance = useMotionValue(0);

  // Interpolation: overlay opacity + image scale from drag distance (DD: responsive-interfaces)
  const overlayOpacity = useTransform(
    dragDistance,
    [0, DISTANCE_DISMISS * 2],
    [1, 0.2]
  );
  const imageScale = useTransform(
    dragDistance,
    [0, DISTANCE_DISMISS * 2],
    [1, 0.85]
  );

  const dragStarted = useRef(false); // Tracks if threshold was exceeded

  // Animation config respecting reduced motion
  const openTransition = prefersReducedMotion ? INSTANT : OPEN_SPRING;
  const closeTransition = prefersReducedMotion ? INSTANT : CLOSE_SPRING;

  // Open lightbox
  const openLightbox = useCallback(
    (img: HTMLImageElement) => {
      setActiveImage({
        src: img.src,
        alt: img.alt || "",
      });
      setIsOpen(true);
      document.documentElement.style.overflow = "hidden";
    },
    []
  );

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setIsOpen(false);
    document.documentElement.style.overflow = "";
    gesture.end();
    // Use onAnimationComplete instead of setTimeout where possible,
    // but AnimatePresence exit needs time — 300ms is conservative for spring
    const cleanupDelay = prefersReducedMotion ? 0 : 300;
    setTimeout(() => {
      setActiveImage(null);
      dragY.jump(0);
      dragX.jump(0);
      dragDistance.jump(0);
    }, cleanupDelay);
  }, [dragY, dragX, dragDistance, prefersReducedMotion]);

  // Esc key handler
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeLightbox]);

  // Attach click handlers to blog post images
  useEffect(() => {
    const postContent = document.getElementById("post-content");
    if (!postContent) return;

    const imgs = postContent.querySelectorAll("img");

    function handleClick(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      const img = e.currentTarget as HTMLImageElement;
      if (img.naturalWidth < 100 || img.naturalHeight < 100) return;
      openLightbox(img);
    }

    imgs.forEach((img) => {
      img.addEventListener("click", handleClick);
      // DD: ergonomic-interactions — cursor affordance
      img.style.cursor = "zoom-in";
    });

    return () => {
      imgs.forEach((img) => {
        img.removeEventListener("click", handleClick);
      });
    };
  }, [openLightbox]);

  // --- Drag handlers with threshold (DD: gesture conflicts) ---
  const onPanStart = useCallback(() => {
    dragStarted.current = false;
  }, []);

  const onPan = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      const rawY = info.offset.y;
      const rawX = info.offset.x;
      const dist = Math.sqrt(rawX * rawX + rawY * rawY);

      // DD: gesture conflicts — don't start drag until threshold exceeded
      if (!dragStarted.current) {
        if (dist < DRAG_THRESHOLD) return;
        dragStarted.current = true;
        gesture.start();
      }

      dragY.jump(dampen(rawY, DISTANCE_DISMISS));
      dragX.jump(dampen(rawX, DISTANCE_DISMISS));
      dragDistance.jump(dist);
    },
    [dragY, dragX, dragDistance]
  );

  const onPanEnd = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      if (!dragStarted.current) {
        // No significant drag occurred — treat as click to close
        return;
      }

      dragStarted.current = false;
      gesture.end();

      const speed = Math.sqrt(
        info.velocity.x * info.velocity.x + info.velocity.y * info.velocity.y
      );
      const dist = Math.sqrt(
        info.offset.x * info.offset.x + info.offset.y * info.offset.y
      );

      // DD: applying velocity — projected position determines dismiss
      if (speed > VELOCITY_DISMISS || dist > DISTANCE_DISMISS) {
        closeLightbox();
      } else {
        // Snap back with spring
        dragY.set(0);
        dragX.set(0);
        dragDistance.set(0);
      }
    },
    [closeLightbox, dragY, dragX, dragDistance]
  );

  // Click on overlay to close (DD: prefer click over mousedown for interruptibility)
  const onOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragStarted.current) return;
      if (
        e.target === e.currentTarget ||
        (e.target as HTMLElement).id === "lightbox-overlay-bg"
      ) {
        closeLightbox();
      }
    },
    [closeLightbox]
  );

  if (!activeImage && !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && activeImage && (
        <motion.div
          id="lightbox-overlay"
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ touchAction: "none" }}
          onClick={onOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={closeTransition}
        >
          {/* Background overlay — opacity driven by drag distance (interpolation) */}
          <motion.div
            id="lightbox-overlay-bg"
            className="absolute inset-0 bg-black/80"
            style={{ opacity: overlayOpacity }}
          />

          {/* Image — no layoutId since source imgs are plain HTML */}
          <motion.img
            src={activeImage.src}
            alt={activeImage.alt}
            className="relative max-h-[90vh] max-w-[90vw] object-contain rounded-lg select-none"
            style={{
              x: dragX,
              y: dragY,
              scale: imageScale,
              cursor: "grab",
              touchAction: "none",
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={isOpen ? openTransition : closeTransition}
            onPanStart={onPanStart}
            onPan={onPan}
            onPanEnd={onPanEnd}
            draggable={false}
            onPointerDown={(e: React.PointerEvent) => {
              // DD: contained-gestures — pointer capture
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
