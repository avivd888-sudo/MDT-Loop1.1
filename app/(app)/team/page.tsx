"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Screen } from "@/components/shell";
import {
  AppHeader,
  Avatar,
  Badge,
  Callout,
  Card,
  Icon,
  Label,
  Meter,
  Num,
  SectionTitle,
  StatTile,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { AccessRequests } from "@/components/access-requests";
import { BetaScope } from "@/components/beta-scope";
import { AddColleague } from "@/components/add-colleague";
import { useLang } from "@/lib/i18n";
import { ORG } from "@/lib/data";
import { DISCIPLINE_ICON } from "@/lib/format";
import { byDiscipline, fmtHours, fmtPercent, mdtMetrics } from "@/lib/metrics";
import { DISCIPLINE_LABEL, type Discipline } from "@/lib/types";

/**
 * The team screen.
 *
 * Head and neck oncology is the most multidisciplinary field in surgery: no
 * single clinician can stage, decide and deliver treatment alone. This screen
 * makes that structure visible — who is in the team, which disciplines are
 * carrying the coordination load, and which are represented in name only.
 *
 * Everything here is aggregated to discipline level. Individual response times
 * are deliberately not shown: the moment a shared tool produces a personal
 * league table, the team stops using it honestly.
 */
export default function TeamPage() {
  const { team, loops, sessions, currentUser } = useStore();
  const { lang, t } = useLang();

  const dm = useMemo(() => byDiscipline(loops, team), [loops, team]);
  const mm = useMemo(() => mdtMetrics(sessions, team), [sessions, team]);

  const byDisc = useMemo(() => {
    const map = new Map<Discipline, typeof dm[number]>();
    dm.forEach((d) => map.set(d.discipline, d));
    return map;
  }, [dm]);

  /** Disciplines represented on the team, core first, then by workload. */
  const disciplines = useMemo(() => {
    const set = new Set<Discipline>(team.map((m) => m.discipline));
    return Array.from(set).sort((a, b) => {
      const ca = team.some((m) => m.discipline === a && m.coreMember) ? 0 : 1;
      const cb = team.some((m) => m.discipline === b && m.coreMember) ? 0 : 1;
      if (ca !== cb) return ca - cb;
      const la = (byDisc.get(a)?.received ?? 0) + (byDisc.get(a)?.raised ?? 0);
      const lb = (byDisc.get(b)?.received ?? 0) + (byDisc.get(b)?.raised ?? 0);
      return lb - la;
    });
  }, [team, byDisc]);

  const totalTraffic = dm.reduce((n, d) => n + d.received, 0);
  const participating = dm.filter((d) => d.raised > 0).length;
  const online = team.filter((m) => m.online).length;

  return (
    <>
      <AppHeader title={t("The team", "הצוות")} subtitle={ORG.department} />
      <Screen>
        <Callout tone="primary" icon="diversity_3">
          {lang === "he" ? (
            <>
              <strong>
                {team.length} אנשי צוות קליני ב־{disciplines.length} דיסציפלינות.
              </strong>{" "}
              החלטה בראש-צוואר מחייבת הסכמה של כירורגיה, אונקולוגיה, אונקולוגיית קרינה,
              פתולוגיה ורדיולוגיה — המסך הזה מראה אם הם באמת מגיעים זה אל זה.
            </>
          ) : (
            <>
              <strong>{team.length} clinicians across {disciplines.length} disciplines.</strong>{" "}
              A head and neck decision needs surgery, oncology, radiation oncology,
              pathology and radiology to agree — this screen shows whether they are
              actually reaching each other.
            </>
          )}
        </Callout>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile
            value={`${participating}/${disciplines.length}`}
            label={t("Raising requests", "יוזמות פניות")}
            icon="record_voice_over"
            hint={t("disciplines", "דיסציפלינות")}
          />
          <StatTile
            value={mm.medianAttendance ?? "—"}
            label={t("In the room", "נוכחים בחדר")}
            icon="groups"
            hint={t("median per meeting", "חציון לדיון")}
          />
          <StatTile
            value={online}
            label={t("Available now", "זמינים כעת")}
            icon="circle"
            tone="stable"
          />
        </div>

        <div className="mt-5">
          <BetaScope />
        </div>

        {/* Per-discipline load */}
        <div className="mt-5">
          <SectionTitle
            action={
              <Link href="/insights" className="text-[11px] font-semibold text-[var(--color-primary)]">
                {t("Metrics", "מדדים")}
              </Link>
            }
          >
            {t("Coordination load by discipline", "עומס התיאום לפי דיסציפלינה")}
          </SectionTitle>

          <div className="space-y-2.5">
            {disciplines.map((d) => {
              const stat = byDisc.get(d);
              const members = team.filter((m) => m.discipline === d);
              const core = members.some((m) => m.coreMember);
              const received = stat?.received ?? 0;
              const raised = stat?.raised ?? 0;
              const openNow = stat?.openNow ?? 0;
              const breached = stat?.breached ?? 0;
              const closure = received ? (stat!.closed / received) : null;

              return (
                <Card key={d} className="p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--color-primary)]">
                      <Icon name={DISCIPLINE_ICON[d] ?? "group"} size={19} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-white">
                            {DISCIPLINE_LABEL[d]}
                          </p>
                          <p className="truncate text-[11px] text-[var(--color-ink-muted)]">
                            {members.map((m) => m.name).join(" · ")}
                          </p>
                        </div>
                        {core && <Badge tone="primary">{t("Core", "ליבה")}</Badge>}
                      </div>

                      <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <p className="text-[var(--color-ink-faint)]">
                            {t("Asked others", "פנו לאחרים")}
                          </p>
                          <p className="text-[15px] font-bold text-white">
                            <Num>{raised}</Num>
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--color-ink-faint)]">
                            {t("Asked of them", "פנו אליהם")}
                          </p>
                          <p className="text-[15px] font-bold text-white">
                            <Num>{received}</Num>
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--color-ink-faint)]">
                            {t("Median reply", "חציון מענה")}
                          </p>
                          <p className="text-[15px] font-bold text-white">
                            <Num>{fmtHours(stat?.medianHoursToAnswer ?? null)}</Num>
                          </p>
                        </div>
                      </div>

                      {received > 0 && (
                        <div className="mt-2.5">
                          <div className="mb-1 flex items-baseline justify-between text-[11px]">
                            <span className="text-[var(--color-ink-faint)]">
                              {t("Share of all requests", "נתח מכלל הפניות")}
                            </span>
                            <span className="font-semibold text-[var(--color-ink-muted)]">
                              <Num>
                                {fmtPercent(totalTraffic ? received / totalTraffic : 0)}
                              </Num>
                            </span>
                          </div>
                          <Meter
                            percent={totalTraffic ? (received / totalTraffic) * 100 : 0}
                            tone={breached > 0 ? "urgent" : "primary"}
                          />
                        </div>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {openNow > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-line-strong)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-ink-muted)]">
                            <Icon name="pending" size={11} />
                            <Num>{openNow}</Num> {t("open", "פתוחות")}
                          </span>
                        )}
                        {breached > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#ef444455] bg-[var(--color-urgent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[#fca5a5]">
                            <Icon name="schedule" size={11} />
                            <Num>{breached}</Num> {t("past target", "חרגו מהיעד")}
                          </span>
                        )}
                        {closure !== null && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#10b98155] bg-[var(--color-stable-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[#6ee7b7]">
                            <Icon name="task_alt" size={11} />
                            <Num>{fmtPercent(closure)}</Num> {t("closed", "נסגרו")}
                          </span>
                        )}
                        {raised === 0 && received > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#f59e0b55] bg-[var(--color-warn-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[#fcd34d]">
                            <Icon name="warning" size={11} />
                            {t("Consulted, not participating", "מתייעצים איתם, אינם יוזמים")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <AccessRequests />

        {/* Directory */}
        <div className="mt-5">
          <SectionTitle>{t("Directory", "ספר טלפונים")}</SectionTitle>
          <Card className="divide-y divide-[var(--color-line)]">
            {team.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <Avatar
                  initials={m.initials}
                  colour={m.colour}
                  size={38}
                  online={m.online}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white">
                    {m.name}
                    {m.id === currentUser.id && (
                      <span className="ms-1.5 text-[11px] font-normal text-[var(--color-ink-faint)]">
                        {t("(you)", "(את/ה)")}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-[var(--color-ink-muted)]">
                    {m.role}
                  </p>
                  {m.external && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#fcd34d]">
                      <Icon name="flight_land" size={11} />
                      {t("Visiting", "אורח/ת")}
                      {m.hospital ? ` · ${m.hospital}` : ""}
                    </p>
                  )}
                </div>
                {m.coreMember && (
                  <Icon
                    name="verified"
                    size={16}
                    className="shrink-0 text-[var(--color-primary)]"
                  />
                )}
              </div>
            ))}
          </Card>
          <AddColleague />
          <p className="mt-2 flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
            <Icon name="verified" size={13} className="mt-px shrink-0" />
            {t(
              "Marked disciplines must be represented for a board decision to be recorded as definitive rather than provisional.",
              "הדיסציפלינות המסומנות חייבות להיות מיוצגות כדי שהחלטת המועצה תירשם כסופית ולא כזמנית.",
            )}
          </p>
        </div>

        {/* Why discipline-level */}
        <div className="mt-5">
          <SectionTitle>{t("A note on measurement", "הערה על המדידה")}</SectionTitle>
          <Card className="p-4">
            <Label>{t("Why nothing here is per-person", "מדוע אין כאן דבר ברמת האדם")}</Label>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
              {t(
                "Every figure on this screen is aggregated to the discipline. A single pathologist’s median turnaround is a staffing fact, not a personal one, and presenting it as personal turns a coordination tool into a performance-management tool. Teams work around those. The unit of improvement here is the service, not the individual.",
                "כל נתון במסך הזה מצטבר לרמת הדיסציפלינה. חציון זמן התגובה של פתולוג יחיד הוא עובדה של כוח אדם, לא עובדה אישית, והצגתו כאישית הופכת כלי תיאום לכלי להערכת ביצועים. צוותים לומדים לעקוף כלים כאלה. יחידת השיפור כאן היא השירות, לא האדם.",
              )}
            </p>
          </Card>
        </div>
      </Screen>
    </>
  );
}
