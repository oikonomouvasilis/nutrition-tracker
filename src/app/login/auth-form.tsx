"use client";

import { useState } from "react";
import { login, signup } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "mt-1 w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-neon-green/60";

/** Απλό σκορ ισχύος κωδικού 0..4. */
function scorePassword(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

const STRENGTH = [
  { label: "", color: "var(--color-surface-2)" },
  { label: "Αδύναμος", color: "#ff5c8a" },
  { label: "Μέτριος", color: "#ffc34d" },
  { label: "Καλός", color: "#29d6f5" },
  { label: "Ισχυρός", color: "#2dff95" },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 16.3 2 9.7 6.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 46c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 36.3 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 41.6 16.2 46 24 46z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.8 35.9 46 30.6 46 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export default function AuthForm({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  const [password, setPassword] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  const score = scorePassword(password);

  async function google() {
    setGoogleBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setGoogleBusy(false); // αλλιώς γίνεται redirect στο Google
  }

  return (
    <form className="mt-6 space-y-4">
      {error && (
        <p className="rounded-lg border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-sm text-neon-pink">
          {error}
        </p>
      )}
      {message === "check-email" && (
        <p className="rounded-lg border border-neon-amber/30 bg-neon-amber/10 px-3 py-2 text-sm text-neon-amber">
          Έλεγξε το email σου για να επιβεβαιώσεις τον λογαριασμό.
        </p>
      )}

      {/* Google */}
      <button
        type="button"
        onClick={google}
        disabled={googleBusy}
        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-edge bg-surface-2 px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/5 disabled:opacity-50"
      >
        <GoogleIcon />
        {googleBusy ? "Ανακατεύθυνση…" : "Συνέχεια με Google"}
      </button>

      {/* Διαχωριστικό */}
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-edge" />
        ή με email
        <span className="h-px flex-1 bg-edge" />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@email.com"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-muted">
          Κωδικός
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={inputCls}
        />

        {/* Μπάρα ισχύος κωδικού */}
        {password.length > 0 && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    background: i < score ? STRENGTH[score].color : "var(--color-surface-2)",
                    boxShadow: i < score ? `0 0 8px ${STRENGTH[score].color}` : undefined,
                  }}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px]" style={{ color: STRENGTH[score].color }}>
              Ισχύς κωδικού: {STRENGTH[score].label || "—"}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          formAction={login}
          className="flex-1 rounded-lg bg-neon-green px-4 py-2 text-sm font-semibold text-[#06281a] transition hover:brightness-110"
        >
          Σύνδεση
        </button>
        <button
          formAction={signup}
          className="flex-1 rounded-lg border border-edge px-4 py-2 text-sm font-medium text-foreground transition hover:border-neon-green/50"
        >
          Εγγραφή
        </button>
      </div>
    </form>
  );
}
