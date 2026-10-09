import React, { useState } from "react";
import { signIn, signUp, resetPassword, setNewPassword, cloudConfigured } from "../lib/auth.js";
import { Icon } from "./icons.jsx";
import { Banner } from "./common.jsx";

/** Login / sign-up / password reset. `recovery` is set when the user arrived from a reset email. */
export function Auth({ onDone, onSkip, recovery = false, skipLabel = "Continue without an account" }) {
  const [mode, setMode] = useState(recovery ? "recovery" : "signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  if (!cloudConfigured) {
    return (
      <div className="welcome">
        <div className="brand-kanji" lang="ja">同</div>
        <h1>Sync isn't set up yet</h1>
        <p className="dim">This copy of the app has no cloud project connected, so it runs on this device only. Your progress is still saved here. Follow the setup guide (README) to add accounts and sync between devices.</p>
        <button className="btn btn-primary btn-lg btn-block" onClick={onSkip}>Continue on this device</button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setInfo("");
    if (mode !== "forgot" && mode !== "recovery" && !/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Enter a valid email address.");
    if (mode === "forgot" && !/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Enter the email of your account.");
    if ((mode === "signup" || mode === "recovery") && pw.length < 8) return setErr("Use at least 8 characters for the password.");
    if (mode === "signin" && !pw) return setErr("Enter your password.");
    setBusy(true);
    try {
      if (mode === "signin") { await signIn(email, pw); onDone(); }
      else if (mode === "signup") {
        const { needsConfirm } = await signUp(email, pw);
        if (needsConfirm) setInfo("Almost done. We sent a confirmation link to your email. Open it, then come back and sign in.");
        else onDone();
      } else if (mode === "forgot") {
        await resetPassword(email);
        setInfo("If an account exists for this email, a reset link is on its way.");
      } else if (mode === "recovery") {
        await setNewPassword(pw);
        onDone();
      }
    } catch (ex) {
      setErr(ex.message || "Something went wrong. Try again.");
    } finally { setBusy(false); }
  };

  const titles = { signin: "Welcome back", signup: "Create your account", forgot: "Reset your password", recovery: "Choose a new password" };
  const subs = {
    signin: "Sign in to bring your progress to this device.",
    signup: "One account keeps your cards, lessons and stats in sync on every device.",
    forgot: "We'll email you a link to set a new password.",
    recovery: "Pick a new password for your account.",
  };
  const switchTo = (m) => { setMode(m); setErr(""); setInfo(""); };

  return (
    <div className="welcome">
      <div className="brand-kanji" lang="ja">言</div>
      <div className="stack">
        <h1>{titles[mode]}</h1>
        <p className="dim">{subs[mode]}</p>
      </div>
      <form className="stack" onSubmit={submit} noValidate>
        {mode !== "recovery" && (
          <div className="field">
            <label htmlFor="em">Email</label>
            <input id="em" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}
        {mode !== "forgot" && (
          <div className="field">
            <label htmlFor="pw">{mode === "recovery" ? "New password" : "Password"}</label>
            <input id="pw" className="input" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} />
            {mode !== "signin" && <span className="hint">At least 8 characters.</span>}
          </div>
        )}
        {err && <Banner kind="err" icon="warn">{err}</Banner>}
        {info && <Banner kind="ok" icon="mail">{info}</Banner>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy} type="submit">
          {busy ? "One moment…" : { signin: "Sign in", signup: "Create account", forgot: "Send reset link", recovery: "Save password" }[mode]}
        </button>
      </form>
      <div className="stack center">
        {mode === "signin" && (<>
          <button className="btn btn-ghost" onClick={() => switchTo("forgot")}>Forgot password?</button>
          <button className="btn btn-soft btn-block" onClick={() => switchTo("signup")}>I'm new here. Create an account</button>
        </>)}
        {mode === "signup" && <button className="btn btn-soft btn-block" onClick={() => switchTo("signin")}>I already have an account</button>}
        {mode === "forgot" && <button className="btn btn-soft btn-block" onClick={() => switchTo("signin")}>Back to sign in</button>}
        {onSkip && mode !== "recovery" && <button className="btn btn-ghost" onClick={onSkip}><Icon name="offline" /> {skipLabel}</button>}
      </div>
    </div>
  );
}
