import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";

// --- Spring configs (DD: simulating-physics) ---
const OPEN_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
const CLOSE_SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };

// --- Thresholds ---
const VELOCITY_DISMISS = 500; // px/s — fast drag dismisses immediately
const DISTANCE_DISMISS = 150; // px — slow drag past this distance dismisses

// --- Rubber banding (DD: rubber-banding dampen function) ---
function dampen(val: number, max: number): number {
  const abs = Math.abs(val);
  if (abs > max) {
    const extra = abs - max;
    const dampenedExtra = Math.sqrt(extra) * 3;
    return Math.sign(val) * (max + dampenedExtra);
  }
  return val;
}

// --- Contained gesture helpers (DD: contained-gestures) ---
const gesture = {
  start: () => {
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    // Disable pointer events on everything else during drag
    const style = document.createElement("style");
    style.id = "lightbox-gesture";
    style.textContent = "body > *:not(#lightbox-overlay) { pointer-events: none !important; }";
    document.head.appendChild(style);
  },
  end: () => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.getElementById("lightbox-gesture")?.remove();
  },
};

interface LightboxImage {
  src: string;
  alt: string;
  rect: DOMRect;
}

export function ImageLightbox() {
  const [activeImage, setActiveImage] = useState<LightboxImage | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag motion values
  const dragY = useMotionValue(0);
  const dragX = useMotionValue(0);

  // Opacity linked to drag distance
  const dragDistance = useMotionValue(0);
  const overlayOpacity = useTransform(dragDistance, [0, DISTANCE_DISMISS * 2], [1, 0.2]);

  // Scale linked to drag distance for tactile feedback
  const imageScale = useTransform(dragDistance, [0, DISTANCE_DISMISS * 2], [1, 0.85]);

  const isDragging = useRef(false);

  // Open lightbox
  const openLightbox = useCallback((img: HTMLImageElement) => {
    const rect = img.getBoundingClientRect();
    setActiveImage({
      src: img.src,
      alt: img.alt || "",
      rect,
    });
    setIsOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = "";
    gesture.end();
    // Clean up after exit animation
    setTimeout(() => {
      setActiveImage(null);
      dragY.jump(0);
      dragX.jump(0);
      dragDistance.jump(0);
    }, 400);
  }, [dragY, dragX, dragDistance]);

  // Esc key handler
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        closeLightbox();
      }
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
      const img = e.currentTarget as HTMLImageElement;
      // Don't open for tiny images (icons, etc.)
      if (img.naturalWidth < 100 || img.naturalHeight < 100) return;
      openLightbox(img);
    }

    imgs.forEach((img) => {
      img.addEventListener("click", handleClick);
      img.style.cursor = "zoom-in";
      // Fitts' Law: expand hit area with padding (DD: ergonomic-interactions)
      img.style.padding = "8px";
      img.style.margin = "-8px";
      img.style.boxSizing = "content-box";
    });

    return () => {
      imgs.forEach((img) => {
        img.removeEventListener("click", handleClick);
      });
    };
  }, [openLightbox]);

  // --- Drag handlers ---
  const onPanStart = useCallback(() => {
    isDragging.current = true;
    gesture.start();
  }, []);

  const onPan = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      const rawY = info.offset.y;
      const rawX = info.offset.x;

      // Apply rubber banding beyond dismiss distance
      const dampedY = dampen(rawY, DISTANCE_DISMISS);
      const dampedX = dampen(rawX, DISTANCE_DISMISS);

      dragY.jump(dampedY);
      dragX.jump(dampedX);

      const dist = Math.sqrt(rawX * rawX + rawY * rawY);
      dragDistance.jump(dist);
    },
    [dragY, dragX, dragDistance]
  );

  const onPanEnd = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      isDragging.current = false;
      gesture.end();

      const speed = Math.sqrt(
        info.velocity.x * info.velocity.x + info.velocity.y * info.velocity.y
      );
      const dist = Math.sqrt(
        info.offset.x * info.offset.x + info.offset.y * info.offset.y
      );

      if (speed > VELOCITY_DISMISS || dist > DISTANCE_DISMISS) {
        // Dismiss
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

  // Click on overlay to close (but not during drag)
  const onOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging.current) return;
      // Only close if clicking the overlay, not the image
      if (e.target === e.currentTarget || (e.target as HTMLElement).id === "lightbox-overlay-bg") {
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
          ref={containerRef}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ touchAction: "none" }}
          onClick={onOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={CLOSE_SPRING}
        >
          {/* Background overlay */}
          <motion.div
            id="lightbox-overlay-bg"
            className="absolute inset-0 bg-black/80"
            style={{ opacity: overlayOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={OPEN_SPRING}
          />

          {/* Image */}
          <motion.img
            src={activeImage.src}
            alt={activeImage.alt}
            className="relative max-h-[90vh] max-w-[90vw] object-contain rounded-lg select-none"
            style={{
              x: dragX,
              y: dragY,
              scale: imageScale,
              cursor: isOpen ? "grab" : "default",
              touchAction: "none",
            }}
            layoutId={`lightbox-${activeImage.src}`}
            initial={{
              opacity: 0,
              scale: 0.7,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.7,
            }}
            transition={isOpen ? OPEN_SPRING : CLOSE_SPRING}
            onPanStart={onPanStart}
            onPan={onPan}
            onPanEnd={onPanEnd}
            draggable={false}
            onPointerDown={(e: React.PointerEvent) => {
              // Pointer capture (DD: contained-gestures)
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
