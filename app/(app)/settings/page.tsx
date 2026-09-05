"use client";

import { useState } from "react";
import { Screen } from "@/components/shell";
import { AppHeader, Callout, Card, En, Icon, Label, Num, SectionTitle } from "@/components/ui";
import { ORG_DOMAINS } from "@/lib/org-email";
import { EDITION } from "@/lib/edition";
import { useLang } from "@/lib/i18n";

const LOCK_OPTIONS = [
  {
    value: 0,
    en: ["Immediately", "Locks the moment the app goes to the background"],
    he: ["מיד", "ננעל ברגע שהיישום עובר לרקע"],
  },
  {
    value: 1,
    en: ["After one minute", "Recommended for shared ward devices"],
    he: ["אחרי דקה", "מומלץ למכשירים משותפים במחלקה"],
  },
  {
    value: 5,
    en: ["After five minutes", "Personal devices only"],
    he: ["אחרי חמש דקות", "למכשירים אישיים בלבד"],
  },
  {
    value: 15,
    en: ["After fifteen minutes", "Not advisable where the screen is visible to others"],
    he: ["אחרי חמש עשרה דקות", "לא מומלץ במקום שבו המסך גלוי לאחרים"],
  },
];

/** The regulatory framework that actually governs an Israeli deployment. */
const REGULATION = [
  {
    icon: "policy",
    en: [
      "Privacy Protection Law and the Data Security Regulations",
      "Medical information is sensitive data. A database with more than 100 authorised users, or more than 100,000 data subjects, falls into the high security tier, with obligations for monitoring, access control and documentation.",
    ],
    he: [
      "חוק הגנת הפרטיות ותקנות אבטחת מידע",
      "מידע רפואי הוא מידע רגיש. מאגר עם יותר מ־100 בעלי הרשאה, או יותר מ־100,000 נושאי מידע, נכנס לרמת האבטחה הגבוהה, על חובות הניטור, בקרת הגישה והתיעוד שנלוות לה.",
    ],
  },
  {
    icon: "verified_user",
    en: [
      "Amendment 13",
      "Requires the appointment of a data protection officer and substantially widens enforcement powers. In force since August 2025.",
    ],
    he: [
      "תיקון 13",
      "מחייב מינוי ממונה על הגנת הפרטיות ומרחיב מהותית את סמכויות האכיפה. בתוקף מאוגוסט 2025.",
    ],
  },
  {
    icon: "local_hospital",
    en: [
      "Ministry of Health director-general circulars",
      "Directives on managing the computerised medical record and on information security in healthcare institutions.",
    ],
    he: [
      "חוזרי מנכ״ל משרד הבריאות",
      "הנחיות לניהול הרשומה הרפואית הממוחשבת ולאבטחת מידע במוסדות רפואיים.",
    ],
  },
  {
    icon: "medical_information",
    en: [
      "Medical software classification",
      "The system is positioned as a communication and coordination tool — it does not interpret data and does not recommend treatment. A final classification with the Medical Devices Division (AMAR) is required before any pilot.",
    ],
    he: [
      "סיווג תוכנה רפואית",
      "המערכת ממוקמת ככלי תקשורת ותיאום — היא איננה מפרשת נתונים ואיננה ממליצה על טיפול. נדרש סיווג סופי מול אגף אמ״ר לפני כל פיילוט.",
    ],
  },
  {
    icon: "science",
    en: [
      "Helsinki committee",
      "Interventional research in human subjects requires institutional Helsinki committee approval before data collection begins.",
    ],
    he: [
      "ועדת הלסינקי",
      "מחקר התערבותי בבני אדם מחייב אישור ועדת הלסינקי המוסדית לפני תחילת איסוף הנתונים.",
    ],
  },
];

/** The hospital systems this layer points at, rather than replaces. */
const INTEGRATIONS = [
  {
    k: "Chameleon",
    en: "The inpatient record — source of demographics, diagnoses and documents",
    he: "הרשומה האשפוזית — מקור לנתוני דמוגרפיה, לאבחנות ולמסמכים",
  },
  {
    k: "Ofek",
    en: "Cross-organisational view of clinical information",
    he: "צפייה בין־ארגונית במידע הקליני",
  },
  {
    k: "FHIR-IL",
    en: "The Israeli interoperability profile for health data exchange",
    he: "הפרופיל הישראלי לתקשורת ולהחלפת מידע רפואי",
  },
];

