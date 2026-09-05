"use client";

import Link from "next/link";
import { Screen } from "@/components/shell";
import { AppHeader, Avatar, Card, DemoBanner, En, Icon, Label, Num } from "@/components/ui";
import { LanguageToggle } from "@/components/language-toggle";
import { useLang } from "@/lib/i18n";
import { EDITION } from "@/lib/edition";
import { useStore } from "@/lib/store";
import { ORG } from "@/lib/data";
import { DISCIPLINE_LABEL } from "@/lib/types";

const LINKS = [
  {
    href: "/team",
    icon: "diversity_3",
    en: ["The team", "Disciplines, coordination load, directory"],
    he: ["הצוות", "דיסציפלינות, עומס תיאום, ספר טלפונים"],
  },
  {
    href: "/insights",
    icon: "insights",
    en: ["Closed-loop metrics", "Closure rates, bottlenecks, pathway clock"],
    he: ["מדדי מעגל סגור", "שיעורי סגירה, צווארי בקבוק, שעון המסלול"],
  },
  {
    href: "/pilot",
    icon: "science",
    en: ["The pilot", "Cohort, feasibility outcomes, data export"],
    he: ["הפיילוט", "הקוהורטה, מדדי היתכנות, ייצוא נתונים"],
  },
  {
    href: "/staging",
    icon: "calculate",
    en: ["TNM staging tool", "AJCC Version 9 and 8th edition"],
    he: ["כלי סטייג'ינג TNM", "AJCC מהדורה 9 ומהדורה 8"],
  },
  {
    href: "/evidence",
    icon: "menu_book",
    en: ["Literature and evidence", "Guidelines, textbooks, trials"],
    he: ["ספרות ומקורות", "הנחיות, ספרי לימוד, מחקרים"],
  },
  {
    href: "/settings",
    icon: "shield_lock",
    en: ["Security and privacy", "Lock, biometrics, regulation"],
    he: ["אבטחה ופרטיות", "נעילה, ביומטריה, רגולציה"],
  },
];

export default function MorePage() {
  const { currentUser, patients, loops, resetDemo } = useStore();
  const { lang, t } = useLang();
  const openLoops = loops.filter((l) => !l.closedAt).length;

  return (
    <>
      <AppHeader title={t("More", "עוד")} />
      <Screen>
        <Card className="flex items-center gap-3 p-4">
          <Avatar initials={currentUser.initials} colour={currentUser.colour} size={52} online />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-bold text-white">{currentUser.name}</p>
            <p className="truncate text-[13px] text-[var(--color-ink-muted)]">
              {currentUser.role} · {DISCIPLINE_LABEL[currentUser.discipline]}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
              {lang === "he" ? (
                <>
                  <Num>{patients.length}</Num> מטופלים · <Num>{openLoops}</Num> לולאות פתוחות
                </>
              ) : (
                <>
                  <Num>{patients.length}</Num> patients · <Num>{openLoops}</Num> open loops
                </>
              )}
            </p>
          </div>
          {/* Switching identity is a first-class action, not a hidden setting:
              on a shared board every permission follows from who you are, so
              being signed in as the wrong colleague is a mistake worth making
              easy to correct. */}
          <Link
            href="/login"
            aria-label={t("Change who is signed in", "החלפת המשתמש המחובר")}
            className="grid size-10 shrink-0 place-items-center rounded-full text-[var(--color-ink-muted)] hover:bg-white/5 hover:text-white"
          >
            <Icon name="swap_horiz" size={20} />
          </Link>
        </Card>

        <p className="mt-2 px-1 text-[11px] text-[var(--color-ink-faint)]">
          {ORG.hospital} · {ORG.hmo}
        </p>

        <DemoBanner className="mt-3" />

        <div className="mt-4 space-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--color-primary)]/50">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--color-primary)]">
                  <Icon name={l.icon} size={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-white">
                    {(lang === "he" ? l.he : l.en)[0]}
                  </p>
                  <p className="truncate text-[12px] text-[var(--color-ink-muted)]">
                    {(lang === "he" ? l.he : l.en)[1]}
                  </p>
                </div>
                <Icon name="chevron_right" size={20} className="text-[var(--color-ink-faint)]" />
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <Label>{t("Language", "שפה")}</Label>
          <div className="mt-1.5">
            <LanguageToggle />
          </div>
        </div>

        <div className="mt-6">
          <Label>{t("Session", "הפעלה")}</Label>
          <div className="mt-1.5 space-y-2">
            <button onClick={resetDemo} className="w-full text-start">
              <Card className="flex items-center gap-3 p-3.5">
                <Icon name="restart_alt" size={20} className="text-[var(--color-ink-muted)]" />
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-white">
                    {t("Reset the demonstration", "איפוס ההדגמה")}
                  </p>
                  <p className="text-[12px] text-[var(--color-ink-muted)]">
                    {t(
                      "Discard changes and return to the opening state",
                      "ביטול השינויים וחזרה למצב ההתחלתי",
                    )}
                  </p>
                </div>
              </Card>
            </button>
            <Link href="/">
              <Card className="flex items-center gap-3 p-3.5">
                <Icon name="logout" size={20} className="text-[#fca5a5]" />
                <p className="flex-1 text-[14px] font-semibold text-[#fca5a5]">
                  {t("Lock and sign out", "נעילה ויציאה")}
                </p>
              </Card>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--color-ink-faint)]">
          <En>
            {EDITION.product} · {EDITION.edition}
          </En>{" "}
          ·{" "}
          <En>
            {EDITION.stage} {EDITION.version}
          </En>{" "}
          · {t("synthetic data", "נתונים סינתטיים")}
        </p>
      </Screen>
    </>
  );
}
