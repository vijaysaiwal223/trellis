"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type AiAssistantState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const Context = createContext<AiAssistantState | null>(null);

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo<AiAssistantState>(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAiAssistant() {
  const value = useContext(Context);
  if (!value) throw new Error("useAiAssistant must be used within AiAssistantProvider");
  return value;
}
