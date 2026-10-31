// Signed-in Playwright context on production for the video captures (brief §4).
// The refresh token is single-use: it is exchanged once and the resulting session
// lives in .session.json (gitignored). Never print either.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const here = new URL("..", import.meta.url).pathname;
export const BASE = "https://www.stredninamiru.cz";
const GATE_CODE = "pristuptestovaciverze"; // public tester code, CLAUDE.md
const SESSION_FILE = here + ".session.json";

process.loadEnvFile(here + ".env.local");
process.loadEnvFile(here + "../../frontend/.env");
const SB_URL = process.env.VITE_SUPABASE_URL;
const STORAGE_KEY = `sb-${new URL(SB_URL).hostname.split(".")[0]}-auth-token`;

async function session() {
  if (existsSync(SESSION_FILE)) return JSON.parse(readFileSync(SESSION_FILE, "utf8"));
  const sb = createClient(SB_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.refreshSession({ refresh_token: process.env.MARKETING_TEST_REFRESH_TOKEN });
  if (error || !data.session) throw new Error(`refreshSession failed: ${error?.message ?? "no session"} (ask the founder for a fresh token)`);
  writeFileSync(SESSION_FILE, JSON.stringify(data.session), { mode: 0o600 });
  return data.session;
}

export async function open({ video } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    locale: "cs-CZ", timezoneId: "Europe/Prague", colorScheme: "light",
    ...(video ? { recordVideo: { dir: video, size: { width: 780, height: 1688 } } } : {}),
  });
  const gate = await context.request.post(BASE + "/__gate", { data: { key: GATE_CODE } });
  if (gate.status() !== 204) throw new Error(`gate answered ${gate.status()}`);
  const page = await context.newPage();
  await page.goto(BASE + "/favicon.svg").catch(() => {});
  const s = await session();
  await page.evaluate(([k, v]) => {
    localStorage.setItem(k, v);
    localStorage.setItem("skolamatch.remember-me", "true");
  }, [STORAGE_KEY, JSON.stringify(s)]);

  // supabase-js rotates the refresh token in the page; keep the newest one for the next run.
  const close = async () => {
    const latest = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY).catch(() => null);
    if (latest) writeFileSync(SESSION_FILE, latest, { mode: 0o600 });
    await context.close();
    await browser.close();
  };
  return { browser, context, page, close };
}
