import type {
  MobileView,
  PlaygroundView,
  SourceLines,
} from "@yongsk0066/reploom-ui/react";

type Presentation = {
  view?: PlaygroundView;
  mobile?: MobileView;
  file?: string;
  highlight?: SourceLines;
};

const examples: Record<string, Presentation> = {
  "move-before-problem": { view: "preview" },
  "move-before-solution": { view: "preview" },
  "react-counter": { file: "/src/counter.ts" },
  "compute-primes": { file: "/primes.ts" },
};

export function presentationFor(project: string): Presentation {
  if (/^effect-event-(ko|en|ja)-[123]$/.test(project)) {
    return {
      mobile: "preview",
      highlight: project.endsWith("-3") ? [9, 14] : undefined,
    };
  }
  return examples[project] ?? {};
}
