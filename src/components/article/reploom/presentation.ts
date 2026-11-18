import type { PlaygroundView } from "@yongsk0066/reploom-ui/react";

type Presentation = { view?: PlaygroundView; file?: string };

const examples: Record<string, Presentation> = {
  "move-before-problem": { view: "preview" },
  "move-before-solution": { view: "preview" },
  "react-counter": { file: "/src/counter.ts" },
  "compute-primes": { file: "/primes.ts" },
};

export function presentationFor(project: string): Presentation {
  return examples[project] ?? {};
}
