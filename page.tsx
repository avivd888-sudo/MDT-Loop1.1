"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Button, En, Icon, Wordmark } from "@/components/ui";
import { ORG } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { DISCIPLINE_LABEL } from "@/lib/types";

/**
 * Identity, not authentication.
 *
 * This screen used to be a mock email and password form, which was the wrong
 * thing in two ways: it invited people to type credentials into something that
 * checks nothing, and it left every viewer of the shared board acting as the
 * same clinician — which makes "only the person who asked may close" a rule
 * about nobody.
 *
 * So it asks the honest question instead. The choice is remembered per device
 * and drives every permission in the application: who may answer, who may
 * close, who holds a discipline lead's authority. Real authentication belongs
 * to the hospital's identity provider and is listed as a prerequisite in the
 * protocol, not faked here.
 */
export default function LoginPage() {
  const router = useRouter();
  const { team, currentUser, signInAs } = useStore();
  const { lang, t } = useLang();
  const [picked, setPicked] = useState<string>(currentUser.id);

  const chosen = team.find((m) => m.id === picked) ?? currentUser;

  function enter() {
    signInAs(chosen.id);
    router.push("/loops");
  }

  return (
    <div className="flex min-h-dvh justify-center bg-[#0a0f16] md:py-6">
      <div className="flex min-h-dvh w-full max-w-[440px] flex-col bg-[var(--color-canvas)] px-6 py-8 md:h-[calc(100dvh-3rem)] md:min-h-0 md:overflow-y-auto md:rounded-3xl md:border md:border-[var(--color-line-strong)]">
        <Link
          href="/"
          aria-label={t("Back", "חזרה")}
          className="-ms-2 grid size-10 place-items-center rounded-full text-white hover:bg-white/5"
        >
          <Icon name="arrow_back" size={22} />
        </Link>

        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mt-2">
              <Wordmark />
            </div>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {t("Head & neck oncology", "אונקולוגיה של ראש-צוואר")}
            </p>
            <p className="text-[12px] text-[var(--color-ink-faint)]">{ORG.hospital}</p>
          </div>

          <h1 className="mb-1 text-[15px] font-bold text-white">
            {t("Who is using this device?", "מי משתמש במכשיר הזה?")}
          </h1>
          <p className="mb-3 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            {t(
              "The board is shared with the team. Your choice decides what you may do on it — a loop can only be closed by the clinician who opened it.",
              "הלוח משותף לכל הצוות. הבחירה שלך קובעת מה מותר לך לעשות בו — לולאה נסגרת רק בידי מי שפתח אותה.",
            )}
          </p>

          <ul className="space-y-2" role="radiogroup" aria-label={t("Choose your identity", "בחירת זהות")}>
            {team.map((m) => {
              const active = m.id === picked;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPicked(m.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors ${
                      active
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                        : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
                    }`}
                  >
                    <Avatar initials={m.initials} colour={m.colour} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-white">
                        {m.name}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--color-ink-muted)]">
                        {DISCIPLINE_LABEL[m.discipline]}
                        {m.disciplineLead && t(" · discipline lead", " · מנהל דיסציפלינה")}
                        {m.external &&
                          (lang === "he" ? (
                            <>
                              {" · אורח"}
                              {m.hospital && (
                                <>
                                  {" מ־"}
                                  <En>{m.hospital}</En>
                                </>
                              )}
                            </>
                          ) : (
                            ` · visiting${m.hospital ? ` from ${m.hospital}` : ""}`
                          ))}
                      </span>
                    </span>
                    {active && (
                      <Icon name="check_circle" size={19} className="text-[var(--color-primary)]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <Button icon="login" className="mt-4 w-full" onClick={enter}>
            {t("Sign in", "כניסה")}
          </Button>
        </div>

        <div className="mt-6 space-y-3 text-center">
          {/* Said plainly on purpose. This build checks nothing, and a screen
              that implies otherwise would be the dishonest part. */}
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line-strong)] px-3 py-1.5 text-[11px] text-[var(--color-ink-muted)]">
            <Icon name="lock" size={13} />
            {t(
              "No password is asked for, and none would be checked",
              "לא מבקשים כאן סיסמה, ואף סיסמה לא הייתה נבדקת",
            )}
          </p>
          <p className="text-[13px] text-[var(--color-ink-muted)]">
            {t("Not on the list?", "לא ברשימה?")}{" "}
            <Link href="/register" className="font-semibold text-[var(--color-primary)]">
              {t("Request access", "בקשת גישה")}
            </Link>
          </p>
          <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
            {t(
              "From an organizational address at an Israeli health fund or hospital only.",
              "רק מכתובת ארגונית של קופת חולים או בית חולים בישראל.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
