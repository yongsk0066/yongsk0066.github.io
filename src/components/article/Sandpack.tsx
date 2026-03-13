import { useState, useMemo, useRef } from "react";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  type SandpackPredefinedTemplate,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";

type FileValue = string | { code: string; hidden?: boolean; active?: boolean };

interface SandpackProps {
  files: Record<string, FileValue>;
  template?: SandpackPredefinedTemplate;
  showNavigator?: boolean;
  showTabs?: boolean;
  showLineNumbers?: boolean;
  editorHeight?: number;
  expandable?: boolean;
  dependencies?: Record<string, string>;
}

export default function Sandpack({
  files,
  template = "react",
  showNavigator = true,
  showTabs = true,
  showLineNumbers = true,
  editorHeight = 300,
  expandable = true,
  dependencies,
}: SandpackProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedFiles: SandpackFiles = useMemo(() => {
    const result: SandpackFiles = {};
    for (const [path, value] of Object.entries(files)) {
      if (typeof value === "string") {
        result[path] = { code: value };
      } else {
        result[path] = value;
      }
    }
    return result;
  }, [files]);

  const isLongContent = useMemo(() => {
    const mainFile = Object.values(normalizedFiles).find(
      (f) => typeof f !== "string" && !f.hidden
    );
    if (!mainFile || typeof mainFile === "string") return false;
    const lineCount = mainFile.code.split("\n").length;
    return lineCount > 16;
  }, [normalizedFiles]);

  const shouldShowExpandButton = expandable && isLongContent;

  const handleToggle = () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);

    if (!nextExpanded && containerRef.current) {
      containerRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  const currentEditorHeight = isExpanded ? 600 : editorHeight;

  return (
    <div className="sandpack-wrapper my-6" ref={containerRef}>
      <div
        className="rounded-lg overflow-hidden"
        style={{
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
        }}
      >
        <SandpackProvider
          files={normalizedFiles}
          template={template}
          theme="dark"
          customSetup={dependencies ? { dependencies } : undefined}
        >
          {/* Custom layout container */}
          <div
            className="flex flex-col lg:flex-row"
            style={{ background: "#151515" }}
          >
            <div className="w-full lg:w-1/2" style={{ height: currentEditorHeight }}>
              <SandpackCodeEditor
                showTabs={showTabs}
                showLineNumbers={showLineNumbers}
                style={{ height: "100%" }}
              />
            </div>
            <div className="w-full lg:w-1/2" style={{ height: editorHeight }}>
              <SandpackPreview
                showNavigator={showNavigator}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </SandpackProvider>
        {shouldShowExpandButton && (
          <button
            onClick={handleToggle}
            className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm flex items-center justify-center gap-2 transition-colors border-t border-zinc-700"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