/**
 * Security and privacy.
 *
 * The original design referenced HIPAA. That is United States legislation and
 * does not apply to an Israeli hospital; this screen corrects it and sets out
 * the regulatory framework that actually governs the deployment.
 */
export default function SettingsPage() {
  const { lang, t } = useLang();
  const [lock, setLock] = useState(1);
  const [biometric, setBiometric] = useState(true);
  const [screenshots, setScreenshots] = useState(false);
  const [notifyContent, setNotifyContent] = useState(false);

  return (
    <>
      <AppHeader title={t("Security and privacy", "אבטחה ופרטיות")} back="/more" />
      <Screen>
        <Card className="flex items-center gap-3 border-[#10b98144] bg-[var(--color-stable-soft)] p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#10b98133] text-[var(--color-stable)]">
            <Icon name="shield_lock" size={24} />
          </span>
          <div>
            <p className="text-[15px] font-bold text-white">
              {t("Device secured", "המכשיר מאובטח")}
            </p>
            <p className="text-[12px] text-[#6ee7b7]">
              {t(
                "Auto-lock on, biometrics on, screenshots blocked",
                "נעילה אוטומטית פעילה, זיהוי ביומטרי פעיל, צילומי מסך חסומים",
              )}
            </p>
          </div>
        </Card>

        <div className="mt-5">
          <SectionTitle>{t("Auto-lock", "נעילה אוטומטית")}</SectionTitle>
          <div className="space-y-1.5">
            {LOCK_OPTIONS.map((o) => {
              const active = lock === o.value;
              const [label, hint] = lang === "he" ? o.he : o.en;
              return (
                <button
                  key={o.value}
                  onClick={() => setLock(o.value)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-start transition-colors ${
                    active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface-2)]"
                  }`}
                >
                  <Icon
                    name={active ? "radio_button_checked" : "radio_button_unchecked"}
                    size={20}
                    className={`mt-px shrink-0 ${active ? "text-[var(--color-primary)]" : "text-[var(--color-ink-faint)]"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-white">{label}</span>
                    <span className="block text-[12px] text-[var(--color-ink-muted)]">
                      {hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {lock >= 5 && (
            <div className="mt-2">
              <Callout tone="warn" icon="warning">
                {t(
                  "A delay of five minutes or more is not appropriate for a device in a shared clinical area — a workstation left open shows patient information to everyone who walks past.",
                  "השהיה של חמש דקות ומעלה אינה מתאימה למכשיר באזור קליני משותף — עמדה שנשארת פתוחה מציגה מידע על מטופלים לכל מי שעובר לידה.",
                )}
              </Callout>
            </div>
          )}
        </div>

        {/* ---------- who may hold an account ---------- */}
        <div className="mt-5">
          <SectionTitle>{t("Who may hold an account", "מי רשאי להחזיק חשבון")}</SectionTitle>

          <Card className="p-4">
            <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {lang === "he" ? (
                <>
                  אי אפשר להירשם למערכת הזאת מכתובת פרטית. חשבון נפתח רק בשלושה שלבים,
                  ורק השלישי נותן גישה בפועל.
                </>
              ) : (
                <>
                  This system cannot be joined from a personal address. An account is
                  opened in three steps, and only the third grants any access.
                </>
              )}
            </p>

            <ol className="mt-3 space-y-3">
              {[
                {
                  n: 1,
                  icon: "domain_verification",
                  en: [
                    "An organizational address",
                    "The domain must belong to an Israeli health fund or hospital. A consumer mailbox is refused by name, and an unlisted domain goes to the information security officer rather than being turned away.",
                  ],
                  he: [
                    "כתובת ארגונית",
                    "הדומיין חייב להשתייך לקופת חולים או לבית חולים בישראל. תיבה פרטית נדחית במפורש, ודומיין שאינו ברשימה עובר לממונה אבטחת המידע ולא נדחה על הסף.",
                  ],
                },
                {
                  n: 2,
                  icon: "mark_email_read",
                  en: [
                    "Proof of the address",
                    "A code is sent to it and has to come back. This proves the person can read mail at that employer today — nothing more.",
                  ],
                  he: [
                    "הוכחת הכתובת",
                    "נשלח אליה קוד שצריך לחזור. זה מוכיח שהאדם קורא היום דואר אצל אותו מעסיק — ולא יותר מזה.",
                  ],
                },
                {
                  n: 3,
                  icon: "how_to_reg",
                  en: [
                    "A discipline lead admits them",
                    "An employer address is not membership of this board. The lead of the applicant's own discipline decides, because they are the person who can actually check.",
                  ],
                  he: [
                    "מנהל דיסציפלינה מכניס ללוח",
                    "כתובת של מעסיק אינה חברות בצוות הזה. ההחלטה היא של מנהל הדיסציפלינה של המבקש, כי הוא מי שבאמת יכול לבדוק.",
                  ],
                },
              ].map((s3) => {
                const [title, detail] = lang === "he" ? s3.he : s3.en;
                return (
                  <li key={s3.n} className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--color-primary)]">
                      <Icon name={s3.icon} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white">
                        <Num>{s3.n}</Num>. {title}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                        {detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <Callout tone="neutral" icon="key_off" className="mt-3">
              {lang === "he" ? (
                <>
                  המערכת אינה מנהלת סיסמאות. ההזדהות מוסבת לספק הזהויות של בית החולים (
                  <En>SSO</En>) — רשימת סיסמאות שנייה היא נכס שצריך להגן עליו, ועדיף שלא
                  תיווצר.
                </>
              ) : (
                <>
                  The system holds no passwords. Authentication is delegated to the
                  hospital identity provider (<En>SSO</En>) — a second list of passwords is
                  an asset that has to be defended, and is better never created.
                </>
              )}
            </Callout>
          </Card>

          {/* The list is shown in full rather than summarised: a control nobody
              can read is a control nobody can correct. */}
          <Card className="mt-2 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <Label>{t("Recognised domains", "דומיינים מוכרים")}</Label>
              <span className="text-[11px] text-[var(--color-ink-faint)]">
                <Num>{ORG_DOMAINS.length}</Num>
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {ORG_DOMAINS.map((d) => (
                <li key={d.domain} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[12px] text-[var(--color-ink-muted)]">
                    {lang === "he" ? d.he : d.en}
                  </span>
                  <span className="shrink-0 font-mono text-[12px] text-white">
                    <En>
                      {d.subdomains ? "*." : ""}
                      {d.domain}
                    </En>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
              {lang === "he" ? (
                <>
                  בתי החולים הממשלתיים מכוסים בכלל אחד — <En>*.health.gov.il</En> — ולא
                  בשורה לכל בית חולים, כך שתוספת או שינוי שם אינם דורשים שינוי בקוד.
                  הרשימה עצמה שייכת לממונה אבטחת המידע: רק הוא יכול לאשר אילו כתובות מוסד
                  באמת מנפיק.
                </>
              ) : (
                <>
                  The government hospitals are covered by one rule —{" "}
                  <En>*.health.gov.il</En> — rather than a line each, so an addition or a
                  rename needs no code change. The list itself belongs to the information
                  security officer: only they can confirm which addresses an institution
                  actually issues.
                </>
              )}
            </p>
          </Card>
        </div>

        <div className="mt-5">
          <SectionTitle>{t("Access", "גישה")}</SectionTitle>
          <div className="space-y-2">
            <Toggle
              icon="fingerprint"
              label={t("Biometric unlock", "שחרור נעילה ביומטרי")}
              detail={t(
                "Face or fingerprint instead of retyping the password",
                "זיהוי פנים או טביעת אצבע במקום הקלדה חוזרת של הסיסמה",
              )}
              value={biometric}
              onChange={setBiometric}
            />
            <Toggle
              icon="screenshot"
              label={t("Allow screenshots", "אישור צילומי מסך")}
              detail={t(
                "Blocked by default — a screenshot of clinical information leaves the governed system",
                "חסום כברירת מחדל — צילום מסך של מידע קליני יוצא מהמערכת המבוקרת",
              )}
              value={screenshots}
              onChange={setScreenshots}
              danger
            />
            <Toggle
              icon="notifications"
              label={t("Show content in notifications", "הצגת תוכן בהתראות")}
              detail={t(
                "Off by default — a lock-screen preview can expose a name and a diagnosis",
                "כבוי כברירת מחדל — תצוגה מקדימה במסך הנעול עלולה לחשוף שם ואבחנה",
              )}
              value={notifyContent}
              onChange={setNotifyContent}
              danger
            />
          </div>
        </div>

        <div className="mt-5">
          <SectionTitle>{t("Regulatory framework", "המסגרת הרגולטורית")}</SectionTitle>
          <Card className="p-4">
            <Callout tone="warn" icon="gavel">
              {lang === "he" ? (
                <>
                  העיצוב המקורי הפנה ל־
                  <strong>
                    <En>HIPAA</En>
                  </strong>
                  . זו חקיקה אמריקאית והיא אינה חלה על בית חולים בישראל. המסגרת שחלה על
                  ההטמעה הזאת שונה.
                </>
              ) : (
                <>
                  The original design referenced <strong>HIPAA</strong>. That is United States
                  legislation and does not apply to an Israeli hospital. The framework that
                  governs this deployment is different.
                </>
              )}
            </Callout>

            <ul className="mt-3 space-y-2.5">
              {REGULATION.map((r) => {
                const [title, body] = lang === "he" ? r.he : r.en;
                return (
                  <li key={r.icon} className="flex items-start gap-2.5">
                    <Icon name={r.icon} size={18} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
                    <div>
                      <p className="text-[13px] font-semibold text-white">{title}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                        {body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="mt-5">
          <SectionTitle>
            {t("Integration with hospital systems", "ממשק למערכות בית החולים")}
          </SectionTitle>
          <Card className="p-4">
            <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {t(
                "The system is built as a coordination layer above the record, not as a replacement for it. It holds no clinical source of truth — it points at the existing record.",
                "המערכת בנויה כשכבת תיאום מעל הרשומה, לא כתחליף לה. אין בה מקור אמת קליני — היא מפנה אל הרשומה הקיימת.",
              )}
            </p>
            <ul className="mt-3 space-y-2 border-t border-[var(--color-line)] pt-3">
              {INTEGRATIONS.map((i) => (
                <li key={i.k} className="flex items-start gap-2.5">
                  <span className="mt-0.5 rounded bg-white/5 px-1.5 py-0.5 text-[11px] font-bold text-[var(--color-primary)]">
                    <En>{i.k}</En>
                  </span>
                  <span className="flex-1 text-[12px] leading-relaxed text-white">
                    {lang === "he" ? i.he : i.en}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] font-semibold text-[#fcd34d]">
              {t(
                "Not implemented in the prototype. All data here is synthetic and local.",
                "לא ממומש באב-הטיפוס. כל הנתונים כאן סינתטיים ומקומיים.",
              )}
            </p>
          </Card>
        </div>

        <div className="mt-5">
          <SectionTitle>{t("Audit", "בקרת גישה ותיעוד")}</SectionTitle>
          <Card className="p-4">
            <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {t(
                "A production system records every record opened, every document viewed and every decision entered, against an identified user. Audit logs are what make access to a shared oncology record defensible.",
                "מערכת בייצור מתעדת כל רשומה שנפתחה, כל מסמך שנצפה וכל החלטה שהוזנה, מול משתמש מזוהה. יומני הבקרה הם מה שהופך גישה לרשומה אונקולוגית משותפת לגישה שאפשר להגן עליה.",
              )}
            </p>
            <p className="mt-2 text-[12px] font-semibold text-[#fcd34d]">
              {t(
                "The loop audit trail is implemented in the prototype. Access auditing is not.",
                "נתיב הביקורת של הלולאות ממומש באב-הטיפוס. תיעוד הגישה אינו ממומש.",
              )}
            </p>
          </Card>
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--color-ink-faint)]">
          <En>
            {EDITION.product} · {EDITION.edition}
          </En>{" "}
          ·{" "}
          <En>
            {EDITION.stage} {EDITION.version}
          </En>
        </p>
      </Screen>
    </>
  );
}

function Toggle({
  icon,
  label,
  detail,
  value,
  onChange,
  danger,
}: {
  icon: string;
  label: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  const on = value;
  return (
    <Card className="flex items-start gap-3 p-3.5">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg ${
          on && danger
            ? "bg-[var(--color-urgent-soft)] text-[#fca5a5]"
            : "bg-white/5 text-[var(--color-primary)]"
        }`}
      >
        <Icon name={icon} size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-white">{label}</p>
        <p className="text-[12px] leading-snug text-[var(--color-ink-muted)]">{detail}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`mt-0.5 h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
          on ? (danger ? "bg-[var(--color-urgent)]" : "bg-[var(--color-primary)]") : "bg-white/15"
        }`}
      >
        <span
          className={`block size-5 rounded-full bg-white transition-transform ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </Card>
  );
}
