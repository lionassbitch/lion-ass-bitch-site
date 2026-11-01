import type { ReactNode } from "react";
import { useT } from "../lib/i18n";

export function Progress({ step, total, label }: { step: number; total: number; label: string }) {
  const { t } = useT();
  return (
    <div className="progress" role="group" aria-label={`${t.app.step} ${step} ${t.app.of} ${total}`}>
      <ol aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <li key={i} className={i + 1 < step ? "done" : i + 1 === step ? "current" : ""} />
        ))}
      </ol>
      <div className="label">
        {t.app.step} {step} {t.app.of} {total} — {label}
      </div>
    </div>
  );
}

export function Notice({ kind = "info", children, role }: { kind?: "info" | "error" | "ok" | "plain"; children: ReactNode; role?: string }) {
  return (
    <div className={`notice ${kind === "plain" ? "" : kind}`} role={role ?? (kind === "error" ? "alert" : undefined)}>
      {children}
    </div>
  );
}

export function Field({ id, label, help, error, required, children }: { id: string; label: string; help?: string; error?: string; required?: boolean; children: ReactNode }) {
  const { t } = useT();
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {required ? <span className="muted small">({t.app.required})</span> : <span className="muted small">({t.app.optional})</span>}
      </label>
      {help && (
        <div className="help" id={`${id}-help`}>
          {help}
        </div>
      )}
      {children}
      {error && (
        <div className="error" id={`${id}-error`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export function Choices<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  multiple,
  help,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  multiple?: boolean;
  help?: string;
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <fieldset>
      <legend>{legend}</legend>
      {help && <div className="help muted small">{help}</div>}
      {options.map((o) => (
        <label key={o.value} className="choice">
          <input type={multiple ? "checkbox" : "radio"} name={name} value={o.value} checked={selected(o.value)} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useT();
  return (
    <span role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" /> {label ?? t.app.loading}
    </span>
  );
}
