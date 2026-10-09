import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("App crashed", error, info); }
  async resetCache() {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* ignore */ }
    location.reload();
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 24px", font: "16px/1.5 system-ui, sans-serif", color: "#ede7e2" }}>
        <h1 style={{ fontSize: "1.4rem" }}>Something went wrong</h1>
        <p>Your study data is safe: it is stored on this device (and in your account if you are signed in).</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#242120", padding: 12, borderRadius: 12, fontSize: 13 }}>{String(this.state.error?.message || this.state.error)}</pre>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn" style={btn} onClick={() => location.reload()}>Reload</button>
          <button className="btn" style={{ ...btn, background: "#3a3532", color: "#ede7e2" }} onClick={() => this.resetCache()}>Reload with fresh copy</button>
        </div>
      </div>
    );
  }
}
const btn = { font: "inherit", fontWeight: 600, padding: "12px 20px", borderRadius: 999, border: 0, background: "#ee8559", color: "#2a1206", cursor: "pointer" };
