import { useState } from "react";

const defaults = { roomId: "general", isDark: false };
const saved = import.meta.state?.("preferences", defaults) ?? {
  value: defaults,
};

export function useChatPreferences() {
  const [preferences, update] = useState(() => saved.value);

  function set(key, value) {
    saved.value = { ...saved.value, [key]: value };
    update(saved.value);
  }

  return {
    ...preferences,
    setRoomId: (room) => set("roomId", room),
    setIsDark: (dark) => set("isDark", dark),
  };
}
