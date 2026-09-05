"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Screen } from "@/components/shell";
import {
  AppHeader,
  BarRow,
  Callout,
  Card,
  En,
  Icon,
  Label,
  Meter,
  Num,
  SectionTitle,
  StatTile,
} from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import {
  byDiscipline,
  fmtHours,
  fmtPercent,
  loopMetrics,
  mdtMetrics,
  pathwayMetrics,
} from "@/lib/metrics";
import { DISCIPLINE_SHORT } from "@/lib/types";
import { adjuvantMetrics, milestoneText, SPORT_TARGET_DAYS } from "@/lib/pathway";
import { shortName } from "@/lib/format";

/**
 * The completion buckets come out of `adjuvantMetrics` labelled the way the
 * trial reported them. Only the word needs translating; the ranges do not.
 */
const COMPLETION_LABEL_HE: Record<string, string> = {
  "4–5 milestones": "4–5 אבני דרך",
  "2–3 milestones": "2–3 אבני דרך",
  "0–1 milestones": "0–1 אבני דרך",
};

/** How these numbers are produced — the note that keeps the screen honest. */
const METHOD = [
  {
    icon: "sync",
    en: [
      "Closure rate",
      "Loops marked closed by the clinician who opened them, over all loops. An answer without confirmation does not count.",
    ],
    he: [
      "שיעור סגירה",
      "לולאות שנסגרו בידי הרופא שפתח אותן, מתוך כלל הלולאות. תשובה ללא אישור אינה נספרת.",
    ],
  },
  {
    icon: "timer",
    en: [
      "Response time",
      "Median hours from opening a loop to the first substantive answer, grouped by the receiving discipline.",
    ],
    he: [
      "זמן תגובה",
      "חציון השעות מפתיחת הלולאה ועד התשובה המהותית הראשונה, בפילוח לפי הדיסציפלינה המשיבה.",
    ],
  },
  {
    icon: "diversity_3",
    en: [
      "Cross-discipline traffic",
      "Requests raised plus requests answered, per discipline — a proxy for how far participation extends beyond surgery.",
    ],
    he: [
      "תנועה בין דיסציפלינות",
      "בקשות שנפתחו ובקשות שנענו, לכל דיסציפלינה — מדד עקיף לשאלה עד כמה ההשתתפות חורגת מעבר לכירורגיה.",
    ],
  },
  {
    icon: "gavel",
    en: [
      "No-decision rate",
      "Cases listed for the board that ended without a recorded decision, including deferrals.",
    ],
    he: [
      "שיעור מקרים ללא החלטה",
      "מקרים שהועלו לדיון והסתיימו בלי החלטה מתועדת, כולל דחיות לדיון נוסף.",
    ],
  },
  {
    icon: "schedule",
    en: [
      "Pathway days",
      "Days from referral to MDT decision or to treatment start, whichever is available.",
    ],
    he: [
      "ימי מסלול",
      "הימים מההפניה ועד החלטת ה־MDT או ועד לתחילת הטיפול, לפי מה שקיים.",
    ],
  },
];

/**
 * Metrics.
 *
 * This is the screen that turns the application from a working tool into a
 * study instrument. Every number is computed live by the same functions that
 * would run against real data, so the demonstration shows exactly what the
 * study would measure.
 *
 * Design note: every chart is single-hue with a value label beside each row.
 * Colouring categories by hue failed colour-vision separation testing, so
 * identity is carried by text, not colour. Status colours are reserved for the
 * tiles, where they always travel with an icon and a word.
 */
