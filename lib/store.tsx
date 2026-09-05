"use client";

/**
 * Application state.
 *
 * State lives in React and is mirrored to sessionStorage, so that refreshing
 * the browser mid-demonstration does not erase a decision just recorded.
 * sessionStorage rather than localStorage: it is scoped to the tab and cleared
 * when the tab closes, so nothing resembling clinical data survives on a
 * shared machine.
 *
 * Every action here maps one-to-one onto an API call a real server would
 * expose, which is why they are named as domain actions (acknowledgeLoop,
 * closeLoop) rather than as setters.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CURRENT_USER_ID, LOOPS, PATIENTS, PENDING_REQUESTS, SESSIONS, TEAM } from "./data";
import { translateDeep } from "./demo-he";
import { useLang } from "./i18n";
import { SharedState, type SyncState } from "./sync";
import { setRoster } from "./roster";
import type { PendingMember } from "./types";
import { DISCIPLINE_SHORT } from "./types";
import type {
  Discipline,
  Loop,
  LoopEvent,
  LoopKind,
  LoopUrgency,
  MdtDecision,
  MdtSession,
  Patient,
  TeamMember,
} from "./types";

interface NewLoopInput {
  patientId: string;
  kind: LoopKind;
  urgency: LoopUrgency;
  toDiscipline: Discipline;
  situation: string;
  background: string;
  assessment: string;
  request: string;
  blocksCaseId?: string;
}

interface StoreValue {
  /** Next patient id — must come from the pool so the static route exists. */
  nextPatientId: () => string;
  patients: Patient[];
  sessions: MdtSession[];
  loops: Loop[];
  team: TeamMember[];
  currentUser: TeamMember;

  getPatient: (id: string) => Patient | undefined;
  getLoop: (id: string) => Loop | undefined;
  addPatient: (p: Patient) => void;

  openLoop: (input: NewLoopInput) => string;
  acknowledgeLoop: (id: string, note?: string) => void;
  answerLoop: (id: string, answer: string) => void;
  closeLoop: (id: string, closureNote: string) => void;
  escalateLoop: (id: string) => void;

  /** Whether this board is shared, and whether the last change was saved. */
  sync: SyncState;

  /** Sign this browser in as a particular clinician. */
  signInAs: (id: string) => void;
  /** Discipline leads only: bring a colleague onto the board. */
  addTeamMember: (m: Omit<TeamMember, "addedBy">) => void;

  /** Access requests that have proved a work address and await a lead. */
  pending: PendingMember[];
  /** Record a verified request. Grants nothing on its own. */
  requestAccess: (p: PendingMember) => void;
  /** Lead of the same discipline only: admit a request to the board. */
  approveMember: (id: string, role?: string) => void;
  /** Lead of the same discipline only: refuse a request. */
  declineMember: (id: string) => void;

  /** True when the signed-in clinician leads a discipline. */
  isDisciplineLead: boolean;
  /** Lead only: move a stalled loop to a different discipline. */
  reassignLoop: (id: string, to: Discipline, reason: string) => void;
  /** Lead only: close a loop its requester cannot close. */
  overrideCloseLoop: (id: string, reason: string) => void;
  /** Lead only: reopen a loop that was closed without being handled properly. */
  reopenLoop: (id: string, reason: string) => void;

  recordDecision: (sessionId: string, caseId: string, decision: MdtDecision) => void;
  deferCase: (sessionId: string, caseId: string, reason: string) => void;
  toggleAttendance: (sessionId: string, memberId: string) => void;

  resetDemo: () => void;
}

/* Assigned round-robin so two people admitted on the same day do not get the
   same avatar colour, which is the one thing that makes a roster hard to scan. */
const MEMBER_COLOURS = [
  "#137fec",
  "#a78bfa",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
];

const StoreContext = createContext<StoreValue | null>(null);

