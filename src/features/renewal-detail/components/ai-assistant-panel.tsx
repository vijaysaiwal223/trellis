"use client";

import { BorderBeam } from "border-beam";
import { BotAvatar } from "bot-avatars";
import { Text } from "@medusajs/ui";
import { RiArrowUpLine, RiCloseLine, RiSparkling2Line } from "@remixicon/react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import type { AiPortfolioFacts } from "../ai-portfolio";
import { isAiSuggestion, type AiSuggestion, type AiSuggestionFacts } from "../ai-suggestion";

type Exchange = {
  id: number;
  question: string;
  answer?: string;
  suggestion?: AiSuggestion;
  pending?: boolean;
};

type AskMode = "summary" | "suggestion" | "question";

function fallbackAnswer(mode: AskMode, facts: AiSuggestionFacts, fallbackText: string) {
  if (mode === "suggestion") return fallbackText;
  if (mode === "question") {
    return "I couldn't generate an answer right now. The renewal details are still available in the dashboard.";
  }
  const seats = `${facts.vendor} has ${facts.activeSeats} of ${facts.purchasedSeats} purchased seats active (${facts.usagePercent}% usage), with ${facts.possibleWaste} in possible waste.`;
  const owner = facts.ownerStatus === "active" && facts.ownerName
    ? `${facts.ownerName} is the current owner.`
    : facts.ownerStatus === "departed"
      ? "The previous owner has departed."
      : "No owner is assigned.";
  const timing = facts.daysToCancelBy === undefined
    ? ""
    : facts.daysToCancelBy < 0
      ? `The cancel-by window closed ${-facts.daysToCancelBy} days ago.`
      : `There are ${facts.daysToCancelBy} days until cancel-by.`;
  return [seats, owner, timing].filter(Boolean).join(" ");
}

function portfolioFallback(mode: AskMode, facts: AiPortfolioFacts) {
  const open = facts.renewals.filter((row) => !row.resolved);
  const urgent = open.filter((row) => row.daysToCancelBy <= 30);
  const ownerless = open.filter((row) => row.ownerStatus !== "active");
  if (mode === "summary") {
    return `${open.length} renewals remain open. ${urgent.length} have a cancel-by date within 30 days or already past, and ${ownerless.length} lack an active owner.`;
  }
  if (mode === "suggestion") {
    const next = [...open].sort((a, b) => a.daysToCancelBy - b.daysToCancelBy)[0];
    return next
      ? `Review ${next.vendor} first: its cancel-by date is ${next.daysToCancelBy < 0 ? `${-next.daysToCancelBy} days past` : `${next.daysToCancelBy} days away`}, and its risk is ${next.risk.toLowerCase()}.`
      : "All renewals in the available portfolio are resolved.";
  }
  return "I couldn't generate an answer right now. The renewal portfolio is still available in the dashboard.";
}

export type AiAssistantPanelContext =
  | {
      kind: "vendor";
      facts: AiSuggestionFacts;
      fallbackText: string;
      suggestion: AiSuggestion | null;
      onSuggestion: (suggestion: AiSuggestion | null) => void;
      onReview: () => void;
    }
  | { kind: "portfolio"; facts: AiPortfolioFacts };

