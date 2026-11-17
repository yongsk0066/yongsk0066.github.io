import { formatCount } from "./format.ts";
import "./theme.css";

export function mount(container: HTMLElement, { state, signal }: {
  state: Record<string, unknown>;
  signal: AbortSignal;
}) {
  let count = Number(state.count || 0);
  const heading = document.createElement("h1");
  heading.textContent = "순수 DOM 프로젝트";
  const button = document.createElement("button");
  const input = document.createElement("input");
  input.setAttribute("aria-label", "메모");
  input.value = String(state.note || "");
  const render = () => { button.textContent = formatCount(count); };
  button.addEventListener("click", () => { count++; render(); }, { signal });
  container.append(heading, button, input);
  render();
  // The adapter aborts listeners before replacing this mount. The explicit
  // state bag survives compatible edits and is cleared by restarting the frame.
  return () => { state.count = count; state.note = input.value; };
}