/**
 * Identifiers for records created at runtime.
 *
 * The counter is per-prefix and starts at 1000, so identifiers are predictable
 * in advance. That is needed only because of the static export: Next.js cannot
 * generate a page for a dynamic route that did not exist at build time, so the
 * build pre-renders an identifier pool (RUNTIME_POOL in lib/data). A server
 * deployment does not need this.
 */
const counters: Record<string, number> = {};
const nextId = (prefix: string) => {
  counters[prefix] = (counters[prefix] ?? 1000) + 1;
  return `${prefix}-${counters[prefix]}`;
};
const stamp = () => new Date().toISOString();

const STORAGE_KEY = "ent-mdt-demo-v2";

interface Snapshot {
  patients: Patient[];
  sessions: MdtSession[];
  loops: Loop[];
  /** Shared, so that a colleague one lead adds is on everyone's roster. */
  team?: TeamMember[];
  /** Access requests waiting on a discipline lead — shared for the same reason. */
  pending?: PendingMember[];
}

/**
 * Which clinician this browser is signed in as.
 *
 * `localStorage`, deliberately, and the only thing in the application that
 * uses it: identity should survive closing a tab, while anything resembling
 * clinical data stays in `sessionStorage` and does not. Identity is per device
 * because the board is shared — without it every viewer would act as the same
 * person and "only the clinician who asked may close" would mean nothing.
 */
const IDENTITY_KEY = "mdt-loop-identity";

function loadIdentity(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(IDENTITY_KEY);
  } catch {
    return null;
  }
}

