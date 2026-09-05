"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Screen } from "@/components/shell";
import {
  AppHeader,
  Button,
  Callout,
  Card,
  En,
  Field,
  Icon,
  Label,
  Num,
  Select,
  Textarea,
} from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import {
  DISCIPLINE_LABEL,
  LOOP_KIND_LABEL,
  LOOP_SLA_HOURS,
  URGENCY_LABEL,
  type Discipline,
  type LoopKind,
  type LoopUrgency,
} from "@/lib/types";

/** The discipline defaults from the request type — fewer fields to fill. */
const KIND_TO_DISCIPLINE: Record<LoopKind, Discipline> = {
  "pathology-review": "pathology",
  "imaging-report": "radiology",
  "anaesthetic-assessment": "anaesthetics",
  "oncology-opinion": "medical-oncology",
  "radiation-opinion": "radiation-oncology",
  "endocrine-opinion": "endocrinology",
  "infection-opinion": "infectious-diseases",
  "neuro-opinion": "neurology",
  "skull-base-opinion": "neurosurgery",
  "nutrition-assessment": "dietetics",
  "swallow-assessment": "speech-language",
  "dental-clearance": "dentistry",
  scheduling: "nursing",
  other: "surgery",
};

export default function NewLoopPage() {
  const router = useRouter();
  const { patients, openLoop } = useStore();
  const { lang, t } = useLang();

  const [patientId, setPatientId] = useState("");
  const [kind, setKind] = useState<LoopKind>("imaging-report");
  const [discipline, setDiscipline] = useState<Discipline>("radiology");
  const [urgency, setUrgency] = useState<LoopUrgency>("urgent");
  const [situation, setSituation] = useState("");
  const [background, setBackground] = useState("");
  const [assessment, setAssessment] = useState("");
  const [request, setRequest] = useState("");

  const valid = patientId && request.trim().length >= 10 && situation.trim().length >= 5;

  function changeKind(k: LoopKind) {
    setKind(k);
    setDiscipline(KIND_TO_DISCIPLINE[k]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const id = openLoop({
      patientId,
      kind,
      urgency,
      toDiscipline: discipline,
      situation: situation.trim(),
      background: background.trim(),
      assessment: assessment.trim(),
      request: request.trim(),
    });
    router.push(`/loops/${id}`);
  }

  return (
    <>
      <AppHeader title={t("Open a loop", "פתיחת לולאה")} back="/loops" />
      <Screen>
        <Callout tone="primary" icon="sync">
          {lang === "he" ? (
            <>
              לולאה איננה הודעה. כתבו <strong>בקשה אחת ומדויקת</strong> שאפשר לענות עליה
              ולסגור אותה. בקשה מעורפלת מייצרת תשובה מעורפלת ולולאה שאינה נסגרת לעולם.
            </>
          ) : (
            <>
              A loop is not a message. Write <strong>one specific request</strong> that can
              be answered and closed. A vague request produces a vague answer and a loop
              that never closes.
            </>
          )}
        </Callout>

        <form onSubmit={submit} className="mt-4 space-y-5">
          <section className="space-y-3">
            <Label>{t("Context", "הקשר")}</Label>

            <Field label={t("Patient", "מטופל")} required>
              <Select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
                <option value="" disabled>
                  {t("Select a patient", "בחירת מטופל")}
                </option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.diagnosis}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("Request type", "סוג הבקשה")} required>
              <Select value={kind} onChange={(e) => changeKind(e.target.value as LoopKind)}>
                {(Object.keys(LOOP_KIND_LABEL) as LoopKind[]).map((k) => (
                  <option key={k} value={k}>
                    {LOOP_KIND_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={t("To discipline", "לדיסציפלינה")}
              required
              hint={t(
                "The request goes to the discipline's queue, not to a named person — so one person's absence does not stop the loop.",
                "הבקשה נכנסת לתור של הדיסציפלינה ולא לאדם מסוים — כך שהיעדרות של אדם אחד אינה עוצרת את הלולאה.",
              )}
            >
              <Select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as Discipline)}
              >
                {(Object.keys(DISCIPLINE_LABEL) as Discipline[]).map((d) => (
                  <option key={d} value={d}>
                    {DISCIPLINE_LABEL[d]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("Urgency", "דחיפות")}>
              <div className="grid grid-cols-3 gap-2">
                {(["stat", "urgent", "routine"] as LoopUrgency[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className={`min-h-12 rounded-lg border text-[13px] font-semibold transition-colors ${
                      urgency === u
                        ? u === "stat"
                          ? "border-[var(--color-urgent)] bg-[var(--color-urgent-soft)] text-[#fca5a5]"
                          : "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-white"
                        : "border-[var(--color-line-strong)] text-[var(--color-ink-muted)]"
                    }`}
                  >
                    <span className="block">{URGENCY_LABEL[u]}</span>
                    <span className="block text-[10px] font-normal opacity-70">
                      <Num>{LOOP_SLA_HOURS[u]}</Num>
                      {t("h", " שע׳")}
                    </span>
                  </button>
                ))}
              </div>
            </Field>
          </section>

          <section className="space-y-3 border-t border-[var(--color-line)] pt-5">
            <div className="flex items-baseline justify-between">
              <Label>
                {lang === "he" ? (
                  <>
                    מובנית לפי <En>SBAR</En>
                  </>
                ) : (
                  <>Structured as SBAR</>
                )}
              </Label>
              <span className="text-[11px] text-[var(--color-ink-faint)]">
                {t(
                  "Situation · Background · Assessment · Request",
                  "רקע קצר · רקע · הערכה · בקשה",
                )}
              </span>
            </div>

            <Field label={t("S — Situation", "S — רקע קצר")} required>
              <Textarea
                rows={2}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder={t(
                  "Who the patient is and what is happening now.",
                  "מי המטופל ומה קורה איתו עכשיו.",
                )}
              />
            </Field>

            <Field label={t("B — Background", "B — רקע")}>
              <Textarea
                rows={3}
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder={t(
                  "Staging, comorbidities, what has already been done.",
                  "שלב המחלה, מחלות רקע, ומה כבר נעשה.",
                )}
              />
            </Field>

            <Field label={t("A — Assessment", "A — הערכה")}>
              <Textarea
                rows={2}
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder={t(
                  "Why this matters now, and what depends on the answer.",
                  "למה זה חשוב עכשיו, ומה תלוי בתשובה.",
                )}
              />
            </Field>

            <Field
              label={t("R — Request", "R — בקשה")}
              required
              hint={t(
                "This is the only thing that gets closed. If it cannot be answered in a sentence, it is too broad.",
                "זה הדבר היחיד שנסגר. אם אי אפשר לענות עליו במשפט אחד, הוא רחב מדי.",
              )}
            >
              <Textarea
                rows={3}
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                placeholder={t(
                  "For example: is there invasion through the outer cortex of the thyroid cartilage?",
                  "לדוגמה: האם יש חדירה דרך הקורטקס החיצוני של סחוס התריס?",
                )}
              />
            </Field>
          </section>

          <Button type="submit" icon="send" disabled={!valid} className="w-full">
            {t("Open the loop", "פתיחת הלולאה")}
          </Button>

          <Card className="p-3.5">
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
              <Icon name="info" size={15} className="mt-px shrink-0" />
              <span>
                {t(
                  "Once open, the loop counts as finished only when you yourself confirm the answer resolves the request. Nobody else can close it for you.",
                  "מרגע שנפתחה, הלולאה נחשבת גמורה רק כאשר את/ה עצמך מאשר/ת שהתשובה פותרת את הבקשה. איש אחר אינו יכול לסגור אותה במקומך.",
                )}
              </span>
            </p>
          </Card>
        </form>
      </Screen>
    </>
  );
}
