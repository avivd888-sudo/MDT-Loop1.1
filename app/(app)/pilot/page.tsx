"use client";

import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import {
  AppHeader,
  Badge,
  Button,
  Callout,
  Card,
  DemoBanner,
  En,
  Icon,
  Label,
  Meter,
  Num,
  SectionTitle,
} from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import { saveFile } from "@/lib/download";
import { PILOT_START, PILOT_TARGET, cohortCsv, pilotMetrics } from "@/lib/pilot";
import { SUBSITE_LABEL } from "@/lib/types";

/**
 * The pilot screen.
 *
 * Everything else in this application helps the department do its work. This
 * screen is the one that turns doing the work into a study: it counts the
 * consecutive cohort, reports the three things the protocol actually claims,
 * and exports the rows for analysis.
 *
 * It is deliberately unflattering. The recruitment bar shows how far off the
 * target is, the closure rate is shown with its denominator, and the standard
 * deviation — the number the whole pilot exists to produce — is withheld until
 * there are enough intervals for it to mean anything.
 */
export default function PilotPage() {
  const { patients, loops, sessions } = useStore();
  const { lang, t } = useLang();
  const [saved, setSaved] = useState<string | null>(null);

  const m = useMemo(() => pilotMetrics(patients, loops, sessions), [patients, loops, sessions]);

  const pct = Math.round((m.enrolled / m.target) * 100);
  const peakWeek = Math.max(1, ...m.weekly.map((w) => w.opened));

  async function exportCsv() {
    const outcome = await saveFile(
      `mdt-loop-pilot-${new Date().toISOString().slice(0, 10)}.csv`,
      cohortCsv(m),
    );
    setSaved(
      outcome === "saved"
        ? lang === "he"
          ? `${m.enrolled} שורות יוצאו.`
          : `${m.enrolled} rows exported.`
        : outcome === "declined"
          ? t(
              "The download was declined — nothing was saved.",
              "ההורדה בוטלה — דבר לא נשמר.",
            )
          : t("Export is not available in this view.", "הייצוא אינו זמין בתצוגה הזאת."),
    );
  }

  return (
    <>
      <AppHeader
        title={t("The pilot", "הפיילוט")}
        subtitle={t(
          "Feasibility study · cohort and outcomes",
          "מחקר היתכנות · קוהורטה ותוצאים",
        )}
      />

      <Screen>
        <DemoBanner />

        {/* Recruitment */}
        <Card className="mt-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <Label>{t("Consecutive cohort", "קוהורטה רצופה")}</Label>
            <span className="text-[12px] text-[var(--color-ink-muted)]">
              {lang === "he" ? (
                <>
                  מ־<Num>{fmtDate(PILOT_START)}</Num>
                </>
              ) : (
                <>
                  from <Num>{fmtDate(PILOT_START)}</Num>
                </>
              )}
            </span>
          </div>
          <p className="mt-1 text-3xl font-extrabold leading-none text-white">
            <Num>{m.enrolled}</Num>
            <span className="text-[14px] font-semibold text-[var(--color-ink-muted)]">
              {" "}
              {t("of", "מתוך")} <Num>{m.target}</Num>
            </span>
          </p>
          <div className="mt-3">
            <Meter percent={pct} tone={pct >= 100 ? "stable" : "primary"} height={8} />
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            {lang === "he" ? (
              <>
                כל מטופל שהופנה בתאריך ההתחלה או אחריו נכלל, לפי הסדר.
                <strong className="text-white"> איש אינו נבחר פנימה או החוצה</strong> —
                קוהורטה שמישהו בורר היא קוהורטה שמספרת מה הוא ציפה למצוא.
              </>
            ) : (
              <>
                Every patient referred on or after the start date is included, in order.
                <strong className="text-white"> Nobody is selected in or out</strong> — a
                cohort somebody chooses is a cohort that tells you what they expected.
              </>
            )}
          </p>
        </Card>

        {/* The three things the protocol claims */}
        <div className="mt-5">
          <SectionTitle>
            {t(
              "Primary outcome — feasibility and adoption",
              "תוצא ראשוני — היתכנות ואימוץ",
            )}
          </SectionTitle>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3.5">
              <Label>{t("Cases with a loop", "מקרים עם לולאה")}</Label>
              <p className="mt-1 text-2xl font-extrabold leading-none text-white">
                {/* One isolate, not two. Two adjacent isolated runs either side
                    of a slash are ordered by the paragraph's direction, so in
                    Hebrew "1/2" renders as "2/1" — a fraction that reads
                    backwards and looks like a data error rather than a bug. */}
                <Num>{m.withLoop}</Num>
                <span className="text-[13px] font-semibold text-[var(--color-ink-muted)]">
                  <Num>{`/${m.enrolled}`}</Num>
                </span>
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
                {t(
                  "At least one request raised through the platform.",
                  "לפחות בקשה אחת שהועלתה דרך הפלטפורמה.",
                )}
              </p>
            </Card>

            <Card className="p-3.5">
              <Label>{t("Loop closure rate", "שיעור סגירת לולאות")}</Label>
              <p className="mt-1 text-2xl font-extrabold leading-none text-white">
                {m.closureRate === null ? (
                  "—"
                ) : (
                  <>
                    <Num>{Math.round(m.closureRate * 100)}</Num>
                    <span className="text-[14px]">%</span>
                  </>
                )}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
                {m.answeredNotClosed > 0 ? (
                  lang === "he" ? (
                    <>
                      <Num>{m.answeredNotClosed}</Num> נענו ועדיין לא נסגרו.
                    </>
                  ) : (
                    <>
                      <Num>{m.answeredNotClosed}</Num> answered and still not closed.
                    </>
                  )
                ) : (
                  t(
                    "Every answer confirmed by the clinician who asked.",
                    "כל תשובה אושרה בידי מי שביקש אותה.",
                  )
                )}
              </p>
            </Card>
          </div>

          {/* Sustained use — a pilot that is used in week one and abandoned in
              week four has failed, and only a series shows that. */}
          <Card className="mt-3 p-3.5">
            <Label>{t("Loops opened per week", "לולאות שנפתחו בשבוע")}</Label>
            {m.weekly.length === 0 ? (
              <p className="mt-2 text-[12px] text-[var(--color-ink-faint)]">
                {t("Nothing opened yet.", "עדיין לא נפתחה אף לולאה.")}
              </p>
            ) : (
              <ul className="mt-2.5 space-y-1.5">
                {m.weekly.map((w) => (
                  <li key={w.week} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-[11px] text-[var(--color-ink-faint)]">
                      <Num>{w.week.replace(/^\d{4}-/, "")}</Num>
                    </span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                      <span
                        className="block h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${(w.opened / peakWeek) * 100}%` }}
                      />
                    </span>
                    <span className="w-5 shrink-0 text-end text-[11px] font-semibold text-white">
                      <Num>{w.opened}</Num>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
              {t(
                "Adoption is a series, not a total: a platform used hard for a fortnight and then abandoned has failed, and only the shape shows it.",
                "אימוץ הוא סדרה, לא סכום: פלטפורמה שמשתמשים בה בעוצמה שבועיים ואז נוטשים אותה נכשלה, ורק צורת הסדרה מראה זאת.",
              )}
            </p>
          </Card>
        </div>

        {/* The variance estimate — the reason the pilot exists */}
        <div className="mt-5">
          <SectionTitle>
            {t("Secondary — referral to decision", "תוצא משני — מהפניה עד החלטה")}
          </SectionTitle>
          <Card className="p-4">
            <div className="flex items-baseline justify-between gap-3">
              <Label>
                {t(
                  "Days from referral to a recorded decision",
                  "ימים מההפניה ועד החלטה מתועדת",
                )}
              </Label>
              <Badge tone={m.interval.reportable ? "stable" : "neutral"}>
                <En>n = {m.interval.n}</En>
              </Badge>
            </div>

            {m.interval.n === 0 ? (
              <p className="mt-2 text-[12px] text-[var(--color-ink-faint)]">
                {t(
                  "No decisions recorded in the cohort yet.",
                  "עדיין לא נרשמו החלטות בקוהורטה.",
                )}
              </p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    { k: "median", label: t("Median", "חציון"), v: m.interval.median },
                    { k: "mean", label: t("Mean", "ממוצע"), v: m.interval.mean },
                    { k: "range", label: t("Range", "טווח"), v: null },
                  ].map((cell) => (
                    <div key={cell.k}>
                      <p className="text-[11px] text-[var(--color-ink-faint)]">{cell.label}</p>
                      <p className="mt-0.5 text-[17px] font-bold text-white">
                        {cell.k === "range" ? (
                          <Num>
                            {m.interval.min}–{m.interval.max}
                          </Num>
                        ) : (
                          <Num>{cell.v === null ? "—" : cell.v.toFixed(1)}</Num>
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 border-t border-[var(--color-line)] pt-3">
                  <Label>{t("Standard deviation", "סטיית תקן")}</Label>
                  {m.interval.reportable && m.interval.sd !== null ? (
                    <>
                      <p className="mt-0.5 text-2xl font-extrabold leading-none text-white">
                        <Num>{m.interval.sd.toFixed(1)}</Num>
                        <span className="text-[13px] font-semibold text-[var(--color-ink-muted)]">
                          {" "}
                          {t("days", "ימים")}
                        </span>
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                        {t(
                          "This is the number the definitive trial is powered from. The protocol’s working assumption was 20 days, and it was an assumption, not a measurement.",
                          "זה המספר שממנו נגזרת עוצמת המחקר המכריע. הנחת העבודה בפרוטוקול הייתה 20 ימים, והיא הייתה הנחה, לא מדידה.",
                        )}
                      </p>
                    </>
                  ) : (
                    <Callout tone="neutral" icon="hourglass_top">
                      {lang === "he" ? (
                        <>
                          לא מוצגת עד שיירשמו <Num>10</Num> מרווחים. <En>SD</En> שמבוסס על{" "}
                          <Num>{m.interval.n}</Num>{" "}
                          {m.interval.n === 1 ? "מרווח" : "מרווחים"} אינו יציב מספיק כדי
                          לתכנן עליו מחקר, וציטוט שלו בכל זאת הוא הדרך שבה נולדים מחקרים
                          חסרי עוצמה.
                        </>
                      ) : (
                        <>
                          Withheld until <Num>10</Num> intervals are recorded. An SD from{" "}
                          <Num>{m.interval.n}</Num>{" "}
                          {m.interval.n === 1 ? "interval" : "intervals"} is too unstable to
                          plan a trial around, and quoting one anyway is how
                          under-powered trials get designed.
                        </>
                      )}
                    </Callout>
                  )}
                </div>
              </>
            )}
          </Card>

          {m.boardCases > 0 && (
            <Card className="mt-3 p-3.5">
              <Label>{t("Cases reaching no decision", "מקרים שלא הגיעו להחלטה")}</Label>
              <p className="mt-1 text-[15px] font-bold text-white">
                {lang === "he" ? (
                  <>
                    <Num>{m.boardUndecided}</Num> מתוך <Num>{m.boardCases}</Num> ששובצו
                  </>
                ) : (
                  <>
                    <Num>{m.boardUndecided}</Num> of <Num>{m.boardCases}</Num> listed
                  </>
                )}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
                {lang === "he" ? (
                  <>
                    מושווה בניתוח מול <Num>24.9%</Num> המדווחים בספרות.
                  </>
                ) : (
                  <>
                    Compared in the analysis against the <Num>24.9%</Num> reported in the
                    literature.
                  </>
                )}
              </p>
            </Card>
          )}
        </div>

        {/* The cohort itself */}
        <div className="mt-5">
          <SectionTitle
            action={
              <span className="text-[11px] text-[var(--color-ink-faint)]">
                {lang === "he" ? (
                  <>
                    <Num>{m.enrolled}</Num> שורות
                  </>
                ) : (
                  <>
                    <Num>{m.enrolled}</Num> rows
                  </>
                )}
              </span>
            }
          >
            {t("Cohort", "קוהורטה")}
          </SectionTitle>

          {m.cohort.length === 0 ? (
            <Card className="p-4">
              <p className="text-[12px] text-[var(--color-ink-muted)]">
                {lang === "he" ? (
                  <>
                    לא הופנו מטופלים מאז <Num>{fmtDate(PILOT_START)}</Num>.
                  </>
                ) : (
                  <>
                    No patients referred since <Num>{fmtDate(PILOT_START)}</Num>.
                  </>
                )}
              </p>
            </Card>
          ) : (
            <Card className="divide-y divide-[var(--color-line)]">
              {m.cohort.map((c) => (
                <div key={c.patient.id} className="flex items-center gap-3 p-3">
                  <span className="w-10 shrink-0 rounded bg-white/5 py-1 text-center text-[11px] font-bold text-[var(--color-ink-muted)]">
                    <Num>P{String(c.seq).padStart(3, "0")}</Num>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">
                      {SUBSITE_LABEL[c.patient.subsite]} ·{" "}
                      <En>{c.patient.tnm.stageGroup}</En>
                    </p>
                    <p className="truncate text-[11px] text-[var(--color-ink-faint)]">
                      {lang === "he" ? (
                        <>
                          הופנה <Num>{fmtDate(c.patient.referralDate)}</Num> ·{" "}
                          <Num>{`${c.loopsClosed}/${c.loopsOpened}`}</Num> לולאות נסגרו
                        </>
                      ) : (
                        <>
                          Referred <Num>{fmtDate(c.patient.referralDate)}</Num> ·{" "}
                          <Num>{`${c.loopsClosed}/${c.loopsOpened}`}</Num> loops closed
                        </>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-end">
                    {c.daysToDecision === null ? (
                      <span className="text-[11px] text-[var(--color-ink-faint)]">
                        {t("no decision", "אין החלטה")}
                      </span>
                    ) : (
                      <>
                        <span className="block text-[15px] font-bold text-white">
                          <Num>{c.daysToDecision}</Num>
                        </span>
                        <span className="block text-[10px] text-[var(--color-ink-faint)]">
                          {t("days", "ימים")}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </Card>
          )}

          <Button icon="download" variant="secondary" className="mt-3 w-full" onClick={exportCsv}>
            {lang === "he" ? (
              <>
                ייצוא הקוהורטה כ־<En>CSV</En>
              </>
            ) : (
              <>Export the cohort as CSV</>
            )}
          </Button>
          {saved && (
            <p className="mt-2 px-1 text-[11px] text-[var(--color-ink-muted)]">{saved}</p>
          )}
          {/* The prose is one flex item, not several: a bare text node beside
              an element inside a flex container makes each of them a column. */}
          <p className="mt-2 flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
            <Icon name="lock" size={13} className="mt-px shrink-0" />
            <span>
              {t(
                "The export carries study identifiers only — no names, no national ID numbers, no medical record numbers. The key that maps a study number back to a patient stays inside the system.",
                "הייצוא נושא מזהי מחקר בלבד — בלי שמות, בלי מספרי תעודת זהות ובלי מספרי תיק רפואי. המפתח שמקשר מספר מחקר בחזרה למטופל נשאר בתוך המערכת.",
              )}
            </span>
          </p>
        </div>
      </Screen>
    </>
  );
}