export function AiAssistantPanel({
  context,
  onClose,
}: {
  context: AiAssistantPanelContext;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const nextIdRef = useRef(0);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [exchanges]);

  async function ask(mode: AskMode, prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || pending) return;
    const id = ++nextIdRef.current;
    setExchanges((items) => [...items, { id, question: trimmed, pending: true }]);
    setQuestion("");
    setPending(true);

    const finish = (update: Partial<Exchange>) => {
      setExchanges((items) => items.map((item) => item.id === id ? { ...item, ...update, pending: false } : item));
    };

    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    let streamedAnswer = "";
    const revealSuggestion = async (suggestion: AiSuggestion) => {
      const words = suggestion.recommendation.match(/\S+\s*/g) ?? [suggestion.recommendation];
      let answer = "";
      for (let index = 0; index < words.length; index += 3) {
        if (controller.signal.aborted) return;
        answer += words.slice(index, index + 3).join("");
        setExchanges((items) => items.map((item) => item.id === id ? { ...item, answer } : item));
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
      if (!controller.signal.aborted) finish({ answer: suggestion.recommendation, suggestion });
    };

    try {
      if (mode === "suggestion" && context.kind === "vendor" && context.suggestion) {
        await revealSuggestion(context.suggestion);
        return;
      }
      const vendorSuggestion = mode === "suggestion" && context.kind === "vendor";
      const response = await fetch(vendorSuggestion ? "/api/ai-suggestion" : "/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorSuggestion
          ? context.facts
          : { scope: context.kind, facts: context.facts, mode: mode === "suggestion" ? "question" : mode, question: trimmed }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("AI request failed");
      if (vendorSuggestion && context.kind === "vendor") {
        const result: unknown = await response.json();
        if (!isAiSuggestion(result)) throw new Error("Invalid suggestion");
        await revealSuggestion(result);
        if (!controller.signal.aborted) context.onSuggestion(result);
      } else {
        if (!response.body) throw new Error("Missing answer stream");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            streamedAnswer += decoder.decode(value, { stream: true });
            setExchanges((items) => items.map((item) => item.id === id ? { ...item, answer: streamedAnswer } : item));
          }
          streamedAnswer += decoder.decode();
          if (!streamedAnswer.trim()) throw new Error("Empty answer");
          finish({ answer: streamedAnswer.trim() });
        } finally {
          reader.releaseLock();
        }
      }
    } catch {
      if (requestRef.current === controller) {
        finish({ answer: streamedAnswer.trim() || (context.kind === "vendor"
          ? fallbackAnswer(mode, context.facts, context.fallbackText)
          : portfolioFallback(mode, context.facts)) });
      }
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setPending(false);
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask("question", question);
  }

  function onQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask("question", question);
    }
  }

  return (
    <aside
      aria-label="Bruno assistant"
      id="renewal-ai-panel"
      className="fixed inset-y-0 right-0 z-40 flex w-[min(400px,100vw)] flex-col border-l border-ui-border-base bg-ui-bg-base shadow-elevation-flyout 2xl:static 2xl:z-auto 2xl:-ml-px 2xl:w-[380px] 2xl:shrink-0 2xl:overflow-hidden 2xl:rounded-[12px] 2xl:border 2xl:shadow-none"
    >
      <div className="flex items-start justify-between gap-3 border-b border-ui-border-base px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-ui-bg-interactive-soft text-ui-fg-interactive">
            <RiSparkling2Line className="size-[18px]" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold leading-5 text-ui-fg-base">Bruno</h2>
            <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">
              {context.kind === "vendor" ? `Ask about ${context.facts.vendor}` : "Ask about your renewals"}
            </Text>
          </div>
        </div>
        <button type="button" aria-label="Close Bruno assistant" onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-ui-bg-subtle focus-visible:outline-2 focus-visible:outline-ui-bg-interactive">
          <RiCloseLine className="size-5" />
        </button>
      </div>

      <div ref={transcriptRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
        {exchanges.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-4 px-2 py-6 text-center">
            <div className="flex size-24 shrink-0 items-center justify-center" aria-hidden="true">
              <BotAvatar
                type="blob"
                state="default"
                size={96}
                color="#2876f5"
                ink="#ffffff"
                theme="light"
                interactive={false}
                aria-hidden="true"
              />
            </div>
            <div className="flex max-w-[320px] flex-col items-center gap-2">
              <Text as="p" className="text-[16px] font-medium leading-5 text-ui-fg-base">
                {context.kind === "vendor" ? "Review this renewal with Bruno" : "Review your renewals with Bruno"}
              </Text>
              <Text as="p" className="text-[14px] leading-5 text-ui-fg-subtle">
                {context.kind === "vendor"
                  ? "Answers use the contract, usage, deadline, risk, and ownership data shown here. You make the final decision."
                  : "Ask about risk, deadlines, ownership, and usage across your renewal portfolio. You make the final decision."}
              </Text>
            </div>
          </div>
        ) : null}

        {exchanges.map((exchange) => (
          <div key={exchange.id} className="space-y-2">
            <div className="ml-11 rounded-xl bg-ui-bg-subtle px-3 py-2.5 text-[14px] leading-5 text-ui-fg-base">
              {exchange.question}
            </div>
            <div className="flex items-start gap-2">
              <BotAvatar
                type="blob"
                state={exchange.pending ? "working" : "default"}
                size={36}
                color="#2876f5"
                ink="#ffffff"
                theme="light"
                interactive={false}
                aria-label={exchange.pending ? "Bruno is generating an answer" : "Bruno"}
              />
              <div className="min-w-0 flex-1 pt-1 text-[14px] leading-5 text-ui-fg-base">
                {exchange.pending && !exchange.answer ? (
                  <p role="status" className="text-[13px] leading-5 text-ui-fg-subtle">Reviewing renewal data…</p>
                ) : (
                  <div className="space-y-2">
                    <Text as="p" className="text-[14px] leading-5 text-ui-fg-base">
                      {exchange.answer}
                      {exchange.pending ? <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-ui-fg-interactive" /> : null}
                    </Text>
                    {exchange.suggestion ? (
                      <>
                        <Text as="p" className="text-[13px] leading-5 text-ui-fg-subtle">{exchange.suggestion.reasoning}</Text>
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-ui-fg-subtle">
                          <span className="rounded-full border border-ui-border-base bg-ui-bg-subtle px-2 py-0.5 font-medium text-ui-fg-base">
                            Suggested: {exchange.suggestion.action}
                          </span>
                          <span>{exchange.suggestion.confidence}% confidence</span>
                        </div>
                        {context.kind === "vendor" ? (
                          <button type="button" onClick={context.onReview}
                            className="text-[13px] font-medium text-ui-fg-interactive hover:underline focus-visible:outline-2 focus-visible:outline-ui-bg-interactive">
                            Review decision
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-ui-border-base p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => void ask("summary", context.kind === "vendor" ? `Summarize ${context.facts.vendor}'s renewal.` : "Summarize the renewal portfolio.")}
            className="rounded-full border border-ui-border-base bg-ui-bg-base px-3 py-1.5 text-[12px] font-medium text-ui-fg-base hover:bg-ui-bg-subtle focus-visible:outline-2 focus-visible:outline-ui-bg-interactive disabled:cursor-not-allowed disabled:opacity-50">
            {context.kind === "vendor" ? "Summarize renewal" : "Summarize renewals"}
          </button>
          <button type="button" disabled={pending} onClick={() => void ask("suggestion", context.kind === "vendor" ? `What should we do about ${context.facts.vendor}?` : "Which renewal should I review next, and why?")}
            className="rounded-full border border-ui-border-base bg-ui-bg-base px-3 py-1.5 text-[12px] font-medium text-ui-fg-base hover:bg-ui-bg-subtle focus-visible:outline-2 focus-visible:outline-ui-bg-interactive disabled:cursor-not-allowed disabled:opacity-50">
            Suggest next step
          </button>
        </div>
        <BorderBeam size="pulse-inner" theme="light" colorVariant="colorful" strength={0.75} duration={3.2} borderRadius={12} className="w-full">
          <form onSubmit={submit} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-2 shadow-elevation-card-rest">
            <label htmlFor="renewal-ai-question" className="sr-only">
              {context.kind === "vendor" ? "Ask Bruno about this renewal" : "Ask Bruno about your renewals"}
            </label>
            <textarea id="renewal-ai-question" autoFocus value={question} onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={onQuestionKeyDown} rows={3} maxLength={300}
              placeholder={context.kind === "vendor" ? `Ask about ${context.facts.vendor}'s renewal…` : "Ask about your renewals…"}
              className="w-full resize-none bg-transparent px-2 py-1 text-[14px] leading-5 text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
            />
            <div className="flex items-center justify-between px-1 pb-1">
              <Text as="span" className="text-[11px] text-ui-fg-muted">Based on available data</Text>
              <button type="submit" disabled={!question.trim() || pending} aria-label="Ask Bruno"
                className="flex size-8 items-center justify-center rounded-lg bg-ui-bg-interactive text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-bg-interactive disabled:cursor-not-allowed disabled:opacity-40">
                <RiArrowUpLine className="size-[17px]" />
              </button>
            </div>
          </form>
        </BorderBeam>
        <Text as="p" className="mt-2 text-center text-[11px] leading-4 text-ui-fg-muted">
          AI suggestions are advisory. No decision is recorded here.
        </Text>
      </div>
    </aside>
  );
}
