"use client";

import { useEffect, useState } from "react";

import { isAiSuggestion, type AiSuggestion, type AiSuggestionFacts } from "../ai-suggestion";
import { AiSuggestionCard } from "./ai-suggestion-card";

export function AiInsight({
  fallbackText,
  facts,
  onSuggestion,
}: {
  fallbackText: string;
  facts: AiSuggestionFacts;
  onSuggestion: (suggestion: AiSuggestion | null) => void;
}) {
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    fetch("/api/ai-suggestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(facts),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Suggestion unavailable");
        const result: unknown = await response.json();
        if (!isAiSuggestion(result)) throw new Error("Invalid suggestion");
        return result;
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        setSuggestion(result);
        onSuggestion(result);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setSuggestion(null);
        onSuggestion(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [facts, onSuggestion]);

  return (
    <AiSuggestionCard
      text={suggestion?.recommendation ?? fallbackText}
      reasoning={suggestion?.reasoning}
      confidence={suggestion?.confidence}
      action={suggestion?.action}
      loading={loading && !suggestion}
    />
  );
}
