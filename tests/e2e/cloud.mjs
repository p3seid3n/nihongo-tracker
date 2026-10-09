import { launch, shot } from "./lib.mjs";
import { startMock } from "./mock-supabase.mjs";

const URL_ = process.env.CLOUD_BASE || "http://127.0.0.1:4174";
const mock = await startMock(54321);
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1; } else log("ok:", m); };

const A = await launch();
const pa = A.page;
await pa.goto(URL_, { waitUntil: "networkidle" });
await pa.click("text=Get started");
await pa.click("text=Intermediate");
await pa.click("text=Continue"); await pa.click("text=Continue"); await pa.click("text=Continue");
await pa.click("text=Start learning");
await pa.waitForSelector(".plan-hero");
await pa.click("nav >> text=Settings");
await pa.click("text=Sign in or create account");
await pa.waitForSelector("text=Welcome back");
await shot(pa, "40-auth-signin");

// wrong credentials first
await pa.fill("#em", "mael@example.com");
await pa.fill("#pw", "wrongpass");
await pa.click("button[type=submit]");
await pa.waitForSelector("text=/don't match/");
await shot(pa, "41-auth-error");

await pa.click("text=I'm new here");
await pa.fill("#em", "mael@example.com");
await pa.fill("#pw", "correct horse battery");
await shot(pa, "42-auth-signup");
await pa.click("button[type=submit]");
await pa.waitForSelector("text=Combine with your account?");
await shot(pa, "43-owner-prompt");
await pa.click("text=Combine both");
await pa.waitForSelector("text=Up to date", { timeout: 15000 });
await shot(pa, "44-settings-synced");
ok(mock.rows.size >= 4, `A uploaded ${mock.rows.size} slices`);
log("keys:", [...mock.rows.values()].map((r) => r.key).join(", "));

// device B: fresh browser profile
const B = await launch();
const pb = B.page;
await pb.goto(URL_, { waitUntil: "networkidle" });
await pb.click("text=I already have an account");
await pb.waitForSelector("text=Welcome back");
await pb.fill("#em", "mael@example.com");
await pb.fill("#pw", "correct horse battery");
await pb.click("button[type=submit]");
await pb.waitForSelector(".plan-hero", { timeout: 15000 });
ok((await pb.evaluate(() => window.__ntStore.settings.onboarded)) === true, "B received onboarded settings from the cloud");
const decksB = await pb.evaluate(() => window.__ntStore.deckList().map((d) => d.id).join(","));
ok(decksB.includes("kana-hira"), "B received decks: " + decksB);
await shot(pb, "45-device-b-home");

// B studies a few cards and syncs
await pb.click("text=/Study \\d+ cards/");
await pb.waitForSelector(".flash");
for (let i = 0; i < 6; i++) { await pb.click("button.show-btn"); await pb.click("button.grade.g3"); }
await pb.click(".study-top button[aria-label='Close session']");
await pb.waitForSelector(".plan-hero");
await pb.click("nav >> text=Settings");
await pb.click("text=Sync now");
await pb.waitForSelector("text=Up to date", { timeout: 15000 });
await pb.waitForTimeout(500);
const logB = await pb.evaluate(() => window.__ntStore.logRows().length);
log("B reviews:", logB);

// A syncs and should see B's reviews
await pa.click("text=Sync now");
await pa.waitForTimeout(2500);
const logA = await pa.evaluate(() => window.__ntStore.logRows().length);
ok(logA === logB && logB > 0, `A received B's reviews (${logA}/${logB})`);

// concurrent settings edits
await pa.evaluate(() => window.__ntStore.updateSettings({ name: "FromA" }));
await pb.evaluate(() => new Promise((r) => setTimeout(r, 30)).then(() => window.__ntStore.updateSettings({ name: "FromB" })));
await pb.click("text=Sync now"); await pb.waitForTimeout(1500);
await pa.click("text=Sync now"); await pa.waitForTimeout(1500);
await pb.click("text=Sync now"); await pb.waitForTimeout(1500);
const na = await pa.evaluate(() => window.__ntStore.settings.name);
const nb = await pb.evaluate(() => window.__ntStore.settings.name);
ok(na === nb && na === "FromB", `settings converge (A=${na}, B=${nb})`);

// reload A: the session persists
await pa.reload({ waitUntil: "networkidle" });
await pa.waitForSelector(".plan-hero");
await pa.click("nav >> text=Settings");
await pa.waitForSelector("text=mael@example.com");
ok(true, "A still signed in after reload");

// sign out keeps local data
await pa.click("button:has-text('Sign out')");
await pa.click(".sheet button:has-text('Sign out')");
await pa.waitForSelector("text=Sign in or create account");
ok((await pa.evaluate(() => window.__ntStore.deckList().length)) >= 2, "data kept on the device after sign out");

// a different account on the same device must not mix data
await pa.click("text=Sign in or create account");
await pa.click("text=I'm new here");
await pa.fill("#em", "other@example.com");
await pa.fill("#pw", "another password 1");
await pa.click("button[type=submit]");
await pa.waitForSelector("text=This device has another account's data");
await shot(pa, "46-owner-other");
await pa.click("button:has-text('Cancel and sign out')");
try { await pa.waitForSelector("text=Sign in or create account", { timeout: 8000 }); } catch (e) { await shot(pa, "47-debug"); log("DEBUG text:", (await pa.innerText("body")).slice(0, 600)); log("session:", await pa.evaluate(() => localStorage.getItem("nt4-auth")?.slice(0, 80))); throw e; }
ok(true, "other-account prompt works");

log("A errors:", A.errors);
log("B errors:", B.errors);
log("mock stats:", mock.stats);
await A.browser.close();
await B.browser.close();
mock.close();
