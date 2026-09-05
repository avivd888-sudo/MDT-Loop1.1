"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import {
  AppHeader,
  Badge,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  En,
  Icon,
  Num,
  SearchInput,
  SectionTitle,
} from "@/components/ui";
import { EVIDENCE } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { SUBSITE_LABEL, type EvidenceSource, type Subsite } from "@/lib/types";

const SOURCE_ICON: Record<EvidenceSource, string> = {
  Cummings: "menu_book",
  NCCN: "policy",
  ASCO: "verified",
  ESMO: "verified",
  PubMed: "article",
  Cochrane: "fact_check",
  AJCC: "rule",
  "Local protocol": "domain",
};

export default function EvidencePage() {
  const { lang, t } = useLang();
  const [query, setQuery] = useState("");
  const [subsite, setSubsite] = useState<Subsite | "all">("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EVIDENCE.filter((e) => {
      if (subsite !== "all" && !e.tags.includes(subsite)) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q)
      );
    });
  }, [query, subsite]);

  const subsites = useMemo(() => {
    const set = new Set<Subsite>();
    EVIDENCE.forEach((e) => e.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, []);

  return (
    <>
      <AppHeader
        title={t("Literature and evidence", "ספרות ומקורות")}
        subtitle={t("Guidelines, textbooks and trials", "הנחיות, ספרי לימוד ומחקרים")}
        back="/more"
      />
      <Screen>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t(
            "Search guidelines, conditions, staging…",
            "חיפוש בהנחיות, במצבים ובסטייג׳ינג…",
          )}
        />

        <div className="mt-3">
          <ChipRow>
            <Chip active={subsite === "all"} onClick={() => setSubsite("all")}>
              {t("All sites", "כל האתרים")}
            </Chip>
            {subsites.map((s) => (
              <Chip key={s} active={subsite === s} onClick={() => setSubsite(s)}>
                {SUBSITE_LABEL[s]}
              </Chip>
            ))}
          </ChipRow>
        </div>

        <Link href="/staging" className="mt-4 block">
          <Card className="flex items-center gap-3 border-[#137fec55] bg-gradient-to-br from-[#137fec22] to-transparent p-4 transition-colors hover:border-[var(--color-primary)]">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-white">
              <Icon name="calculate" size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-white">
                {lang === "he" ? (
                  <>
                    כלי סטייג׳ינג <En>TNM</En>
                  </>
                ) : (
                  "TNM staging tool"
                )}
              </p>
              <p className="text-[12px] leading-snug text-[var(--color-ink-muted)]">
                {lang === "he" ? (
                  <>
                    <Num>AJCC Version 9</Num> לאורופרינקס <En>p16</En> חיובי, מהדורה 8
                    בשאר האתרים
                  </>
                ) : (
                  <>
                    <Num>AJCC Version 9</Num> for p16-positive oropharynx, 8th edition
                    elsewhere
                  </>
                )}
              </p>
            </div>
            <Icon name="chevron_right" size={20} className="text-[var(--color-ink-faint)]" />
          </Card>
        </Link>

        <div className="mt-5">
          <SectionTitle
            action={
              <span className="text-[12px] text-[var(--color-ink-muted)]">
                <Num>{results.length}</Num> {t("results", "תוצאות")}
              </span>
            }
          >
            {query ? t("Results", "תוצאות") : t("Reference library", "ספריית העיון")}
          </SectionTitle>

          <div className="space-y-2.5">
            {results.length === 0 ? (
              <EmptyState
                icon="search_off"
                title={t("Nothing found", "לא נמצא דבר")}
                body={t(
                  "The demonstration library holds a small fixed selection. A production system would query PubMed and the publishing bodies directly.",
                  "ספריית ההדגמה מכילה מבחר קבוע ומצומצם. מערכת בייצור תשאל את PubMed ואת גופי ההנחיות ישירות.",
                )}
              />
            ) : (
              results.map((e) => (
                <Card key={e.id} className="p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--color-primary)]">
                      <Icon name={SOURCE_ICON[e.source]} size={21} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[var(--color-primary)]">
                          <Num>{e.source}</Num>
                        </span>
                        <span className="text-[11px] text-[var(--color-ink-faint)]">
                          <Num>{e.year}</Num>
                        </span>
                        <Badge tone="neutral">
                          <En>{e.grade}</En>
                        </Badge>
                        {e.offline && (
                          <Badge tone="stable">
                            <Icon name="offline_pin" size={11} />
                            {t("Available offline", "זמין גם ללא רשת")}
                          </Badge>
                        )}
                      </div>

                      {/* Titles, abstracts and citations are quoted as published.
                          A translated title cannot be looked up, and a translated
                          finding cannot be checked against the paper. */}
                      <p className="mt-1 text-[14px] font-bold leading-snug text-white">
                        <En>{e.title}</En>
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                        <En>{e.summary}</En>
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {e.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="rounded border border-white/10 bg-white/5 px-1.5 py-px text-[10px] text-[var(--color-ink-muted)]"
                          >
                            {SUBSITE_LABEL[t]}
                          </span>
                        ))}
                      </div>

                      <p className="mt-2 text-[11px] italic text-[var(--color-ink-faint)]">
                        <En>{e.citation}</En>
                      </p>

                      {e.url && (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-primary)]"
                        >
                          {t("Open source", "למקור")}
                          <Icon name="open_in_new" size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <Card className="mt-5 p-3.5">
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            <Icon name="info" size={15} className="mt-px shrink-0" />
            <span>
              {lang === "he" ? (
                <>
                  הספרייה הזאת היא מבחר קבוע לצורכי הדגמה. מערכת בייצור תשלב שאילתות חיות
                  מול <En>PubMed</En> ומול המוציאים לאור, ותידרש לרישיונות המתאימים לפני
                  עלייה לאוויר. כותרות המאמרים, תקצירי הממצאים והציטוטים מובאים באנגלית
                  המקורית במכוון — מאמר בתרגום אי אפשר לאתר ואי אפשר לאמת מול המקור.
                </>
              ) : (
                <>
                  This library is a fixed selection for demonstration purposes. A production
                  system would integrate live queries against PubMed and the publishers, and
                  would need the corresponding licences before going live.
                </>
              )}
            </span>
          </p>
        </Card>
      </Screen>
    </>
  );
}
