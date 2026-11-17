import { createBrowserPlatform, type BrowserPlatform } from "@yongsk0066/reploom/browser";

type Owner = { platform: BrowserPlatform; users: number };
const owners = new WeakMap<Document, Owner>();

export function acquirePlatform(document: Document) {
  let owner = owners.get(document);
  if (!owner) {
    owner = {
      platform: createBrowserPlatform({ manifestUrl: "/reploom/manifest.json" }),
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
