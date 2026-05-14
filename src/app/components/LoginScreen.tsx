"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { synthEmail } from "../../lib/auth";

type LoginScreenProps = {
  onAuthenticated: () => void;
};

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = username.trim();
    if (!trimmed || !password) {
      toast.error("Enter your name and password.");
      return;
    }

    let email: string;
    try {
      email = synthEmail(trimmed);
    } catch (error) {
      toast.error("Invalid username", {
        description:
          error instanceof Error ? error.message : "Could not sign in.",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Could not sign in", { description: error.message });
      return;
    }

    onAuthenticated();
  }

  return (
    <section className="login-screen">
      <div className="login-card">
        <header className="login-heading">
          <p className="eyebrow">Internal Support Platform</p>
          <h1>Sign in</h1>
          <p className="login-copy">
            Enter the name and password your manager gave you.
          </p>
        </header>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Your name"
              required
              type="text"
              value={username}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              required
              type="password"
              value={password}
            />
          </label>
          <button
            className="submit-button"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}
