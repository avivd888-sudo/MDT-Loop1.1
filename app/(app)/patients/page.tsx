"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import { PatientCard } from "@/components/patient";
import {
  Avatar,
  Chip,
  ChipRow,
  DemoBanner,
  EmptyState,
  Fab,
  Icon,
  SearchInput,
  StatTile,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { daysSince } from "@/lib/format";
import { pathwayMetrics } from "@/lib/metrics";
import { PATHWAY_LABEL, SUBSITE_LABEL, type PathwayStatus, type Subsite } from "@/lib/types";

type Filter = "all" | "urgent" | "blocked" | "mdt" | PathwayStatus;

/* The pathway filters take their text from PATHWAY_LABEL, which is already
   bilingual — so they are built inside the component, where the table is read
   during a render and answers in the language currently selected. */
const PATHWAY_FILTERS: PathwayStatus[] = ["new-referral", "treatment", "surveillance"];

export default function PatientsPage() {
  const { patients, loops, currentUser } = useStore();
  const { lang, t } = useLang();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [subsite, setSubsite] = useState<Subsite | "all">("all");

  const openLoopsByPatient = useMemo(() => {
    const map = new Map<string, { open: number; blocking: number }>();
    loops
      .filter((l) => !l.closedAt)
      .forEach((l) => {
        const cur = map.get(l.patientId) ?? { open: 0, blocking: 0 };
        cur.open++;
        if (l.blocksCaseId) cur.blocking++;
        map.set(l.patientId, cur);
      });
    return map;
  }, [loops]);

  const subsites = useMemo(
    () => Array.from(new Set(patients.map((p) => p.subsite))),
    [patients],
  );

  const pm = useMemo(() => pathwayMetrics(patients), [patients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients
      .filter((p) => {
        if (subsite !== "all" && p.subsite !== subsite) return false;
        const blocking = (openLoopsByPatient.get(p.id)?.blocking ?? 0) > 0;
        if (filter === "urgent" && p.acuity !== "urgent") return false;
        if (filter === "blocked" && !blocking) return false;
        if (filter === "mdt" && p.status !== "mdt-review") return false;
        if (
          filter !== "all" &&
          filter !== "urgent" &&
          filter !== "blocked" &&
          filter !== "mdt" &&
          p.status !== filter
        )
          return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.mrn.includes(q) ||
          p.nationalId.includes(q) ||
          p.diagnosis.toLowerCase().includes(q) ||
          SUBSITE_LABEL[p.subsite].toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Urgent first, then longest-waiting
        if (a.acuity !== b.acuity) return a.acuity === "urgent" ? -1 : 1;
        return daysSince(a.referralDate) > daysSince(b.referralDate) ? -1 : 1;
      });
  }, [patients, query, filter, subsite, openLoopsByPatient]);

  const urgentCount = patients.filter((p) => p.acuity === "urgent").length;
  const blockedCount = Array.from(openLoopsByPatient.values()).filter(
    (v) => v.blocking > 0,
  ).length;

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("All", "הכול") },
    { id: "urgent", label: t("Urgent", "דחופים") },
    { id: "blocked", label: t("Blocked", "חסומים") },
    { id: "mdt", label: t("For MDT", "לדיון MDT") },
    ...PATHWAY_FILTERS.map((id) => ({ id, label: PATHWAY_LABEL[id] })),
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/95 backdrop-blur-md">
        <div className="flex min-h-14 items-center gap-3 px-4">
          <Link href="/more" aria-label={t("Your profile", "הפרופיל שלך")}>
            <Avatar
              initials={currentUser.initials}
              colour={currentUser.colour}
              size={36}
              online
            />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-white">
              {t("Patient list", "רשימת המטופלים")}
            </h1>
            <p className="truncate text-[11px] text-[var(--color-ink-muted)]">
              {lang === "he"
                ? `${patients.length} פעילים · ${currentUser.name}`
                : `${patients.length} active · ${currentUser.name}`}
            </p>
          </div>
          <Link
            href="/loops"
            aria-label={t("Loops", "לולאות")}
            className="grid size-10 place-items-center rounded-full text-white hover:bg-white/5"
          >
            <Icon name="sync" size={22} />
          </Link>
        </div>
      </header>

      <Screen>
        <DemoBanner className="mb-3" />

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t(
            "Search name, MRN, national ID or diagnosis…",
            "חיפוש לפי שם, מס׳ תיק, ת״ז או אבחנה…",
          )}
        />

        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile
            value={urgentCount}
            label={t("Urgent", "דחופים")}
            icon="priority_high"
            tone={urgentCount ? "urgent" : "neutral"}
          />
          <StatTile
            value={blockedCount}
            label={t("Blocked", "חסומים")}
            icon="block"
            tone={blockedCount ? "warn" : "neutral"}
          />
          <StatTile
            value={pm.over60Days}
            label={t("Over 60 days", "מעל 60 יום")}
            icon="schedule"
            tone={pm.over60Days ? "urgent" : "stable"}
          />
        </div>

        <div className="mt-3 space-y-2">
          <ChipRow>
            {filters.map((f) => (
              <Chip
                key={f.id}
                active={filter === f.id}
                onClick={() => setFilter(f.id)}
                tone={f.id === "urgent" ? "urgent" : f.id === "blocked" ? "warn" : undefined}
              >
                {f.label}
              </Chip>
            ))}
          </ChipRow>

          <ChipRow>
            <Chip active={subsite === "all"} onClick={() => setSubsite("all")}>
              {t("All sites", "כל האתרים")}
            </Chip>
            {subsites.map((s) => (
              <Chip key={s} active={subsite === s} onClick={() => setSubsite(s)}>
                {SUBSITE_LABEL[s]}
              </Chip>
            ))}
          </ChipRow>
        </div>

        <div className="mt-4 space-y-2.5">
          {filtered.length === 0 ? (
            <EmptyState
              icon="search_off"
              title={t("No patients match", "אין מטופלים תואמים")}
              body={t(
                "Try clearing the filters, or searching by MRN instead of name.",
                "אפשר לנקות את הסינון, או לחפש לפי מס׳ תיק במקום לפי שם.",
              )}
            />
          ) : (
            filtered.map((p) => (
              <PatientCard
                key={p.id}
                patient={p}
                openLoops={openLoopsByPatient.get(p.id)?.open ?? 0}
                blockedLoops={openLoopsByPatient.get(p.id)?.blocking ?? 0}
              />
            ))
          )}
        </div>
      </Screen>

      <Fab href="/patients/new" icon="add" label={t("Add patient", "הוספת מטופל")} />
    </>
  );
}
