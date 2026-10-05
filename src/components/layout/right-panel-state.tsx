"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type RightPanelContextValue = {
  /** A panel that sits beside the main card, such as the assign-owner drawer. */
  panel: ReactNode;
  panelWidth: number;
  setPanel: (panel: ReactNode, width?: number) => void;
};

const RightPanelContext = createContext<RightPanelContextValue | null>(null);

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<ReactNode>(null);
  const [panelWidth, setPanelWidth] = useState(400);
  const updatePanel = useCallback((nextPanel: ReactNode, width = 400) => {
    setPanel(nextPanel);
    setPanelWidth(width);
  }, []);
  return <RightPanelContext.Provider value={{ panel, panelWidth, setPanel: updatePanel }}>{children}</RightPanelContext.Provider>;
}

export function useRightPanel() {
  const context = useContext(RightPanelContext);
  if (!context) throw new Error("useRightPanel must be used inside RightPanelProvider");
  return context;
}
