"use client";

import { BorderBeam } from "border-beam";
import { BotAvatar } from "bot-avatars";
import { Button, Heading, IconButton, Text, Textarea } from "@medusajs/ui";
import { RiArrowUpLine, RiCloseLine, RiSparkling2Line } from "@remixicon/react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import type { AiPortfolioFacts } from "../ai-portfolio";

type Exchange = {
  id: number;
  question: string;
  answer?: string;
  pending?: boolean;
};

type AskMode = "summary" | "suggestion" | "question";

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

export type AiAssistantPanelContext = { kind: "portfolio"; facts: AiPortfolioFacts };

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

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "portfolio", facts: context.facts, mode: mode === "suggestion" ? "question" : mode, question: trimmed }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("AI request failed");
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
    } catch {
      if (requestRef.current === controller) {
        finish({ answer: streamedAnswer.trim() || portfolioFallback(mode, context.facts) });
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
      className="flex h-full w-full flex-col overflow-hidden rounded-[12px] border border-solid border-ui-border-base bg-ui-bg-base"
    >
      <div className="flex items-start justify-between gap-3 border-b border-ui-border-base px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-ui-bg-interactive-soft text-ui-fg-interactive">
            <RiSparkling2Line className="size-[18px]" />
          </div>
          <div>
            <Heading level="h2" className="text-[16px] font-semibold leading-5 text-ui-fg-base">Bruno</Heading>
            <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">
              Ask about your renewals
            </Text>
          </div>
        </div>
        <IconButton variant="transparent" size="small" aria-label="Close Bruno assistant" onClick={onClose}>
          <RiCloseLine className="size-5" />
        </IconButton>
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
                Review your renewals with Bruno
              </Text>
              <Text as="p" className="text-[14px] leading-5 text-ui-fg-subtle">
                Ask about risk, deadlines, ownership, and usage across your renewal portfolio. You make the final decision.
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
                  <Text role="status" className="text-[13px] leading-5 text-ui-fg-subtle">Reviewing renewal data…</Text>
                ) : (
                  <div className="space-y-2">
                    <Text as="p" className="text-[14px] leading-5 text-ui-fg-base">
                      {exchange.answer}
                      {exchange.pending ? <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-ui-fg-interactive" /> : null}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-ui-border-base p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="small" disabled={pending} onClick={() => void ask("summary", "Summarize the renewal portfolio.")}>
            Summarize renewals
          </Button>
          <Button variant="secondary" size="small" disabled={pending} onClick={() => void ask("suggestion", "Which renewal should I review next, and why?")}>
            Suggest next step
          </Button>
        </div>
        <BorderBeam size="pulse-inner" theme="light" colorVariant="colorful" strength={0.75} duration={3.2} borderRadius={12} className="w-full">
          <form onSubmit={submit} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-2 shadow-elevation-card-rest">
            <label htmlFor="renewal-ai-question" className="sr-only">
              Ask Bruno about your renewals
            </label>
            <Textarea id="renewal-ai-question" autoFocus value={question} onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={onQuestionKeyDown} rows={3} maxLength={300}
              placeholder="Ask about your renewals…"
              className="border-0 bg-transparent px-2 py-1 shadow-none focus:shadow-none"
            />
            <div className="flex items-center justify-between px-1 pb-1">
              <Text as="span" className="text-[11px] text-ui-fg-muted">Based on available data</Text>
              <IconButton type="submit" variant="primary" size="small" disabled={!question.trim() || pending} aria-label="Ask Bruno">
                <RiArrowUpLine className="size-[17px]" />
              </IconButton>
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
