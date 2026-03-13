import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";

interface PostData {
  title: string;
  description?: string;
  date: string;
  draft?: boolean;
  categories?: string[];
}

interface PostEntry {
  id: string;
  collection: string;
  data: PostData;
}

interface YearGroup {
  year: string;
  posts: PostEntry[];
}

interface Props {
  years: YearGroup[];
  isDev: boolean;
}

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.165, 0.84, 0.44, 1],
      delay: index * 0.05,
    },
  }),
};

function PostCard({ post, isDev }: { post: PostEntry; isDev: boolean }) {
  return (
    <a
      href={`/${post.collection}/${post.id}`}
      className="relative group flex flex-nowrap py-3 pr-10 rounded-lg hover:text-black transition-colors duration-300 ease-in-out antialiased"
    >
      <div className="flex flex-col flex-1 truncate">
        <div className="font-bold text-zinc-600 group-hover:text-black transition-colors duration-300 ease-in-out whitespace-normal break-all line-clamp-2">
          {post.data.title}
          {isDev && post.data.draft && (
            <span className="inline-flex items-center ml-2 px-1.5 py-0.5 text-[10px] font-medium leading-none text-orange-600 bg-orange-100 rounded align-middle">
              DRAFT
            </span>
          )}
        </div>
        <div className="text-sm line-clamp-2 whitespace-normal break-all text-semibold">
          {post.data.description}
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="absolute top-1/2 right-2 -translate-y-1/2 size-5 stroke-2 fill-none stroke-current"
      >
        <line
          x1="5"
          y1="12"
          x2="19"
          y2="12"
          className="translate-x-3 group-hover:translate-x-0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-in-out"
        />
        <polyline
          points="12 5 19 12 12 19"
          className="-translate-x-1 group-hover:translate-x-0 transition-transform duration-300 ease-in-out"
        />
      </svg>
    </a>
  );
}

export default function AnimatedPostList({ years, isDev }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    // After hydration, trigger the stagger animation.
    // client:visible ensures this only runs when the component is in the viewport.
    if (prefersReducedMotion) {
      setShouldAnimate(true);
      return;
    }

    // Small delay to ensure CSS initial state (opacity: 0) is applied
    // before framer-motion takes over, preventing a flash.
    const raf = requestAnimationFrame(() => {
      setShouldAnimate(true);
    });

    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion]);

  let globalIndex = 0;

  return (
    <div className="space-y-4">
      {years.map(({ year, posts }) => {
        const sectionStartIndex = globalIndex;
        globalIndex += posts.length;

        return (
          <section
            key={year}
            className="space-y-4"
            data-year={year}
          >
            <motion.div
              className="font-semibold text-black"
              initial={{ opacity: 0, y: 8 }}
              animate={
                prefersReducedMotion || shouldAnimate
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 8 }
              }
              transition={{
                duration: 0.3,
                ease: [0.165, 0.84, 0.44, 1],
                delay: sectionStartIndex * 0.05,
              }}
            >
              {year}
            </motion.div>
            <div>
              <ul className="flex flex-col gap-4">
                {posts.map((post, i) => {
                  const itemIndex = sectionStartIndex + i;
                  return (
                    <motion.li
                      key={post.id}
                      data-categories={JSON.stringify(
                        post.data.categories || []
                      )}
                      custom={itemIndex}
                      initial="hidden"
                      animate={
                        prefersReducedMotion || shouldAnimate
                          ? "visible"
                          : "hidden"
                      }
                      variants={itemVariants}
                    >
                      <PostCard post={post} isDev={isDev} />
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
