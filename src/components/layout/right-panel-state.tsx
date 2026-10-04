"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type RightPanelContextValue = {
  /** A panel that sits beside the main card, such as the assign-owner drawer. */
  panel: ReactNode;
  setPanel: (panel: ReactNode) => void;
};

const RightPanelContext = createContext<RightPanelContextValue | null>(null);

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<ReactNode>(null);
  return <RightPanelContext.Provider value={{ panel, setPanel }}>{children}</RightPanelContext.Provider>;
}

export function useRightPanel() {
  const context = useContext(RightPanelContext);
  if (!context) throw new Error("useRightPanel must be used inside RightPanelProvider");
  return context;
}
