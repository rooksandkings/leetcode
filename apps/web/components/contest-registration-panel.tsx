"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserPlus, X } from "lucide-react";

type RegistrationState = "loading" | "registered" | "unregistered" | "saving" | "error";

export function ContestRegistrationPanel({ contestSlug }: { contestSlug: string }) {
  const router = useRouter();
  const [state, setState] = useState<RegistrationState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      const response = await fetch(`/api/contests/${contestSlug}/registration`);
      if (!alive) {
        return;
      }
      if (!response.ok) {
        setState("error");
        setMessage("Registration status unavailable");
        return;
      }
      const payload = (await response.json()) as { registered: boolean };
      setState(payload.registered ? "registered" : "unregistered");
    }

    load();
    return () => {
      alive = false;
    };
  }, [contestSlug]);

  async function updateRegistration(nextRegistered: boolean) {
    setState("saving");
    setMessage("");

    const response = await fetch(`/api/contests/${contestSlug}/registration`, {
      method: nextRegistered ? "POST" : "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setState("error");
      setMessage(payload.error ?? "Registration update failed");
      return;
    }

    setState(nextRegistered ? "registered" : "unregistered");
    setMessage(nextRegistered ? "Registered" : "Registration removed");
    router.refresh();
  }

  return (
    <div className="registration-actions">
      {state === "registered" ? (
        <>
          <span className="status accepted">
            <UserCheck size={14} />
            Registered
          </span>
          <button className="secondary-button" type="button" onClick={() => updateRegistration(false)}>
            <X size={16} />
            Leave
          </button>
        </>
      ) : (
        <button className="primary-button" disabled={state === "loading" || state === "saving"} type="button" onClick={() => updateRegistration(true)}>
          <UserPlus size={16} />
          {state === "saving" ? "Saving" : "Register"}
        </button>
      )}
      {message ? <span className="subtle">{message}</span> : null}
    </div>
  );
}

