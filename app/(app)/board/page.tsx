"use client";

import Link from "next/link";
import { Screen } from "@/components/shell";
import {
  AppHeader,
  Avatar,
  Badge,
  Card,
  DemoBanner,
  Icon,
  Num,
  SectionTitle,
} from "@/components/ui";
import { quorumFor, useStore } from "@/lib/store";
import { member } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { DISCIPLINE_SHORT } from "@/lib/types";

export default function BoardListPage() {
  const { sessions, team, patients, loops } = useStore();
  const { lang, t } = useLang();

  const upcoming = sessions.filter((s) => s.status !== "complete");
  const past = sessions.filter((s) => s.status === "complete");

  return (
    <>
      <AppHeader
        title={t("Tumour board", "מועצת גידולים")}
        subtitle={t("Head & neck MDT", "דיון MDT ראש-צוואר")}
      />
      <Screen>
        <DemoBanner className="mb-4" />

        {upcoming.length > 0 && (
          <>
            <SectionTitle>{t("Current meeting", "הדיון הנוכחי")}</SectionTitle>
            <div className="space-y-3">
              {upcoming.map((s) => {
                const quorum = quorumFor(s, team);
                const decided = s.cases.filter((c) => c.status === "decided").length;
                const blocked = s.cases.filter(
                  (c) => c.status === "pending" && c.prerequisites.some((p) => !p.ready),
                ).length;

                return (
                  <Link key={s.id} href={`/board/${s.id}`} className="block">
                    <Card className="p-4 transition-colors hover:border-[var(--color-primary)]/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold text-white">{s.title}</p>
                          <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                            <Num>{fmtDate(s.date)}</Num> · <Num>{s.startTime}</Num> ·{" "}
                            {s.location}
                          </p>
                        </div>
                        <Badge tone={s.status === "in-progress" ? "primary" : "neutral"}>
                          {s.status === "in-progress"
                            ? t("In progress", "בעיצומו")
                            : t("Scheduled", "מתוכנן")}
                        </Badge>
                      </div>

                      <div
                        className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 ${
                          quorum.met
                            ? "border-[#10b98155] bg-[var(--color-stable-soft)]"
                            : "border-[#f59e0b55] bg-[var(--color-warn-soft)]"
                        }`}
                      >
                        <Icon
                          name={quorum.met ? "verified" : "warning"}
                          size={16}
                          className={`mt-px shrink-0 ${quorum.met ? "text-[#6ee7b7]" : "text-[#fcd34d]"}`}
                        />
                        <p
                          className={`text-[12px] leading-snug ${
                            quorum.met ? "text-[#6ee7b7]" : "text-[#fcd34d]"
                          }`}
                        >
                          {quorum.met
                            ? t(
                                "Quorate — every core discipline is represented.",
                                "יש מניין חוקי — כל דיסציפלינת ליבה מיוצגת.",
                              )
                            : lang === "he"
                              ? `אין מניין חוקי — חסר ייצוג של ${quorum.missing.map((d) => DISCIPLINE_SHORT[d]).join(", ")}.`
                              : `Not quorate — missing ${quorum.missing.map((d) => DISCIPLINE_SHORT[d]).join(", ")}.`}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-4 border-t border-[var(--color-line)] pt-3 text-[12px]">
                        <span className="text-[var(--color-ink-muted)]">
                          <strong className="text-white">
                            <Num>{s.cases.length}</Num>
                          </strong>{" "}
                          {t("cases", "מקרים")}
                        </span>
                        <span className="text-[var(--color-ink-muted)]">
                          <strong className="text-white">
                            <Num>{decided}</Num>
                          </strong>{" "}
                          {t("decided", "הוכרעו")}
                        </span>
                        {blocked > 0 && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#fcd34d]">
                            <Icon name="block" size={13} />
                            <Num>{blocked}</Num> {t("blocked", "חסומים")}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {s.attendeeIds.slice(0, 5).map((id) => {
                            const mem = member(id);
                            return (
                              <Avatar
                                key={id}
                                initials={mem.initials}
                                colour={mem.colour}
                                size={26}
                                className="ring-2 ring-[var(--color-surface)]"
                              />
                            );
                          })}
                        </div>
                        {s.attendeeIds.length > 5 && (
                          <span className="text-[11px] text-[var(--color-ink-faint)]">
                            {/* The sign goes inside the isolate. A bare "+" beside an
                                isolated number is a neutral character, so the
                                paragraph direction decides where it lands and "+1"
                                renders as "1+" in Hebrew. */}
                            <Num>{`+${s.attendeeIds.length - 5}`}</Num>
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {past.length > 0 && (
          <div className="mt-6">
            <SectionTitle>{t("Previous meetings", "דיונים קודמים")}</SectionTitle>
            <div className="space-y-2.5">
              {past.map((s) => (
                <Link key={s.id} href={`/board/${s.id}`} className="block">
                  <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--color-primary)]/50">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--color-stable)]">
                      <Icon name="task_alt" size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-white">
                        <Num>{fmtDate(s.date)}</Num>
                      </p>
                      <p className="text-[12px] text-[var(--color-ink-muted)]">
                        <Num>{s.cases.length}</Num> {t("cases", "מקרים")} ·{" "}
                        <Num>{s.cases.filter((c) => c.status === "decided").length}</Num>{" "}
                        {t("decided", "הוכרעו")}
                      </p>
                    </div>
                    <Icon name="chevron_right" size={20} className="text-[var(--color-ink-faint)]" />
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Patients not yet listed for the board, and the reason why */}
        <div className="mt-6">
          <SectionTitle>{t("Waiting to be listed", "ממתינים לשיבוץ לדיון")}</SectionTitle>
          <div className="space-y-2">
            {patients
              .filter((p) => p.status === "awaiting-staging" || p.status === "new-referral")
              .map((p) => {
                const open = loops.filter((l) => l.patientId === p.id && !l.closedAt);
                return (
                  <Link key={p.id} href={`/patients/${p.id}`} className="block">
                    <Card className="flex items-center gap-3 p-3">
                      <Icon name="pending" size={18} className="text-[var(--color-ink-faint)]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white">{p.name}</p>
                        <p className="truncate text-[12px] text-[var(--color-ink-muted)]">
                          {open.length > 0
                            ? lang === "he"
                              ? `${open.length} ${open.length > 1 ? "לולאות פתוחות" : "לולאה פתוחה"} · ${open[0].request}`
                              : `${open.length} open loop${open.length > 1 ? "s" : ""} · ${open[0].request}`
                            : p.diagnosis}
                        </p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
          </div>
        </div>
      </Screen>
    </>
  );
}
