import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";

type Props = {
  href: string;
  title: string;
  description?: string;
  draft?: boolean;
  isDev?: boolean;
};

// Spring configs following DD principles:
// "higher stiffness = faster movement; lower damping = more bounce"
// For hover, we want responsive but NOT bouncy (no momentum in hover)
const CARD_SPRING = { stiffness: 400, damping: 25 };
// Arrow gets slightly lower damping for follow-through effect
const ARROW_SPRING = { stiffness: 400, damping: 20 };

export default function ArrowCardInteractive({
  href,
  title,
  description,
  draft,
  isDev,
}: Props) {
  const isHovered = useMotionValue(0);

  // Card transforms — subtle, not exaggerated
  const cardY = useSpring(0, CARD_SPRING);
  const cardScale = useSpring(1, CARD_SPRING);

  // Arrow transforms — follow-through with lower damping
  const arrowX = useSpring(0, ARROW_SPRING);
  // Arrow line scale for the reveal effect
  const arrowLineScaleX = useSpring(0, ARROW_SPRING);
  // Arrow line translate — starts offset, moves to 0
  const arrowLineX = useSpring(12, ARROW_SPRING);

  // Text color interpolation
  const titleColor = useTransform(isHovered, [0, 1], ["#52525b", "#000000"]);
  const titleColorSpring = useSpring(titleColor, CARD_SPRING);

  const handleHoverStart = () => {
    isHovered.set(1);
    cardY.set(-2);
    cardScale.set(1.015);
    arrowX.set(0);
    arrowLineScaleX.set(1);
    arrowLineX.set(0);
  };

  const handleHoverEnd = () => {
    isHovered.set(0);
    cardY.set(0);
    cardScale.set(1);
    arrowX.set(-4);
    arrowLineScaleX.set(0);
    arrowLineX.set(12);
  };

  return (
    <motion.a
      href={href}
      className="relative group flex flex-nowrap py-3 pr-10 rounded-lg antialiased"
      style={{
        y: cardY,
        scale: cardScale,
      }}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onFocus={handleHoverStart}
      onBlur={handleHoverEnd}
    >
      <div className="flex flex-col flex-1 truncate">
        <motion.div
          className="font-bold whitespace-normal break-all line-clamp-2"
          style={{ color: titleColorSpring }}
        >
          {title}
          {isDev && draft && (
            <span className="inline-flex items-center ml-2 px-1.5 py-0.5 text-[10px] font-medium leading-none text-orange-600 bg-orange-100 rounded align-middle">
              DRAFT
            </span>
          )}
        </motion.div>
        <div className="text-sm line-clamp-2 whitespace-normal break-all text-semibold">
          {description}
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="absolute top-1/2 right-2 -translate-y-1/2 size-5 stroke-2 fill-none stroke-current"
      >
        <motion.line
          x1="5"
          y1="12"
          x2="19"
          y2="12"
          style={{
            scaleX: arrowLineScaleX,
            x: arrowLineX,
          }}
        />
        <motion.polyline
          points="12 5 19 12 12 19"
          style={{
            x: arrowX,
          }}
        />
      </svg>
    </motion.a>
  );
}