export default function InsightsPage() {
  const { loops, sessions, patients, team } = useStore();
  const { lang, t } = useLang();

  const lm = useMemo(() => loopMetrics(loops), [loops]);
  const dm = useMemo(() => byDiscipline(loops, team), [loops, team]);
  const mm = useMemo(() => mdtMetrics(sessions, team), [sessions, team]);
  const pm = useMemo(() => pathwayMetrics(patients), [patients]);
  const am = useMemo(() => adjuvantMetrics(patients), [patients]);

  const funnel = [
    { label: t("Opened", "נפתחה"), value: lm.total },
    { label: t("Acknowledged", "נקלטה"), value: lm.total - lm.byState.open },
    { label: t("Answered", "נענתה"), value: lm.byState.answered + lm.byState.closed },
    { label: t("Closed", "נסגרה"), value: lm.byState.closed },
  ];

  const maxDisciplineHours = Math.max(1, ...dm.map((d) => d.medianHoursToAnswer ?? 0));
  const maxTraffic = Math.max(1, ...dm.map((d) => d.received + d.raised));

  /** 24.9% of cases reached no recommendation at all — Hahlweg 2017. */
  const BENCHMARK_NO_DECISION = 0.249;

  return (
    <>
      <AppHeader
        title={t("Metrics", "מדדים")}
        subtitle={t("Closed-loop teamwork", "עבודת צוות במעגל סגור")}
      />
      <Screen>
        <Callout tone="warn" icon="science">
          {t(
            "Synthetic demonstration data. None of these values represent the real performance of any department — they show which metrics the system generates automatically.",
            "נתוני הדגמה סינתטיים. אף אחד מהערכים כאן אינו משקף ביצועים אמיתיים של מחלקה כלשהי — הם מראים אילו מדדים המערכת מפיקה אוטומטית.",
          )}
        </Callout>

        {/* The research question */}
        <Card className="mt-4 border-[#137fec55] bg-gradient-to-br from-[#137fec1a] to-transparent p-4">
          <Label>{t("Research question", "שאלת המחקר")}</Label>
          <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-white">
            {t(
              "Does structured closed-loop communication between disciplines shorten the time to a multidisciplinary treatment decision in head and neck cancer?",
              "האם תקשורת מובנית במעגל סגור בין הדיסציפלינות מקצרת את הזמן עד להחלטת טיפול רב-תחומית בסרטן ראש-צוואר?",
            )}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            {lang === "he" ? (
              <>
                התוצא הראשוני הוא מספר הימים מההפניה ועד להחלטת <En>MDT</En> מתועדת.
                התוצאים המשניים הם שיעור סגירת הלולאות ושיעור המקרים שנדונו בוועדה בלי
                שהתקבלה בהם החלטה.
              </>
            ) : (
              <>
                The primary outcome is days from referral to a recorded MDT decision.
                Secondary outcomes are the loop closure rate and the proportion of cases
                discussed at the board without reaching a decision.
              </>
            )}
          </p>
        </Card>

        {/* Headline metric */}
        <div className="mt-4">
          <SectionTitle>{t("Loop closure rate", "שיעור סגירת לולאות")}</SectionTitle>
          <Card className="p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-5xl font-extrabold leading-none text-white">
                  <Num>{fmtPercent(lm.closureRate)}</Num>
                </p>
                <p className="mt-1.5 text-[12px] text-[var(--color-ink-muted)]">
                  {lang === "he" ? (
                    <>
                      <Num>{lm.byState.closed}</Num> מתוך <Num>{lm.total}</Num> בקשות
                      שהרופא ששאל אישר שנפתרו
                    </>
                  ) : (
                    <>
                      <Num>{lm.byState.closed}</Num> of <Num>{lm.total}</Num> requests
                      confirmed resolved by the clinician who asked
                    </>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-end">
                <p className="text-[11px] leading-tight text-[var(--color-ink-faint)]">
                  {lang === "he" ? (
                    <>
                      זמן חציוני
                      <br />
                      עד סגירה
                    </>
                  ) : (
                    <>
                      Median time
                      <br />
                      to close
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-[17px] font-bold text-white">
                  <Num>{fmtHours(lm.medianHoursToClose)}</Num>
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Meter percent={lm.closureRate * 100} tone="stable" height={8} />
            </div>
          </Card>
        </div>

        {/* Where loops are lost */}
        <div className="mt-5">
          <SectionTitle>{t("Where loops are lost", "היכן לולאות הולכות לאיבוד")}</SectionTitle>
          <Card className="p-4">
            {funnel.map((f) => (
              <BarRow
                key={f.label}
                label={f.label}
                value={f.value}
                max={lm.total}
                display={`${f.value}`}
              />
            ))}
            <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
              {lang === "he" ? (
                <>
                  הפער בין <strong className="text-white">נענתה</strong> לבין{" "}
                  <strong className="text-white">נסגרה</strong> הוא הכשל שהמערכת הזאת
                  קיימת כדי לחשוף: מישהו השיב, אבל איש לא אישר שהתשובה באמת שחררה את
                  ההחלטה.
                </>
              ) : (
                <>
                  The gap between <strong className="text-white">answered</strong> and{" "}
                  <strong className="text-white">closed</strong> is the failure this system
                  exists to expose: somebody replied, but nobody confirmed the reply actually
                  unblocked the decision.
                </>
              )}
            </p>
          </Card>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile
            value={lm.answeredNotClosed}
            label={t("Not closed", "לא נסגרו")}
            icon="pending"
            tone={lm.answeredNotClosed > 0 ? "review" : "stable"}
          />
          <StatTile
            value={lm.breached}
            label={t("Past target", "חריגה מהיעד")}
            icon="schedule"
            tone={lm.breached > 0 ? "urgent" : "stable"}
          />
          <StatTile
            value={fmtHours(lm.medianHoursToAck)}
            label={t("To acknowledge", "עד קליטה")}
            icon="mark_email_read"
          />
        </div>

        {/* Who works with whom */}
        <div className="mt-5">
          <SectionTitle
            action={
              <Link href="/team" className="text-[11px] font-semibold text-[var(--color-primary)]">
                {t("Team view", "מסך הצוות")}
              </Link>
            }
          >
            {t("Cross-discipline traffic", "תנועה בין הדיסציפלינות")}
          </SectionTitle>
          <Card className="p-4">
            {dm.map((d) => (
              <BarRow
                key={`traffic-${d.discipline}`}
                label={DISCIPLINE_SHORT[d.discipline]}
                value={d.received + d.raised}
                max={maxTraffic}
                display={`${d.received + d.raised}`}
                sublabel={
                  lang === "he"
                    ? `${d.raised} שאלו · ${d.received} השיבו`
                    : `${d.raised} asked · ${d.received} answered`
                }
              />
            ))}
            <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
              {t(
                "Multidisciplinary care is a two-way property. A discipline that only ever receives requests is being consulted, not participating — and that shows up here before it shows up in the meeting.",
                "טיפול רב-תחומי הוא תכונה דו-כיוונית. דיסציפלינה שרק מקבלת בקשות היא דיסציפלינה שמתייעצים איתה, לא דיסציפלינה שמשתתפת — וזה נראה כאן לפני שזה נראה בדיון.",
              )}
            </p>
          </Card>
        </div>

        {/* Bottleneck */}
        <div className="mt-5">
          <SectionTitle
            action={
              <span className="text-[11px] text-[var(--color-ink-faint)]">
                {t("median", "חציון")}
              </span>
            }
          >
            {t("Response time by discipline", "זמן תגובה לפי דיסציפלינה")}
          </SectionTitle>
          <Card className="p-4">
            {dm.map((d) => (
              <BarRow
                key={d.discipline}
                label={DISCIPLINE_SHORT[d.discipline]}
                value={d.medianHoursToAnswer ?? 0}
                max={maxDisciplineHours}
                display={fmtHours(d.medianHoursToAnswer)}
                tone={d.breached > 0 ? "urgent" : "primary"}
                sublabel={
                  d.openNow > 0
                    ? lang === "he"
                      ? `${d.openNow} פתוחות כעת${d.breached ? ` · ${d.breached} בחריגה מהיעד` : ""}`
                      : `${d.openNow} open now${d.breached ? ` · ${d.breached} past target` : ""}`
                    : undefined
                }
              />
            ))}
            <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
              {t(
                "Measured at discipline level, never at individual level. The aim is to find systemic load — a short-staffed pathology service, an anaesthetic gap — not to rank clinicians. That distinction decides whether a team uses the system or works around it.",
                "המדידה היא ברמת הדיסציפלינה, לעולם לא ברמת האדם. המטרה היא לאתר עומס מערכתי — מכון פתולוגיה בתת-תקן, פער בהרדמה — ולא לדרג רופאים. ההבחנה הזאת היא שקובעת אם צוות ישתמש במערכת או יעקוף אותה.",
              )}
            </p>
          </Card>
        </div>

        {/* Tumour board */}
        <div className="mt-5">
          <SectionTitle>{t("The tumour board", "ועדת הגידולים")}</SectionTitle>
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-3xl font-extrabold text-white">
                  <Num>{fmtPercent(mm.noDecisionRate)}</Num>
                </p>
                <p className="text-[11px] text-[var(--color-ink-faint)]">
                  {t("No decision", "ללא החלטה")}
                </p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-[#fcd34d]">
                  <Num>{mm.blockedByOpenLoop}</Num>
                </p>
                <p className="text-[11px] text-[var(--color-ink-faint)]">
                  {t("Blocked by an open loop", "חסומים בגלל לולאה פתוחה")}
                </p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white">
                  <Num>{mm.medianAttendance ?? "—"}</Num>
                </p>
                <p className="text-[11px] text-[var(--color-ink-faint)]">
                  {t("Disciplines in the room", "דיסציפלינות בחדר")}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-3">
              <BarRow
                label={t("This department (demo)", "המחלקה הזאת (הדגמה)")}
                value={mm.noDecisionRate}
                max={Math.max(mm.noDecisionRate, BENCHMARK_NO_DECISION)}
                display={fmtPercent(mm.noDecisionRate)}
                tone={mm.noDecisionRate > BENCHMARK_NO_DECISION ? "urgent" : "primary"}
              />
              <BarRow
                label={t("Literature — Hahlweg 2017", "ספרות — Hahlweg 2017")}
                value={BENCHMARK_NO_DECISION}
                max={Math.max(mm.noDecisionRate, BENCHMARK_NO_DECISION)}
                display={fmtPercent(BENCHMARK_NO_DECISION)}
                tone="neutral"
              />
            </div>

            <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
              {lang === "he" ? (
                <>
                  בתצפית מובנית על <Num>249</Num> מקרים ב־<Num>29</Num> ועדות גידולים,
                  ב־<Num>24.9%</Num> לא התקבלה כל המלצת טיפול. ההשערה היא שחלק ניכר מהם
                  נכשלים על מידע חסר שאפשר היה להשיג עוד לפני הדיון.
                </>
              ) : (
                <>
                  In a structured observation of 249 cases across 29 tumour boards, 24.9%
                  reached no treatment recommendation at all. The hypothesis is that a
                  substantial share of those fail on missing information that could have been
                  obtained before the meeting.
                </>
              )}
            </p>
            <p className="mt-2 text-[11px] italic text-[var(--color-ink-faint)]">
              <En>Hahlweg P, et al. BMC Cancer. 2017;17:772.</En>
            </p>
          </Card>
        </div>

        {/* Pathway clock */}
        <div className="mt-5">
          <SectionTitle>{t("Pathway clock", "שעון המסלול")}</SectionTitle>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-[var(--color-ink-faint)]">
                  {t("Referral to decision", "מהפניה עד החלטה")}
                </p>
                <p className="text-2xl font-extrabold text-white">
                  <Num>{pm.medianDaysToDecision ?? "—"}</Num>
                  <span className="text-[13px] font-semibold"> {t("days", "ימים")}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--color-ink-faint)]">
                  {t("Referral to treatment", "מהפניה עד טיפול")}
                </p>
                <p className="text-2xl font-extrabold text-white">
                  <Num>{pm.medianDaysToTreatment ?? "—"}</Num>
                  <span className="text-[13px] font-semibold"> {t("days", "ימים")}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1 border-t border-[var(--color-line)] pt-3">
              <p className="mb-2 text-[11px] font-semibold text-[var(--color-ink-faint)]">
                {t(
                  "Days waiting — patients not yet started on treatment",
                  "ימי המתנה — מטופלים שטרם החלו טיפול",
                )}
              </p>
              {pm.perPatient
                .filter((p) => !p.started)
                .map((p) => (
                  <BarRow
                    key={p.id}
                    label={shortName(p.name)}
                    value={p.daysWaiting}
                    max={90}
                    display={
                      lang === "he" ? `${p.daysWaiting} ימים` : `${p.daysWaiting} days`
                    }
                    tone={
                      p.daysWaiting > 60 ? "urgent" : p.daysWaiting > 30 ? "warn" : "primary"
                    }
                  />
                ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-3">
              <span className="inline-flex items-center gap-1 rounded-md border border-[#f59e0b55] bg-[var(--color-warn-soft)] px-2 py-1 text-[11px] font-semibold text-[#fcd34d]">
                <Icon name="warning" size={12} />
                {t("Over 30 days:", "מעל 30 יום:")} <Num>{pm.over30Days}</Num>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-[#ef444455] bg-[var(--color-urgent-soft)] px-2 py-1 text-[11px] font-semibold text-[#fca5a5]">
                <Icon name="error" size={12} />
                {t("Over 60 days:", "מעל 60 יום:")} <Num>{pm.over60Days}</Num>
              </span>
            </div>

            <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
              {lang === "he" ? (
                <>
                  הספים אינם שרירותיים. במטא-אנליזה של <Num>873,718</Num> מטופלים, התחלת
                  טיפול בתוך <Num>30</Num> יום נשאה <En>aHR</En> <Num>1.09</Num>, ועיכוב
                  מעבר ל־<Num>60</Num> יום נשא <En>aHR</En> <Num>1.42</Num>. בישראל אין
                  יעד זמן לאומי מקביל — וזו אחת הסיבות שהמחקר הזה נדרש.
                </>
              ) : (
                <>
                  The thresholds are not arbitrary. In a meta-analysis of 873,718 patients,
                  starting treatment within 30 days carried aHR 1.09, and delay beyond 60 days
                  aHR 1.42. Israel has no equivalent national time target — one of the reasons
                  this study is needed.
                </>
              )}
            </p>
            <p className="mt-2 text-[11px] italic text-[var(--color-ink-faint)]">
              <En>Oral Oncology. 2024. PMID 39577127.</En>
            </p>
          </Card>
        </div>

        {/* Adjuvant pathway — the evidence-derived clock */}
        {am.onPathway > 0 && (
          <div className="mt-5">
            <SectionTitle
              action={
                <span className="text-[11px] text-[var(--color-ink-faint)]">
                  <Num>{am.onPathway}</Num> {t("on pathway", "במסלול")}
                </span>
              }
            >
              {t("Adjuvant radiotherapy pathway", "מסלול הקרנות משלימות")}
            </SectionTitle>
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {/* A rate without its denominator is a misleading number. With
                      two patients on the pathway "100%" would otherwise read as
                      a department-wide claim. */}
                  <p className="text-3xl font-extrabold text-white">
                    <Num>
                      {am.startedPort === 0
                        ? "—"
                        : `${am.timelyPort}/${am.startedPort}`}
                    </Num>
                  </p>
                  <p className="text-[11px] leading-snug text-[var(--color-ink-faint)]">
                    {lang === "he" ? (
                      <>
                        מבין מי שכבר החלו, החלו הקרנות בתוך{" "}
                        <Num>{SPORT_TARGET_DAYS}</Num> ימים מהניתוח
                      </>
                    ) : (
                      <>
                        of those who have started, began radiotherapy within{" "}
                        <Num>{SPORT_TARGET_DAYS}</Num> days of surgery
                      </>
                    )}
                    {am.onPathway > am.startedPort && (
                      <>
                        {" · "}
                        <span className="text-[#fcd34d]">
                          <Num>{am.onPathway - am.startedPort}</Num>{" "}
                          {t("still waiting", "עדיין ממתינים")}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-[#fca5a5]">
                    <Num>{am.overdue.length}</Num>
                  </p>
                  <p className="text-[11px] leading-snug text-[var(--color-ink-faint)]">
                    {t(
                      "milestones overdue across the cohort",
                      "אבני דרך בחריגה בכלל הקוהורטה",
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1 border-t border-[var(--color-line)] pt-3">
                <p className="mb-2 text-[11px] font-semibold text-[var(--color-ink-faint)]">
                  {t(
                    "Patients by milestones completed",
                    "מטופלים לפי אבני דרך שהושלמו",
                  )}
                </p>
                {am.byCompletion.map((b) => (
                  <BarRow
                    key={b.label}
                    label={lang === "he" ? (COMPLETION_LABEL_HE[b.label] ?? b.label) : b.label}
                    value={b.patients}
                    max={Math.max(1, ...am.byCompletion.map((x) => x.patients))}
                    display={`${b.patients}`}
                    tone={b.label.startsWith("0") ? "urgent" : "primary"}
                  />
                ))}
              </div>

              {am.overdue.length > 0 && (
                <div className="mt-3 border-t border-[var(--color-line)] pt-3">
                  <p className="mb-2 text-[11px] font-semibold text-[var(--color-ink-faint)]">
                    {t("Overdue now", "בחריגה כעת")}
                  </p>
                  <ul className="space-y-1.5">
                    {am.overdue.slice(0, 4).map((o) => (
                      <li
                        key={`${o.patientId}-${o.milestone.id}`}
                        className="flex items-start gap-2 text-[12px]"
                      >
                        <Icon
                          name="error"
                          size={13}
                          className="mt-0.5 shrink-0 text-[var(--color-urgent)]"
                        />
                        <Link href={`/patients/${o.patientId}`} className="flex-1 hover:underline">
                          <span className="text-white">
                            <En>{shortName(o.patientName)}</En>
                          </span>{" "}
                          <span className="text-[var(--color-ink-muted)]">
                            — {milestoneText(o.milestone).label}
                          </span>
                        </Link>
                        <span className="shrink-0 font-semibold text-[#fca5a5]">
                          {lang === "he" ? (
                            <>
                              <Num>{o.daysLate}</Num> ימים
                            </>
                          ) : (
                            <>
                              <Num>{o.daysLate}</Num>d
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                {lang === "he" ? (
                  <>
                    במחקר האקראי שבודד את אבני הדרך האלה, השלמה של ארבע או חמש מהן הביאה
                    להתחלת הקרנות בזמן אצל <Num>90%</Num> מהמטופלים, לעומת <Num>10%</Num>{" "}
                    אצל מי שהשלימו אחת או אף אחת. הטעם במעקב אחריהן כאן הוא שכל אחת מהן היא
                    העברת אחריות בין שתי דיסציפלינות — בדיוק מה שלולאה נועדה לה.
                  </>
                ) : (
                  <>
                    In the randomised trial that isolated these milestones, completing four or five
                    produced on-time radiotherapy in 90% of patients against 10% for one or none. The
                    point of tracking them here is that each one is a handoff between two disciplines —
                    which is exactly what a loop is for.
                  </>
                )}
              </p>
              <p className="mt-2 text-[11px] italic text-[var(--color-ink-faint)]">
                <En>
                  Graboyes EM, et al. JAMA Otolaryngol Head Neck Surg. 2026 · Graboyes EM, et al.
                  JAMA Otolaryngol Head Neck Surg. 2019;145(2):166–177.
                </En>
              </p>
            </Card>
          </div>
        )}

        {/* Age of open loops */}
        <div className="mt-5">
          <SectionTitle>{t("Age of open loops", "גיל הלולאות הפתוחות")}</SectionTitle>
          <Card className="p-4">
            {lm.ageBuckets.map((b) => (
              <BarRow
                key={b.label}
                label={b.label}
                value={b.count}
                max={Math.max(1, ...lm.ageBuckets.map((x) => x.count))}
                display={`${b.count}`}
                tone={b.label.includes("7") ? "urgent" : "primary"}
              />
            ))}
          </Card>
        </div>

        {/* Methodology */}
        <div className="mt-5">
          <SectionTitle>{t("How these are calculated", "איך המדדים מחושבים")}</SectionTitle>
          <Card className="divide-y divide-[var(--color-line)]">
            {METHOD.map((m) => {
              const [title, body] = lang === "he" ? m.he : m.en;
              return (
                <div key={m.icon} className="flex gap-3 p-3.5">
                  <Icon
                    name={m.icon}
                    size={18}
                    className="mt-px shrink-0 text-[var(--color-primary)]"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                      {body}
                    </p>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        <Link href="/evidence" className="mt-4 block">
          <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--color-primary)]/50">
            <Icon name="menu_book" size={20} className="text-[var(--color-primary)]" />
            <p className="flex-1 text-[13px] font-semibold text-white">
              {t("Full evidence base and sources", "בסיס הראיות המלא והמקורות")}
            </p>
            <Icon name="chevron_right" size={20} className="text-[var(--color-ink-faint)]" />
          </Card>
        </Link>
      </Screen>
    </>
  );
}
