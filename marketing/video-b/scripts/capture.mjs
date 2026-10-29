// Real @3x stills of every app state the video shows (brief §3 + §4).
// Run: node scripts/capture.mjs [onboarding|app] ...  (default: both)
// Writes public/shots/*.png and public/shots/rects.json (tap targets in CSS px).
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { open, BASE } from "./browser.mjs";

const SHOTS = new URL("../public/shots/", import.meta.url).pathname;
const RECTS = SHOTS + "rects.json";
const rects = existsSync(RECTS) ? JSON.parse(readFileSync(RECTS, "utf8")) : {};
const phases = process.argv.slice(2).length ? process.argv.slice(2) : ["onboarding", "app"];
const FEATURED = [56, 110, 160]; // Ječná, Smíchovská, Křižík (brief §3)

const { page, close } = await open();
const settle = (ms = 900) => page.waitForTimeout(ms);
const shot = async (name) => {
  await settle();
  await page.screenshot({ path: SHOTS + name + ".png" });
  console.log("shot", name, page.url().replace(BASE, ""));
};
// Remember where a tap lands so Remotion can draw the tap ring on the same spot.
const tap = async (name, locator, { dispatch = false } = {}) => {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  if (!b) throw new Error(`no box for ${name}`);
  rects[name] = { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
  // SVG map regions ignore synthetic pointer clicks at their bbox centre; fire the click itself.
  if (dispatch) await locator.dispatchEvent("click");
  else await page.mouse.click(rects[name].x, rects[name].y);
};
const btn = (name) => page.getByRole("button", { name, exact: false }).first();
const next = () => btn("Pokračovat").click();

async function onboarding() {
  await page.goto(BASE + "/onboarding/welcome", { waitUntil: "networkidle" });
  await shot("s1_welcome");
  await btn("Začít").click();
  await settle();
  await page.getByText("Jsem student", { exact: true }).click();
  await page.locator(".ob-gender-option").first().click();
  await next();
  await settle();
  await btn("Jdeme na otázky").click();

  // 1 focus
  await shot("s1_q1");
  await tap("s1_q1_it", page.getByRole("checkbox", { name: "IT a technika" }).or(page.getByText("IT a technika", { exact: true })).first());
  await shot("s1_q1_it");
  await next();
  // 2 future
  await tap("s1_q2", page.getByText("Na vysoké škole", { exact: true }).first());
  await shot("s1_q2");
  await next();
  // 3 study type
  await shot("s1_q3");
  await tap("s1_q3_odborna", page.getByText("Odborná škola s maturitou", { exact: true }).first());
  await shot("s1_q3_odborna");
  await next();
  // 4 language, 5 practice
  await page.getByText("Základ mi stačí", { exact: true }).first().click();
  await next();
  await page.getByText("Půl na půl", { exact: true }).first().click();
  await next();
  // 6 districts: where the three featured schools are (P1, P2, P5) plus neighbours
  await shot("s1_q6");
  await page.locator(".ob-district-map").first().scrollIntoViewIfNeeded();
  await shot("s1_q6_map0");
  for (const n of [1, 2, 3, 5, 10]) {
    const region = page.locator(".ob-district-map-region").filter({ has: page.locator("title", { hasText: new RegExp(`^Praha ${n}$`) }) });
    await tap(`s1_q6_p${n}`, region, { dispatch: true });
    await settle(250);
  }
  await shot("s1_q6_map");
  await next();
  // 7 certainty, 8 priority
  await page.getByText("Tak zhruba", { exact: true }).first().click();
  await next();
  await page.getByText("Obojí je důležité", { exact: true }).first().click();
  await next();
  // 9–11 points block: optional, skipped (no invented score)
  for (let i = 0; i < 3; i++) {
    await settle(500);
    await btn("Přeskočit").click();
  }
  await page.waitForURL(/reveal|vysled/i, { timeout: 20000 }).catch(() => {});
  await settle(3500);
  await shot("s1_reveal");
  console.log("reveal text:", (await page.locator("h1, h2, p").allInnerTexts()).slice(0, 8).join(" | "));

  // The flow only auto-saves answers for beta testers; this developer account isn't one.
  // Save the same answers through the endpoint a new account's flush uses, so /skoly can
  // sort by "Shoda s tebou" from exactly the quiz shown in step 1.
  const saved = await page.evaluate(async () => {
    const raw = JSON.parse(sessionStorage.getItem("skolamatch.onboarding.answers") || "{}");
    const answers = Object.fromEntries(Object.entries(raw)
      .map(([k, v]) => [k, Array.isArray(v) ? v.filter((x) => x !== "nevim") : v])
      .filter(([, v]) => v !== "nevim" && v !== "" && v != null && !(Array.isArray(v) && !v.length)));
    const token = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.endsWith("-auth-token")))).access_token;
    const r = await fetch("https://school-app-production-be43.up.railway.app/api/me/onboarding-answers", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ answers }),
    });
    return `${r.status} ${JSON.stringify(await r.json()).slice(0, 120)} answers=${JSON.stringify(answers)}`;
  });
  console.log("onboarding-answers:", saved);
}

