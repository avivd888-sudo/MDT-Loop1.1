"use client";

import Link from "next/link";
import { useState } from "react";
import { Screen } from "@/components/shell";
import { LoopChain } from "@/components/loop";
import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  En,
  Icon,
  Label,
  Num,
  SectionTitle,
  Textarea,
} from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { member } from "@/lib/data";
import { fmtDateTime, relativeTime, shortName } from "@/lib/format";
import { fmtHours, hoursOpen, isBreached } from "@/lib/metrics";
import {
  DISCIPLINE_LABEL,
  LOOP_KIND_LABEL,
  LOOP_SLA_HOURS,
  URGENCY_LABEL,
  loopState,
  type LoopEvent,
} from "@/lib/types";

const EVENT_LABEL: Record<LoopEvent["type"], { en: string; he: string; icon: string }> = {
  opened: { en: "Loop opened", he: "הלולאה נפתחה", icon: "outgoing_mail" },
  acknowledged: { en: "Receipt acknowledged", he: "הבקשה נקלטה", icon: "mark_email_read" },
  answered: { en: "Answer received", he: "התקבלה תשובה", icon: "reply" },
  closed: { en: "Loop closed", he: "הלולאה נסגרה", icon: "task_alt" },
  escalated: { en: "Escalated", he: "הוסלמה", icon: "priority_high" },
  reopened: {
    en: "Reopened by a discipline lead",
    he: "נפתחה מחדש בידי מנהל דיסציפלינה",
    icon: "restart_alt",
  },
  note: { en: "Note", he: "הערה", icon: "sticky_note_2" },
  reassigned: {
    en: "Rerouted by a discipline lead",
    he: "נותבה מחדש בידי מנהל דיסציפלינה",
    icon: "alt_route",
  },
  // Named differently from "Loop closed" on purpose. A lead closing a stalled
  // loop is not the requester confirming the answer resolved anything, and the
  // audit trail must not let the two read alike.
  "override-closed": {
    en: "Closed by a discipline lead",
    he: "נסגרה בידי מנהל דיסציפלינה",
    icon: "gavel",
  },
};

