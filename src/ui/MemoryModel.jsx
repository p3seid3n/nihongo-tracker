// Settings → Memory model: fit the scheduler's weights to your own reviews.
import React, { useMemo, useRef, useState } from "react";
import { useApp, plural } from "./common.jsx";
import { buildHistories, scoredCount, MIN_REVIEWS, GOOD_REVIEWS } from "../lib/optimize.js";
import { runOptimize } from "../lib/optimizeRun.js";
import { validWeights, DEFAULT_W } from "../lib/fsrs.js";
import * as hap from "../lib/haptics.js";

const pct = (x) => `${Math.round(x * 100)}%`;
const dateText = (t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function MemoryModel({ Section, Row }) {
  const { store, toast, confirm } = useApp();
  const s = store.settings;
  const rows = useMemo(() => store.logRows(), [store.version]);
  const usable = useMemo(() => scoredCount(buildHistories(rows)), [rows]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const job = useRef(null);
  const custom = validWeights(s.fsrsW);

  const start = async () => {
    hap.tap();
    setResult(null); setBusy(true); setProgress(0);
    const j = runOptimize(rows, store.weights(), (p) => setProgress(p));
    job.current = j;
    try {
      const res = await j.promise;
      if (res && res.cancelled) return;
      setResult(res);
      if (res && res.ok) store.updateSettings({ fsrsFit: { at: Date.now(), n: res.scored, better: !!res.better, gain: res.gain } });
    } catch (e) {
      toast("The fit failed. Nothing was changed.");
    } finally {
      setBusy(false); job.current = null;
    }
  };
  const cancel = () => { if (job.current) job.current.cancel(); setBusy(false); };
  const use = () => {
    if (!result || !result.better || !validWeights(result.w)) return;
    store.updateSettings({ fsrsW: result.w.map((x) => +x.toFixed(4)), fsrsFit: { at: Date.now(), n: result.scored, better: true, gain: result.gain, used: true } });
    setResult(null); hap.success && hap.success();
    toast("Using your own weights from now on.");
  };
  const reset = async () => {
    if (!(await confirm({ title: "Back to the default weights?", body: "Cards already scheduled keep their dates. New answers use the standard weights again.", confirm: "Use defaults" }))) return;
    store.updateSettings({ fsrsW: null, fsrsFit: null });
    setResult(null);
    toast("Back to the default weights.");
  };

  return (
    <Section title="Memory model" hint="The scheduler guesses how fast you forget. After enough reviews it can learn your own forgetting curve instead of the average one. It runs on this device, is checked on cards it was not trained on, and is only offered when it predicts those better. Cards you imported as already known have no history, so only cards you started in the app count.">
      <Row title={custom ? "Using your own weights" : "Using the standard weights"} sub={custom && s.fsrsFit ? `Fitted ${dateText(s.fsrsFit.at)} from ${plural(s.fsrsFit.n, "review")}` : `${plural(usable, "review")} usable so far (${MIN_REVIEWS} needed, ${GOOD_REVIEWS}+ is better)`}>
        {custom && <button className="btn btn-soft" onClick={reset}>Use defaults</button>}
      </Row>
      <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
        {usable < MIN_REVIEWS && <div className="small dim">Keep reviewing. {plural(MIN_REVIEWS - usable, "more review")} until a fit is possible.</div>}
        {usable >= MIN_REVIEWS && !busy && <button className="btn btn-tonal btn-block" onClick={start}>Fit to my reviews</button>}
        {busy && (
          <>
            <div className="cov-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Fitting"><i style={{ width: `${progress * 100}%`, background: "var(--primary)" }} /></div>
            <button className="btn btn-soft btn-block" onClick={cancel}>Cancel</button>
          </>
        )}
        {result && !result.ok && <div className="small dim">Not enough usable reviews yet ({result.scored} of {result.need}).</div>}
        {result && result.ok && (
          <div className="stack" style={{ gap: 8 }} aria-live="polite">
            <div className="small">On {plural(result.nTest, "review")} the fit never saw, the standard weights expected you to remember <b>{pct(result.before.predicted)}</b>; you actually remembered <b>{pct(result.before.actual)}</b>.{result.better ? <> Your weights expect <b>{pct(result.after.predicted)}</b>.</> : null}</div>
            {result.better
              ? <div className="small dim">Better on those cards (log loss {result.before.loss.toFixed(3)} → {result.after.loss.toFixed(3)}).</div>
              : <div className="small dim">No clear improvement over the standard weights, so nothing changes. Try again after more reviews.</div>}
            {result.better && <button className="btn btn-primary btn-block" onClick={use}>Use my weights</button>}
          </div>
        )}
      </div>
    </Section>
  );
}
