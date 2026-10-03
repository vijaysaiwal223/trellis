"use client";

import { Text, clx } from "@medusajs/ui";
import { RiCloseLine } from "@remixicon/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { isValidISODate } from "@/features/renewal-risk/deadlines";
import type { NoticeSource, TermsOverride } from "@/features/renewal-risk/decision-model";
import { extractTerms, impliedCancelBy, type ExtractionResult } from "@/features/renewal-risk/extract";
import { formatMoney } from "@/features/renewal-risk/money";
import type { Renewal } from "@/features/renewal-risk/types";

const inputClass = "h-9 w-full rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none";
const TEXT_TYPES = /\.(txt|md|csv|text)$/i;

type Props = {
  row: Renewal;
  onSave: (terms: Omit<TermsOverride, "confirmedAt">) => void;
  onClose: () => void;
};

/**
 * Where notice terms get on file: typed in, or read out of a contract the user
 * pastes or uploads. Extraction only proposes — nothing changes a deadline
 * until the person presses Confirm, with the source sentence beside each value.
 */
export function TermsModal({ row, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState(row.noticeAssumed ? "" : String(row.noticeDays));
  const [renewalDate, setRenewalDate] = useState<string>(row.renewalDate);
  const [value, setValue] = useState(String(row.contractValue));
  const [text, setText] = useState("");
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  // Which fields still hold exactly what was extracted (so the source can be recorded honestly).
  const [fromExtract, setFromExtract] = useState<{ notice?: string; confidence?: number; excerpt?: string } | null>(null);

  useEffect(() => { dialogRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const noticeNumber = Number(notice);
  const noticeValid = notice.trim() !== "" && Number.isInteger(noticeNumber) && noticeNumber >= 0 && noticeNumber <= 365;
  const dateValid = isValidISODate(renewalDate);
  const valueNumber = Number(value.replace(/[,\s]/g, ""));
  const valueValid = Number.isFinite(valueNumber) && valueNumber > 0;
  const canSave = noticeValid && dateValid && valueValid;

  const runExtraction = (source: string) => {
    const result = extractTerms(source);
    setExtraction(result);
    return result;
  };

  const useExtracted = () => {
    if (!extraction) return;
    if (extraction.noticeDays) {
      setNotice(String(extraction.noticeDays.value));
      setFromExtract({ notice: String(extraction.noticeDays.value), confidence: extraction.noticeDays.confidence, excerpt: extraction.noticeDays.excerpt });
    }
    if (extraction.renewalDate) setRenewalDate(extraction.renewalDate.value);
    if (extraction.annualValue) setValue(String(extraction.annualValue.value));
  };

  const save = () => {
    if (!canSave) return;
    const stillExtracted = fromExtract && fromExtract.notice === notice;
    const source: NoticeSource = stillExtracted ? "extracted" : "manual";
    onSave({
      noticePeriodDays: noticeNumber,
      renewalDate: renewalDate !== row.renewalDate ? renewalDate : undefined,
      contractValue: valueNumber !== row.contractValue ? valueNumber : undefined,
      source,
      confidence: stillExtracted ? fromExtract.confidence : undefined,
      excerpt: stillExtracted ? fromExtract.excerpt : undefined,
    });
    onClose();
  };

  const cancelByPreview = noticeValid && dateValid ? impliedCancelBy(renewalDate, noticeNumber) : null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="terms-title" tabIndex={-1} className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-ui-border-base bg-ui-bg-base shadow-elevation-flyout outline-none">
      <div className="flex items-center justify-between gap-3 border-b border-ui-border-base px-4 py-3">
        <div className="flex flex-col">
          <Text as="span" id="terms-title" className="text-[16px] font-medium leading-6 text-ui-fg-base">Contract terms · {row.vendor}</Text>
          <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">Notice terms set the deadline everything else is counted from.</Text>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-ui-bg-subtle-hover">
          <RiCloseLine className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <div className="flex flex-col gap-2 rounded-xl border border-ui-border-base p-3">
          <Text as="span" className="text-[14px] font-medium text-ui-fg-base">Read it from the contract</Text>
          <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">
            Paste the renewal and notice clauses, or choose a text file. Trellis proposes values and shows the sentence it used; nothing changes until you confirm. PDFs aren&apos;t read in this prototype.
          </Text>
          <textarea
            value={text}
            rows={4}
            onChange={(event) => { setText(event.target.value); setExtraction(null); setFileNote(null); }}
            placeholder="e.g. Either party may prevent renewal by giving ninety (90) days prior written notice…"
            className="w-full resize-none rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 py-1.5 text-[13px] outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center rounded-[8px] border border-ui-border-base bg-ui-bg-base px-3 text-[13px] font-medium text-ui-fg-base hover:bg-ui-bg-subtle">
              Choose file
              <input
                type="file"
                accept=".txt,.md,.csv,.text,text/plain"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (!TEXT_TYPES.test(file.name) && !file.type.startsWith("text/")) {
                    setFileNote(`${file.name}: only text files can be read here. Paste the clauses instead.`);
                    return;
                  }
                  if (file.size > 500_000) { setFileNote(`${file.name} is too large (limit 500 KB).`); return; }
                  const content = await file.text();
                  setText(content);
                  setFileNote(`Read ${file.name}.`);
                  runExtraction(content);
                }}
              />
            </label>
            <Button variant="secondary" size="small" disabled={!text.trim()} onClick={() => runExtraction(text)}>Find terms</Button>
            {fileNote ? <Text as="span" className="text-[12px] text-ui-fg-subtle">{fileNote}</Text> : null}
          </div>

          {extraction ? (
            <div className="flex flex-col gap-2 rounded-lg bg-ui-bg-subtle p-2.5" aria-live="polite">
              {!extraction.noticeDays && !extraction.renewalDate && !extraction.annualValue ? (
                <Text as="p" className="text-[13px] text-ui-fg-base">Nothing recognisable found. Enter the terms below by hand.</Text>
              ) : (
                <>
                  {extraction.noticeDays ? (
                    <div>
                      <Text as="p" className="text-[13px] text-ui-fg-base"><span className="font-medium">Notice: {extraction.noticeDays.value} days</span> · {extraction.noticeDays.confidence}% sure</Text>
                      <Text as="p" className="text-[12px] italic leading-4 text-ui-fg-subtle">&ldquo;{extraction.noticeDays.excerpt}&rdquo;</Text>
                    </div>
                  ) : <Text as="p" className="text-[13px] text-ui-fg-subtle">No notice period found.</Text>}
                  {extraction.conflicting ? <Text as="p" role="alert" className="text-[12px] font-medium text-ui-tag-orange-text">The text mentions more than one notice period. Check the clause before confirming.</Text> : null}
                  {extraction.renewalDate ? (
                    <div>
                      <Text as="p" className="text-[13px] text-ui-fg-base"><span className="font-medium">Renewal date: {extraction.renewalDate.value}</span></Text>
                      <Text as="p" className="text-[12px] italic leading-4 text-ui-fg-subtle">&ldquo;{extraction.renewalDate.excerpt}&rdquo;</Text>
                    </div>
                  ) : null}
                  {extraction.annualValue ? (
                    <div>
                      <Text as="p" className="text-[13px] text-ui-fg-base"><span className="font-medium">Annual value: {formatMoney(extraction.annualValue.value, row.currency)}</span></Text>
                      <Text as="p" className="text-[12px] italic leading-4 text-ui-fg-subtle">&ldquo;{extraction.annualValue.excerpt}&rdquo;</Text>
                    </div>
                  ) : null}
                  <div><Button variant="secondary" size="small" onClick={useExtracted}>Use these values</Button></div>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">Notice period (days)</Text>
            <input type="text" inputMode="numeric" value={notice} aria-invalid={!noticeValid} onChange={(event) => setNotice(event.target.value)} className={clx(inputClass, !noticeValid && notice !== "" && "border-ui-border-error")} />
          </label>
          <label className="flex flex-col gap-1">
            <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">Renewal date</Text>
            <input type="text" value={renewalDate} placeholder="YYYY-MM-DD" aria-invalid={!dateValid} onChange={(event) => setRenewalDate(event.target.value)} className={clx(inputClass, !dateValid && "border-ui-border-error")} />
          </label>
          <label className="flex flex-col gap-1">
            <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">Annual value ({row.currency ?? "USD"})</Text>
            <input type="text" inputMode="decimal" value={value} aria-invalid={!valueValid} onChange={(event) => setValue(event.target.value)} className={clx(inputClass, !valueValid && "border-ui-border-error")} />
          </label>
        </div>

        <Text as="p" className="text-[13px] leading-5 text-ui-fg-subtle">
          {cancelByPreview ? <>Cancel-by would be <span className="font-medium text-ui-fg-base">{cancelByPreview}</span>.</> : "Enter a notice period and a valid date (YYYY-MM-DD) to preview the cancel-by date."}
        </Text>
        <Text as="p" className="text-[12px] leading-4 text-ui-fg-muted">If a decision is already on record, changing these terms re-opens it for review.</Text>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-ui-border-base p-4">
        <Button variant="secondary" size="base" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="base" disabled={!canSave} onClick={save}>Confirm terms</Button>
      </div>
    </div>
  );
}
