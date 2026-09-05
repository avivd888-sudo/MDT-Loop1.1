"use client";

import Link from "next/link";
import { En, Icon, InfinityMark, Wordmark } from "@/components/ui";
import { ORG } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { EDITION } from "@/lib/edition";

/**
 * The gate.
 *
 * The right place to state the governance position before anyone sees a
 * patient name, and to make clear this is a demonstration build.
 */
export default function GatePage() {
  const { lang, t } = useLang();

  return (
    <div className="flex min-h-dvh justify-center bg-[#0a0f16] md:py-6">
      <div className="flex min-h-dvh w-full max-w-[440px] flex-col justify-between bg-[var(--color-canvas)] px-6 py-10 md:h-[calc(100dvh-3rem)] md:min-h-0 md:overflow-y-auto md:rounded-3xl md:border md:border-[var(--color-line-strong)]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-[#137fec] to-[#0d5aa8] shadow-lg shadow-[#137fec44]">
            <InfinityMark size={46} className="text-white" />
          </div>
          <div className="mt-5">
            <Wordmark mark={false} />
          </div>
          {/* The name is an abbreviation, so it is expanded once, here, before
              it is used everywhere else — in this build and in the Hebrew
              submission materials alike. */}
          <p className="mt-1.5 text-[15px] text-[var(--color-ink-muted)]">
            {lang === "he" ? (
              <>
                <strong className="font-semibold text-white">הצוות הרב-תחומי לראש-צוואר
                (<En>MDT</En>)</strong>, בלולאה סגורה
              </>
            ) : (
              <>
                The head &amp; neck <strong className="font-semibold text-white">multidisciplinary
                team (MDT)</strong>, in closed loop
              </>
            )}
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">{ORG.hospital}</p>

          <div className="mt-8 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-start">
            <div className="mb-2 flex items-center gap-2">
              <Icon name="lock" size={20} className="text-[var(--color-primary)]" />
              <h2 className="text-base font-bold text-white">
                {t("Restricted access", "גישה מוגבלת")}
              </h2>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {t(
                "This system holds information about oncology patients. Access is limited to members of the head and neck multidisciplinary team, and every access is logged.",
                "המערכת מחזיקה מידע על מטופלים אונקולוגיים. הגישה מוגבלת לחברי הצוות הרב-תחומי לראש-צוואר, וכל כניסה נרשמת.",
              )}
            </p>
          </div>

          <div className="mt-4 w-full rounded-xl border border-[#f59e0b55] bg-[var(--color-warn-soft)] p-4 text-start">
            <div className="mb-1.5 flex items-center gap-2">
              <Icon name="science" size={18} className="text-[#fcd34d]" />
              <h2 className="text-sm font-bold text-[#fcd34d]">
                {t("Research demonstration build", "גרסת הדגמה למחקר")}
              </h2>
            </div>
            <p className="text-[12px] leading-relaxed text-[#fcd34d]/90">
              {t(
                "Every patient, result and message here is fabricated. The system is not connected to any hospital record and is not intended for clinical decisions.",
                "כל מטופל, כל תוצאה וכל הודעה כאן הם בדויים. המערכת אינה מחוברת לשום רשומה של בית החולים ואינה מיועדת לקבלת החלטות קליניות.",
              )}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/login"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-[15px] font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <Icon name="fingerprint" size={22} />
            {t("Verify identity and sign in", "אימות זהות וכניסה")}
          </Link>
          <p className="text-center text-[11px] text-[var(--color-ink-faint)]">
            {lang === "he" ? (
              <>
                <En>{EDITION.stage}</En> <En>{EDITION.version}</En> · מהדורת{" "}
                <En>{EDITION.edition}</En> · {EDITION.department.he} ·{" "}
                {EDITION.site.he} · נתונים סינתטיים בלבד
              </>
            ) : (
              <>
                <En>
                  {EDITION.stage} {EDITION.version}
                </En>{" "}
                · <En>{EDITION.edition}</En> edition · {EDITION.department.en} ·{" "}
                {EDITION.site.en} · synthetic data only
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