export default function LoopDetail({ id }: { id: string }) {
  const {
    getLoop,
    getPatient,
    currentUser,
    acknowledgeLoop,
    answerLoop,
    closeLoop,
    escalateLoop,
    isDisciplineLead,
    reassignLoop,
    overrideCloseLoop,
    reopenLoop,
  } = useStore();
  const { lang, t } = useLang();

  const [answerDraft, setAnswerDraft] = useState("");
  const [closureDraft, setClosureDraft] = useState("");
  const [overrideDraft, setOverrideDraft] = useState("");

  const loop = getLoop(id);

  if (!loop) {
    return (
      <>
        <AppHeader title={t("Loop", "לולאה")} back="/loops" />
        <Screen>
          <EmptyState
            icon="search_off"
            title={t("Loop not found", "הלולאה לא נמצאה")}
            body={t(
              "It may have been created in a previous demonstration session and reset since.",
              "ייתכן שהיא נוצרה בהדגמה קודמת ומאז המערכת אופסה.",
            )}
          />
        </Screen>
      </>
    );
  }

  const patient = getPatient(loop.patientId);
  const state = loopState(loop);
  const breached = isBreached(loop);
  const requester = member(loop.requesterId);

  // Who may do what. The essential rule: only the requester can close.
  const canAcknowledge = !loop.acknowledgedAt && loop.toDiscipline === currentUser.discipline;
  const canAnswer = !loop.answeredAt && loop.toDiscipline === currentUser.discipline;
  const canClose = Boolean(loop.answeredAt) && !loop.closedAt && loop.requesterId === currentUser.id;

  /**
   * The lead's panel appears only where it is actually needed: a loop that is
   * open, past its target turnaround, and that the signed-in clinician cannot
   * close themselves. Offering an override on a healthy loop would quietly turn
   * the requester-closes rule into a suggestion.
   */
  const canOverride = isDisciplineLead && !loop.closedAt && breached && !canClose;
  /** A closed loop can still have gone unhandled, so a lead can put it back. */
  const canReopen = isDisciplineLead && Boolean(loop.closedAt);
  const awaitingSomeoneElse = !loop.closedAt && !canAcknowledge && !canAnswer && !canClose;

  return (
    <>
      <AppHeader
        title={LOOP_KIND_LABEL[loop.kind]}
        subtitle={patient ? shortName(patient.name) : undefined}
        back="/loops"
        action={
          !loop.closedAt && breached ? (
            <button
              onClick={() => escalateLoop(loop.id)}
              aria-label={t("Escalate", "הסלמה")}
              className="grid size-10 place-items-center rounded-full text-[#fca5a5] hover:bg-white/5"
            >
              <Icon name="priority_high" size={21} />
            </button>
          ) : undefined
        }
      />

      <Screen>
        {/* Loop state */}
        <Card className="p-4">
          <LoopChain loop={loop} />

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-3">
            <Badge tone={loop.closedAt ? "stable" : breached ? "urgent" : "primary"}>
              {URGENCY_LABEL[loop.urgency]}
            </Badge>
            <span className="text-[12px] text-[var(--color-ink-muted)]">
              {lang === "he" ? (
                <>
                  פתוחה <Num>{fmtHours(hoursOpen(loop))}</Num> · יעד{" "}
                  <Num>{LOOP_SLA_HOURS[loop.urgency]}</Num> שע׳
                </>
              ) : (
                <>
                  Open <Num>{fmtHours(hoursOpen(loop))}</Num> · target{" "}
                  <Num>{LOOP_SLA_HOURS[loop.urgency]}</Num>h
                </>
              )}
            </span>
          </div>

          {breached && !loop.closedAt && (
            <div className="mt-3">
              <Callout tone="urgent" icon="schedule">
                {t(
                  "Past its target turnaround. If this loop is blocking a decision, escalation is the right move — not further waiting.",
                  "חרגה מזמן היעד. אם הלולאה הזאת חוסמת החלטה, הסלמה היא הצעד הנכון — לא עוד המתנה.",
                )}
              </Callout>
            </div>
          )}

          {state === "answered" && !loop.closedAt && (
            <div className="mt-3">
              <Callout tone="review" icon="pending">
                {lang === "he" ? (
                  <>
                    נענתה אך <strong>עדיין לא נסגרה</strong>. רק{" "}
                    {loop.requesterId === currentUser.id ? (
                      "את/ה"
                    ) : (
                      <En>{requester.name}</En>
                    )}{" "}
                    — מי שביקש — יכול לאשר שהתשובה פותרת את השאלה.
                  </>
                ) : (
                  <>
                    Answered but <strong>not yet closed</strong>. Only{" "}
                    {loop.requesterId === currentUser.id ? "you" : requester.name} — the
                    person who asked — can confirm the answer resolves the question.
                  </>
                )}
              </Callout>
            </div>
          )}
        </Card>

        {/* SBAR */}
        <div className="mt-4">
          <SectionTitle
            action={
              <span className="text-[11px] text-[var(--color-ink-faint)]">
                <En>SBAR</En>
              </span>
            }
          >
            {t("The request", "הבקשה")}
          </SectionTitle>

          <Card className="divide-y divide-[var(--color-line)]">
            {[
              { k: "S", label: t("Situation", "רקע קצר"), body: loop.situation },
              { k: "B", label: t("Background", "רקע"), body: loop.background },
              { k: "A", label: t("Assessment", "הערכה"), body: loop.assessment },
            ].map((row) => (
              <div key={row.k} className="flex gap-3 p-3.5">
                <span className="grid size-6 shrink-0 place-items-center rounded bg-white/5 text-[11px] font-bold text-[var(--color-ink-muted)]">
                  {row.k}
                </span>
                <div className="min-w-0 flex-1">
                  <Label>{row.label}</Label>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-white">{row.body}</p>
                </div>
              </div>
            ))}

            {/* The ask is emphasised: it is the only thing that gets closed */}
            <div className="flex gap-3 bg-[var(--color-primary-soft)] p-3.5">
              <span className="grid size-6 shrink-0 place-items-center rounded bg-[var(--color-primary)] text-[11px] font-bold text-white">
                R
              </span>
              <div className="min-w-0 flex-1">
                <Label>{t("Request", "בקשה")}</Label>
                <p className="mt-0.5 text-[14px] font-semibold leading-relaxed text-white">
                  {loop.request}
                </p>
              </div>
            </div>
          </Card>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-[var(--color-ink-faint)]">
            <span className="inline-flex items-center gap-1">
              <Avatar initials={requester.initials} colour={requester.colour} size={16} />
              <En>{requester.name}</En>
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="east" size={12} />
              {DISCIPLINE_LABEL[loop.toDiscipline]}
            </span>
            <span>{fmtDateTime(loop.openedAt)}</span>
          </div>
        </div>

        {/* Blocking */}
        {loop.blocksCaseId && (
          <div className="mt-4">
            <Callout
              tone={loop.closedAt ? "stable" : "warn"}
              icon={loop.closedAt ? "check_circle" : "block"}
            >
              {loop.closedAt ? (
                lang === "he" ? (
                  <>
                    הלולאה הזאת שחררה תנאי מקדים ברשימת דיון ה־<En>MDT</En>.
                  </>
                ) : (
                  <>This loop released a prerequisite on the tumour board list.</>
                )
              ) : lang === "he" ? (
                <>
                  הלולאה הזאת חוסמת מקרה בדיון ה־<En>MDT</En>.{" "}
                  <Link href="/board" className="font-semibold underline">
                    מעבר לדיון
                  </Link>
                </>
              ) : (
                <>
                  This loop is blocking a case at the tumour board.{" "}
                  <Link href="/board" className="font-semibold underline">
                    Open the board
                  </Link>
                </>
              )}
            </Callout>
          </div>
        )}

        {/* Answer */}
        {loop.answer && (
          <div className="mt-4">
            <SectionTitle>{t("The answer", "התשובה")}</SectionTitle>
            <Card className="p-3.5">
              <p className="text-[13px] leading-relaxed text-white">{loop.answer}</p>
              <p className="mt-2 border-t border-[var(--color-line)] pt-2 text-[11px] text-[var(--color-ink-faint)]">
                <En>{member(loop.answeredBy!).name}</En> · {fmtDateTime(loop.answeredAt!)}
              </p>
            </Card>
          </div>
        )}

        {/* Closure */}
        {loop.closedAt && (
          <div className="mt-4">
            <SectionTitle>{t("Closure", "הסגירה")}</SectionTitle>
            <Card className="border-[#10b98144] bg-[var(--color-stable-soft)] p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#6ee7b7]">
                <Icon name="task_alt" size={14} />
                {t("Confirmed by the person who asked", "אושרה בידי מי שביקש")}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white">
                {loop.closureNote}
              </p>
              <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-[var(--color-ink-faint)]">
                {lang === "he" ? (
                  <>
                    <En>{member(loop.closedBy!).name}</En> · {fmtDateTime(loop.closedAt)} ·{" "}
                    <Num>{fmtHours(hoursOpen(loop))}</Num> מהפתיחה
                  </>
                ) : (
                  <>
                    {member(loop.closedBy!).name} · {fmtDateTime(loop.closedAt)} ·{" "}
                    <Num>{fmtHours(hoursOpen(loop))}</Num> from opening
                  </>
                )}
              </p>
            </Card>
          </div>
        )}

        {/* Actions */}
        {!loop.closedAt && (
          <div className="mt-5 space-y-3">
            {canAcknowledge && (
              <Button
                icon="mark_email_read"
                className="w-full"
                onClick={() => acknowledgeLoop(loop.id)}
              >
                {t("Acknowledge receipt", "אישור קליטה")}
              </Button>
            )}

            {canAnswer && (
              <Card className="p-3.5">
                <Label>{t("Answer", "תשובה")}</Label>
                <Textarea
                  className="mt-1.5"
                  rows={4}
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  placeholder={t(
                    "Answer the request as written. An answer that does not address it will be rejected at closure.",
                    "ענו על הבקשה כפי שנוסחה. תשובה שאינה נוגעת בה תידחה בשלב הסגירה.",
                  )}
                />
                <Button
                  icon="reply"
                  className="mt-3 w-full"
                  disabled={answerDraft.trim().length < 5}
                  onClick={() => {
                    answerLoop(loop.id, answerDraft.trim());
                    setAnswerDraft("");
                  }}
                >
                  {t("Send answer", "שליחת התשובה")}
                </Button>
              </Card>
            )}

            {canClose && (
              <Card className="border-[#a78bfa55] p-3.5">
                <Label>{t("Close the loop", "סגירת הלולאה")}</Label>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                  {t(
                    "Does the answer resolve the request? If not, do not close it. Write what is still missing and the clock keeps running.",
                    "האם התשובה פותרת את הבקשה? אם לא — אל תסגרו אותה. כתבו מה עדיין חסר, והשעון ימשיך לרוץ.",
                  )}
                </p>
                <Textarea
                  className="mt-2"
                  rows={3}
                  value={closureDraft}
                  onChange={(e) => setClosureDraft(e.target.value)}
                  placeholder={t(
                    "What was done as a result, and why the question is settled.",
                    "מה נעשה בעקבות התשובה, ולמה השאלה סגורה.",
                  )}
                />
                <Button
                  icon="task_alt"
                  className="mt-3 w-full"
                  disabled={closureDraft.trim().length < 5}
                  onClick={() => {
                    closeLoop(loop.id, closureDraft.trim());
                    setClosureDraft("");
                  }}
                >
                  {t("Close the loop", "סגירת הלולאה")}
                </Button>
              </Card>
            )}

            {canOverride && (
              <Card className="border-[#f59e0b66] bg-[var(--color-warn-soft)] p-3.5">
                <div className="flex items-center gap-2">
                  <Icon name="gavel" size={17} className="text-[#fcd34d]" />
                  <Label>{t("Discipline lead", "מנהל דיסציפלינה")}</Label>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                  {lang === "he" ? (
                    <>
                      הלולאה חרגה מהיעד שלה ומי שפתח אותה לא סגר אותה. כמנהל הדיסציפלינה
                      אפשר לנתב אותה מחדש או לסגור אותה{" "}
                      <strong className="text-white">בנימוק</strong>. כל אחת משתי הפעולות
                      נרשמת על שמך בהיסטוריה שלמטה, ולעולם אינה מוצגת כסגירה רגילה.
                    </>
                  ) : (
                    <>
                      This loop has passed its target and its requester has not closed it.
                      As lead for your discipline you may reroute it or close it{" "}
                      <strong className="text-white">with a reason</strong>. Either act is
                      recorded against your name in the history below, and is never shown
                      as an ordinary closure.
                    </>
                  )}
                </p>
                <Textarea
                  className="mt-2"
                  rows={2}
                  value={overrideDraft}
                  onChange={(e) => setOverrideDraft(e.target.value)}
                  placeholder={t(
                    "Why the loop is being taken over — e.g. requester on leave, answer already acted on.",
                    "מדוע הלולאה נלקחת לטיפול — למשל: מי שפתח אותה בחופשה, או שכבר פעלו לפי התשובה.",
                  )}
                />
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button
                    icon="gavel"
                    variant="danger"
                    disabled={overrideDraft.trim().length < 5}
                    onClick={() => {
                      overrideCloseLoop(loop.id, overrideDraft.trim());
                      setOverrideDraft("");
                    }}
                  >
                    {t("Close as lead", "סגירה כמנהל")}
                  </Button>
                  <Button
                    icon="alt_route"
                    variant="secondary"
                    disabled={overrideDraft.trim().length < 5}
                    onClick={() => {
                      reassignLoop(loop.id, "surgery", overrideDraft.trim());
                      setOverrideDraft("");
                    }}
                  >
                    {t("Reroute to Head & Neck Surgery", "ניתוב לכירורגיית ראש-צוואר")}
                  </Button>
                </div>
              </Card>
            )}

            {canReopen && (
              <Card className="border-[#f59e0b66] bg-[var(--color-warn-soft)] p-3.5">
                <div className="flex items-center gap-2">
                  <Icon name="restart_alt" size={17} className="text-[#fcd34d]" />
                  <Label>{t("Discipline lead", "מנהל דיסציפלינה")}</Label>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                  {t(
                    "Closed is not always handled. If the answer did not settle the question, put the loop back — the clock resumes and the closure rate stays worth measuring.",
                    "״נסגרה״ אינו תמיד ״טופלה״. אם התשובה לא יישבה את השאלה, החזירו את הלולאה — השעון מתחדש ושיעור הסגירה נשאר מדד ששווה למדוד.",
                  )}
                </p>
                <Textarea
                  className="mt-2"
                  rows={2}
                  value={overrideDraft}
                  onChange={(e) => setOverrideDraft(e.target.value)}
                  placeholder={t("What is still outstanding.", "מה עדיין פתוח.")}
                />
                <Button
                  icon="restart_alt"
                  variant="secondary"
                  className="mt-2.5 w-full"
                  disabled={overrideDraft.trim().length < 5}
                  onClick={() => {
                    reopenLoop(loop.id, overrideDraft.trim());
                    setOverrideDraft("");
                  }}
                >
                  {t("Reopen this loop", "פתיחה מחדש של הלולאה")}
                </Button>
              </Card>
            )}

            {loop.overriddenBy && (
              <Callout tone="warn" icon="gavel">
                {lang === "he" ? (
                  <>
                    טופלה בידי מנהל דיסציפלינה, ולא בידי מי שביקש. הנימוק שנרשם:{" "}
                    {loop.overrideReason}
                  </>
                ) : (
                  <>
                    Handled by a discipline lead, not by the clinician who asked. Reason
                    recorded: {loop.overrideReason}
                  </>
                )}
              </Callout>
            )}

            {awaitingSomeoneElse && !canOverride && (
              <Callout tone="neutral" icon="hourglass_top">
                {!loop.answeredAt ? (
                  lang === "he" ? (
                    <>
                      ממתין ל{DISCIPLINE_LABEL[loop.toDiscipline]}. אי אפשר לענות במקומם —
                      וזו בדיוק הנקודה.
                    </>
                  ) : (
                    <>
                      Waiting on {DISCIPLINE_LABEL[loop.toDiscipline]}. You cannot answer
                      on their behalf — that is the point.
                    </>
                  )
                ) : lang === "he" ? (
                  <>
                    ממתין לאישורו של <En>{requester.name}</En>, שפתח את הלולאה.
                  </>
                ) : (
                  <>Waiting on {requester.name}, who opened the loop, to confirm.</>
                )}
              </Callout>
            )}
          </div>
        )}

        {/* Audit trail */}
        <div className="mt-6">
          <SectionTitle
            action={
              <span className="text-[11px] text-[var(--color-ink-faint)]">
                {t("Not editable", "לא ניתן לעריכה")}
              </span>
            }
          >
            {t("Loop history", "היסטוריית הלולאה")}
          </SectionTitle>
          <ol className="space-y-0">
            {loop.events.map((e, i) => {
              const meta = EVENT_LABEL[e.type];
              const actor = member(e.actorId);
              return (
                <li key={`${e.at}-${i}`} className="relative flex gap-3 pb-4">
                  {i < loop.events.length - 1 && (
                    <span className="absolute start-[13px] top-7 h-full w-px bg-[var(--color-line-strong)]" />
                  )}
                  <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]">
                    <Icon name={meta.icon} size={14} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[13px] font-semibold text-white">
                      {lang === "he" ? meta.he : meta.en}
                    </p>
                    <p className="text-[11px] text-[var(--color-ink-faint)]">
                      <En>{actor.name}</En> · {fmtDateTime(e.at)} · {relativeTime(e.at)}
                    </p>
                    {e.note && (
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                        {e.note}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {patient && (
          <Link href={`/patients/${patient.id}`} className="mt-2 block">
            <Card className="flex items-center gap-3 p-3.5">
              <Icon name="folder_shared" size={20} className="text-[var(--color-primary)]" />
              <p className="flex-1 text-[13px] font-semibold text-white">
                {lang === "he" ? (
                  <>
                    פתיחת התיק של <En>{patient.name}</En>
                  </>
                ) : (
                  <>Open {patient.name}&apos;s record</>
                )}
              </p>
              <Icon name="chevron_right" size={20} className="text-[var(--color-ink-faint)]" />
            </Card>
          </Link>
        )}
      </Screen>
    </>
  );
}
