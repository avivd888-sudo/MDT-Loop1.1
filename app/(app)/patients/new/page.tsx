"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import {
  AppHeader,
  Button,
  Callout,
  Card,
  DemoBanner,
  En,
  Field,
  Icon,
  Input,
  Label,
  Num,
  Select,
  Textarea,
} from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { isValidIsraeliId, normaliseIsraeliId } from "@/lib/israeli-id";
import { computeStage, schemaFor, type StagingSite } from "@/lib/staging";
import { SUBSITE_LABEL, type Acuity, type Subsite } from "@/lib/types";

/** ICD-10 codes for the head & neck sites this unit actually sees. */
const ICD10: { code: string; label: string; subsite: Subsite; site: StagingSite | null }[] = [
  { code: "C32.0", label: "Malignant neoplasm of glottis", subsite: "larynx", site: "larynx" },
  { code: "C32.1", label: "Malignant neoplasm of supraglottis", subsite: "larynx", site: "larynx" },
  { code: "C09.9", label: "Malignant neoplasm of tonsil", subsite: "oropharynx", site: "oropharynx-p16-positive" },
  { code: "C10.9", label: "Malignant neoplasm of oropharynx", subsite: "oropharynx", site: "oropharynx-p16-positive" },
  { code: "C02.1", label: "Malignant neoplasm of border of tongue", subsite: "oral-cavity", site: "oral-cavity" },
  { code: "C04.9", label: "Malignant neoplasm of floor of mouth", subsite: "oral-cavity", site: "oral-cavity" },
  { code: "C12", label: "Malignant neoplasm of pyriform sinus", subsite: "hypopharynx", site: "hypopharynx" },
  { code: "C11.9", label: "Malignant neoplasm of nasopharynx", subsite: "nasopharynx", site: "nasopharynx" },
  { code: "C73", label: "Malignant neoplasm of thyroid gland", subsite: "thyroid", site: null },
  { code: "C07", label: "Malignant neoplasm of parotid gland", subsite: "salivary", site: null },
  { code: "C77.0", label: "Cervical nodal metastasis, unknown primary", subsite: "unknown-primary", site: null },
];

