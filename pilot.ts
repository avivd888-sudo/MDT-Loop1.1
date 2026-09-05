/**
 * The pilot cohort, and the numbers the study actually claims.
 *
 * This is what turns a month of using the platform into a study rather than a
 * month of using a platform. The protocol asks three things of the pilot, and
 * this module computes exactly those and nothing more:
 *
 *   1. Is it feasible — do cases get a loop opened at all, and do loops close?
 *   2. Is it adopted — is it still being used in week eight?
 *   3. What is the standard deviation of the referral-to-decision interval?
 *
 * The third is the one that makes the pilot worth running. There is no prior
 * study of this endpoint in head and neck cancer, so there is no variance
 * estimate with which to power a definitive trial. Producing that estimate is
 * the stated purpose, which is also why this file refuses to print an SD from
 * a handful of observations without saying how few (see `intervalStats`).
 *
 * ── Enrolment is not a decision ───────────────────────────────────────────
 *
 * The cohort is derived, never chosen: consecutive patients referred on or
 * after the pilot start date, in order, up to the target. Nobody picks who
 * counts. A screen with an "enrol this patient" button would invite exactly
 * the selection bias that makes small single-centre cohorts worthless — the
 * interesting case gets enrolled, the one that went badly does not.
 */

import { NOW } from "./data";
import { hoursBetween } from "./metrics";
import type { Loop, MdtSession, Patient } from "./types";

/**
 * The one line to change when the real intervention period opens. Everything
 * else on the pilot screen follows from it.
 */
export const PILOT_START = "2026-06-01";

/** 20 patients: the lower bound of the published 20–40 range for a pilot
 *  sizing a variance estimate, chosen because a department's volume of new
 *  head and neck diagnoses would take years to reach 40. */
export const PILOT_TARGET = 20;

export interface PilotPatient {
  patient: Patient;
  /** Consecutive position in the cohort — 1-based. */
  seq: number;
  /** Days from referral to a recorded MDT decision, where one exists. */
  daysToDecision: number | null;
  loopsOpened: number;
  loopsClosed: number;
}

export interface IntervalStats {
  n: number;
  mean: number | null;
  median: number | null;
  sd: number | null;
  min: number | null;
  max: number | null;
  /**
   * Whether the spread is worth quoting. An SD from fewer than ten intervals
   * is too unstable to plan a trial around, and saying so is more useful than
   * printing a number to one decimal place.
   */
  reportable: boolean;
}

export interface PilotMetrics {
  cohort: PilotPatient[];
  enrolled: number;
  target: number;
  /** Feasibility: cases with at least one loop opened. */
  withLoop: number;
  /** Adoption: loops closed by the requester, over loops answered. */
  closureRate: number | null;
  answeredNotClosed: number;
  /** Cases taken to the board that left it with no recommendation. */
  boardCases: number;
  boardUndecided: number;
  /** The estimate the definitive trial will be powered from. */
  interval: IntervalStats;
  /** Loops opened per ISO week, oldest first — sustained use, or a spike. */
  weekly: { week: string; opened: number }[];
}

const DAY = 24;

function daysBetween(a: string, b: string): number {
  return Math.round(hoursBetween(a, b) / DAY);
}

/** Sample standard deviation (n−1): these are a sample of future patients. */
export function intervalStats(values: number[]): IntervalStats {
  const n = values.length;
  if (n === 0) {
    return { n: 0, mean: null, median: null, sd: null, min: null, max: null, reportable: false };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const median =
    n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const sd =
    n < 2 ? null : Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  return {
    n,
    mean,
    median,
    sd,
    min: sorted[0],
    max: sorted[n - 1],
    reportable: n >= 10,
  };
}

/** ISO week key, e.g. `2026-W31`. */
function isoWeek(iso: string): string {
  const d = new Date(iso);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function pilotMetrics(
  patients: Patient[],
  loops: Loop[],
  sessions: MdtSession[],
  now: string = NOW,
): PilotMetrics {
  const cohortPatients = patients
    .filter((p) => p.referralDate >= PILOT_START && p.referralDate <= now.slice(0, 10))
    .sort((a, b) => a.referralDate.localeCompare(b.referralDate))
    .slice(0, PILOT_TARGET);

  const ids = new Set(cohortPatients.map((p) => p.id));
  const cohortLoops = loops.filter((l) => ids.has(l.patientId));

  const cohort: PilotPatient[] = cohortPatients.map((patient, i) => {
    const mine = cohortLoops.filter((l) => l.patientId === patient.id);
    return {
      patient,
      seq: i + 1,
      daysToDecision: patient.decisionDate
        ? daysBetween(patient.referralDate, patient.decisionDate)
        : null,
      loopsOpened: mine.length,
      loopsClosed: mine.filter((l) => l.closedAt).length,
    };
  });

  const answered = cohortLoops.filter((l) => l.answeredAt);
  const closed = answered.filter((l) => l.closedAt);

  const boardEntries = sessions.flatMap((s) => s.cases.filter((c) => ids.has(c.patientId)));

  const weeks = new Map<string, number>();
  cohortLoops.forEach((l) => {
    const k = isoWeek(l.openedAt);
    weeks.set(k, (weeks.get(k) ?? 0) + 1);
  });

  return {
    cohort,
    enrolled: cohort.length,
    target: PILOT_TARGET,
    withLoop: cohort.filter((c) => c.loopsOpened > 0).length,
    closureRate: answered.length ? closed.length / answered.length : null,
    answeredNotClosed: answered.length - closed.length,
    boardCases: boardEntries.length,
    boardUndecided: boardEntries.filter((c) => c.status !== "decided").length,
    interval: intervalStats(
      cohort.map((c) => c.daysToDecision).filter((d): d is number => d !== null),
    ),
    weekly: [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([week, opened]) => ({
      week,
      opened,
    })),
  };
}

/**
 * The cohort as CSV, one row per patient.
 *
 * Deliberately identifiers-free: a study export that carries names and national
 * ID numbers out of the system into somebody's downloads folder is a data
 * breach waiting for a lost laptop. The study identifier is the sequence
 * number, and the key that maps it back to a patient stays inside the system.
 */
export function cohortCsv(m: PilotMetrics): string {
  const head = [
    "study_id",
    "referral_date",
    "decision_date",
    "days_to_decision",
    "subsite",
    "stage",
    "loops_opened",
    "loops_closed",
  ];
  const rows = m.cohort.map((c) =>
    [
      `P${String(c.seq).padStart(3, "0")}`,
      c.patient.referralDate,
      c.patient.decisionDate ?? "",
      c.daysToDecision ?? "",
      c.patient.subsite,
      c.patient.tnm.stageGroup,
      c.loopsOpened,
      c.loopsClosed,
    ].join(","),
  );
  return [head.join(","), ...rows].join("\n");
}
