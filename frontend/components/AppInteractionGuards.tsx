"use client";

import { useEffect } from "react";

const editableSelector =
  "input, textarea, select, [contenteditable='true'], [data-allow-context-menu='true']";

export function AppInteractionGuards() {
  useEffect(() => {
    const preventNonEditableContextMenu = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(editableSelector)) return;
      event.preventDefault();
    };

    document.addEventListener("contextmenu", preventNonEditableContextMenu);
    return () => document.removeEventListener("contextmenu", preventNonEditableContextMenu);
  }, []);

  return null;
}
