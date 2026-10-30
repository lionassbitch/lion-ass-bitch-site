import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router";
import { api, ApiError, formatBytes, formatUtc, type Media, type Statement } from "../lib/api";
import { useT } from "../lib/i18n";
import { useSession } from "../lib/session";
import { uploadResumable } from "../lib/upload";
import { Choices, Field, Notice, Progress, Spinner } from "../components/ui";
import { SignaturePad, type SignaturePadHandle } from "../components/SignaturePad";
import { VideoRecorder } from "../components/VideoRecorder";
import type { ApproximateDate, StatementAnswers, WitnessProfile } from "../../../server/src/types";
import type { Dictionary } from "../../../server/src/i18n/en";

const STEPS = ["consent", "profile", "questions", "video", "documents", "review", "sign"] as const;
type Step = (typeof STEPS)[number];

function stepLabel(t: Dictionary, s: Step): string {
  return { consent: t.consent.title, profile: t.profile.title, questions: t.questions.title, video: t.video.title, documents: t.documents.title, review: t.review.title, sign: t.sign.title }[s];
}

export function describeDate(d: ApproximateDate | undefined, t: Dictionary): string {
  if (!d) return t.questions.notAnswered;
  const label = t.questions.datePrecision[d.precision];
  const core = d.precision === "exact" || d.precision === "approximate" ? d.date : d.precision === "month_year" ? d.month : d.precision === "range" ? `${d.rangeStart} – ${d.rangeEnd}` : "";
  return [label, core].filter(Boolean).join(": ") + (d.note ? ` — ${d.note}` : "");
}

export function StatementWizard() {
  const { t, lang } = useT();
  const { me, config, loading } = useSession();
  const navigate = useNavigate();
  const { step: stepParam } = useParams();
  const [params] = useSearchParams();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [error, setError] = useState<string | null>(null);
  const step: Step = (STEPS as readonly string[]).includes(stepParam ?? "") ? (stepParam as Step) : "consent";

  const reload = useCallback(async (id: string) => {
    const r = await api<{ statement: Statement; media: Media[] }>("GET", `/api/statements/${id}`);
    setStatement(r.statement);
    setMedia(r.media);
    return r.statement;
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!me) {
      navigate(`/sign-in?returnTo=${encodeURIComponent(`/statement/${step}`)}&lang=${lang}`, { replace: true });
      return;
    }
    (async () => {
      try {
        const id = params.get("id");
        if (id) {
          const st = await reload(id);
          if (st.status === "signed") navigate(`/receipt/${st.id}`, { replace: true });
          return;
        }
        const list = await api<{ statements: Statement[] }>("GET", "/api/statements");
        const draft = list.statements.find((s) => s.status === "draft");
        if (draft) {
          navigate(`/statement/${step}?id=${draft.id}`, { replace: true });
          return;
        }
        const created = await api<{ statement: Statement }>("POST", "/api/statements", { language: lang });
        navigate(`/statement/consent?id=${created.statement.id}`, { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.code === "invite_required") setError(t.landing.inviteRequired);
        else setError(err instanceof ApiError ? err.message : t.app.errorGeneric);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, me, params.get("id")]);

  // Keep the statement's interface language in sync (drafts only; content untouched).
  useEffect(() => {
    if (statement && statement.status === "draft" && statement.language !== lang) {
      api<{ statement: Statement }>("PUT", `/api/statements/${statement.id}/language`, { language: lang })
        .then((r) => setStatement(r.statement))
        .catch(() => {});
    }
  }, [lang, statement]);

  const go = (s: Step) => navigate(`/statement/${s}?id=${statement?.id}`);
  const idx = STEPS.indexOf(step) + 1;

  if (error) {
    return (
      <section className="card">
        <Notice kind="error">{error}</Notice>
        <Link className="btn" to="/">
          {t.app.goHome}
        </Link>
      </section>
    );
  }
  if (!statement || !me || !config) return <Spinner />;
  if (!statement.consent && step !== "consent") {
    go("consent");
    return null;
  }

  return (
    <section className="card">
      <div className="eyebrow">
        {t.receipt.evidenceId}: {statement.evidenceId}
        {statement.version > 1 ? ` · ${t.my.version} ${statement.version}` : ""}
      </div>
      <Progress step={idx} total={STEPS.length} label={stepLabel(t, step)} />
      {step === "consent" && <ConsentStep statement={statement} onSaved={(s) => { setStatement(s); go("profile"); }} />}
      {step === "profile" && <ProfileStep statement={statement} accountEmail={me.user.email} onSaved={(s) => { setStatement(s); go("questions"); }} onBack={() => go("consent")} />}
      {step === "questions" && <QuestionsStep statement={statement} onSaved={(s) => { setStatement(s); go("video"); }} onBack={() => go("profile")} />}
      {step === "video" && <VideoStep statement={statement} media={media} reload={() => reload(statement.id)} onNext={() => go("documents")} onBack={() => go("questions")} maxBytes={config.limits.maxVideoBytes} />}
      {step === "documents" && <DocumentsStep statement={statement} media={media} reload={() => reload(statement.id)} onNext={() => go("review")} onBack={() => go("video")} maxBytes={config.limits.maxDocumentBytes} maxDocs={config.limits.maxDocuments} />}
      {step === "review" && <ReviewStep statement={statement} go={go} onBack={() => go("documents")} />}
      {step === "sign" && <SignStep statement={statement} onBack={() => go("review")} />}
    </section>
  );
}

/* ---------------------------------------------------------------- consent */
function ConsentStep({ statement, onSaved }: { statement: Statement; onSaved: (s: Statement) => void }) {
  const { t } = useT();
  const { config } = useSession();
  const [a1, setA1] = useState(Boolean(statement.consent));
  const [a2, setA2] = useState(Boolean(statement.consent));
  const [a3, setA3] = useState(Boolean(statement.consent));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ statement: Statement }>("PUT", `/api/statements/${statement.id}/consent`, { privacyNoticeVersion: config?.privacyNoticeVersion, disclosureAcknowledged: a1, voluntaryAcknowledged: a2, withdrawalAcknowledged: a3 });
      onSaved(r.statement);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.app.errorGeneric);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit}>
      <h1>{t.consent.title}</h1>
      <p className="muted small">
        {t.consent.version}: {config?.privacyNoticeVersion}
      </p>
      <p className="lede">{t.consent.p1}</p>
      <h3>{t.consent.collected}</h3>
      <ul>
        {t.consent.collectedItems.map((c, i) => (
          <li key={i}>{c}{i === 4 && config ? ` (IP: ${config.metadata.ipAddress ? "on" : "off"}; user agent: ${config.metadata.userAgent ? "on" : "off"})` : ""}</li>
        ))}
      </ul>
      <h3>{t.consent.use}</h3>
      <p>{t.consent.useText}</p>
      <h3>{t.consent.retention}</h3>
      <p>{t.consent.retentionText}</p>
      <h3>{t.consent.rights}</h3>
      <p>{t.consent.rightsText}</p>
      <fieldset>
        <legend className="visually-hidden">{t.consent.title}</legend>
        <label className="choice">
          <input type="checkbox" checked={a1} onChange={(e) => setA1(e.target.checked)} required />
          <span>{t.consent.ack1}</span>
        </label>
        <label className="choice">
          <input type="checkbox" checked={a2} onChange={(e) => setA2(e.target.checked)} required />
          <span>{t.consent.ack2}</span>
        </label>
        <label className="choice">
          <input type="checkbox" checked={a3} onChange={(e) => setA3(e.target.checked)} required />
          <span>{t.consent.ack3}</span>
        </label>
      </fieldset>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="actions between">
        <Link className="btn secondary" to="/">
          {t.app.back}
        </Link>
        <button className="btn gold lg" type="submit" disabled={busy || !(a1 && a2 && a3)}>
          {t.consent.agree}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- profile */
type ProfileForm = Omit<WitnessProfile, "accountEmail">;
const emptyProfile: ProfileForm = {
  legalName: "",
  phone: null,
  preferredContact: "email",
  relationshipCategory: "friend",
  relationshipOther: null,
  relationshipDescription: "",
  howAndWhenMet: "",
  hasPersonalInterest: "no",
  personalInterestDescription: null,
  willingToBeContacted: "yes",
};

function useServerErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const capture = (err: unknown, fallback: string) => {
    if (err instanceof ApiError && err.code === "validation" && Array.isArray(err.details)) {
      const map: Record<string, string> = {};
      for (const d of err.details as { path: string; message: string }[]) map[d.path.split(".")[0]] = d.message;
      setErrors(map);
      return err.message;
    }
    setErrors({});
    return err instanceof ApiError ? err.message : fallback;
  };
  return { errors, capture, clear: () => setErrors({}) };
}

