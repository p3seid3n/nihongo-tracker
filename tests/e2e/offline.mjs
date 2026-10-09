import { launch, shot, BASE } from "./lib.mjs";
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1; } else log("ok:", m); };
const { browser, ctx, page, errors } = await launch({ serviceWorkers: "allow" });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector("text=Let's build your Japanese.");
// wait for the service worker to take control
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 }).catch(() => {});
await page.reload({ waitUntil: "networkidle" });
ok(await page.evaluate(() => !!navigator.serviceWorker.controller), "service worker controls the page");
const cacheNames = await page.evaluate(async () => (await caches.keys()).join(","));
log("caches:", cacheNames);
// finish onboarding online
await page.click("text=Get started"); await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Start learning");
await page.waitForSelector(".plan-hero");
await page.waitForTimeout(1200); // let the store flush to IndexedDB
// go offline and reload
await ctx.setOffline(true);
await page.reload({ waitUntil: "load" });
await page.waitForSelector(".plan-hero", { timeout: 10000 });
ok(true, "app opens offline with saved data");
// study offline
await page.click("text=/Study \\d+ cards/");
await page.waitForSelector(".flash");
await page.click("button.show-btn"); await page.click("button.grade.g3");
await page.click(".study-top button[aria-label='Close session']");
await page.waitForSelector(".plan-hero");
await page.waitForTimeout(1200);
ok((await page.evaluate(() => window.__ntStore.logRows().length)) === 1, "offline review recorded");
// persisted across offline reload
await page.reload({ waitUntil: "load" });
await page.waitForSelector(".plan-hero");
ok((await page.evaluate(() => window.__ntStore.logRows().length)) === 1, "offline review survived reload");
await ctx.setOffline(false);

// light theme + desktop screenshots
await page.evaluate(() => window.__ntStore.updateSettings({ theme: "light" }));
await page.waitForTimeout(300);
await shot(page, "50-home-light");
await page.setViewportSize({ width: 1280, height: 800 });
await page.waitForTimeout(300);
await shot(page, "51-home-desktop");
await page.click("nav >> text=Stats");
await page.waitForTimeout(300);
await shot(page, "52-stats-desktop");
log("errors:", errors);
await browser.close();