// Puts `locator` near the top of the viewport so before/after shots line up.
const toTop = (locator, offset = 70) =>
  locator.evaluate((el, off) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off), offset);

const NAMES = { 56: "Ječná", 110: "Smíchovská střední škola", 160: "Františka Křižíka" };

async function app() {
  // Start clean so step 2 shows no bookmarks or picks from earlier runs.
  await page.goto(BASE + "/prihlaska", { waitUntil: "networkidle" });
  for (let n = await page.getByRole("button", { name: "Odebrat z přihlášky" }).count(); n > 0; n--) {
    await page.getByRole("button", { name: "Odebrat z přihlášky" }).first().click();
    await settle(700);
  }
  await page.goto(BASE + "/ulozene", { waitUntil: "networkidle" });
  for (let n = await page.getByRole("button", { name: "Odebrat z uložených" }).count(); n > 0; n--) {
    await page.getByRole("button", { name: "Odebrat z uložených" }).first().click();
    await settle(900);
  }

  // 2 · browse, filter by field, sort by match (the default once a quiz exists), then by cutoff
  await page.goto(BASE + "/skoly", { waitUntil: "networkidle" });
  const clear = page.getByRole("button", { name: "Zrušit vše" });
  if (await clear.isVisible().catch(() => false)) { await clear.click(); await settle(); }
  await shot("s2_list");
  await tap("s2_it", page.locator("button", { hasText: /^IT a technika/ }).first());
  await shot("s2_it");
  const sort = page.locator(".ss-sort-trigger").first();
  const firstCard = () => page.locator(".ss-results").locator("li, article").first();
  await toTop(firstCard(), 64);
  await shot("s2_shoda");
  await toTop(sort, 160);
  await shot("s2_hranice_open");
  await tap("s2_hranice_sort", sort);
  await shot("s2_sheet_shoda");
  // A tap on an option in the mobile sheet closes it without applying the sort (production
  // bug, reported). Arrow keys change the radio without closing, so the real sorted state is
  // reached that way; the tap ring in the video sits on the option the arrow selects.
  const hranice = page.locator(".ss-sort-option", { hasText: "Hranice přijetí" });
  const hb = await hranice.boundingBox();
  rects.s2_hranice = { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2, w: hb.width, h: hb.height };
  await page.locator(".ss-sort-option input:checked").focus();
  await page.keyboard.press("ArrowDown");
  await shot("s2_sheet_hranice");
  await btn("Zobrazit").click();
  await settle();
  console.log("sort now:", await sort.innerText());
  await toTop(firstCard(), 64);
  await shot("s2_hranice");

  // 3 · save the three featured schools (bookmark), then the saved list
  for (const [id, name] of Object.entries(NAMES)) {
    await page.goto(BASE + "/skoly", { waitUntil: "networkidle" });
    await page.getByPlaceholder(/Název školy/).first().fill(name);
    await settle(1200);
    const fav = page.locator(".ss-results").getByRole("button", { name: /Uložit školu k oblíbeným|Odebrat z oblíbených/ }).first();
    console.log(`row for ${id}:`, await fav.evaluate((el) => el.closest("li, article")?.innerText.split("\n")[0] ?? ""));
    if ((await fav.getAttribute("aria-label")) === "Odebrat z oblíbených") { await fav.click(); await settle(); } // re-runs start unsaved
    await toTop(firstCard(), 64);
    await shot(`s3_find_${id}`);
    await tap(`s3_fav_${id}`, fav);
    await shot(`s3_saved_${id}`);
  }
  await page.goto(BASE + "/ulozene", { waitUntil: "networkidle" });
  await shot("s3_ulozene");
  await page.screenshot({ path: SHOTS + "s3_ulozene_full.png", fullPage: true });

  // 4 · comparison of the three (horizontal pan as a frame sequence), then the matrix
  await page.evaluate((ids) => localStorage.setItem("skolamatch.compareSelection", JSON.stringify(ids)), FEATURED);
  await page.goto(BASE + "/porovnani", { waitUntil: "networkidle" });
  await shot("s4_compare");
  const PAN = 24;
  for (let i = 0; i <= PAN; i++) {
    await page.evaluate((t) => {
      const el = [...document.querySelectorAll("*")].find((e) => e.scrollWidth > e.clientWidth + 20 && /auto|scroll/.test(getComputedStyle(e).overflowX));
      if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) * t;
    }, i / PAN);
    await settle(80);
    await page.screenshot({ path: `${SHOTS}pan/${String(i).padStart(2, "0")}.jpg`, type: "jpeg", quality: 90 });
  }
  console.log("pan frames:", PAN + 1);

  await page.goto(BASE + "/porovnani/matice", { waitUntil: "networkidle" });
  await settle();
  // Weights persist per account: reset to the app defaults so "before" is what a new user sees.
  for (const c of ["Podíl přijatých", "Počet míst", "Jazyky výuky", "Bez školného", "Výše školného", "Úspěšnost u maturity"])
    await page.getByRole("button", { name: `${c}: Dost`, exact: true }).click();
  await page.getByRole("button", { name: "Shoda s tebou: Zásadní", exact: true }).click();
  await settle();
  const rank = async () => (await page.locator("main").innerText()).split("Pořadí podle tvých vah")[1].match(/\n(\d)\n([^\n]+)/g).map((x) => x.trim().replace("\n", ".")).join(" ");
  const rankHead = page.getByText("Pořadí podle tvých vah", { exact: true }).first();
  const weight = page.getByRole("button", { name: "Počet míst: Nezáleží", exact: true });
  await toTop(page.getByText("Co je pro tebe důležité?", { exact: true }).first(), 64);
  await shot("s4_matrix");
  await toTop(rankHead, 64);
  await shot("s4_rank_before");
  console.log("ranking before:", await rank());
  await toTop(weight, 300);
  await shot("s4_weight_before");
  await tap("s4_weight", weight);
  await shot("s4_weight_after");
  await toTop(rankHead, 64);
  await shot("s4_rank_after");
  console.log("ranking after:", await rank());

  // 5 · the application: three picks in the matrix's new order, then move one up
  await page.goto(BASE + "/prihlaska", { waitUntil: "networkidle" });
  for (let n = await page.getByRole("button", { name: "Odebrat z přihlášky" }).count(); n > 0; n--) {
    await page.getByRole("button", { name: "Odebrat z přihlášky" }).first().click();
    await settle(700);
  }
  await page.goto(BASE + "/porovnani/matice", { waitUntil: "networkidle" });
  for (let i = 0; i < 3; i++) {
    const saved = page.waitForResponse((r) => r.url().includes("/api/picks") && r.request().method() === "PUT");
    await page.getByRole("button", { name: /^Přidat .* do přihlášky$/ }).first().click();
    await saved;
    await settle(600);
  }
  await page.goto(BASE + "/prihlaska", { waitUntil: "networkidle" });
  await shot("s5_picks");
  await page.screenshot({ path: SHOTS + "s5_picks_full.png", fullPage: true });
  await tap("s5_up", page.getByRole("button", { name: "Posunout výš" }).nth(1));
  await shot("s5_after");
  await page.screenshot({ path: SHOTS + "s5_after_full.png", fullPage: true });
  console.log("picks:", (await page.locator("main").innerText()).match(/\n[1-3]\.?\n[^\n]+/g)?.join(" ").replace(/\n/g, " "));
}

try {
  if (phases.includes("onboarding")) await onboarding();
  if (phases.includes("app")) await app();
} catch (e) {
  await page.screenshot({ path: SHOTS + "_error.png" }).catch(() => {});
  console.error("FAILED at", page.url().replace(BASE, ""), e.message.split("\n")[0]);
  process.exitCode = 1;
} finally {
  writeFileSync(RECTS, JSON.stringify(rects, null, 1));
  await close();
}