export default function NewPatientPage() {
  const router = useRouter();
  const { addPatient, nextPatientId } = useStore();
  const { lang, t } = useLang();

  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [mrn, setMrn] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"M" | "F">("M");
  const [icd, setIcd] = useState("");
  const [p16, setP16] = useState<"positive" | "negative" | "not-tested">("not-tested");
  /* `tCat` rather than `t`: the T category and the translation helper cannot
     both be called `t` in the same scope. */
  const [tCat, setTCat] = useState("");
  const [n, setN] = useState("");
  const [m, setM] = useState("M0");
  const [acuity, setAcuity] = useState<Acuity>("routine");
  const [ecog, setEcog] = useState("0");
  const [history, setHistory] = useState("");

  const selected = ICD10.find((c) => c.code === icd);

  const idTouched = nationalId.replace(/\D/g, "").length >= 9;
  const idValid = isValidIsraeliId(nationalId);

  const site: StagingSite | null = useMemo(() => {
    if (!selected?.site) return null;
    if (selected.subsite === "oropharynx") {
      return p16 === "positive" ? "oropharynx-p16-positive" : "oropharynx-p16-negative";
    }
    return selected.site;
  }, [selected, p16]);

  const schema = site ? schemaFor(site) : null;
  const result = site ? computeStage(site, tCat, n, m) : null;

  const valid = name.trim() && idValid && mrn.trim() && age && icd;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !selected) return;

    const id = nextPatientId();
    addPatient({
      id,
      nationalId: normaliseIsraeliId(nationalId),
      mrn: mrn.trim(),
      name: name.trim(),
      age: Number(age),
      sex,
      subsite: selected.subsite,
      diagnosis: selected.label,
      histology: t("Awaiting histological confirmation", "ממתין לאישור היסטולוגי"),
      tnm: {
        t: tCat || "TX",
        n: n || "NX",
        m: m || "M0",
        p16: selected.subsite === "oropharynx" ? p16 : undefined,
        edition: schema?.edition ?? "AJCC 8",
        stageGroup: result?.stage ?? "—",
        provisional: true,
      },
      status: "new-referral",
      acuity,
      alerts: [],
      comorbidities: [],
      ecog: Number(ecog) as 0 | 1 | 2 | 3 | 4,
      plan:
        history.trim() ||
        t(
          "Work-up in progress. To be presented at the next tumour board.",
          "הבירור בעיצומו. יוצג בדיון הגידולים הקרוב.",
        ),
      careTeamIds: ["u-levi"],
      referralDate: new Date().toISOString().slice(0, 10),
      timeline: [
        {
          id: "t-new",
          date: new Date().toISOString().slice(0, 10),
          kind: "referral",
          title: t("Added to the department list", "נוסף לרשימת המחלקה"),
          detail:
            history.trim() ||
            t(
              "Referral registered on the head & neck pathway.",
              "ההפניה נקלטה במסלול ראש-צוואר.",
            ),
          actor: "Dr. Dana Levi",
        },
      ],
      documents: [],
    });
    router.push(`/patients/${id}`);
  }

  return (
    <>
      <AppHeader title={t("New patient", "מטופל חדש")} back="/patients" />
      <Screen>
        <DemoBanner className="mb-4" />

        <form onSubmit={submit} className="space-y-5">
          <section className="space-y-3">
            <Label>{t("Identity", "פרטים מזהים")}</Label>

            <Field label={t("Full name", "שם מלא")} required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Last name, First name", "שם משפחה, שם פרטי")}
                required
              />
            </Field>

            <Field
              label={t("National ID", "תעודת זהות")}
              required
              hint={t(
                "Checked against its check digit as you type.",
                "נבדקת מול ספרת הביקורת תוך כדי ההקלדה.",
              )}
            >
              <div className="relative">
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="000000000"
                  inputMode="numeric"
                  maxLength={9}
                  dir="ltr"
                  className={`text-start pe-10 ${
                    idTouched
                      ? idValid
                        ? "border-[var(--color-stable)]"
                        : "border-[var(--color-urgent)]"
                      : ""
                  }`}
                  required
                />
                {idTouched && (
                  <span className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center">
                    <Icon
                      name={idValid ? "check_circle" : "error"}
                      size={20}
                      className={idValid ? "text-[var(--color-stable)]" : "text-[var(--color-urgent)]"}
                    />
                  </span>
                )}
              </div>
            </Field>

            {idTouched && !idValid && (
              <p className="-mt-1 text-[12px] font-semibold text-[#fca5a5]">
                {t(
                  "Check digit does not validate. Check for transposed digits.",
                  "ספרת הביקורת אינה תואמת. כדאי לבדוק אם התחלפו ספרות.",
                )}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("MRN", "מספר תיק")} required>
                <Input
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  placeholder="000000"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-start"
                  required
                />
              </Field>
              <Field label={t("Age", "גיל")} required>
                <Input
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  type="number"
                  min={0}
                  max={120}
                  placeholder="64"
                  required
                />
              </Field>
            </div>

            <Field label={t("Sex", "מין")}>
              <div className="grid grid-cols-2 gap-2">
                {(["M", "F"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSex(s)}
                    className={`min-h-11 rounded-lg border text-sm font-semibold transition-colors ${
                      sex === s
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-white"
                        : "border-[var(--color-line-strong)] text-[var(--color-ink-muted)]"
                    }`}
                  >
                    {s === "M" ? t("Male", "זכר") : t("Female", "נקבה")}
                  </button>
                ))}
              </div>
            </Field>
          </section>

          <section className="space-y-3 border-t border-[var(--color-line)] pt-5">
            <Label>{t("Clinical details", "פרטים קליניים")}</Label>

            <Field label={t("Primary diagnosis (ICD-10)", "אבחנה ראשית (ICD-10)")} required>
              <Select value={icd} onChange={(e) => setIcd(e.target.value)} required>
                <option value="" disabled>
                  {t("Select a diagnosis", "בחירת אבחנה")}
                </option>
                {ICD10.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </option>
                ))}
              </Select>
            </Field>

            {selected?.subsite === "oropharynx" && (
              <Field
                label={t("p16 immunohistochemistry", "צביעת p16 באימונוהיסטוכימיה")}
                required
                hint={t(
                  "Determines which AJCC edition applies — p16-positive disease is staged under Version 9.",
                  "קובעת לפי איזו מהדורת AJCC מדרגים — מחלה p16 חיובית מדורגת לפי מהדורה 9.",
                )}
              >
                <Select value={p16} onChange={(e) => setP16(e.target.value as typeof p16)}>
                  <option value="not-tested">{t("Not yet tested", "טרם נבדק")}</option>
                  <option value="positive">{t("Positive", "חיובי")}</option>
                  <option value="negative">{t("Negative", "שלילי")}</option>
                </Select>
              </Field>
            )}

            {schema ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="T">
                    <Select value={tCat} onChange={(e) => setTCat(e.target.value)}>
                      <option value="">—</option>
                      {schema.t.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="N">
                    <Select value={n} onChange={(e) => setN(e.target.value)}>
                      <option value="">—</option>
                      {schema.n.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="M">
                    <Select value={m} onChange={(e) => setM(e.target.value)}>
                      {schema.m.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {result?.stage && (
                  <Card className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>{t("Derived stage group", "קבוצת שלב מחושבת")}</Label>
                        <p className="text-xl font-extrabold text-white">
                          {t("Stage", "שלב")} <Num>{result.stage}</Num>
                        </p>
                      </div>
                      <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-[var(--color-ink-muted)]">
                        <Num>{result.edition}</Num>
                      </span>
                    </div>
                    {/* The stage-grouping rationale quotes AJCC categories, so
                        it stays in English in both languages: a translated
                        staging criterion cannot be checked against the manual. */}
                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                      <En>{result.reasoning}</En>
                    </p>
                  </Card>
                )}
              </>
            ) : (
              icd && (
                <Callout tone="neutral" icon="info">
                  {lang === "he" ? (
                    <>
                      הזנת <En>TNM</En> עבור {SUBSITE_LABEL[selected!.subsite].toLowerCase()}{" "}
                      אינה ממומשת באב-הטיפוס הזה. עדיין אפשר ליצור את הרשומה ולדרג
                      אותה ידנית.
                    </>
                  ) : (
                    <>
                      TNM entry for {SUBSITE_LABEL[selected!.subsite].toLowerCase()} is not
                      implemented in this prototype. The record can still be created and
                      staged manually.
                    </>
                  )}
                </Callout>
              )
            )}

            <Field label={t("ECOG performance status", "מצב תפקודי ECOG")}>
              <Select value={ecog} onChange={(e) => setEcog(e.target.value)}>
                {[0, 1, 2, 3, 4].map((v) => (
                  <option key={v} value={v}>
                    ECOG {v}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("Priority", "עדיפות")}>
              <div className="grid grid-cols-2 gap-2">
                {(["routine", "urgent"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAcuity(a)}
                    className={`min-h-11 rounded-lg border text-sm font-semibold transition-colors ${
                      acuity === a
                        ? a === "urgent"
                          ? "border-[var(--color-urgent)] bg-[var(--color-urgent-soft)] text-[#fca5a5]"
                          : "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-white"
                        : "border-[var(--color-line-strong)] text-[var(--color-ink-muted)]"
                    }`}
                  >
                    {a === "urgent" ? t("Urgent", "דחוף") : t("Routine", "שגרתי")}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t("Presentation & history", "תלונה נוכחית ואנמנזה")}>
              <Textarea
                value={history}
                onChange={(e) => setHistory(e.target.value)}
                rows={4}
                placeholder={t(
                  "Brief history, examination findings, and the question for the MDT…",
                  "אנמנזה קצרה, ממצאי הבדיקה, והשאלה לדיון MDT…",
                )}
              />
            </Field>
          </section>

          <Button type="submit" icon="save" disabled={!valid} className="w-full">
            {t("Save patient", "שמירת המטופל")}
          </Button>

          <p className="flex items-start gap-1.5 pb-2 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
            <Icon name="info" size={14} className="mt-px shrink-0" />
            {lang === "he" ? (
              <>
                קבוצות השלב המחושבות הן תמיכה בהחלטה בלבד. שלב המחלה הרשמי חייב להיות
                מאומת מול ספר ה־<En>AJCC</En> בידי הרופא האחראי.
              </>
            ) : (
              <>
                Derived stage groups are decision support only. The stage of record must be
                confirmed against the AJCC manual by the responsible clinician.
              </>
            )}
          </p>
        </form>
      </Screen>
    </>
  );
}
