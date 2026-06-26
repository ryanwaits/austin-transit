"use client";

import { type FormEvent, useId, useState } from "react";
import { subscribe } from "@/lib/api-client";

type State = "idle" | "submitting" | "done" | "error";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const id = useId();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setMessage("");
    const res = await subscribe(email).catch(() => ({ ok: false, error: "network" }));
    if (res.ok) {
      setState("done");
    } else {
      setState("error");
      setMessage(
        res.error === "invalid_email"
          ? "That email address doesn't look right."
          : "Something went wrong. Please try again.",
      );
    }
  }

  if (state === "done") {
    return (
      <p className="ui" style={{ fontSize: "var(--text-body)", color: "var(--otp-ontime)" }}>
        You&apos;re on the list. We&apos;ll send the next one when it&apos;s ready.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor={id} className="ui" style={{ display: "block", marginBottom: "8px" }}>
        Get the next essay in your inbox
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "stretch" }}>
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={state === "error"}
          style={{
            flex: "1 1 240px",
            minHeight: "44px",
            padding: "0 14px",
            fontFamily: "var(--font-sans)",
            fontSize: "16px" /* prevents iOS zoom-on-focus */,
            color: "var(--color-fg)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "4px",
          }}
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          className="ui"
          style={{
            minHeight: "44px",
            padding: "0 22px",
            fontSize: "var(--text-small)",
            fontWeight: 600,
            color: "var(--color-bg)",
            background: "var(--color-fg)",
            border: "1px solid var(--color-fg)",
            borderRadius: "4px",
            cursor: state === "submitting" ? "default" : "pointer",
            opacity: state === "submitting" ? 0.7 : 1,
            transition: "opacity .15s ease",
          }}
        >
          {state === "submitting" ? "Adding…" : "Notify me"}
        </button>
      </div>
      {/* reserve space so an error message never shifts layout */}
      <p
        role={state === "error" ? "alert" : undefined}
        className="caption"
        style={{ minHeight: "1.3em", marginTop: "8px", color: "var(--otp-late)" }}
      >
        {message}
      </p>
    </form>
  );
}
