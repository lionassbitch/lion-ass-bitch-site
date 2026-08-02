"use client";

import { useState, type FormEvent } from "react";
import { site } from "../lib/site";

type Errors = { name?: string; email?: string; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactForm() {
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const supportEmail = site.support.email;

  function validate(next = values): Errors {
    const found: Errors = {};
    if (!next.name.trim()) found.name = "Tell us who's transmitting.";
    if (!next.email.trim()) found.email = "We need a way to answer.";
    else if (!EMAIL_RE.test(next.email.trim())) found.email = "That email doesn't look right.";
    if (next.message.trim().length < 10)
      found.message = "Give us at least a sentence to weigh.";
    return found;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const subject = `LAB transmission from ${values.name.trim()}`;
    const body = `${values.message.trim()}\n\n— ${values.name.trim()} (${values.email.trim()})`;

    if (supportEmail) {
      window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`;
    } else {
      window.open(site.social.instagram, "_blank", "noopener,noreferrer");
    }
    setSent(true);
  }

  function update(field: keyof typeof values, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (errors[field]) setErrors(validate(next));
  }

  return (
    <form className="contactForm" onSubmit={onSubmit} noValidate>
      <div className="contactField">
        <label htmlFor="cf-name">Name</label>
        <input
          id="cf-name"
          name="name"
          type="text"
          autoComplete="name"
          value={values.name}
          aria-invalid={errors.name ? "true" : undefined}
          aria-describedby={errors.name ? "cf-name-err" : undefined}
          onChange={(event) => update("name", event.target.value)}
        />
        {errors.name ? (
          <p className="contactError" id="cf-name-err">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="contactField">
        <label htmlFor="cf-email">Email</label>
        <input
          id="cf-email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          aria-invalid={errors.email ? "true" : undefined}
          aria-describedby={errors.email ? "cf-email-err" : undefined}
          onChange={(event) => update("email", event.target.value)}
        />
        {errors.email ? (
          <p className="contactError" id="cf-email-err">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="contactField">
        <label htmlFor="cf-message">Message</label>
        <textarea
          id="cf-message"
          name="message"
          rows={5}
          value={values.message}
          aria-invalid={errors.message ? "true" : undefined}
          aria-describedby={errors.message ? "cf-message-err" : undefined}
          onChange={(event) => update("message", event.target.value)}
        />
        {errors.message ? (
          <p className="contactError" id="cf-message-err">
            {errors.message}
          </p>
        ) : null}
      </div>

      <button className="btn btn--solid" type="submit">
        {supportEmail ? "Send transmission" : "Open Instagram to send"}
      </button>

      <p className="contactStatus" role="status" aria-live="polite">
        {sent
          ? supportEmail
            ? "Your mail client should be opening — we read every transmission."
            : "Instagram is opening in a new tab — send your message there."
          : ""}
      </p>
    </form>
  );
}
