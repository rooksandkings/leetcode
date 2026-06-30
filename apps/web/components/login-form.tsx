"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

type LoginState = "idle" | "sending" | "sent" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");

    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      setState("error");
      setMessage("Login request failed");
      return;
    }

    setState("sent");
    setMessage("Check your email for the sign-in link");
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          name="email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <div className="actions">
        <button className="primary-button" disabled={state === "sending"} type="submit">
          <Mail size={16} />
          {state === "sending" ? "Sending" : "Send Link"}
        </button>
        {message ? <span className="subtle">{message}</span> : null}
      </div>
    </form>
  );
}

