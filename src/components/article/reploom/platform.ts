import {
  createBrowserPlatform,
  type BrowserPlatform,
  type BrowserPlatformOptions,
  type Manifest,
} from "@yongsk0066/reploom/browser";

declare const __ARTICLE_PLAYGROUND_MANIFEST__: Manifest;

type Owner = { platform: BrowserPlatform; users: number };
const options: BrowserPlatformOptions = import.meta.env?.DEV
  ? { manifestUrl: "/design/assets/manifest.json" }
  : {
      manifestUrl: "/reploom/manifest.json",
      manifest:
        typeof __ARTICLE_PLAYGROUND_MANIFEST__ === "undefined"
          ? undefined
          : __ARTICLE_PLAYGROUND_MANIFEST__,
    };

const owners = new WeakMap<Document, Owner>();

export function acquirePlatform(document: Document) {
  let owner = owners.get(document);
  if (!owner) {
    owner = {
      platform: createBrowserPlatform(options),
      users: 0,
    };
    owners.set(document, owner);
  }
  owner.users++;
  const current = owner;
  let released = false;

  return {
    platform: current.platform,
    release() {
      if (released) return;
      released = true;
      current.users--;
      // React unmounts child sessions before this deferred platform teardown.
      queueMicrotask(() => {
        if (current.users !== 0 || owners.get(document) !== current) return;
        owners.delete(document);
        current.platform.dispose();
      });
    },
  };
}
