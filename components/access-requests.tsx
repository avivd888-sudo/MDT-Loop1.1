"use client";

import { useState } from "react";
import { fmtDateTime } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { DISCIPLINE_LABEL } from "@/lib/types";
import { Button, Callout, Card, En, Icon, Label, Num, SectionTitle } from "./ui";

/**
 * The queue a discipline lead has to clear.
 *
 * Everything upstream of this is automatic: the domain is checked, a code is
 * sent, the address answers. None of it lets anybody in. Admission is a person
 * saying yes about a person they know, and this is where that happens.
 *
 * A lead sees only their own discipline. That is not a UI convenience — a
 * pathology lead is in no position to know whether a new radiation oncologist
 * is who they say they are, and an approval by somebody who cannot check is an
 * approval that means nothing.
 */
export function AccessRequests() {
  const { pending, currentUser, approveMember, declineMember } = useStore();
  const { lang, t } = useLang();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (!currentUser.disciplineLead) return null;

  const mine = pending.filter((p) => p.discipline === currentUser.discipline);
  const others = pending.length - mine.length;

  if (pending.length === 0) return null;

  return (
    <div className="mt-6">
      <SectionTitle
        action={
          mine.length > 0 ? (
            <span className="text-[12px] font-semibold text-[#fcd34d]">
              <Num>{mine.length}</Num>
            </span>
          ) : undefined
        }
      >
        {t("Waiting to be admitted", "ממתינים לאישור כניסה")}
      </SectionTitle>

      {mine.length === 0 ? (
        <Card className="p-3.5">
          <p className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            {lang === "he" ? (
              <>
                אין בקשות ב{DISCIPLINE_LABEL[currentUser.discipline]}.{" "}
                <Num>{others}</Num> בקשות ממתינות למנהלי דיסציפלינות אחרות.
              </>
            ) : (
              <>
                Nothing waiting in {DISCIPLINE_LABEL[currentUser.discipline]}.{" "}
                <Num>{others}</Num> request{others === 1 ? " is" : "s are"} with other
                discipline leads.
              </>
            )}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {mine.map((p) => (
            <Card key={p.id} className="p-3.5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--color-warn-soft)] text-[#fcd34d]">
                  <Icon name="how_to_reg" size={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-white">{p.name}</p>
                  <p className="truncate text-[12px] text-[var(--color-ink-muted)]">
                    {p.role} · {DISCIPLINE_LABEL[p.discipline]}
                  </p>
                </div>
              </div>

              <dl className="mt-3 space-y-1.5 border-t border-[var(--color-line)] pt-3 text-[12px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-ink-faint)]">
                    {t("Verified address", "כתובת מאומתת")}
                  </dt>
                  <dd className="min-w-0 truncate font-semibold text-white">
                    <En>{p.email}</En>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-ink-faint)]">
                    {t("Organisation", "ארגון")}
                  </dt>
                  <dd className="min-w-0 truncate text-[var(--color-ink-muted)]">
                    {p.organisation}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-ink-faint)]">
                    {t("Licence", "רישיון")}
                  </dt>
                  <dd className="min-w-0 truncate text-[var(--color-ink-muted)]">
                    <Num>{p.licence}</Num>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-ink-faint)]">
                    {t("Requested", "מועד הבקשה")}
                  </dt>
                  <dd className="min-w-0 truncate text-[var(--color-ink-muted)]">
                    <Num>{fmtDateTime(p.requestedAt)}</Num>
                  </dd>
                </div>
              </dl>

              {confirming === p.id ? (
                <>
                  <Callout tone="warn" icon="warning" className="mt-3">
                    {lang === "he" ? (
                      <>
                        אישור נותן ל<strong>{p.name}</strong> גישה לתיקי המטופלים
                        האונקולוגיים של המחלקה. לאשר רק אם את/ה מכיר/ה את האדם הזה אישית
                        או אימת/ה אותו מול מקום העבודה.
                      </>
                    ) : (
                      <>
                        Approving gives <strong>{p.name}</strong> access to the
                        department&apos;s oncology records. Approve only if you know this
                        person or have confirmed them with their employer.
                      </>
                    )}
                  </Callout>
                  <div className="mt-3 flex gap-2">
                    <Button
                      icon="check"
                      className="flex-1"
                      onClick={() => {
                        approveMember(p.id);
                        setConfirming(null);
                      }}
                    >
                      {t("Admit to the board", "אישור והוספה ללוח")}
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirming(null)}>
                      {t("Cancel", "ביטול")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button icon="how_to_reg" className="flex-1" onClick={() => setConfirming(p.id)}>
                    {t("Approve", "אישור")}
                  </Button>
                  <Button variant="danger" icon="block" onClick={() => declineMember(p.id)}>
                    {t("Refuse", "דחייה")}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