function ProfileStep({ statement, accountEmail, onSaved, onBack }: { statement: Statement; accountEmail: string | null; onSaved: (s: Statement) => void; onBack: () => void }) {
  const { t } = useT();
  const [form, setForm] = useState<ProfileForm>(() => ({ ...emptyProfile, ...((statement.profile as unknown as ProfileForm) ?? {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { errors, capture } = useServerErrors();
  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ statement: Statement }>("PUT", `/api/statements/${statement.id}/profile`, form);
      onSaved(r.statement);
    } catch (err) {
      setError(capture(err, t.app.errorGeneric));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit}>
      <h1>{t.profile.title}</h1>
      <p className="lede">{t.profile.intro}</p>
      <Field id="legalName" label={t.profile.legalName} help={t.profile.legalNameHelp} required error={errors.legalName}>
        <input id="legalName" type="text" value={form.legalName} onChange={(e) => set("legalName", e.target.value)} required maxLength={200} autoComplete="name" />
      </Field>
      <Field id="accountEmail" label={t.profile.accountEmail} help={t.profile.accountEmailHelp}>
        <input id="accountEmail" type="email" value={accountEmail ?? t.profile.accountEmailNone} readOnly />
      </Field>
      <Field id="phone" label={t.profile.phone} error={errors.phone}>
        <input id="phone" type="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} maxLength={40} autoComplete="tel" />
      </Field>
      <Choices name="preferredContact" legend={t.profile.preferredContact} value={form.preferredContact} onChange={(v) => set("preferredContact", v)} options={(Object.keys(t.profile.contactOptions) as (keyof typeof t.profile.contactOptions)[]).map((k) => ({ value: k, label: t.profile.contactOptions[k] }))} />
      <Choices name="relationshipCategory" legend={t.profile.relationshipCategory} value={form.relationshipCategory} onChange={(v) => set("relationshipCategory", v)} options={(Object.keys(t.profile.relationshipOptions) as (keyof typeof t.profile.relationshipOptions)[]).map((k) => ({ value: k, label: t.profile.relationshipOptions[k] }))} />
      {form.relationshipCategory === "other" && (
        <Field id="relationshipOther" label={t.profile.relationshipOther} required>
          <input id="relationshipOther" type="text" value={form.relationshipOther ?? ""} onChange={(e) => set("relationshipOther", e.target.value || null)} maxLength={200} />
        </Field>
      )}
      <Field id="relationshipDescription" label={t.profile.relationshipDescription} help={t.profile.relationshipDescriptionHelp} required error={errors.relationshipDescription}>
        <textarea id="relationshipDescription" value={form.relationshipDescription} onChange={(e) => set("relationshipDescription", e.target.value)} required maxLength={2000} />
      </Field>
      <Field id="howAndWhenMet" label={t.profile.howAndWhenMet} required error={errors.howAndWhenMet}>
        <textarea id="howAndWhenMet" value={form.howAndWhenMet} onChange={(e) => set("howAndWhenMet", e.target.value)} required maxLength={2000} />
      </Field>
      <Choices name="hasPersonalInterest" legend={t.profile.personalInterest} help={t.profile.personalInterestHelp} value={form.hasPersonalInterest} onChange={(v) => set("hasPersonalInterest", v)} options={[{ value: "yes", label: t.app.yes }, { value: "no", label: t.app.no }, { value: "unsure", label: t.app.unsure }]} />
      {form.hasPersonalInterest !== "no" && (
        <Field id="personalInterestDescription" label={t.profile.personalInterestDescription}>
          <textarea id="personalInterestDescription" value={form.personalInterestDescription ?? ""} onChange={(e) => set("personalInterestDescription", e.target.value || null)} maxLength={2000} />
        </Field>
      )}
      <Choices name="willingToBeContacted" legend={t.profile.willingContact} value={form.willingToBeContacted} onChange={(v) => set("willingToBeContacted", v)} options={(Object.keys(t.profile.willingOptions) as (keyof typeof t.profile.willingOptions)[]).map((k) => ({ value: k, label: t.profile.willingOptions[k] }))} />
      {error && <Notice kind="error">{error}</Notice>}
      <div className="actions between">
        <button type="button" className="btn secondary" onClick={onBack}>
          {t.app.back}
        </button>
        <button className="btn gold lg" type="submit" disabled={busy}>
          {busy ? t.app.saving : t.app.continue}
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------- questions */
const emptyAnswers: StatementAnswers = {
  q1_howKnow: "",
  q2_personalKnowledge: "yes_personal_observation",
  q3_firstAware: { precision: "unknown" },
  q4_mostRecentObservation: { precision: "unknown" },
  q5_observations: [],
  q5_observationsOther: null,
  q6_circumstances: "",
  q7_frequency: "",
  q8_specificRecollections: "",
  q9_secondhandPortions: "",
  q10_uncertainties: "",
  q11_hasMaterials: "no",
  q11_materialsDescription: null,
};

function DateInput({ id, legend, value, onChange }: { id: string; legend: string; value: ApproximateDate; onChange: (d: ApproximateDate) => void }) {
  const { t } = useT();
  const set = (patch: Partial<ApproximateDate>) => onChange({ ...value, ...patch });
  return (
    <fieldset>
      <legend>{legend}</legend>
      {(Object.keys(t.questions.datePrecision) as ApproximateDate["precision"][]).map((p) => (
        <label key={p} className="choice">
          <input type="radio" name={`${id}-precision`} checked={value.precision === p} onChange={() => onChange({ precision: p, note: value.note })} />
          <span>{t.questions.datePrecision[p]}</span>
        </label>
      ))}
      {(value.precision === "exact" || value.precision === "approximate") && (
        <Field id={`${id}-date`} label={t.questions.dateLabel} required>
          <input id={`${id}-date`} type="date" value={value.date ?? ""} onChange={(e) => set({ date: e.target.value })} required />
        </Field>
      )}
      {value.precision === "month_year" && (
        <Field id={`${id}-month`} label={t.questions.monthLabel} required>
          <input id={`${id}-month`} type="month" value={value.month ?? ""} onChange={(e) => set({ month: e.target.value })} required pattern="\d{4}-\d{2}" placeholder="YYYY-MM" />
        </Field>
      )}
      {value.precision === "range" && (
        <div className="inline-fields">
          <Field id={`${id}-start`} label={t.questions.rangeStart} required>
            <input id={`${id}-start`} type="month" value={value.rangeStart ?? ""} onChange={(e) => set({ rangeStart: e.target.value })} required pattern="\d{4}-\d{2}" placeholder="YYYY-MM" />
          </Field>
          <Field id={`${id}-end`} label={t.questions.rangeEnd} required>
            <input id={`${id}-end`} type="month" value={value.rangeEnd ?? ""} onChange={(e) => set({ rangeEnd: e.target.value })} required pattern="\d{4}-\d{2}" placeholder="YYYY-MM" />
          </Field>
        </div>
      )}
      <Field id={`${id}-note`} label={t.questions.dateNote}>
        <input id={`${id}-note`} type="text" value={value.note ?? ""} onChange={(e) => set({ note: e.target.value || undefined })} maxLength={500} />
      </Field>
    </fieldset>
  );
}

function QuestionsStep({ statement, onSaved, onBack }: { statement: Statement; onSaved: (s: Statement) => void; onBack: () => void }) {
  const { t } = useT();
  const [a, setA] = useState<StatementAnswers>(() => ({ ...emptyAnswers, ...((statement.answers as unknown as StatementAnswers) ?? {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { errors, capture } = useServerErrors();
  const set = <K extends keyof StatementAnswers>(k: K, v: StatementAnswers[K]) => setA((f) => ({ ...f, [k]: v }));
  const toggleObs = (v: StatementAnswers["q5_observations"][number]) =>
    setA((f) => {
      if (v === "none") return { ...f, q5_observations: f.q5_observations.includes("none") ? [] : ["none"] };
      const without = f.q5_observations.filter((x) => x !== "none");
      return { ...f, q5_observations: without.includes(v) ? without.filter((x) => x !== v) : [...without, v] };
    });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ statement: Statement }>("PUT", `/api/statements/${statement.id}/answers`, a);
      onSaved(r.statement);
    } catch (err) {
      setError(capture(err, t.app.errorGeneric));
      window.scrollTo({ top: 0 });
    } finally {
      setBusy(false);
    }
  };
  const q2 = Object.keys(t.questions.q2Options) as (keyof typeof t.questions.q2Options)[];
  const q5 = Object.keys(t.questions.q5Options) as (keyof typeof t.questions.q5Options)[];
  return (
    <form onSubmit={submit}>
      <h1>{t.questions.title}</h1>
      <p className="lede">{t.questions.intro}</p>
      {error && <Notice kind="error">{error}</Notice>}
      <Field id="q1" label={t.questions.q1} required error={errors.q1_howKnow}>
        <textarea id="q1" value={a.q1_howKnow} onChange={(e) => set("q1_howKnow", e.target.value)} required maxLength={5000} />
      </Field>
      <Choices name="q2" legend={t.questions.q2} value={a.q2_personalKnowledge} onChange={(v) => set("q2_personalKnowledge", v)} options={q2.map((k) => ({ value: k, label: t.questions.q2Options[k] }))} />
      <DateInput id="q3" legend={t.questions.q3} value={a.q3_firstAware} onChange={(d) => set("q3_firstAware", d)} />
      {errors.q3_firstAware && <Notice kind="error">{errors.q3_firstAware}</Notice>}
      <DateInput id="q4" legend={t.questions.q4} value={a.q4_mostRecentObservation} onChange={(d) => set("q4_mostRecentObservation", d)} />
      {errors.q4_mostRecentObservation && <Notice kind="error">{errors.q4_mostRecentObservation}</Notice>}
      <fieldset>
        <legend>{t.questions.q5}</legend>
        <div className="help muted small">{t.questions.q5Help}</div>
        {q5.map((k) => (
          <label key={k} className="choice">
            <input type="checkbox" checked={a.q5_observations.includes(k)} onChange={() => toggleObs(k)} />
            <span>{t.questions.q5Options[k]}</span>
          </label>
        ))}
        {errors.q5_observations && <div className="error">{errors.q5_observations}</div>}
      </fieldset>
      {a.q5_observations.includes("other") && (
        <Field id="q5other" label={t.questions.q5Other} required>
          <textarea id="q5other" value={a.q5_observationsOther ?? ""} onChange={(e) => set("q5_observationsOther", e.target.value || null)} maxLength={2000} />
        </Field>
      )}
      <Field id="q6" label={t.questions.q6} required error={errors.q6_circumstances}>
        <textarea id="q6" className="tall" value={a.q6_circumstances} onChange={(e) => set("q6_circumstances", e.target.value)} required maxLength={20000} />
      </Field>
      <Field id="q7" label={t.questions.q7} error={errors.q7_frequency}>
        <textarea id="q7" value={a.q7_frequency} onChange={(e) => set("q7_frequency", e.target.value)} maxLength={5000} />
      </Field>
      <Field id="q8" label={t.questions.q8} error={errors.q8_specificRecollections}>
        <textarea id="q8" className="tall" value={a.q8_specificRecollections} onChange={(e) => set("q8_specificRecollections", e.target.value)} maxLength={20000} />
      </Field>
      <Field id="q9" label={t.questions.q9} error={errors.q9_secondhandPortions}>
        <textarea id="q9" value={a.q9_secondhandPortions} onChange={(e) => set("q9_secondhandPortions", e.target.value)} maxLength={10000} />
      </Field>
      <Field id="q10" label={t.questions.q10} error={errors.q10_uncertainties}>
        <textarea id="q10" value={a.q10_uncertainties} onChange={(e) => set("q10_uncertainties", e.target.value)} maxLength={10000} />
      </Field>
      <Choices name="q11" legend={t.questions.q11} value={a.q11_hasMaterials} onChange={(v) => set("q11_hasMaterials", v)} options={[{ value: "yes", label: t.app.yes }, { value: "no", label: t.app.no }]} />
      {a.q11_hasMaterials === "yes" && (
        <Field id="q11d" label={t.questions.q11Describe} help={t.questions.q11Upload}>
          <textarea id="q11d" value={a.q11_materialsDescription ?? ""} onChange={(e) => set("q11_materialsDescription", e.target.value || null)} maxLength={5000} />
        </Field>
      )}
      <div className="actions between">
        <button type="button" className="btn secondary" onClick={onBack}>
          {t.app.back}
        </button>
        <button className="btn gold lg" type="submit" disabled={busy}>
          {busy ? t.app.saving : t.app.continue}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ video */
function UploadProgress({ sent, total }: { sent: number; total: number }) {
  const { t } = useT();
  const pct = total ? Math.round((sent / total) * 100) : 0;
  return (
    <div aria-live="polite">
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t.video.uploading}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="muted small">
        {t.video.uploading} {pct}% ({formatBytes(sent)} / {formatBytes(total)})
      </p>
    </div>
  );
}

function MediaCard({ m, onRemove, busy }: { m: Media; onRemove?: () => void; busy?: boolean }) {
  const { t } = useT();
  return (
    <div className="notice ok" style={{ color: "inherit" }}>
      <strong>{m.kind === "video" ? t.video.existing : m.originalFilename ?? m.kind}</strong>
      <dl className="kv">
        {m.originalFilename && m.kind === "video" && (
          <>
            <dt>{t.documents.choose}</dt>
            <dd>{m.originalFilename}</dd>
          </>
        )}
        {m.description && (
          <>
            <dt>{t.documents.description}</dt>
            <dd>{m.description}</dd>
          </>
        )}
        <dt>{t.pdf.sourceType}</dt>
        <dd>{m.sourceType === "live_capture" ? t.video.source.live_capture : t.video.source.uploaded_file}</dd>
        <dt>{t.pdf.size}</dt>
        <dd>
          {formatBytes(m.sizeBytes)} · {m.detectedMime}
        </dd>
        <dt>{t.video.receivedAt}</dt>
        <dd>{formatUtc(m.receivedAt)}</dd>
        <dt>{t.video.fingerprint}</dt>
        <dd className="mono">{m.sha256}</dd>
      </dl>
      {onRemove && (
        <div className="actions">
          <button type="button" className="btn danger" onClick={onRemove} disabled={busy}>
            {m.kind === "video" ? t.video.remove : t.documents.remove}
          </button>
        </div>
      )}
    </div>
  );
}

function VideoStep({ statement, media, reload, onNext, onBack, maxBytes }: { statement: Statement; media: Media[]; reload: () => Promise<unknown>; onNext: () => void; onBack: () => void; maxBytes: number }) {
  const { t } = useT();
  const video = media.find((m) => m.kind === "video" && m.status === "complete");
  const [consent, setConsent] = useState(Boolean(video));
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const abort = useRef<AbortController | null>(null);

  const upload = async (blob: Blob, meta: { sourceType: "live_capture" | "uploaded_file"; filename: string | null; mime: string | null }) => {
    if (blob.size > maxBytes) {
      setError(t.video.fileTooLarge);
      return;
    }
    setBusy(true);
    setError(null);
    abort.current = new AbortController();
    try {
      await uploadResumable(statement.id, blob, { kind: "video", sourceType: meta.sourceType, filename: meta.filename, declaredMime: meta.mime, recordingConsent: true }, (sent, total) => setProgress({ sent, total }), abort.current.signal);
      setProgress(null);
      setPendingFile(null);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.video.uploadFailed);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!video) return;
    setBusy(true);
    try {
      await api("DELETE", `/api/statements/${statement.id}/media/${video.id}`);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1>{t.video.title}</h1>
      <p className="lede">{t.video.intro}</p>
      <p>
        <strong>{t.video.recommended}</strong>
      </p>
      <p>{t.video.prompts}</p>
      <ol>
        {t.video.promptList.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ol>
      {video ? (
        <MediaCard m={video} onRemove={remove} busy={busy} />
      ) : (
        <>
          <fieldset>
            <legend>{t.video.consentTitle}</legend>
            <label className="choice">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{t.video.consentText}</span>
            </label>
          </fieldset>
          {error && <Notice kind="error">{error}</Notice>}
          {progress ? (
            <UploadProgress sent={progress.sent} total={progress.total} />
          ) : (
            <div className="grid-2">
              <div className="card subtle">
                <h3>{t.video.record}</h3>
                <VideoRecorder disabled={!consent || busy} onRecorded={(blob, mime) => upload(blob, { sourceType: "live_capture", filename: `recording.${mime.includes("mp4") ? "mp4" : "webm"}`, mime })} />
              </div>
              <div className="card subtle">
                <h3>{t.video.upload}</h3>
                <Field id="video-file" label={t.video.chooseFile}>
                  <input id="video-file" type="file" accept="video/*" disabled={!consent || busy} onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} />
                </Field>
                {pendingFile && (
                  <button type="button" className="btn" disabled={!consent || busy} onClick={() => upload(pendingFile, { sourceType: "uploaded_file", filename: pendingFile.name, mime: pendingFile.type || null })}>
                    {t.video.upload} ({formatBytes(pendingFile.size)})
                  </button>
                )}
              </div>
            </div>
          )}
          {error && pendingFile && !progress && (
            <button type="button" className="btn secondary" onClick={() => upload(pendingFile, { sourceType: "uploaded_file", filename: pendingFile.name, mime: pendingFile.type || null })}>
              {t.video.resume}
            </button>
          )}
        </>
      )}
      <div className="actions between">
        <button type="button" className="btn secondary" onClick={onBack} disabled={busy}>
          {t.app.back}
        </button>
        <button type="button" className={video ? "btn gold lg" : "btn lg"} onClick={onNext} disabled={busy}>
          {video ? t.app.continue : t.video.skip}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- documents */
function DocumentsStep({ statement, media, reload, onNext, onBack, maxBytes, maxDocs }: { statement: Statement; media: Media[]; reload: () => Promise<unknown>; onNext: () => void; onBack: () => void; maxBytes: number; maxDocs: number }) {
  const { t } = useT();
  const docs = media.filter((m) => m.kind === "document" && m.status === "complete");
  const [file, setFile] = useState<File | null>(null);
  const [desc, setDesc] = useState("");
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const add = async () => {
    if (!file) return;
    if (file.size > maxBytes) {
      setError(t.video.fileTooLarge);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadResumable(statement.id, file, { kind: "document", sourceType: "uploaded_file", filename: file.name, declaredMime: file.type || null, description: desc || null }, (sent, total) => setProgress({ sent, total }));
      setProgress(null);
      setFile(null);
      setDesc("");
      if (inputRef.current) inputRef.current.value = "";
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.video.uploadFailed);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    setBusy(true);
    try {
      await api("DELETE", `/api/statements/${statement.id}/media/${id}`);
      await reload();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <h1>{t.documents.title}</h1>
      <p className="lede">{t.documents.intro}</p>
      <p className="muted small">{t.documents.accepted}</p>
      {docs.length === 0 ? <p className="muted">{t.documents.none}</p> : docs.map((d) => <MediaCard key={d.id} m={d} onRemove={() => remove(d.id)} busy={busy} />)}
      {error && <Notice kind="error">{error}</Notice>}
      {docs.length >= maxDocs ? (
        <p className="muted">{t.documents.limit}</p>
      ) : progress ? (
        <UploadProgress sent={progress.sent} total={progress.total} />
      ) : (
        <div className="card subtle">
          <Field id="doc-file" label={t.documents.choose}>
            <input ref={inputRef} id="doc-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.heic,.heif,.webp,.gif,.txt,application/pdf,image/*,text/plain" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field id="doc-desc" label={t.documents.description}>
            <input id="doc-desc" type="text" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} />
          </Field>
          <button type="button" className="btn" disabled={!file || busy} onClick={add}>
            {t.documents.choose}
            {file ? ` (${formatBytes(file.size)})` : ""}
          </button>
        </div>
      )}
      <div className="actions between">
        <button type="button" className="btn secondary" onClick={onBack} disabled={busy}>
          {t.app.back}
        </button>
        <button type="button" className="btn gold lg" onClick={onNext} disabled={busy}>
          {t.app.continue}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- review */
export interface ReviewPayload {
  statement: Statement & { profile: WitnessProfile; answers: StatementAnswers };
  media: Media[];
  authentication: { provider: string; providerIssuer: string; providerSubject: string; emailClaim: string | null; emailVerified: boolean; providerDisplayName: string | null; authenticatedAt: string };
  affirmation: { text: string; spanishCourtesy: string; dateParts: { day: string; month: string; year: string }; sourceUrl: string; esignConsent: string; accuracyDeclaration: string };
  reviewDigest: string;
  complete: boolean;
  problems: string[];
}

export function StatementReview({ r, t, go }: { r: ReviewPayload; t: Dictionary; go?: (s: Step) => void }) {
  const p = r.statement.profile;
  const a = r.statement.answers;
  const QA = ({ q, a }: { q: string; a: string }) => (
    <div className="qa">
      <div className="q">{q}</div>
      <div className="a">{a || t.questions.notAnswered}</div>
    </div>
  );
  const Edit = ({ s }: { s: Step }) => (go ? <button type="button" className="btn link" onClick={() => go(s)}>{t.review.edit}</button> : null);
  return (
    <>
      <div className="review-section">
        <h3>
          {t.review.witness} <Edit s="profile" />
        </h3>
        <dl className="kv">
          <dt>{t.profile.legalName}</dt>
          <dd>{p.legalName}</dd>
          <dt>{t.profile.accountEmail}</dt>
          <dd>{p.accountEmail ?? t.profile.accountEmailNone}</dd>
          <dt>{t.profile.phone}</dt>
          <dd>{p.phone ?? "—"}</dd>
          <dt>{t.profile.preferredContact}</dt>
          <dd>{t.profile.contactOptions[p.preferredContact]}</dd>
          <dt>{t.profile.relationshipCategory}</dt>
          <dd>{p.relationshipCategory === "other" && p.relationshipOther ? `${t.profile.relationshipOptions.other}: ${p.relationshipOther}` : t.profile.relationshipOptions[p.relationshipCategory]}</dd>
          <dt>{t.profile.relationshipDescription}</dt>
          <dd>{p.relationshipDescription}</dd>
          <dt>{t.profile.howAndWhenMet}</dt>
          <dd>{p.howAndWhenMet}</dd>
          <dt>{t.profile.personalInterest}</dt>
          <dd>
            {p.hasPersonalInterest === "yes" ? t.app.yes : p.hasPersonalInterest === "no" ? t.app.no : t.app.unsure}
            {p.personalInterestDescription ? ` — ${p.personalInterestDescription}` : ""}
          </dd>
          <dt>{t.profile.willingContact}</dt>
          <dd>{t.profile.willingOptions[p.willingToBeContacted]}</dd>
        </dl>
      </div>
      <div className="review-section">
        <h3>
          {t.review.statement} <Edit s="questions" />
        </h3>
        <QA q={t.questions.q1} a={a.q1_howKnow} />
        <QA q={t.questions.q2} a={t.questions.q2Options[a.q2_personalKnowledge]} />
        <QA q={t.questions.q3} a={describeDate(a.q3_firstAware, t)} />
        <QA q={t.questions.q4} a={describeDate(a.q4_mostRecentObservation, t)} />
        <QA q={t.questions.q5} a={a.q5_observations.length ? a.q5_observations.map((o) => `• ${t.questions.q5Options[o]}${o === "other" && a.q5_observationsOther ? `: ${a.q5_observationsOther}` : ""}`).join("\n") : t.questions.noneSelected} />
        <QA q={t.questions.q6} a={a.q6_circumstances} />
        <QA q={t.questions.q7} a={a.q7_frequency} />
        <QA q={t.questions.q8} a={a.q8_specificRecollections} />
        <QA q={t.questions.q9} a={a.q9_secondhandPortions} />
        <QA q={t.questions.q10} a={a.q10_uncertainties} />
        <QA q={t.questions.q11} a={`${a.q11_hasMaterials === "yes" ? t.app.yes : t.app.no}${a.q11_materialsDescription ? ` — ${a.q11_materialsDescription}` : ""}`} />
      </div>
      <div className="review-section">
        <h3>
          {t.review.videoSection} <Edit s="video" />
        </h3>
        {r.media.filter((m) => m.kind === "video").length ? r.media.filter((m) => m.kind === "video").map((m) => <MediaCard key={m.id} m={m} />) : <p className="muted">{t.review.noVideo}</p>}
      </div>
      <div className="review-section">
        <h3>
          {t.review.documentsSection} <Edit s="documents" />
        </h3>
        {r.media.filter((m) => m.kind === "document").length ? r.media.filter((m) => m.kind === "document").map((m) => <MediaCard key={m.id} m={m} />) : <p className="muted">{t.review.noDocuments}</p>}
      </div>
      <div className="review-section">
        <h3>{t.review.account}</h3>
        <dl className="kv">
          <dt>{t.pdf.authProvider}</dt>
          <dd>{r.authentication.provider === "google" ? "Google" : "Microsoft"}</dd>
          <dt>{t.pdf.authEmail}</dt>
          <dd>
            {r.authentication.emailClaim ?? "—"} ({t.pdf.authEmailVerified}: {r.authentication.emailVerified ? t.app.yes : t.app.no})
          </dd>
          <dt>{t.pdf.providerDisplayName}</dt>
          <dd>{r.authentication.providerDisplayName ?? "—"}</dd>
          <dt>{t.pdf.authAt}</dt>
          <dd>{formatUtc(r.authentication.authenticatedAt)}</dd>
        </dl>
        <p className="muted small">{t.pdf.authCaveat}</p>
      </div>
    </>
  );
}

function ReviewStep({ statement, go, onBack }: { statement: Statement; go: (s: Step) => void; onBack: () => void }) {
  const { t } = useT();
  const [r, setR] = useState<ReviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<ReviewPayload>("GET", `/api/statements/${statement.id}/review`)
      .then(setR)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.app.errorGeneric));
  }, [statement.id, t]);
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!r) return <Spinner />;
  return (
    <div>
      <h1>{t.review.title}</h1>
      <p className="lede">{t.review.intro}</p>
      {!r.complete && (
        <Notice kind="error">
          {t.app.errorGeneric} ({r.problems.join(", ")})
        </Notice>
      )}
      <StatementReview r={r} t={t} go={go} />
      <div className="actions between">
        <button type="button" className="btn secondary" onClick={onBack}>
          {t.app.back}
        </button>
        <button type="button" className="btn gold lg" onClick={() => go("sign")} disabled={!r.complete}>
          {t.review.proceed}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- sign */
function SignStep({ statement, onBack }: { statement: Statement; onBack: () => void }) {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [r, setR] = useState<ReviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState(false);
  const [esign, setEsign] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [method, setMethod] = useState<"drawn" | "typed">("drawn");
  const [typed, setTyped] = useState("");
  const [adopt, setAdopt] = useState(false);
  const [busy, setBusy] = useState(false);
  const pad = useRef<SignaturePadHandle>(null);
  useEffect(() => {
    api<ReviewPayload>("GET", `/api/statements/${statement.id}/review`)
      .then((rv) => {
        setR(rv);
        setLegalName(rv.statement.profile.legalName);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t.app.errorGeneric));
  }, [statement.id, t]);
  const canSubmit = useMemo(() => accuracy && esign && legalName.trim().length > 0 && (method === "typed" ? adopt && typed.trim().toLowerCase() === legalName.trim().toLowerCase() : true), [accuracy, esign, legalName, method, adopt, typed]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!r) return;
    setError(null);
    const imageDataUrl = method === "drawn" ? pad.current?.toDataUrl() ?? null : null;
    if (method === "drawn" && !imageDataUrl) {
      setError(t.sign.missingSignature);
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ statementId: string }>("POST", `/api/statements/${statement.id}/sign`, {
        legalName: legalName.trim(),
        method,
        typedValue: method === "typed" ? typed.trim() : undefined,
        imageDataUrl: imageDataUrl ?? undefined,
        declaredAccurate: accuracy,
        consentedToEsign: esign,
        reviewDigest: r.reviewDigest,
        affirmationTextSeen: r.affirmation.text,
      });
      navigate(`/receipt/${res.statementId}?lang=${lang}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && (err.code === "review_mismatch" || err.code === "affirmation_mismatch")) setError(t.sign.mismatch);
      else setError(err instanceof ApiError ? err.message : t.app.errorGeneric);
    } finally {
      setBusy(false);
    }
  };
  if (error && !r) return <Notice kind="error">{error}</Notice>;
  if (!r) return <Spinner />;
  return (
    <form onSubmit={submit}>
      <h1>{t.sign.title}</h1>
      <p className="lede">{t.sign.statuteIntro}</p>
      <div className="statute" lang="en">
        {r.affirmation.text}
      </div>
      <p className="muted small">
        <a href={r.affirmation.sourceUrl} target="_blank" rel="noreferrer noopener">
          {t.sign.statuteSource}
        </a>
      </p>
      {lang === "es" && (
        <>
          <p className="muted small">{t.sign.spanishCourtesy}</p>
          <p className="muted" lang="es">
            {r.affirmation.spanishCourtesy}
          </p>
        </>
      )}
      <Notice kind="info">{t.sign.warning}</Notice>
      <fieldset>
        <legend>{t.sign.accuracy}</legend>
        <label className="choice">
          <input type="checkbox" checked={accuracy} onChange={(e) => setAccuracy(e.target.checked)} />
          <span>{r.affirmation.accuracyDeclaration}</span>
        </label>
      </fieldset>
      <fieldset>
        <legend>{t.sign.esign}</legend>
        <label className="choice">
          <input type="checkbox" checked={esign} onChange={(e) => setEsign(e.target.checked)} />
          <span>{r.affirmation.esignConsent}</span>
        </label>
      </fieldset>
      <Field id="sig-name" label={t.sign.legalName} required>
        <input id="sig-name" type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} required maxLength={200} autoComplete="name" />
      </Field>
      <Choices name="method" legend={t.sign.method} value={method} onChange={setMethod} options={[{ value: "drawn", label: t.sign.draw }, { value: "typed", label: t.sign.type }]} />
      {method === "drawn" ? (
        <SignaturePad ref={pad} label={t.sign.draw} />
      ) : (
        <>
          <Field id="sig-typed" label={t.sign.type} required>
            <input id="sig-typed" type="text" value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={200} />
          </Field>
          <div className="typed-sig" aria-label={t.sign.typedPreview}>
            {typed}
          </div>
          <label className="choice" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={adopt} onChange={(e) => setAdopt(e.target.checked)} />
            <span>{t.sign.typedAdopt}</span>
          </label>
        </>
      )}
      <p className="muted small">{t.sign.notarizationNote}</p>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="actions between">
        <button type="button" className="btn secondary" onClick={onBack} disabled={busy}>
          {t.app.back}
        </button>
        <button className="btn gold lg" type="submit" disabled={!canSubmit || busy}>
          {busy ? t.sign.submitting : t.sign.submit}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- receipt */
export function Receipt() {
  const { id } = useParams();
  const { t } = useT();
  const { me, loading } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<{ statement: Statement; signature: { legalName: string; method: string; signedAt: string; affirmationText: string } | null; media: Media[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (loading) return;
    if (!me) {
      navigate(`/sign-in?returnTo=${encodeURIComponent(`/receipt/${id}`)}`, { replace: true });
      return;
    }
    api<typeof data>("GET", `/api/statements/${id}/receipt`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.app.errorGeneric));
  }, [id, loading, me, navigate, t]);
  const download = async () => {
    const r = await api<{ url: string }>("GET", `/api/statements/${id}/pdf`);
    window.location.href = r.url;
  };
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!data) return <Spinner />;
  return (
    <section className="card">
      <div className="eyebrow">{t.app.name}</div>
      <h1>{t.receipt.title}</h1>
      <p className="lede">{t.receipt.thanks}</p>
      <dl className="kv">
        <dt>{t.receipt.evidenceId}</dt>
        <dd>
          <strong>{data.statement.evidenceId}</strong> ({t.my.version} {data.statement.version})
        </dd>
        <dt>{t.pdf.signedBy}</dt>
        <dd>{data.signature?.legalName}</dd>
        <dt>{t.receipt.signedAt}</dt>
        <dd>{formatUtc(data.signature?.signedAt)}</dd>
        <dt>{t.receipt.digest}</dt>
        <dd className="mono">{data.statement.frozenRecordSha256}</dd>
        <dt>{t.receipt.pdfDigest}</dt>
        <dd className="mono">{data.statement.pdfSha256}</dd>
      </dl>
      <div className="actions">
        <button type="button" className="btn gold lg" onClick={download}>
          {t.receipt.download}
        </button>
        <Link className="btn secondary" to="/my">
          {t.receipt.myRecords}
        </Link>
      </div>
      <h3>{t.receipt.next}</h3>
      <p>{t.receipt.nextText}</p>
      <p className="muted small">{t.app.footer}</p>
    </section>
  );
}
