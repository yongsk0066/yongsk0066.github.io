/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type * as YTNamespace from "youtube";

declare global {
  const YT: typeof YTNamespace;
  namespace YT {
    type Player = YTNamespace.Player;
    type OnStateChangeEvent = YTNamespace.OnStateChangeEvent;
  }
}
