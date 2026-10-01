"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { AiSuggestion } from "@/features/renewal-detail/ai-suggestion";

type AiAssistantState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  suggestions: Record<string, { key: string; value: AiSuggestion | null }>;
  setSuggestion: (slug: string, key: string, suggestion: AiSuggestion | null) => void;
  reviewRequest: string | null;
  requestReview: (slug: string) => void;
  clearReviewRequest: () => void;
};

const Context = createContext<AiAssistantState | null>(null);

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, { key: string; value: AiSuggestion | null }>>({});
  const [reviewRequest, setReviewRequest] = useState<string | null>(null);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const setSuggestion = useCallback((slug: string, key: string, suggestion: AiSuggestion | null) => {
    setSuggestions((current) => ({ ...current, [slug]: { key, value: suggestion } }));
  }, []);
  const clearReviewRequest = useCallback(() => setReviewRequest(null), []);

  const value = useMemo<AiAssistantState>(() => ({
    isOpen,
    open,
    close,
    suggestions,
    setSuggestion,
    reviewRequest,
    requestReview: setReviewRequest,
    clearReviewRequest,
  }), [isOpen, open, close, suggestions, setSuggestion, reviewRequest, clearReviewRequest]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAiAssistant() {
  const value = useContext(Context);
  if (!value) throw new Error("useAiAssistant must be used within AiAssistantProvider");
  return value;
}
