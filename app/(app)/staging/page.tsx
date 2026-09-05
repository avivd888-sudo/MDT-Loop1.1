"use client";

import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import type { ReactNode } from "react";
import {
  AppHeader,
  Callout,
  Card,
  En,
  Icon,
  Label,
  Num,
  SectionTitle,
  Select,
} from "@/components/ui";
import { useLang } from "@/lib/i18n";
import {
  SUPPORTED_SITES,
  computeStage,
  schemaFor,
  stageOpcP16Pathological,
  type StagingSite,
} from "@/lib/staging";

/**
 * TNM staging tool.
 *
 * The point of difference here is that it knows which *edition* applies to
 * which site. Version 9 replaced the 8th edition for HPV-associated
 * oropharyngeal and salivary gland cancers on 1 January 2026; everything else
 * is still 8th edition. A tool that silently applies one edition everywhere
 * will produce confidently wrong stage groups.
 */
export default function StagingPage() {
  const { lang, t } = useLang();
  const [site, setSite] = useState<StagingSite>("oropharynx-p16-positive");
  /* `tCat` and not `t`: the translation helper owns that name. */
  const [tCat, setTCat] = useState("");
  const [n, setN] = useState("");
  const [m, setM] = useState("M0");
  const [pn, setPn] = useState("");

  const schema = useMemo(() => schemaFor(site), [site]);
  const result = useMemo(() => computeStage(site, tCat, n, m), [site, tCat, n, m]);
  const pathResult = useMemo(
    () => (schema.hasPathological && tCat && pn ? stageOpcP16Pathological(tCat, pn) : null),
    [schema.hasPathological, tCat, pn],
  );

  const meta = SUPPORTED_SITES.find((s) => s.id === site)!;

  function changeSite(next: StagingSite) {
    setSite(next);
    setTCat("");
    setN("");
    setM("M0");
    setPn("");
  }

  return (
    <>
      <AppHeader
        title={t("TNM staging", "סטייג׳ינג TNM")}
        subtitle={t("Head & neck", "ראש-צוואר")}
        back="/evidence"
      />
      <Screen>
        <Callout tone="warn" icon="warning">
          {lang === "he" ? (
            <>
              תמיכה בהחלטה בלבד. שלב המחלה הרשמי חייב להיות מאומת מול ספר ה־
              <En>AJCC</En> בידי הרופא האחראי.
            </>
          ) : (
            <>
              Decision support only. The stage of record must be confirmed against the AJCC
              manual by the responsible clinician.
            </>
          )}
        </Callout>

        <div className="mt-4 space-y-3">
          <div>
            <Label>{t("Tumour site", "אתר הגידול")}</Label>
            <Select
              className="mt-1.5"
              value={site}
              onChange={(e) => changeSite(e.target.value as StagingSite)}
            >
              {SUPPORTED_SITES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          <div
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
              meta.edition === "AJCC 9"
                ? "border-[#137fec55] bg-[var(--color-primary-soft)]"
                : "border-[var(--color-line)] bg-white/[0.03]"
            }`}
          >
            <Icon
              name={meta.edition === "AJCC 9" ? "fiber_new" : "menu_book"}
              size={18}
              className={`mt-px shrink-0 ${
                meta.edition === "AJCC 9" ? "text-[var(--color-primary)]" : "text-[var(--color-ink-muted)]"
              }`}
            />
            <div>
              <p className="text-[13px] font-bold text-white">
                <En>{meta.edition}</En>
              </p>
              {/* The edition note quotes the AJCC scope statement, so it stays
                  in the original English in both languages. */}
              <p className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                <En>{meta.note}</En>
              </p>
            </div>
          </div>
        </div>

        {/* Category pickers */}
        <div className="mt-5 space-y-4">
          <CategoryPicker
            label={
              lang === "he" ? (
                <>
                  <En>T</En> — הגידול הראשוני
                </>
              ) : (
                "T — primary tumour"
              )
            }
            options={schema.t}
            value={tCat}
            onChange={setTCat}
          />
          <CategoryPicker
            label={
              lang === "he" ? (
                <>
                  <En>N</En> — קשריות לימפה אזוריות
                  {schema.hasPathological ? " (קליני)" : ""}
                </>
              ) : (
                `N — regional nodes${schema.hasPathological ? " (clinical)" : ""}`
              )
            }
            options={schema.n}
            value={n}
            onChange={setN}
          />
          <CategoryPicker
            label={
              lang === "he" ? (
                <>
                  <En>M</En> — גרורות מרוחקות
                </>
              ) : (
                "M — distant metastasis"
              )
            }
            options={schema.m}
            value={m}
            onChange={setM}
          />

          {/* Said once, where the English definitions are actually read. */}
          {lang === "he" && (
            <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
              הגדרות ה־<En>AJCC</En> מובאות כאן באנגלית המקורית במכוון, כדי שאפשר יהיה
              להשוות אותן מילה במילה מול הספר.
            </p>
          )}
        </div>

        {/* Result */}
        <div className="mt-5">
          <SectionTitle>
            {schema.hasPathological
              ? t("Clinical stage", "שלב קליני")
              : t("Stage", "שלב")}
          </SectionTitle>
          <Card className="p-4">
            {result.stage ? (
              <>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-extrabold text-white">
                    {t("Stage", "שלב")} <Num>{result.stage}</Num>
                  </p>
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-[var(--color-ink-muted)]">
                    <En>{result.edition}</En>
                  </span>
                </div>
                <p className="mt-1 font-mono text-[13px] text-[var(--color-ink-muted)]">
                  <En>
                    {tCat} {n} {m}
                  </En>
                </p>
                {/* Reasoning and caveats quote AJCC categories and stage-grouping
                    rules verbatim. A translated criterion cannot be checked
                    against the manual, so both stay in English. */}
                <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[13px] leading-relaxed text-white">
                  <En>{result.reasoning}</En>
                </p>
                {result.caveats.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {result.caveats.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]"
                      >
                        <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                        <En>{c}</En>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="py-4 text-center text-[13px] text-[var(--color-ink-muted)]">
                {/* The only reachable no-stage message is the prompt to finish
                    the entry, and that is interface text rather than an AJCC
                    rule — so it does get translated. */}
                {lang === "he" && result.supported ? (
                  <>
                    יש לבחור את קטגוריות ה־<En>T</En>, ה־<En>N</En> וה־<En>M</En> כדי
                    לגזור את השלב.
                  </>
                ) : (
                  <En>{result.reasoning}</En>
                )}
              </p>
            )}
          </Card>
        </div>

        {/* Pathological staging — p16+ oropharynx only */}
        {schema.hasPathological && schema.pathologicalN && (
          <div className="mt-5">
            <SectionTitle>
              {t(
                "Pathological stage (after neck dissection)",
                "שלב פתולוגי (לאחר דיסקציה צווארית)",
              )}
            </SectionTitle>
            <CategoryPicker
              label={
                lang === "he" ? (
                  <>
                    <En>pN</En> — קשריות לימפה בבדיקה פתולוגית
                  </>
                ) : (
                  "pN — pathological nodes"
                )
              }
              options={schema.pathologicalN}
              value={pn}
              onChange={setPn}
            />

            {pathResult?.stage ? (
              <Card className="mt-3 p-4">
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-extrabold text-white">
                    {t("Stage", "שלב")} <Num>{pathResult.stage}</Num>
                  </p>
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-[var(--color-ink-muted)]">
                    {t("Pathological", "פתולוגי")}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[13px] text-[var(--color-ink-muted)]">
                  <En>
                    {tCat} {pn}
                  </En>
                </p>
                <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[13px] leading-relaxed text-white">
                  <En>{pathResult.reasoning}</En>
                </p>
                <ul className="mt-3 space-y-1.5">
                  {pathResult.caveats.map((c) => (
                    <li
                      key={c}
                      className="flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]"
                    >
                      <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                      <En>{c}</En>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <p className="mt-2 text-[12px] text-[var(--color-ink-faint)]">
                {lang === "he" ? (
                  <>
                    יש לבחור קטגוריית <En>T</En> וקטגוריית <En>pN</En> כדי לגזור את השלב
                    הפתולוגי.
                  </>
                ) : (
                  <>Select a T category and a pN category to derive the pathological stage.</>
                )}
              </p>
            )}
          </div>
        )}

        <Card className="mt-5 p-3.5">
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            <Icon name="rule" size={15} className="mt-px shrink-0" />
            <span>
              {t(
                "Sites absent from the list above are deliberately not implemented, and are not approximated. A staging tool that quietly produces a plausible but wrong answer is more dangerous than one that declines to answer.",
                "אתרים שאינם ברשימה שלמעלה אינם ממומשים במכוון, ואינם מקורבים. כלי סטייג׳ינג שמפיק בשקט תשובה סבירה אך שגויה מסוכן יותר מכלי שנמנע מלענות.",
              )}
            </span>
          </p>
        </Card>
      </Screen>
    </>
  );
}

function CategoryPicker({
  label,
  options,
  value,
  onChange,
}: {
  /* ReactNode, not string: in Hebrew the category letter is a Latin run that
     has to be isolated inside the label. */
  label: ReactNode;
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 space-y-1.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-start transition-colors ${
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-[var(--color-line-strong)]"
              }`}
            >
              <span
                className={`mt-px inline-flex min-w-11 shrink-0 justify-center rounded px-1.5 py-0.5 font-mono text-[13px] font-bold ${
                  active ? "bg-[var(--color-primary)] text-white" : "bg-white/5 text-white"
                }`}
              >
                <En>{o.label}</En>
              </span>
              {/* The category definitions are AJCC text, quoted as printed. */}
              {o.hint && (
                <span className="flex-1 text-[12px] leading-snug text-[var(--color-ink-muted)]">
                  <En>{o.hint}</En>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