function loadSnapshot(): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    if (!Array.isArray(parsed?.patients) || !Array.isArray(parsed?.loops)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const [patients, setPatients] = useState<Patient[]>(PATIENTS);
  const [sessions, setSessions] = useState<MdtSession[]>(SESSIONS);
  const [loops, setLoops] = useState<Loop[]>(LOOPS);
  const [team, setTeam] = useState<TeamMember[]>(TEAM);
  const [pending, setPending] = useState<PendingMember[]>(PENDING_REQUESTS);
  const [userId, setUserId] = useState<string>(CURRENT_USER_ID);

  // Kept in step with the registry that `member()` reads — and in the language
  // being read, since `member()` is called to render a colleague's name.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setRoster(translateDeep(team)), [team, lang]);

  const currentUser = useMemo(
    () => team.find((m) => m.id === userId) ?? team[0],
    [team, userId],
  );

  const signInAs = useCallback((id: string) => {
    setUserId(id);
    try {
      window.localStorage.setItem(IDENTITY_KEY, id);
    } catch {
      /* identity falls back to this session only */
    }
  }, []);

  /**
   * Bring a colleague onto the board. A discipline lead's call, including for
   * an outside consultant helping with one case — the alternative is that the
   * person everyone is waiting on cannot be addressed by the system at all.
   */
  const addTeamMember = useCallback(
    (m: Omit<TeamMember, "addedBy">) => {
      if (!currentUser.disciplineLead) return;
      setTeam((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, addedBy: currentUser.id }],
      );
    },
    [currentUser],
  );

  /* ---------------------------------------------------------------------- */
  /* Access requests                                                        */
  /* ---------------------------------------------------------------------- */

  /**
   * Record a request from somebody who has proved a work address.
   *
   * It grants nothing. The whole point of keeping requests as their own list,
   * rather than adding a `pending: true` member to the roster, is that a
   * half-admitted person cannot be routed a loop by accident: `member()` never
   * sees them, so no screen can address them and no request can be assigned to
   * them until a lead has said yes.
   */
  const requestAccess = useCallback((p: PendingMember) => {
    setPending((prev) =>
      prev.some((x) => x.email.toLowerCase() === p.email.toLowerCase()) ? prev : [...prev, p],
    );
  }, []);

  /**
   * A lead admits someone to the board.
   *
   * Scoped to the lead's own discipline. A pathology lead should not be the one
   * deciding that a new radiation oncologist is who they say they are — the
   * person who can check that is the head of that discipline, which is the
   * whole argument for putting this authority with the department heads rather
   * than with an administrator.
   */
  const approveMember = useCallback(
    (id: string, role?: string) => {
      const req = pending.find((p) => p.id === id);
      if (!req) return;
      if (!currentUser.disciplineLead || currentUser.discipline !== req.discipline) return;

      const initials =
        req.name
          .replace(/^(Dr|Prof|Mr|Ms|Mrs|ד״ר|דר|פרופ׳|פרופ)\.?\s+/i, "")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w: string) => w[0])
          .join("")
          .toUpperCase() || "?";

      setTeam((prev) =>
        prev.some((m) => m.id === req.id)
          ? prev
          : [
              ...prev,
              {
                id: req.id,
                name: req.name,
                role: role?.trim() || req.role,
                discipline: req.discipline,
                initials,
                colour: MEMBER_COLOURS[prev.length % MEMBER_COLOURS.length],
                addedBy: currentUser.id,
                email: req.email,
                organisation: req.organisation,
              },
            ],
      );
      setPending((prev) => prev.filter((p) => p.id !== id));
    },
    [pending, currentUser],
  );

  /** A lead refuses a request. The record is removed, not marked — a refused
   *  request that stays on the screen is a list nobody ever finishes reading. */
  const declineMember = useCallback(
    (id: string) => {
      const req = pending.find((p) => p.id === id);
      if (!req) return;
      if (!currentUser.disciplineLead || currentUser.discipline !== req.discipline) return;
      setPending((prev) => prev.filter((p) => p.id !== id));
    },
    [pending, currentUser],
  );

  /*
   * Two tiers of persistence, in this order.
   *
   * The shared record comes first where it exists: on the published build the
   * whole team reads and writes one board, which is the difference between a
   * demonstration and something a department can run a pilot on. Where it does
   * not exist — local development, the offline single file, the automated
   * walkthrough — the tab-scoped snapshot behaves exactly as it always did.
   */
  const shared = useRef<SharedState<Snapshot> | null>(null);
  if (shared.current === null) shared.current = new SharedState<Snapshot>();
  const [sync, setSync] = useState<SyncState>({ status: "local" });

  const hydrated = useRef(false);
  useEffect(() => {
    const store = shared.current!;
    const unsubscribe = store.subscribe(setSync);

    void (async () => {
      const remote = await store.load();
      const snap = remote ?? loadSnapshot();
      if (snap) {
        setPatients(snap.patients);
        setSessions(snap.sessions);
        setLoops(snap.loops);
        if (Array.isArray(snap.team) && snap.team.length) setTeam(snap.team);
        if (Array.isArray(snap.pending)) setPending(snap.pending);
      }
      const saved = loadIdentity();
      if (saved) setUserId(saved);
      hydrated.current = true;
    })();

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Guarded on `hydrated`: without it the seed data would be written over
    // the team's board in the moment between mount and load resolving.
    if (!hydrated.current) return;
    const snapshot = { patients, sessions, loops, team, pending };
    shared.current?.save(snapshot);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* Storage unavailable — the app continues from memory */
    }
  }, [patients, sessions, loops, team, pending]);

  /* Translated on the way out, like everything else the interface reads. */
  const getPatient = useCallback(
    (id: string) => {
      const p = patients.find((x) => x.id === id);
      return p && translateDeep(p);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- language decides
    // which copy comes back.
    [patients, lang],
  );
  const getLoop = useCallback(
    (id: string) => {
      const l = loops.find((x) => x.id === id);
      return l && translateDeep(l);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loops, lang],
  );

  const addPatient = useCallback((p: Patient) => setPatients((prev) => [p, ...prev]), []);

  /* ---------------------------------------------------------------------- */
  /* Loop lifecycle                                                         */
  /* ---------------------------------------------------------------------- */

  const pushEvent = (l: Loop, e: LoopEvent): Loop => ({ ...l, events: [...l.events, e] });

  const openLoop = useCallback(
    (input: NewLoopInput) => {
      const id = nextId("l");
      const at = stamp();
      const loop: Loop = {
        id,
        ...input,
        requesterId: currentUser.id,
        openedAt: at,
        events: [{ at, actorId: currentUser.id, type: "opened" }],
      };
      setLoops((prev) => [loop, ...prev]);
      return id;
    },
    [currentUser.id],
  );

  const acknowledgeLoop = useCallback(
    (id: string, note?: string) => {
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) =>
          l.id === id && !l.acknowledgedAt
            ? pushEvent(
                { ...l, acknowledgedAt: at, acknowledgedBy: currentUser.id },
                { at, actorId: currentUser.id, type: "acknowledged", note },
              )
            : l,
        ),
      );
    },
    [currentUser.id],
  );

  const answerLoop = useCallback(
    (id: string, answer: string) => {
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          // Answering implies acknowledgement, even if not done explicitly
          const base = l.acknowledgedAt
            ? l
            : { ...l, acknowledgedAt: at, acknowledgedBy: currentUser.id };
          return pushEvent(
            { ...base, answeredAt: at, answeredBy: currentUser.id, answer },
            { at, actorId: currentUser.id, type: "answered" },
          );
        }),
      );
    },
    [currentUser.id],
  );

  /**
   * Closing a loop.
   *
   * This is the only action in the system that only the *requester* may
   * perform, and that is the whole point: an answer is not a closure. A loop
   * closes only when the person who asked confirms the answer resolved the
   * question. Closing also marks the linked MDT prerequisite as ready.
   */
  const closeLoop = useCallback(
    (id: string, closureNote: string) => {
      const at = stamp();
      let caseId: string | undefined;

      /*
       * The rule is enforced here, in the domain action, and not only by hiding
       * the button. A permission that lives in the view is a suggestion: any
       * other call path — a future keyboard shortcut, a deep link, a test —
       * walks straight past it. This is the one rule the whole study rests on,
       * so it belongs where the state actually changes.
       *
       * Note for the production build: this is still client-side. Authorisation
       * has to be re-checked on the server before any real data is written,
       * because nothing sent from a browser can be trusted.
       */
      const target = loops.find((l) => l.id === id);
      if (!target || target.closedAt || target.requesterId !== currentUser.id) return;

      setLoops((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          caseId = l.blocksCaseId;
          return pushEvent(
            { ...l, closedAt: at, closedBy: currentUser.id, closureNote },
            { at, actorId: currentUser.id, type: "closed", note: closureNote },
          );
        }),
      );

      // Release the block on the tumour board case
      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          cases: s.cases.map((c) => ({
            ...c,
            prerequisites: c.prerequisites.map((p) =>
              p.loopId === id ? { ...p, ready: true } : p,
            ),
          })),
        })),
      );
      void caseId;
    },
    [currentUser.id, loops],
  );

  const escalateLoop = useCallback(
    (id: string) => {
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) =>
          l.id === id
            ? pushEvent(
                { ...l, urgency: l.urgency === "routine" ? "urgent" : "stat" },
                {
                  at,
                  actorId: currentUser.id,
                  type: "escalated",
                  note: "Escalated after passing the target turnaround",
                },
              )
            : l,
        ),
      );
    },
    [currentUser.id],
  );

  /* ---------------------------------------------------------------------- */
  /* Discipline lead                                                          */
  /*                                                                          */
  /* Closure belongs to the requester. That rule is the point of the system,  */
  /* and it is also the rule most likely to strand a loop: the person who     */
  /* asked is on nights, in theatre, or on leave. A discipline lead may break */
  /* the rule, must give a reason, and the act is stamped onto the loop       */
  /* itself as well as the audit trail — so no view can ever show a lead's    */
  /* override as though the requester had confirmed the answer.               */
  /*                                                                          */
  /* Naming this the department heads' authority is a design choice, not an   */
  /* implementation detail: it makes the pathway theirs to own.               */
  /* ---------------------------------------------------------------------- */

  const isDisciplineLead = Boolean(currentUser.disciplineLead);

  const reassignLoop = useCallback(
    (id: string, to: Discipline, reason: string) => {
      if (!currentUser.disciplineLead) return;
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const from = DISCIPLINE_SHORT[l.toDiscipline];
          return pushEvent(
            { ...l, toDiscipline: to, overriddenBy: currentUser.id, overrideReason: reason },
            {
              at,
              actorId: currentUser.id,
              type: "reassigned",
              note: `Rerouted from ${from} to ${DISCIPLINE_SHORT[to]} — ${reason}`,
            },
          );
        }),
      );
    },
    [currentUser.id, currentUser.disciplineLead],
  );

  const overrideCloseLoop = useCallback(
    (id: string, reason: string) => {
      if (!currentUser.disciplineLead) return;
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) =>
          l.id === id
            ? pushEvent(
                {
                  ...l,
                  closedAt: at,
                  closedBy: currentUser.id,
                  closureNote: reason,
                  overriddenBy: currentUser.id,
                  overrideReason: reason,
                },
                { at, actorId: currentUser.id, type: "override-closed", note: reason },
              )
            : l,
        ),
      );
      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          cases: s.cases.map((c) => ({
            ...c,
            prerequisites: c.prerequisites.map((pr) =>
              pr.loopId === id ? { ...pr, ready: true } : pr,
            ),
          })),
        })),
      );
    },
    [currentUser.id, currentUser.disciplineLead],
  );

  /**
   * Reopening. A loop can be closed and still not have been handled — the
   * requester accepts a partial answer, or closes to clear their board. The
   * lead of the discipline the request went to can put it back, which is the
   * only way the closure rate stays worth measuring.
   */
  const reopenLoop = useCallback(
    (id: string, reason: string) => {
      if (!currentUser.disciplineLead) return;
      const at = stamp();
      setLoops((prev) =>
        prev.map((l) =>
          l.id === id && l.closedAt
            ? pushEvent(
                {
                  ...l,
                  closedAt: undefined,
                  closedBy: undefined,
                  closureNote: undefined,
                  overriddenBy: currentUser.id,
                  overrideReason: reason,
                },
                { at, actorId: currentUser.id, type: "reopened", note: reason },
              )
            : l,
        ),
      );
    },
    [currentUser.id, currentUser.disciplineLead],
  );

  /* ---------------------------------------------------------------------- */
  /* Tumour board                                                            */
  /* ---------------------------------------------------------------------- */

  const recordDecision = useCallback(
    (sessionId: string, caseId: string, decision: MdtDecision) => {
      let patientId: string | undefined;
      let recommendation = "";

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const cases = s.cases.map((c) => {
            if (c.id !== caseId) return c;
            patientId = c.patientId;
            recommendation = decision.recommendation;
            return { ...c, status: "decided" as const, decision };
          });
          const allHandled = cases.every((c) => c.status !== "pending");
          return { ...s, cases, status: allHandled ? ("complete" as const) : s.status };
        }),
      );

      if (patientId) {
        const pid = patientId;
        const today = stamp().slice(0, 10);
        setPatients((prev) =>
          prev.map((p) =>
            p.id === pid
              ? {
                  ...p,
                  status: "treatment" as const,
                  plan: recommendation,
                  decisionDate: p.decisionDate ?? today,
                  timeline: [
                    ...p.timeline,
                    {
                      id: nextId("t"),
                      date: today,
                      kind: "mdt" as const,
                      title: "MDT decision recorded",
                      detail: recommendation,
                      actor: team.find((m) => m.id === decision.decidedBy)?.name,
                    },
                  ],
                }
              : p,
          ),
        );

        // The follow-up becomes a loop, not a task — so it also has to close
        if (decision.followUp) {
          const at = stamp();
          setLoops((prev) => [
            {
              id: nextId("l"),
              patientId: pid,
              kind: "scheduling" as const,
              urgency: "routine" as const,
              situation: `MDT decision of ${today}.`,
              background: recommendation,
              assessment: "Follow-up action arising from the board decision.",
              request: decision.followUp!,
              requesterId: currentUser.id,
              toDiscipline: "nursing" as const,
              openedAt: at,
              events: [{ at, actorId: currentUser.id, type: "opened" as const }],
            },
            ...prev,
          ]);
        }
      }
    },
    [currentUser.id, team],
  );

  const deferCase = useCallback((sessionId: string, caseId: string, reason: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              cases: s.cases.map((c) =>
                c.id === caseId
                  ? {
                      ...c,
                      status: "deferred" as const,
                      deferReason: reason,
                      timesDeferred: c.timesDeferred + 1,
                    }
                  : c,
              ),
            }
          : s,
      ),
    );
  }, []);

  const toggleAttendance = useCallback((sessionId: string, memberId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              attendeeIds: s.attendeeIds.includes(memberId)
                ? s.attendeeIds.filter((id) => id !== memberId)
                : [...s.attendeeIds, memberId],
            }
          : s,
      ),
    );
  }, []);

  const resetDemo = useCallback(() => {
    setPatients(PATIENTS);
    setSessions(SESSIONS);
    setLoops(LOOPS);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /*
   * What the interface receives.
   *
   * The state above stays in the language the seed data was written in, and
   * every action reads and writes it — so the audit trail, the CSV export and
   * the shared snapshot are all unaffected by what language somebody is
   * reading in. Only the copy handed to the screens is translated, and only
   * when the reader is reading Hebrew: in English `translateDeep` returns its
   * argument and this costs nothing.
   *
   * Doing it here rather than at each render site is the difference between one
   * seam and a hundred. A hundred means one of them is eventually missed, and a
   * Hebrew screen with an English diagnosis on it is the kind of defect nobody
   * reports — they just trust the tool a little less.
   */
  /* Memoised: it is a dependency of several screens' own memos, so handing out
     a fresh object on every render would defeat all of them. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shownUser = useMemo(() => translateDeep(currentUser), [currentUser, lang]);

  const shown = useMemo(
    () => ({
      patients: translateDeep(patients),
      sessions: translateDeep(sessions),
      loops: translateDeep(loops),
      team: translateDeep(team),
      pending: translateDeep(pending),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `lang` is not read
    // here; it is the signal that the translated projection must be rebuilt.
    [patients, sessions, loops, team, pending, lang],
  );

  const value: StoreValue = {
    nextPatientId: () => nextId("p"),
    patients: shown.patients,
    sessions: shown.sessions,
    loops: shown.loops,
    team: shown.team,
    currentUser: shownUser,
    getPatient,
    getLoop,
    addPatient,
    openLoop,
    acknowledgeLoop,
    answerLoop,
    closeLoop,
    escalateLoop,
    sync,
    signInAs,
    addTeamMember,
    pending: shown.pending,
    requestAccess,
    approveMember,
    declineMember,
    isDisciplineLead,
    reassignLoop,
    overrideCloseLoop,
    reopenLoop,
    recordDecision,
    deferCase,
    toggleAttendance,
    resetDemo,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Is the board quorate — every required discipline represented. */
export function quorumFor(session: MdtSession, team: TeamMember[]) {
  const present = new Set(
    session.attendeeIds
      .map((id) => team.find((m) => m.id === id)?.discipline)
      .filter(Boolean) as Discipline[],
  );
  const missing = session.requiredDisciplines.filter((d) => !present.has(d));
  return { met: missing.length === 0, missing };
}
