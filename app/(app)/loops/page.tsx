"use client";

import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import { LoopCard } from "@/components/loop";
import {
  AppHeader,
  Callout,
  Chip,
  ChipRow,
  DemoBanner,
  EmptyState,
  Fab,
  Icon,
  Num,
  SectionTitle,
  StatTile,
} from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { actionableFor, isBreached, loopMetrics } from "@/lib/metrics";

type Filter = "mine" | "all" | "open" | "answered" | "breached" | "closed";

const FILTERS: { id: Filter; en: string; he: string }[] = [
  { id: "mine", en: "On me", he: "עליי" },
  { id: "all", en: "All", he: "הכול" },
  { id: "open", en: "Unanswered", he: "ללא מענה" },
  { id: "answered", en: "Awaiting closure", he: "ממתין לסגירה" },
  { id: "breached", en: "Overdue", he: "חורג מהיעד" },
  { id: "closed", en: "Closed", he: "נסגרו" },
];

export default function LoopsPage() {
  const { loops, getPatient, currentUser } = useStore();
  const { lang, t } = useLang();
  const [filter, setFilter] = useState<Filter>("mine");

  const metrics = useMemo(() => loopMetrics(loops), [loops]);
  const { toAnswer, toClose } = useMemo(
    () => actionableFor(loops, currentUser),
    [loops, currentUser],
  );

  const visible = useMemo(() => {
    const sorted = [...loops].sort((a, b) => {
      // Open before closed, and overdue first
      if (Boolean(a.closedAt) !== Boolean(b.closedAt)) return a.closedAt ? 1 : -1;
      if (isBreached(a) !== isBreached(b)) return isBreached(a) ? -1 : 1;
      return a.openedAt < b.openedAt ? -1 : 1;
    });

    switch (filter) {
      case "mine":
        return [...toAnswer, ...toClose];
      case "open":
        return sorted.filter((l) => !l.answeredAt && !l.closedAt);
      case "answered":
        return sorted.filter((l) => l.answeredAt && !l.closedAt);
      case "breached":
        return sorted.filter((l) => isBreached(l));
      case "closed":
        return sorted.filter((l) => l.closedAt);
      default:
        return sorted;
    }
  }, [loops, filter, toAnswer, toClose]);

  return (
    <>
      <AppHeader
        title={t("Loops", "לולאות")}
        subtitle={
          lang === "he"
            ? `${metrics.byState.closed} מתוך ${metrics.total} נסגרו`
            : `${metrics.byState.closed} of ${metrics.total} closed`
        }
      />

      <Screen>
        <DemoBanner className="mb-3" />

        <div className="grid grid-cols-3 gap-2">
          <StatTile
            value={toAnswer.length + toClose.length}
            label={t("On me", "עליי")}
            icon="person_alert"
            tone={toAnswer.length + toClose.length > 0 ? "primary" : "neutral"}
          />
          <StatTile
            value={metrics.answeredNotClosed}
            label={t("Not closed", "לא נסגרו")}
            icon="pending"
            tone={metrics.answeredNotClosed > 0 ? "review" : "neutral"}
          />
          <StatTile
            value={metrics.breached}
            label={t("Overdue", "חריגה")}
            icon="schedule"
            tone={metrics.breached > 0 ? "urgent" : "neutral"}
          />
        </div>

        {metrics.answeredNotClosed > 0 && (
          <Callout tone="review" icon="info">
            {lang === "he" ? (
              <>
                <strong>
                  <Num>{metrics.answeredNotClosed}</Num>{" "}
                  {metrics.answeredNotClosed === 1 ? "לולאה נענתה" : "לולאות נענו"} ולא
                  נסגרו.
                </strong>{" "}
                מישהו השיב — איש עדיין לא אישר שהתשובה פתרה את השאלה. זה בדיוק הכשל
                שהמערכת הזאת קיימת כדי להפוך לגלוי.
              </>
            ) : (
              <>
                <strong>
                  <Num>{metrics.answeredNotClosed}</Num> loop
                  {metrics.answeredNotClosed === 1 ? " has" : "s have"} been answered but
                  not closed.
                </strong>{" "}
                Someone replied — nobody has yet confirmed the reply resolved the
                question. That is the failure this system exists to make visible.
              </>
            )}
          </Callout>
        )}

        <div className="mt-3">
          <ChipRow>
            {FILTERS.map((f) => (
              <Chip
                key={f.id}
                active={filter === f.id}
                onClick={() => setFilter(f.id)}
                tone={f.id === "breached" ? "urgent" : f.id === "answered" ? "review" : undefined}
              >
                {lang === "he" ? f.he : f.en}
              </Chip>
            ))}
          </ChipRow>
        </div>

        {filter === "mine" ? (
          <div className="mt-4 space-y-5">
            <section>
              <SectionTitle
                action={
                  <span className="text-[12px] text-[var(--color-ink-muted)]">
                    <Num>{toAnswer.length}</Num>
                  </span>
                }
              >
                {t("Waiting for my answer", "ממתין לתשובה שלי")}
              </SectionTitle>
              {toAnswer.length === 0 ? (
                <p className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-4 text-center text-[13px] text-[var(--color-ink-muted)]">
                  {lang === "he"
                    ? `אין דבר פתוח עבור ${currentUser.role}`
                    : `Nothing outstanding for ${currentUser.role}`}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {toAnswer.map((l) => (
                    <LoopCard key={l.id} loop={l} patient={getPatient(l.patientId)} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionTitle
                action={
                  <span className="text-[12px] text-[var(--color-ink-muted)]">
                    <Num>{toClose.length}</Num>
                  </span>
                }
              >
                {t(
                  "I asked, I have an answer, I have not closed it",
                  "שאלתי, קיבלתי תשובה, ועדיין לא סגרתי",
                )}
              </SectionTitle>
              {toClose.length === 0 ? (
                <p className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-4 text-center text-[13px] text-[var(--color-ink-muted)]">
                  {t("Nothing waiting on your confirmation", "אין דבר שממתין לאישור שלך")}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {toClose.map((l) => (
                    <LoopCard key={l.id} loop={l} patient={getPatient(l.patientId)} />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {visible.length === 0 ? (
              <EmptyState
                icon="filter_alt_off"
                title={t("Nothing in this view", "אין כאן דבר")}
                body={t(
                  "Try a different filter, or open a new loop with the button below.",
                  "אפשר לנסות סינון אחר, או לפתוח לולאה חדשה בכפתור שלמטה.",
                )}
              />
            ) : (
              visible.map((l) => (
                <LoopCard key={l.id} loop={l} patient={getPatient(l.patientId)} />
              ))
            )}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5">
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            <Icon name="sync" size={16} className="mt-px shrink-0 text-[var(--color-primary)]" />
            <span>
              {lang === "he" ? (
                <>
                  לולאה איננה הודעה. היא בקשה מובנית שנחשבת גמורה רק כאשר מי ששאל מאשר
                  שהתשובה פתרה את השאלה. ארבעת השלבים האלה —{" "}
                  <strong className="text-white">נפתחה, נקלטה, נענתה, נסגרה</strong> — הם
                  מה שנמדד.
                </>
              ) : (
                <>
                  A loop is not a message. It is a structured request that counts as
                  finished only when the person who asked confirms the answer resolved
                  the question. Those four stages —{" "}
                  <strong className="text-white">
                    opened, acknowledged, answered, closed
                  </strong>{" "}
                  — are what gets measured.
                </>
              )}
            </span>
          </p>
        </div>
      </Screen>

      <Fab href="/loops/new" icon="add" label={t("Open a loop", "פתיחת לולאה")} />
    </>
  );
}
