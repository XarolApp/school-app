# Plan 025 — Revenue model and payment fixes before launch

Status: **v3 IMPLEMENTED locally (uncommitted, 2026-10-28, Sonnet 5.5) — `npm test` 309 pass, frontend lint 0 errors, build ok. Not done: the three Stripe test-clock runs (§4.4 gate, need the founder's Stripe test keys) and the founder's localhost test (§9).** (v3 pricing rework + §4.11 review fixes approved by the founder: "go")
(planned 2026-10-28, Opus 5.5 medium). The implementer starts with §13, which lists exactly what changes from the
code already built. v2 (monthly billed on the 22nd, season = min(499, monthly + 149)) was rejected by the founder and is
fully replaced by v3; nothing from v2 is built.
Implementer: Sonnet 5.5, high effort. This touches payments, access and the database,
so per CLAUDE.md: build it, verify it, then stop and give the founder the localhost
test script (§9). No push until the founder confirms.
Depends on: plan 022 chunks 1–8 being committed first (they are local and uncommitted
as of 2026-10-28). Do not start until `git status` shows plan 022 committed.

Canvas with the options the founder picked from: https://claude.ai/artifact/4gC1Jxcm7t5UwkM7s6XqbJ

---

## 0. Founder decisions (2026-10-28) — settled, do not re-open

| Area | Decision |
|---|---|
| Application deadline | **1–22 Feb 2027** (20 Feb is a Saturday, so the deadline moves to Monday 22 Feb). Founder-confirmed. |
| Monthly (**v3**) | 249 Kč on the day of purchase and on the same day every month after (anniversary billing, no fixed billing day). The **last** period is charged only for the days up to 22 Feb; nothing is ever charged after 22 Feb 2027, and the plan ends itself then. Bought when less than a month is left (from ~23 Jan): one prorated charge for the days to 22 Feb. **Not sold when 14 days or fewer are left (from 9 Feb).** |
| After the deadline | Access after 22 Feb is **paid** and covers exams, results, zápisový lístek, appeals and later rounds, up to **30 June 2027**. |
| Season price (**v3**) | One-time, always includes access to 30 June. Price = **0.9 × (what monthly would cost from today until 22 Feb) + 49 Kč**, never above 499 Kč and never below 149 Kč. So 499 Kč until 22 Dec, then it falls ~7 Kč a day. **When 14 days or fewer are left (from 9 Feb) it is a flat 149 Kč**, no trial; after 22 Feb the same 149 Kč pass is called "Jarní přístup". Without spring the season is always 10 % cheaper than monthly; the +49 Kč is the spring bonus. No "early access" label, no struck-through price. |
| Spring for monthly users (**v3**) | Spring alone always costs 149 Kč; nobody gets it for less. A monthly user can buy "Prodloužit do 30. 6." **from 1 Feb**: they pay 149 Kč plus whatever monthly would still have charged until 22 Feb (usually 0; at most one prorated period), the subscription ends now and access runs to 30 June. After 22 Feb: 149 Kč spring pass for everyone. |
| Optional add-on, monthly-only model | **Rejected** — see §1 "Pricing v2". |
| Monthly → season with credit | **Dropped (v3).** Replaced by the spring row above. The trial → monthly downgrade in the cancel screen stays. |
| Cancel / re-buy | One-click "Obnovit" with the saved card (B1, B2); honest cancel screen with a cheaper path below the cancel button (B4). No discount on cancel (B3 dropped). No pause (B5 dropped). |
| Referral | Two-sided (C1). The referrer can keep inviting after their own pass is fully paid back; friends still get their discount. No circular or self-referral payouts. |
| Family plan | Not built. School licence and tutoring partnerships: after the first season (recorded in UNFORGET). |
| Refunds | Minimise legally: replace the 30-day full-refund button with the statutory 14-day withdrawal and a pro-rata deduction. |
| Trials | One season trial per account and per card. A re-buy never silently skips a trial: the user is always told "no trial, you pay now" **before** paying. |
| Emails | The founder builds the day-2 reminder and all emails. **Do not edit or remove any email/reminder promise or the `TRIAL_REMINDER_IMPLEMENTED` flag.** |

---

## 1. Research summary (why the numbers are what they are)

Confidence: medium. Legal points are the lowest-risk reading of the sources below, not a court ruling.

**Withdrawal and refunds (biggest money lever).**
- The app is a *digital service* (continuous access to a database and tools), not one-off digital content. An Advocate General opinion in CJEU C-234/25 *Sky Österreich* (26 Feb 2026) treats continuous-access subscriptions as digital services, so the §1837 l) "no withdrawal for digital content" exception **must not** be relied on ([William Fry](https://www.williamfry.com/knowledge/world-consumer-rights-day-part-2-reshaping-online-subscription-rights-the-sky-austria-case/)).
- For services the consumer keeps 14 days (§1829 OZ). However, if they **expressly asked for performance to start** during that period and were **told** they would then pay a proportionate amount, they pay for the days they had access (§1834 OZ; CRD Art. 14(3)) ([epravo.cz](https://www.epravo.cz/top/clanky/distancni-smlouvy-a-smlouvy-uzavrene-mimo-obchodni-prostory-s-operatory-2-dil-114713.html), [smlouvy.gov.cz sample terms](https://smlouvy.gov.cz/smlouva/soubor/9696875/Listina%20LS.pdf)). The CJEU (C-641/19 *PE Digital*) calculates that amount pro rata by time. Without that express request we would owe a **full** refund, so the request checkbox is what actually cuts refunds.
- A free trial gives **one** withdrawal right, starting when the trial contract is concluded, provided the price after the trial was stated clearly before signup. No new 14 days start when the trial converts to paid (CJEU C-565/22 *Sofatutor*, an edtech case; [Fieldfisher](https://fieldfisher.com/en/services/franchising/franchise-commercial-law-blog/ecj-ruling-single-withdrawal-right-in-subscription-contracts), [pravniprostor.cz](https://www.pravniprostor.cz/clanky/obcanske-pravo/dobra-zprava-pro-podnikatele-spatna-pro-spotrebitele-v-pripade-online-predplatnych-bezi-jen-jedna-lhuta-pro-odstoupeni-od-smlouvy)). So the window runs 14 days from checkout, not from the charge.
- The EU withdrawal button (Directive 2023/2673, applicable from 19 June 2026) requires an online "withdraw" function during the withdrawal period. We keep the existing button and shorten it to 14 days ([iubenda](https://www.iubenda.com/en/blog/the-new-online-withdrawal-function-what-eu-directive-2023-2673-means-for-your-business/), [kurzy.cz](https://zpravy.kurzy.cz/862375-cesko-ceka-zmena-v-online-nakupovani-od-cervna-2026-pribude-povinne-tlacitko-pro-odstoupeni-od/)).
- **Minors (§31 OZ):** a minor can validly make purchases appropriate to the maturity of their age group ([pravniprostor.cz commentary](https://pravniprostor.cz/clanky/obcanske-pravo/komentar-k-noz-31-nezletili)). A ~590 Kč school tool is plausibly within that, but not certainly. Lowest-risk handling: a guardian who did not agree can ask (by email) within 30 days of payment and gets back the **unused part**. This matches the mutual return of value if the contract were invalid, and it is manual, so it can't be farmed by pressing a button.

**Prices.**
- Education monthly plans renew only ~56% of the time at the first renewal (median, RevenueCat SOSA 2026, [RevenueCat](https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category.md)). A monthly buyer on 1 Nov is therefore *expected* to pay roughly 249 + 139 + ~98 + ~50 ≈ **540 Kč** before 22 Feb (assuming ~70% for the later renewals; that part is my estimate). A season pass at 499 Kč (v2), paid up front with no churn, beats that. **Optimise for the season pass, not monthly.**
- Monthly stays as the low-commitment option, but its total until 22 Feb (938 Kč from 1 Nov, v3) is shown next to it.
- "Early access" reads as *unfinished* to consumers (Steam Early Access history; [EMAC 2025](https://proceedings.emac-online.org/pdfs/A2025-126152.pdf), [PocketGamer.biz](https://www.pocketgamer.biz/early-access-needs-to-be-a-premium-proposition-not-a-borked-beta-test)). Don't use it. The daily-falling price already gives a launch price below 690 Kč.
- A price that simply falls over time is not an "announced price reduction" under Omnibus Art. 6a, as long as we never show a struck-through "was" price or the word "sleva" ([Sellforte](https://sellforte.com/blog/eu-law-change-on-promotions), [RPC](https://rpclegal.com/snapshots/consumer/spring-2022/european-commission-publishes-guidance-on-price-promotions-under-the-omnibus-directive)). Referral discounts are personalised codes; show them as "dnešní cena − 100 Kč", never as a struck-through price.

**Pricing v2 (rework, 2026-10-28).** The founder disliked two things in v1: late in the season the season pass cost more than monthly, and monthly vanished on ~8 Jan. Options weighed:
- *Monthly only, last period prorated.* Rejected. Education monthly plans keep only ~56% of payers at the first renewal (RevenueCat, above), so a 1 Nov monthly buyer is worth ~540 Kč expected while a one-time pass at 499 is paid up front. Parents also want "pay once, done", which is the settled two-plan decision (C-8).
- *Season + optional ~100 Kč spring add-on at checkout.* Legal if the box starts unticked: §1817 OZ / CRD Art. 22 forbid an extra payment without express consent, and consent cannot be inferred from a pre-set option ([lewik §1817](https://www.lewik.org/term/22165/obcansky-zakonik-1817/), [legislation.gov.uk CRD Art. 22](https://www.legislation.gov.uk/eudr/2011/83/article/22/data.htm), [UK guidance](https://www.gov.uk/government/publications/getting-consent-for-additional-charges-when-selling-online/getting-consent-for-additional-charges-when-selling-online)). Rejected anyway: asking a 15-year-old in November to decide about June gives a low attach rate, extra charges shown late lower purchase intent and perceived fairness (drip/partitioned-pricing research: [Emerald 2015](https://emerald.com/insight/content/doi/10.1108/JPBM-06-2014-0638/full/html), [London Economics for OFT](https://londoneconomics.co.uk/?p=1191)), and the founder's own worry ("paying extra for something that should be included") is the same signal. No field data compares opt-in add-on attach rates with bundles; that gap is noted.
- *Bundled season at 499 vs 589/599.* 499 Kč. Consumers react to the left digit far more than to the size of a small change (Strulov-Shlain, *Review of Economic Studies* 2023: a 1-cent rise from a .99 price acts like a 15–25-cent rise; [Chicago Booth](https://www.chicagobooth.edu/review/many-retailers-are-making-basic-mispricing-mistake), [ReStud](https://www.restud.com/more-than-a-pennys-worth-left-digit-bias-and-firm-pricing/)). There is no direct 499-vs-599 elasticity study for a product like this; the founder already prefers more buyers (sharing). With a referral it becomes 399 Kč.
- *v2 choice (superseded by v3 below):* season = min(499, monthly-until-deadline + 149). Compared with v1 it earns **less** from November buyers (499 instead of ~589–512) and **more** from December–February buyers, when most families actually decide (e.g. 15 Jan: 458 instead of 300; 1 Feb: 322 instead of 234). The invariant is easy to state honestly: the season pass always costs at most what monthly + spring would.
- *Omnibus Art. 6a:* the price only ever falls and is never shown as a reduction from an earlier price (no "was 499", no "sleva"), so it is not an announced price reduction (sources above).
- *Monthly anchored to the 22nd (v2, superseded):* Stripe Checkout supports `subscription_data.billing_cycle_anchor_config` with a prorated first invoice by default; the anchor must fall within the first period; `proration_behavior:'none'` makes the stub free; trials cannot be combined with an anchor (monthly has none) ([Stripe](https://docs.stripe.com/payments/checkout/billing-cycle)).

**Pricing v3 (founder spec, 2026-10-28, replaces the v2 choice above).** The founder rejected the 22nd anchor: it confuses users, and a buyer on the 18th gets ~4 days for ~32 Kč and can cancel. v3:
- Monthly bills on the purchase anniversary, first charge always the full 249 Kč; only the *last* period is prorated to 22 Feb. No cheap stub exists, so the exploit is gone.
- Season = clamp(0.9 × monthly-until-22-Feb + B, 149, 499). The founder asked for B = 49 or 99. **B = 49 chosen:** it reproduces the founder's own example (499 on 22 Dec, falling from 23 Dec), the season stays at most ~27 % above monthly-without-spring (1 Feb: 221 vs 191; B = 99 would be 271, +42 %), and it lands on the 149 floor (~11 Feb) without a jump when monthly closes on 9 Feb (B = 99 would drop ~207 → 149 overnight). No study measures the best bundle premium for a product like this; that is a judgment call. Season is always far below monthly + spring (15 Jan: 333 vs 465).
- Last 14 days: no monthly, flat 149 Kč pass, no trial (founder). Spring alone is 149 Kč and never cheaper (founder).
- Monthly → season switch with credit dropped: it produced odd amounts. A monthly user extends with "149 Kč + what monthly would still charge" from 1 Feb, which can never be cheaper than paying monthly to the end and then spring.
- Expected value still favours the season: a 1 Nov monthly buyer pays 249 up front and ~56 % renew once (RevenueCat, above), so expected revenue is roughly 249 + 139 + ~98 + ~25 ≈ 510 Kč against 499 Kč paid up front with no churn and spring included.
- Stripe mechanics for the prorated last period (`cancel_at` mid-period) are not documented clearly enough to rely on, so v1's `invoice.created` credit (already built) stays as the safety net and a test-clock run is a hard gate (§4.4).

**Referral.**
- UCPD Annex I point 28 bans *direct exhortation to children to buy*. The CPC network said even "less explicit techniques" can count (Star Stable, [BDK](https://bdkadvokati.com/eu-consumer-protection-authorities-address-harmful-commercial-practices-affecting-children-in-gaming), [Mondaq](https://www.mondaq.com/Article/451704)).
  Mitigations, all required:
  - the copy is informative and never uses "kup", "zaplať", "teď", countdowns or pressure;
  - no leaderboards, progress bars, pop-ups or repeated prompts;
  - the program is shown only to people who have already paid, in Nastavení and once on the post-payment screen;
  - the reward is a partial refund to the card that paid, which is usually the parent's;
  - a server flag `REFERRAL_STUDENT_REWARDS` (default `true`), so it can be switched to parent-role accounts only if ČOI ever objects.
- Pyramid rule (UCPD point 14, CJEU C-515/12 *4finance*): a scheme is banned when its compensation comes *primarily from recruiting*. Capping every referrer's rewards at what they paid means nobody can profit from recruiting, only get their own price back, so it is not a pyramid ([4finance summary](https://counselmagazine.co.uk/content/4finance-uab-v-valstybine-vartotoju-teisiu-apsaugos-tarnyba-and-another)).
- Two-sided programs get roughly 2–3× more participation than one-sided ones (vendor data, low confidence; [Rivo](https://www.rivo.io/blog/referral-program-statistics)).

**Saved card and re-buy.** Reusing a saved card is legal when the customer is present and clicks a button stating the price (a customer-initiated payment; Stripe may ask for 3-D Secure). Off-session charges stay limited to the season-trial charge, which already has a mandate ([Stripe](https://docs.stripe.com/payments/cards/save-and-reuse)). The Terms must say the card stays saved and can be removed.

**Trial abuse.** Stripe does not stop repeat trials by itself. The card `fingerprint` is the standard signal ([Stripe abuse docs](https://docs.stripe.com/disputes/prevention/abuse?locale=en-GB), [UserJot](https://userjot.com/blog/stripe-fingerprint-detect-fraud/)). Its known limits are wallet tokens and virtual cards; accept that ceiling.

---

## 2. The revenue model (what the product does) — v3

All dates are Europe/Prague. All constants live in **one server module**, `lib/season.js`, and the frontend reads them from `GET /api/prices`.

```
DEADLINE        = 2027-02-22T23:59:59+01:00   // end of applications; monthly never charges after it
ACCESS_END      = 2027-06-30T23:59:59+02:00   // end of every paid access this season
SEASON_CAP      = 499   // Kč, the season price never exceeds this
SEASON_FACTOR   = 0.9   // season without spring is 10 % cheaper than monthly
SPRING_BONUS    = 49    // Kč added for the spring part (founder chose 49 over 99, §1 v3)
SPRING_PRICE    = 149   // Kč, floor of the season price; the spring pass price; the spring add-on base
MONTHLY_PRICE   = 249   // Kč, Stripe Price (unchanged)
LAST_CALL_DAYS  = 14    // daysLeft <= this: no monthly, no trial, flat SPRING_PRICE (from 9 Feb)
SPRING_ADDON_FROM = 2027-02-01T00:00:00+01:00 // monthly users see "Prodloužit do 30. 6." from here
MIN_CHARGE_CZK  = 15    // Stripe CZK minimum
REFERRAL_DISCOUNT = 100 ; REFERRAL_REWARD = 100 ; REFERRAL_MIN_PRICE = 249
WITHDRAWAL_DAYS = 14 ; GUARDIAN_REFUND_DAYS = 30
```
Delete `SEASON_RATE`, `MONTHLY_MIN_DAYS_LEFT`, `TRIAL_MIN_DAYS_LEFT` and `switchCreditMinor`. Keep `pragueDay`, `daysLeft` (114 on 1 Nov, 14 on 9 Feb, 1 on 22 Feb, 0 after), `addMonth`, `isSpring`, `onSale`, `proRataOwedMinor`.

Pure functions in `lib/season.js` (export all; unit-tested):
- `monthlyMaxTotalCzk(from)` — **already built, unchanged**: what monthly costs from `from` to DEADLINE with anniversary billing (full 249 Kč periods, last one prorated by time).
- `monthlyAvailable(now)` = `onSale(now) && daysLeft(now) > LAST_CALL_DAYS`. `trialAvailable(now)` = the same condition.
- `monthlyQuote(now)` → `null` when `!monthlyAvailable(now)`, else `{ firstChargeCzk, totalCzk, singleCharge }`: `totalCzk = monthlyMaxTotalCzk(now)`, `singleCharge = addMonth(now, 1) > DEADLINE` (less than a month left), `firstChargeCzk = singleCharge ? totalCzk : MONTHLY_PRICE`.
- `seasonPriceCzk(now)`: `null` after ACCESS_END; `SPRING_PRICE` when `daysLeft(now) <= LAST_CALL_DAYS` (covers 9 Feb → 30 Jun); otherwise `clamp(round(SEASON_FACTOR × monthlyMaxTotalCzk(noon) + SPRING_BONUS), SPRING_PRICE, SEASON_CAP)`, where `noon = new Date(pragueDay(now) + 'T12:00:00+01:00')` so the price is constant for a whole Prague day (CET all of Nov–Feb). Checked in the planning session: never rises hour to hour from 1 Nov to 25 Feb.
- `springAddOnCzk(periodEnd)` = `SPRING_PRICE + (periodEnd < DEADLINE ? monthlyMaxTotalCzk(periodEnd) : 0)`, where `periodEnd` is the subscription's `current_period_end`: 149 Kč plus every monthly charge still due before the deadline. Usually exactly 149.

Sample prices (computed in the planning session with the real `monthlyMaxTotalCzk`, 12:00 Prague):

| Date | Monthly: first charge → total to 22 Feb | Season (to 30 Jun) |
|---|---|---|
| 1 Nov | 249 → 938 | **499** |
| 18 Nov | 249 → 787 (249 × 3 + ~40) | 499 |
| 1 Dec | 249 → 689 | 499 |
| 22 Dec | 249 → 502 | 499 |
| 23 Dec | 249 → 494 | 494 (starts falling) |
| 1 Jan | 249 → 440 | 445 |
| 15 Jan | 249 → 316 | 333 |
| 22 Jan | 249 → 253 | 277 |
| 1 Feb | 191 (one charge) | 221 |
| 8 Feb | 129 (one charge, last day of monthly) | 165 |
| 9 Feb – 22 Feb | closed | **149** (no trial) |
| 23 Feb – 30 Jun | closed | 149 (Jarní přístup) |

Invariants (unit tests, every hour 1 Nov → 8 Feb):
- `SPRING_PRICE ≤ seasonPriceCzk ≤ SEASON_CAP`, and below the cap and above the floor it equals `round(0.9 × monthlyMaxTotalCzk(noon) + 49)` exactly;
- `seasonPriceCzk < monthlyMaxTotalCzk + SPRING_PRICE` (season always cheaper than monthly + spring);
- never rises.

What a buyer sees:

| Date | On sale | Notes |
|---|---|---|
| 1 Nov – 8 Feb | Season (preselected; 3-day trial if eligible) and Monthly | Monthly card: "249 Kč měsíčně · poslední měsíc jen za dny do 22. 2. · celkem nejvýš {total} Kč, pak samo skončí". When `singleCharge`: "{first} Kč jednou za dny do 22. 2., nic dalšího". Season card: "{price} Kč jednou · přístup do 30. 6. 2027". From 23 Dec the season line adds "Cena klesá s tím, kolik zbývá do 22. 2." |
| 9 – 22 Feb | Season only, 149 Kč, no trial | Same card, "149 Kč jednou · přístup do 30. 6. 2027" |
| 23 Feb – 30 Jun | Jarní přístup 149 Kč, no trial | Monthly users who ended on 22 Feb get a one-click offer |
| after 30 Jun | Nothing | `{ onSale:false }` |

Every paid access ends no later than ACCESS_END. Monthly access ends on 22 Feb unless the user extends.

---

## 3. Database (one migration + mirror in `supabase-setup.sql`)

New file `migrations/2026-10-28-revenue-model.sql`. Mirror every statement into `supabase-setup.sql` in the purchases block. Everything must be idempotent (`if not exists`, `create or replace`).

```sql
-- purchases: price is per purchase now (daily price), plus provenance
alter table public.purchases
  drop constraint if exists purchases_plan_check,
  add constraint purchases_plan_check check (plan in ('season','monthly','spring'));
alter table public.purchases
  add column if not exists trial boolean not null default false,
  add column if not exists card_fingerprint text,
  add column if not exists immediate_start_consent_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists discount_kind text check (discount_kind is null or discount_kind in ('referral','switch_credit')),
  add column if not exists discount_minor integer not null default 0 check (discount_minor >= 0),
  add column if not exists cancel_reason text check (cancel_reason is null or cancel_reason in ('price','not_needed','other')),
  add column if not exists needs_payment_confirmation boolean not null default false;
-- 'spring' is a one-time purchase, handled like a no-trial season purchase.

-- one trial per account
alter table public.users add column if not exists season_trial_used_at timestamptz;

-- one trial per card (service role only, no client policy)
create table if not exists public.trial_card_fingerprints (
  fingerprint text primary key,
  user_id uuid references public.users(id) on delete set null,
  used_at timestamptz not null default now()
);
alter table public.trial_card_fingerprints enable row level security;

-- referral
create table if not exists public.referral_codes (
  user_id uuid primary key references public.users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid not null unique references public.users(id) on delete cascade,
  referred_purchase_id uuid not null unique references public.purchases(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','rewarded','capped','void')),
  void_reason text,
  reward_minor integer not null default 0,
  stripe_refund_id text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_user_id);
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
```

Also:
- `apply_stripe_purchase_event` and any other RPC that writes `purchases.plan` must accept `'spring'`. Grep `supabase-setup.sql` for `'season', 'monthly'` and `in ('season','monthly')` and extend each one, including `healOnboarding` in server.js (`.in('plan', [...])`).
- New RPC `restore_season_charge(p_user_id uuid, p_purchase_id uuid)` returns `text`. It is allowed only when the purchase is `plan='season'`, `trial=true`, `cancel_requested_at is not null`, `season_charge_status in ('not_due','ready','canceled')`, `stripe_payment_intent_id is null`, and the user's `season_charge_due_at` (or the original due date from `access_ends_at`) is still in the future. In one transaction it clears `cancel_requested_at`, sets the purchase `status='active'` and `season_charge_status='not_due'`, and sets the user's `subscription_status='trialing'`, `plan_id='season'` and `season_charge_due_at` back to the original due date. It returns `'restored'`, `'too_late'` or `'not_found'`. Look at `request_season_charge_cancel` and `finish_season_charge_cancel` first and reverse exactly what they set.

Verify query (give it to the founder with the migration):
```sql
select count(*) filter (where column_name in ('trial','card_fingerprint','immediate_start_consent_at','discount_kind','needs_payment_confirmation')) as purchase_cols,
       (select count(*) from information_schema.tables where table_schema='public' and table_name in ('trial_card_fingerprints','referral_codes','referrals')) as new_tables
from information_schema.columns where table_schema='public' and table_name='purchases';
-- expect purchase_cols = 5, new_tables = 3
```

---

## 4. Server changes (`server.js`, `lib/season.js`)

Work in this order. After each numbered step, run `npm test`.

### 4.1 `lib/season.js` + `GET /api/prices` (public, no auth)
Create the module from §2. Remove `SEASON_PRICE_CZK`, `SEASON_TRIAL_DAYS` and `MONTHLY_PRICE_CZK` from server.js and import them instead. `GET /api/prices` returns:
```json
{ "onSale": true, "deadline": "...", "accessEnd": "...", "today": "...",
  "season": { "priceCzk": 499, "falling": false, "trialAvailable": true, "isSpring": false },
  "monthly": { "available": true, "priceCzk": 249, "firstChargeCzk": 249, "singleCharge": false, "totalCzk": 938 },
  "referral": { "discountCzk": 100, "available": true } }
```
`season.falling` = `priceCzk < SEASON_CAP && daysLeft(now) > LAST_CALL_DAYS`. `monthly` is `{ available:false }` when `monthlyQuote(now)` is null. Drop the v1 fields `tomorrowPriceCzk` and `maxTotalCzk`.
Add `Cache-Control: public, max-age=300`. With an optional bearer token, also include `trialEligible` for the caller (see 4.3).

### 4.2 Season access end and charge amount
- Replace `seasonEndsAt()` with `ACCESS_END` everywhere (season and spring). Delete the 30-day-floor logic.
- In `chargeDueSeasonPasses()`, charge **`purchase.price_amount_minor`** (the price locked at checkout), never a constant. Make `claim_due_season_charges` return `price_amount_minor` if it doesn't already.
- Same in every refund path that assumes 690.

### 4.3 Trial eligibility (bugs 1, 2, 5)
`trialEligible(userId)` returns false when any of these is true: `users.season_trial_used_at` is set; any purchase of this user has `trial=true`; `trialAvailable(now)` is false.
In `createCheckoutForUser` for `planId === 'season'`:
- **Eligible:** keep the setup-mode Checkout. Store `trial=true` and `price_amount_minor = seasonPriceCzk(now)×100` (minus the referral discount, §4.8) on the purchase. Custom text gets the actual price plus "Zkušební období je jen jedno na účet i na kartu."
- **Not eligible:** use payment-mode Checkout. `line_items: [{ price_data: { currency:'czk', unit_amount, product_data:{ name:'Sezónní přístup do 30. 6. 2027' } }, quantity:1 }]`, `payment_intent_data: { setup_future_usage:'on_session', metadata }`, and `customer_creation:'always'` when there's no customer. Store `trial=false`. Before redirecting, the frontend must already have shown "Zkušební období už bylo využito — zaplatíš hned X Kč" (§5.2). The request must include `acknowledgedNoTrial: true` when the server says not eligible; otherwise return `409 { code:'TRIAL_NOT_AVAILABLE', priceCzk }` so the UI can show the notice first. This is the "user always knows" rule.
- Set `expires_at` to now + 1 hour for every season, spring or one-time Checkout session, so a stale daily price can't be paid. In `createTrackedCheckout`, when reusing a pending purchase whose `price_amount_minor` ≠ today's price, expire that session, mark the purchase failed, and reserve a fresh one (same pattern as the existing `checkout_context` mismatch branch).
- Webhook `checkout.session.completed` mode `setup`:
  1. Retrieve the PaymentMethod and read `card.fingerprint`.
  2. If the fingerprint exists in `trial_card_fingerprints`, or `season_trial_used_at` is already set (a race): **do not schedule a charge and do not grant access.** Set the purchase `needs_payment_confirmation=true`, `trial=false`, status stays `pending`. Keep the payment method on the customer. Don't call `completeOnboardingAfterCheckout`.
  3. Otherwise run the current path, then insert the fingerprint into `trial_card_fingerprints` (`on conflict do nothing`) and set `users.season_trial_used_at = now()`.
- Webhook `checkout.session.completed` mode `payment` (new branch, for season with no trial and for spring): treat it like the existing `payment_intent.succeeded` season branch. Purchase becomes `active`, user `subscription_status='season'`, `plan_id` = `'season'` or `'spring'`, `access_expires_at=ACCESS_END`, `plan_started_at` and `last_paid_at` = now, and `stripe_customer_id`. Then call `completeOnboardingAfterCheckout`. Store the payment method's fingerprint on the purchase. Payment-mode purchases need the PaymentIntent id saved for refunds.
- New `POST /api/purchase/confirm-pending` (requireAuth, checkoutLimiter): for a purchase with `needs_payment_confirmation=true`, create an on-session PaymentIntent (§4.5 helper) at the purchase's locked price. Response: `{ status:'succeeded' }` or `{ status:'requires_action', clientSecret }`. On success the webhook `payment_intent.succeeded` (metadata `plan_id:'season'`, `purchase_id`) activates it; extend that branch so a purchase with `trial=false` is activated directly. New `POST /api/purchase/discard-pending`: detach the payment method, set the purchase `failed`.

### 4.4 Monthly: auto-end, no double subscription, resume (bugs 3, 7)
- `createCheckoutForUser` monthly: if `!monthlyAvailable(now)` return `409 { code:'MONTHLY_CLOSED' }` (from 9 Feb). Anniversary billing, **no** `billing_cycle_anchor_config`. Only when `quote.singleCharge` (less than a month left): add `subscription_data.billing_cycle_anchor: unix(DEADLINE)` (default proration, so the first invoice is the prorated days to 22 Feb and there is no later charge). Set `expires_at` = now + 1 h for every monthly session. Custom text: normal → "Dnes 249 Kč, pak 249 Kč každý měsíc ve stejný den. Poslední platba je jen za dny do 22. 2. 2027, potom předplatné samo skončí. Celkem nejvýš {total} Kč." `singleCharge` → "Dnes {first} Kč za dny do 22. 2. 2027. Nic dalšího se nestrhne, předplatné pak samo skončí."
- Webhook `checkout.session.completed` mode `subscription`: keep setting `cancel_at: unix(DEADLINE)` (idempotent, already built).
- **Keep** `creditLastMonthlyPeriod` and the `invoice.created` branch (already built) with two changes: (a) a `subscription_cycle` invoice whose period **starts** at or after DEADLINE gets a credit of the full line amount (today it returns early); (b) if the invoice would be left between 0 and `MIN_CHARGE_CZK` after the credit, credit the full line (Stripe would otherwise carry the tiny amount as customer-balance debt into a future purchase). Keep `invoice.created` in the founder's `stripe listen` instructions.
- **Stripe verification gate (must pass before moving on), Stripe test clocks:**
  1. Created 18 Nov 2026 12:00 → invoices 249 (18 Nov), 249 (18 Dec), 249 (18 Jan), ~40 (18 Feb, whichever path: Stripe's own proration or our credit), nothing after; status `canceled` after 22 Feb.
  2. Created 1 Feb 2027 12:00 (`singleCharge`) → one invoice ~191, nothing at 22 Feb, status `canceled`.
  3. Created 22 Jan 2027 10:00 → 249, then the 22 Feb renewal is credited to 0 (rule b).
  Record the actual numbers and which path produced the last-period amount in the report.
- `customer.subscription.updated` profile patch: `cancel_at_period_end` must mean "the user cancelled", not the scheduled deadline end. Change it to `Boolean(object.cancel_at_period_end) || purchaseHasCancelRequest`, where `purchaseHasCancelRequest` is `linkedPurchase?.cancel_requested_at != null`. The `findStripePurchase` select must include `cancel_requested_at`.
- `hasLivePlan(profile)`: a monthly with `subscription_status in ('active','past_due')` and unexpired access is **live even when cancel is requested**. New rule: `paidAccessActive(profile) || seasonScheduled`. `createCheckoutForUser` returns 409 `ALREADY_SUBSCRIBED` with `{ canRestore: true }` when a cancel is pending, and the UI offers "Obnovit" instead. This closes the double-subscription bug.
- Cancel (`cancelPlanForUser`, monthly branch): keep `cancel_at_period_end: true` and set `purchases.cancel_requested_at`, plus `cancel_reason` if the body has a valid one.
- New `POST /api/subscription/restore` (requireAuth, checkoutLimiter), also exposed on the pay link as `POST /api/pay-links/:token/restore`, sharing the function `restorePlanForUser(userId)`:
  - monthly with a cancel requested and the period not over: `stripe.subscriptions.update(id, { cancel_at: unix(DEADLINE) })` (this clears `cancel_at_period_end`; verify in test mode), then clear `purchases.cancel_requested_at`. Returns `{ restored:'monthly', nextChargeAt }`.
  - season trial cancelled while still in the trial: call RPC `restore_season_charge`. Returns `{ restored:'season', chargeAt, priceCzk }`. On `'too_late'` return 409 `{ code:'RESTORE_TOO_LATE' }`, and the UI switches to "Koupit znovu".
  - otherwise 400.
- Season trial cancel (`cancelPlanForUser` season branch and the legacy branch): **stop nulling `stripe_payment_method_id`**, so the card stays for one-click re-buy. Card removal is its own action (4.6).

### 4.5 One-click payments with the saved card (B1, A5, spring, re-subscribe)
Helper `chargeSavedCardOnSession({ userId, purchaseId, amountMinor, metadata })`:
- Look up `users.stripe_customer_id` and the payment method: `stripe_payment_method_id`, else the customer's `invoice_settings.default_payment_method`, else the first card in `paymentMethods.list({customer, type:'card'})`. If there's none, return `{ status:'no_card' }` and the UI falls back to Checkout.
- `stripe.paymentIntents.create({ amount, currency:'czk', customer, payment_method, confirm:true, off_session:false, metadata }, { idempotencyKey:'onsession:'+purchaseId })`.
- Return `succeeded`, `requires_action` (with `clientSecret`), or `failed` (with the decline message). Activation always happens in the webhook. The client polls `/api/me` the same way `Activated.jsx` does.

Endpoints, all requireAuth and checkoutLimiter, all requiring `{ confirmPriceCzk }` in the body that must equal the server-computed price, else 409 `PRICE_CHANGED` with the new price (this guarantees the click matched the shown price):
- `POST /api/purchase/season-saved-card` — buy season (or spring after the deadline) with no trial. Allowed only when there is no live plan. Reserves a purchase with `trial=false`.
- `POST /api/plan/switch-to-season` → **rename to `POST /api/plan/extend`** ("Prodloužit do 30. 6.", monthly users only). Reuse the built switch code (`quoteSwitchToSeason` → `quoteExtend`, `switchMonthlyToSeason` → `extendMonthly`, `/api/plan/switch-preview` → `/api/plan/extend-preview` returning `{ amountCzk, springCzk:149, remainingMonthlyCzk }`):
  - Allowed only when `now ≥ SPRING_ADDON_FROM`, `now ≤ DEADLINE`, the profile has a live monthly (`plan_id='monthly'`, access active; a pending cancel is fine).
  - Amount = `springAddOnCzk(current_period_end)` × 100 (from `stripe.subscriptions.retrieve`). Never below 149 Kč, so no `MIN_CHARGE` clamp is needed. Purchase `plan='season'`, `discount_kind=null`, `discount_minor=0`. Delete the credit logic, `switchCreditMinor` and the `'switch_credit'` value from the app code (leave the DB check constraint alone; an unused allowed value is harmless).
  - On `payment_intent.succeeded` with metadata `switch_from_subscription` (keep the key): `stripe.subscriptions.cancel(subId, { prorate:false, invoice_now:false })`, activate the season to ACCESS_END, mark the monthly purchase `canceled` (already built).
  - Withdrawal of this purchase follows §4.7 like any charged season purchase.
- `POST /api/plan/spring` — after DEADLINE, any account without live access (monthly that ended on 22 Feb, expired, new): 149 Kč spring purchase (already built as `seasonSavedCardPurchase` with `isSpring`).
- `POST /api/plan/monthly-saved-card` — resubscribe monthly (only when `monthlyAvailable`): `stripe.subscriptions.create({ customer, items:[{price}], default_payment_method, cancel_at: unix(DEADLINE), payment_behavior:'default_incomplete', expand:['latest_invoice.payment_intent'], metadata, ...(quote.singleCharge ? { billing_cycle_anchor: unix(DEADLINE) } : {}) })`. `confirmPriceCzk` is compared with `quote.firstChargeCzk`. Return the client secret when it needs an action.

### 4.6 Card management
`DELETE /api/payment-method` (requireAuth): refuse when a season trial charge is scheduled (`season_charge_due_at` is set and the status is trialing), because that card is about to be charged. Answer: "nejdřív zruš zkušební období". Otherwise detach the method and null `stripe_payment_method_id`. `GET /api/me` adds `savedCard: { brand, last4 } | null`. Compute it only on `/api/me`, never on the hot `accessStateFor` path.

### 4.7 Withdrawal: statutory 14 days with pro-rata (bug 4, Q5)
- `WITHDRAWAL_DAYS = 14`. `withdrawalWindowEnd(profile)` = `plan_started_at + 14 days` (checkout = contract conclusion, per Sofatutor). It no longer takes the max with `last_paid_at`.
- `withdrawPlanForUser`:
  - **Season during the trial** (no charge yet): keep the current behaviour (cancel the scheduled charge, nothing owed).
  - **Charged purchase:** `owed = proRataOwedMinor({ paidMinor: price_amount_minor, paidAt: last_paid_at, accessEndsAt: access_ends_at, now })`. `refundable = charge.amount − charge.amount_refunded` (from the PaymentIntent's latest charge). Refund amount = `max(0, refundable − owed)`. Pass `amount` explicitly to `stripe.refunds.create`. If `immediate_start_consent_at` is null on the purchase (legacy or bug), owe nothing and refund everything: without the express request we have no right to deduct.
  - **Monthly:** same formula against the first invoice (the window is only the first 14 days).
  - Response adds `owedCzk`.
- Existing `refundCanceledSeasonPurchase` (the cancel-after-charge race) stays a full refund. That is a cancellation before access, not a withdrawal.
- The guardian route (§7 Terms) is manual: no code beyond the Terms text.

### 4.8 Referral (C1)
- `GET /api/referral` (requireAuth): eligible only when the user has a season or spring purchase that is `active` and charged (`stripe_payment_intent_id` succeeded), or a season payment-mode purchase. When `REFERRAL_STUDENT_REWARDS=false`, also require `onboarding_progress.role='parent'`. Lazily create the code (8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, retry on unique conflict). Returns `{ code, link, rewardedCzk, capCzk, pendingCount, rewardedCount }`, with the cap = net paid on the referrer's purchase.
- The landing captures `?pozvanka=CODE` into `localStorage` key `snm.referral` (try/catch) and passes `referralCode` to `/api/checkout` and the pay-link checkout.
- `GET /api/referral/check?code=` (public, `shareLimiter`) returns `{ valid: boolean }` only, so the paywall can show "S pozvánkou máš 100 Kč slevu". No referrer name or data.
- In `createCheckoutForUser` (season only, `seasonPriceCzk(now) ≥ REFERRAL_MIN_PRICE`), the code is valid when **all** of these hold:
  1. the code exists;
  2. the referrer ≠ the caller;
  3. the referrer is eligible as above;
  4. the caller has **no** prior purchase with status in (`active`,`canceled`,`withdrawn`,`refunded`);
  5. the caller has no row in `referrals`;
  6. the caller's `stripe_customer_id`, if any, ≠ the referrer's.

  If valid: price −100 Kč, `discount_kind='referral'`, `discount_minor=10000`, and insert a `referrals` row (`pending`) linked to the purchase. If invalid, ignore it silently (the purchase continues at full price) and return `referralApplied:false` so the UI can say "Pozvánku nešlo použít."
- **No circles:** condition 4 means a person can only ever be referred on their first purchase, and condition 3 means the referrer must already have paid. So if A referred B, B's code can never discount A (A already has a purchase).
- **No self-referral:** at webhook time, when the referred purchase's card fingerprint equals any `card_fingerprint` on the referrer's purchases (or the referrer's saved method), set the referral to `void` with reason `same_card`. The friend keeps the discount; the referrer gets nothing.
- Settlement job `settleReferrals()`, called at the start of `chargeDueSeasonPasses()` (hourly). For `pending` referrals where the referred purchase is charged, still `active`, and `now > referred.plan_started_at + 14 days`:
  - compute the cap remaining = referrer's net paid (`charge.amount − amount_refunded`) − 1 Kč minimum left;
  - if the referrer's purchase is withdrawn or refunded, set `void`;
  - if the cap remaining < 100 Kč, set `capped`;
  - else `stripe.refunds.create({ payment_intent, amount: 10000, reason:'requested_by_customer', metadata:{ referral_id } }, { idempotencyKey:'referral:'+id })`, then set `rewarded`.

  If the referred purchase is withdrawn before settlement, set `void`.
- The referrer's own withdrawal after rewards uses the net refundable amount (already in the 4.7 formula), so no double payout is possible.

### 4.9 Express request for immediate start
`/api/checkout`, `/api/pay-links/:token/checkout` and all §4.5 endpoints require `immediateStart: true` in the body, else 400 `{ code:'IMMEDIATE_START_REQUIRED' }`. Store `immediate_start_consent_at = now()` and `terms_version = TERMS_VERSION` (new constant, `'2026-11-01'`) on the purchase. The Checkout `custom_text.submit.message` repeats the deal in one sentence.

### 4.10 Cleanups that ride along
- Delete `SEASON_DAYS`, `SEASON_MONTHS`, `perDayCzk` and `savingsVsMonthly` from `frontend/src/config/pricing.js` and their uses (bug 3). Keep `TRIAL_*` reminder constants and flags untouched.
- `PROFILE_COLUMNS` and `/api/me` add `trialEligible` and `savedCard`.

### 4.11 Fixes from the Opus review of the v1 code (2026-10-28) — pricing-independent, all required
Line numbers refer to the uncommitted v1 `server.js`; re-locate by function name.
1. **Double charge on a double click** (`abandonPendingPurchases`, used by the saved-card routes, and `discard()`): never mark an existing pending purchase `failed` to make room for a new one. Reuse the pending row through `reservePurchase`, so the idempotency key `onsession:<purchaseId>` returns the same PaymentIntent. `discard()` marks a row failed only after `checkout.sessions.expire` succeeded or the session is already `expired`; a `complete` session is left alone. In the webhook, a `payment_intent.succeeded` that lands on a non-active purchase (failed/stale) is **refunded in full automatically** (idempotency key `orphan:<pi>`) and logged, never silently dropped. `monthlySavedCardPurchase` gets the same guard and also refuses when the customer already has a non-canceled subscription (`subscriptions.list({ customer, status:'all' })`).
2. **Child charging the parent's card** (`savedCardFor`): a card is usable for one-click only when its `fingerprint` equals the `card_fingerprint` of a paid purchase with `checkout_context='self'` by this user. Parent-link purchases must not write the parent's customer or payment method onto the child's `users` row; store them on the purchase only. `createCheckoutForUser` for `checkout_context='self'` never reuses a customer that was created for a parent purchase (create a new customer instead). `/api/me.savedCard` uses the same rule.
3. **Pending switch locks out a paying monthly user**: on `payment_intent.payment_failed` and `payment_intent.canceled` for a non-trial purchase, mark it `failed`. In `apply_stripe_purchase_event`, the "newer purchase exists" guard ignores purchases in `pending` (only `active` newer purchases block). Add a cleanup in the hourly job: non-trial `pending` purchases older than 2 h → `failed`.
4. **`confirm-pending` stacking on a live monthly**: return `409 ALREADY_SUBSCRIBED` when `hasLivePlan(profile)`. When any purchase becomes `active`, mark the same user's other `needs_payment_confirmation` rows `failed`.
5. **Webhook retry skips trial-abuse records**: in the setup branch, run the idempotent follow-ups (save fingerprint on the purchase, insert `trial_card_fingerprints` on conflict do nothing, set `season_trial_used_at` if null, `recordReferral`, set `needs_payment_confirmation` for a blocked card) on both the first-time and the replay path.
6. **Schema rerun safety**: in `supabase-setup.sql`, delete the older chunk-2 `create or replace function claim_due_season_charges` (the migration's drop+create is the only definition). Narrow the migration backfill of `trial=true` to rows with `stripe_setup_intent_id is not null and needs_payment_confirmation = false and stripe_payment_intent_id is null`, and make sure the chunk-2 `update … set season_charge_status='ready'` no longer matches paid rows.
7. Lower-confidence items, fix because they are cheap: tag every refund with `metadata.kind` (`withdrawal` | `referral` | `orphan` | `cancel_race`) and count only `withdrawal` refunds as the withdrawal; a withdrawal while the charge is processing computes `refund_amount_minor` at that moment; a pending trial purchase reserved by old code (`trial=false`, setup mode) is treated as `trial=true` on completion; a unique-index conflict on a pending spring purchase returns the existing row instead of 500. The `/api/me` purchase summary (whichever block builds `cancel_at_period_end` for Settings) adds `canRestore`, `restoreKind`, `needsPaymentConfirmation` and `pendingPurchase { priceCzk }`.

---

## 5. Frontend

Read `docs/sources/claude_code_ui_ux_guide.md` and `design/DESIGN.md` before touching UI. Use existing `ob-pw-*` and `settings-*` classes; no new tokens. Czech copy below is final unless it breaks layout. The student branch uses tykání, the parent branch vykání (`planCopy`).

### 5.1 Price data
New `fetchPrices()` in `api.js` (public request). New hook `usePrices()` in `frontend/src/lib/usePrices.js`: fetch once per mount, fallback `null` → show a skeleton, never a hardcoded price. Replace every `plan.priceCzk` read for season and monthly in `Plan.jsx`, `Zkusebni.jsx`, `Platba.jsx`, `SubscriptionExpired.jsx`, `ParentPay.jsx`, `Landing` (grep `priceCzk`). `PLANS` in `pricing.js` keeps copy only; remove the `priceCzk` fields so nothing can read a stale price.

### 5.2 Paywall screens
- **Plan.jsx season card:** "{price} Kč jednou · přístup do 30. 6. 2027 · i na přijímačky, výsledky a další kola" (the spring wording only once §6 items 1–2 are live; until then just the date). When `season.falling` add one muted line: "Cena klesá s tím, kolik zbývá do 22. 2. Vždy je levnější než měsíční předplatné a jaro dohromady." No "zítra" line, no struck-through price, no "sleva".
- **Monthly card** (hidden when `!monthly.available`): "249 Kč měsíčně · poslední měsíc jen za dny do 22. 2. · celkem nejvýš {totalCzk} Kč, pak samo skončí". When `singleCharge`: "{firstChargeCzk} Kč jednou za dny do 22. 2. · nic dalšího se nestrhne". Under it, muted: "Jaro (přijímačky, výsledky, odvolání) do 30. 6. si pak můžeš přikoupit za 149 Kč."
- **Zkusebni.jsx:** when `trialEligible === false` (from `/api/me`) or `!season.trialAvailable`, skip the trial timeline and show: "Zkušební období už bylo na tomto účtu nebo kartě využité. Zaplatíš hned {price} Kč." Then go straight to Platba.
- **Platba.jsx:**
  - Required, unticked checkbox, id `immediate-start`: "Chci přístup hned. Beru na vědomí, že když do 14 dnů od objednávky odstoupím, zaplatím poměrnou část za dny, kdy jsem měl/a placený přístup." (parent: "…kdy měl/a dítě placený přístup."). The button stays disabled until ticked. Send `immediateStart:true`.
  - The button text states the price: trial → "Začít zkušební období" (unchanged); no trial → "Zaplatit {price} Kč".
  - On 409 `TRIAL_NOT_AVAILABLE` show the notice above and resend with `acknowledgedNoTrial:true` after the user clicks the price button again.
  - Show the referral line when `snm.referral` is valid: "Pozvánka: −100 Kč. Dnes zaplatíš {price−100} Kč." The parent pay page gets the same.
- **Activated.jsx:** when `/api/me` reports `needsPaymentConfirmation`, show this instead of the spinner:
  - Title "Tahle karta už zkušební období měla"
  - Text "Zkušební období je jen jedno na kartu. Přístup můžeš mít hned za {price} Kč."
  - Buttons [Zaplatit {price} Kč] → `confirm-pending` (handle `requires_action` with `getStripeClient().handleNextAction({ clientSecret })`), and [Nechci, odebrat kartu] → `discard-pending` → back to the plan step.

### 5.3 Settings (Nastavení), Předplatné section
State table (implement exactly):

| State | Shows |
|---|---|
| Season trial running | Charge date + price + card •••• last4; [Zrušit zkušební období] |
| Season trial cancelled, trial still running | "Zkušební období zrušeno. Přístup do {trialEnd}. Nic se nestrhne." [Obnovit sezónní přístup] → confirm sheet "Platba {price} Kč proběhne {date} z karty •••• {last4}. Žádné nové zkušební dny." [Potvrdit] |
| Season/spring paid | "Přístup do 30. 6. 2027" + withdrawal button while `canWithdraw` ("Odstoupit od smlouvy (do {date}) — vrátíme {refund} Kč") |
| Monthly active | Next charge date and amount (from Stripe's `current_period_end`; the last one shows its prorated amount, or "Další platba už nebude" when none is left), "Samo skončí 22. 2. 2027", [Zrušit předplatné]. From 1 Feb also [Prodloužit do 30. 6. za {amount} Kč] (sheet: when `remainingMonthlyCzk = 0`: "Jaro do 30. 6. za 149 Kč. Zaplatíš kartou •••• {last4}, měsíční předplatné skončí a přístup poběží do 30. 6." Otherwise: "Jaro 149 Kč + zbývající měsíční platba {remaining} Kč, kterou by sis jinak zaplatil/a {date}. Zaplatíš {amount} Kč …" [Zaplatit {amount} Kč]). |
| Monthly cancelled, period running | "Zrušeno — přístup do {periodEnd}, nic dalšího se nestrhne." [Obnovit předplatné] |
| Monthly ended at the deadline (after 22 Feb) | "Měsíční předplatné skončilo s přihláškami." [Jarní přístup do 30. 6. za 149 Kč] |
| Nothing live, has saved card | [Koupit sezónní přístup za {price} Kč] one-click with confirm sheet; [Odebrat uloženou kartu] |
| Referral eligible | Section "Pozvi kamaráda" (§5.5) |

Withdrawal button: before calling, show a confirm with the computed refund (`GET /api/subscription/withdraw-preview` → `{ owedCzk, refundCzk }`; add it beside the withdraw route, sharing the 4.7 math).

### 5.4 Cancel screen (B4)
Replace the current cancel inset form content:
- First, full width: **[Ano, zrušit]** (`btn-primary` styling is not required; it must be the first focusable control and at least as large as the alternatives).
- Below it, a muted box: season trial → "Raději měsíčně? Dnes {firstChargeCzk} Kč, pak 249 Kč měsíčně, zrušíš kdykoli a samo skončí 22. 2." (singleCharge: "Raději jen do 22. 2.? Jednou {firstChargeCzk} Kč.") [Přejít na měsíční] (cancels the trial, then `monthly-saved-card` with a confirm sheet "Zaplatit {firstChargeCzk} Kč"; hidden when `!monthly.available`). Monthly, from 1 Feb only → "Raději přístup až do 30. 6.?" [Prodloužit za {amount} Kč] (extend sheet). Before 1 Feb a monthly user sees no alternative box.
- Optional chips "Proč rušíš? cena · nepotřebuji · jiný důvod", sent as `reason` on cancel. Not required.

### 5.5 Referral UI (Nastavení only, plus one line on the post-payment screen)
- Settings section "Pozvi kamaráda" (student) or "Doporučte známým" (parent):
  - text "Kdo použije tvůj odkaz, dostane 100 Kč slevu na sezónní přístup. Za každého, kdo si přístup ponechá déle než 14 dní, ti vrátíme 100 Kč na kartu, dokud ti nevrátíme celou cenu. Pak už mají slevu jen kamarádi.";
  - the link with a copy button (catch clipboard rejection → select the text);
  - "Vráceno {rewarded} Kč z {cap} Kč · čeká {pending}".
- Post-payment screen (`Activated` success state): one muted line "V Nastavení najdeš odkaz pro kamarády — dostanou 100 Kč slevu."
- No other placements. No share-sheet popups, no notifications. Never use "kup", "zaplať", "rychle" or "teď" in referral copy.
- Landing / onboarding: on `?pozvanka=` store the code and show a small chip on the paywall only (Plan and Platba): "Pozvánka uplatněna: −100 Kč".

### 5.6 SubscriptionExpired (`/predplatne`) and ParentPay
Both use `usePrices()`. Expired accounts with a saved card get the one-click buttons (season or spring, and monthly if available). ParentPay gets restore, withdraw-preview and immediate-start like Settings, using the pay-link endpoints.

---

## 6. Spring value (makes A6 worth paying for). Build after §4–§5; must ship before 22 Feb 2027

Small and data-backed only; no new data sources.
1. **Termíny 2027 card** on `/skoly` (top, dismissible per account via the existing prefs pattern): exams (from Cermat when published; until then "duben 2027, termín upřesníme"), results, zápisový lístek (10 working days from results), appeals. One config object `frontend/src/config/admissionDates.js` with a `source` URL per date. Show a date only when its value is non-null.
2. **"Loni zbyla volná místa" filter** on Search: programmes in the newest Cermat year where `prijati < kapacita`, from `school_programs`. Label honestly: "Podle loňských výsledků zde zůstala volná místa — šance na další kolo, ne záruka."
3. **Real score check:** the existing decision profile already takes JPZ points. After 15 Apr, the field label switches to "Skutečné body z přijímaček" (date-gated in config). Existing verdict logic unchanged.

Season copy may say "pomůže i s přijímačkami, výsledky a dalšími koly" only once items 1–2 are live. Until then the plan cards say "přístup do 30. 6. 2027" without listing spring features.

---

## 7. Terms (`frontend/src/pages/Legal.jsx`) — rewrite these parts, bump `TERMS_VERSION`

Write plain Czech in the existing style. Do not touch the email/reminder sentences (founder-owned).
- **Ceny (v3):** Sezónní přístup do 30. 6. 2027 stojí 90 % toho, co by ode dne objednávky do 22. 2. 2027 stálo měsíční předplatné, plus 49 Kč, nejvýše však 499 Kč a nejméně 149 Kč. Od 9. 2. 2027 stojí 149 Kč (bez zkušebního období), po 22. 2. 2027 se jako Jarní přístup prodává za 149 Kč. Platí cena zobrazená v okamžiku objednávky (i po zkušebním období). Měsíční předplatné 249 Kč se platí v den objednávky a pak každý měsíc ve stejný den; poslední platba je jen za dny do 22. 2. 2027 a předplatné pak samo skončí, nic dalšího se nestrhne. Zbývá-li do 22. 2. 2027 méně než měsíc, platí se jednou jen za dny do 22. 2. Od 9. 2. 2027 se měsíční předplatné neprodává. Prodloužení měsíčního předplatného do 30. 6. 2027 (od 1. 2. 2027): 149 Kč plus měsíční platby, které by do 22. 2. 2027 ještě proběhly; měsíční předplatné tím skončí. All access ends 30. 6. 2027. Bump `TERMS_VERSION` to `'2026-11-01b'` only if v1 terms were ever shown to a real buyer; otherwise keep `'2026-11-01'`.
- **Zkušební období:** 3 days, only one per account and per payment card. Without a trial the order is paid immediately, and this is shown before payment.
- **§6 Odstoupení:** 14 days from the order (also covers the trial; the trial does not start a new period). If you asked for immediate access, you pay the proportional part for the paid days used; we refund the rest within 14 days. During the trial, withdrawal costs nothing. Button in Nastavení.
- **§7 Nezletilí** (replaces the 30-day full refund): if a minor ordered without the consent of a legal guardian, the guardian can write to info@stredninamiru.cz within 30 days of payment; we refund the unused part. Remove the sentence promising a full refund within 30 days to everyone, and the self-service "do 30 dnů" wording.
- **Uložená karta:** the card stays saved with Stripe for your next payments, which you always confirm yourself; you can remove it in Nastavení. The only automatic charge is the one after the trial.
- **Pozvánky:** discount 100 Kč for a new customer's first season order (while the price is at least 249 Kč); 100 Kč refunded to the referrer for each friend who keeps access for more than 14 days, up to the referrer's own price; not combinable; same-person and same-card referrals don't count; we may end the program for future invitations.
- **Withdrawal model form** stays. Update its intro to 14 days.

---

## 8. Tests (`tests/revenue-025.test.cjs`, follow the existing `tests/*.cjs` style)

Pure (`lib/season.js`):
- `seasonPriceCzk` (12:00 Prague): 1 Nov → 499; 22 Dec → 499; 23 Dec → 494; 15 Jan → 333; 1 Feb → 221; 8 Feb → 165; 9 Feb → 149; 23 Feb → 149; 1 Jul 2027 → null. Same value at 00:01 and 23:59 of 15 Jan (constant per Prague day).
- The price never rises from one hour to the next, 1 Nov → 1 Jul (1-hour steps).
- §2 invariants on every hour 1 Nov → 8 Feb.
- `monthlyQuote(1 Nov 12:00)` → `{ firstChargeCzk:249, totalCzk:938, singleCharge:false }`; `(18 Nov)` → total 787; `(1 Feb)` → `{ firstChargeCzk:191, singleCharge:true }`; `(8 Feb 23:00)` → not null; `(9 Feb 00:00)` → null. `trialAvailable` follows `monthlyAvailable` (8 Feb true, 9 Feb false).
- `springAddOnCzk(DEADLINE)` → 149; `springAddOnCzk(18 Feb 12:00)` → 149 + ~40; `springAddOnCzk(23 Feb)` → 149.
- `proRataOwedMinor`: before payment → 0; halfway → half; after access end → full.

Server boundaries (mock Stripe/Supabase as existing tests do):
- Second season checkout after a cancelled trial → session mode `payment`, not `setup`; without `acknowledgedNoTrial` → 409 `TRIAL_NOT_AVAILABLE`.
- Setup completion with a known fingerprint → no `season_charge_due_at`, `needs_payment_confirmation=true`, onboarding not completed.
- Monthly with a cancel requested → `/api/checkout` returns 409 with `canRestore`; restore calls `subscriptions.update` with `cancel_at = DEADLINE`.
- `customer.subscription.updated` with `cancel_at` = DEADLINE and no user cancel → profile `cancel_at_period_end=false`.
- Withdraw on day 10 after the charge → refund `amount` equals the formula; withdraw without `immediate_start_consent_at` → full refund; withdraw after 14 days → 400.
- Referral:
  - self (same user) → ignored;
  - a referred user with a prior purchase → ignored;
  - A→B then B's code used by A → ignored;
  - same fingerprint → void;
  - settlement before 14 days → nothing;
  - after → refund of 10000 with idempotency key;
  - cap reached → `capped`.
- Charge job uses `price_amount_minor` (e.g. 51200), not 69000.
- `/api/checkout` without `immediateStart` → 400.
- `confirmPriceCzk` mismatch → 409 `PRICE_CHANGED`.
- Monthly checkout session has no `billing_cycle_anchor_config`; it carries `subscription_data.billing_cycle_anchor === unix(DEADLINE)` exactly when `singleCharge` (frozen date 1 Feb) and not on 1 Nov; on 9 Feb it returns 409 `MONTHLY_CLOSED`.
- `invoice.created`: a cycle invoice starting at DEADLINE gets a full credit; a cycle invoice left under 15 Kč after the credit gets a full credit; an 18 Feb → 18 Mar invoice gets 249 × (days after 22 Feb)/28 credited.
- `/api/plan/extend` before 1 Feb → 409; on 5 Feb with `current_period_end` = 18 Feb → amount 149 + ~40 Kč; with `current_period_end` = DEADLINE → 149; `/api/plan/switch-to-season` no longer exists.
- Review fixes (§4.11), one test each: double click on season-saved-card → one PaymentIntent (same idempotency key), no row marked failed; succeeded PI on a failed purchase → full refund with `orphan:` key; child after parent-paid purchase → `savedCard` null and saved-card route returns `no_card`; `payment_failed` on a switch purchase → row `failed` and a later monthly renewal still extends access; `confirm-pending` with a live monthly → 409; setup webhook replay → fingerprint row and `season_trial_used_at` written; `supabase-setup.sql` contains exactly one `function public.claim_due_season_charges`.

Run `npm test`, `cd frontend && npm run lint && npm run build`. All must pass, with zero new lint warnings.

---

## 9. Founder test script (localhost, Stripe test mode)

Start the backend, frontend and `stripe listen` (no `--events` filter, so `invoice.created` arrives). Use a fresh account per case.

1. **Season trial:** buy season with 4242 → trial, price = today's from `/api/prices` (499 Kč until 22 Dec). Settings shows the charge date and price.
2. **Cancel + restore:** cancel the trial → "Obnovit" → confirm → same charge date, no new trial.
3. **Endless trial blocked:** cancel again, let the trial lapse (or set `season_charge_due_at` in the past via SQL), buy again → you see "zkušební období už bylo využito, zaplatíš hned X Kč" **before** paying; Checkout charges immediately.
4. **Same card, new account:** a new email with the same 4242 card → after the card form, the "Tahle karta už zkušební období měla" screen; nothing charged until you click Zaplatit.
5. **Monthly:** buy monthly → 249 Kč today, Settings shows the next charge on the same day next month and "samo skončí 22. 2." Cancel → checkout is blocked with "Obnovit" → restore works. Then the three Stripe test clocks (§4.4) and the results recorded.
6. **Prodloužit do 30. 6.:** gated on the server's real date (from 1 Feb), so it can't be clicked on localhost in October; the automated boundary tests (§8, frozen dates) cover it. Founder check: the button is **not** shown on an active monthly today.
7. **Withdraw:** season paid → withdraw preview shows a small deduction → refund lands in the Stripe dashboard with that amount.
8. **Referral:** account A with season paid → copy the link → account B opens it → paywall shows −100 Kč → pay. In SQL, move B's `plan_started_at` back 15 days → wait for the hourly job, or restart the backend (it runs on boot) → A gets a 100 Kč refund in Stripe. B's code used by A is ignored.
9. **3-D Secure:** repeat 3 with `4000 0025 0000 3155`, and the one-click switch with the same card (handleNextAction popup).

Verify SQL after the cases:
```sql
select u.email, p.plan, p.status, p.trial, p.price_amount_minor/100 as kc, p.discount_kind, p.needs_payment_confirmation
from purchases p join users u on u.id = p.user_id order by p.created_at desc limit 20;
```

---

## 10. Docs to update in the same commit
- `CLAUDE.md` and `AGENTS.md` (together):
  - Monetization: replace "Prices are locked 690/249" with the daily season price model, monthly auto-end and spring pass. Note that prices live in `lib/season.js` and are served by `/api/prices`; `pricing.js` holds copy only.
  - Replace the 30-day refund sentence with the 14-day pro-rata plus the guardian rule.
  - Note that ordinary accounts have no trial (option A).
  - Add the new tables to the schema table.
- `UNFORGET.md`:
  - add "School licence (D2) and tutoring partnerships (D3) — revisit after season 2026/27";
  - add "Admission dates 2027 — fill `admissionDates.js` when Cermat publishes";
  - add "Season constants for 2027/28 — new DEADLINE/ACCESS_END before next September";
  - remove items this plan closes (savings badge, trial abuse, double subscription).
- `plans/README.md`: add 025.
- `docs/skolamatch_current_status.md`: decision log entry 2026-10-28.

## 11. Out of scope (do not build)
- Emails and the day-2 reminder (founder).
- Live Stripe keys, IČO, VAT and invoicing.
- Family plan, school licence, tutoring partnerships, pause, discount-on-cancel and win-back emails.
- Stripe Radar trial-abuse product (optional later; email trial-abuse-prevention@stripe.com).

## 13. v3 delta from the code already built (start here)
1. `lib/season.js` (§2): new constants `SEASON_CAP`, `SEASON_FACTOR`, `SPRING_BONUS`, `LAST_CALL_DAYS`, `SPRING_ADDON_FROM`, `MIN_CHARGE_CZK`; rewrite `seasonPriceCzk`, `monthlyAvailable`, `trialAvailable`; add `monthlyQuote`, `springAddOnCzk`; delete `SEASON_RATE`, `MONTHLY_MIN_DAYS_LEFT`, `TRIAL_MIN_DAYS_LEFT`, `switchCreditMinor`. `monthlyMaxTotalCzk` and `addMonth` stay as they are.
2. `server.js`: `/api/prices` shape (§4.1); monthly Checkout custom text + `singleCharge` anchor, `expires_at` (§4.4); the two `creditLastMonthlyPeriod` changes (§4.4); `monthly-saved-card` (§4.5); switch → extend (§4.5); then all §4.11 fixes.
3. Frontend: `Plan.jsx`, `Platba.jsx`, `SubscriptionManager.jsx`, `Settings.jsx` cancel box, `SubscriptionExpired.jsx`, `ParentPay.jsx`, `usePrices.js` consumers, `api.js` (switch → extend helpers), `pricing.js` copy (§5.2–5.4). Remove the "Zítra" line and every "nevyužitou část měsíce odečteme" string.
4. `Legal.jsx` §4 Ceny (§7).
5. Tests: rewrite the price tests in `tests/revenue-025.test.cjs` (§8) and add the §4.4/§4.5/§4.11 boundary tests.
6. Migration: only the §4.11 item 6 changes; the verify query stays the same.
7. Docs: CLAUDE.md + AGENTS.md price paragraph (season = clamp(0.9 × monthly to 22 Feb + 49, 149, 499), flat 149 from 9 Feb; monthly 249 on the purchase anniversary, last period prorated, not sold from 9 Feb; extend from 1 Feb = 149 + remaining monthly), `docs/handouts/plan-025-founder-test.md` (prices, case 5 three test clocks, case 6 replaced by "extend not shown before 1 Feb", keep `invoice.created`).

## 12. Known ceilings (accepted)
- The last monthly payment is an odd amount (e.g. ~40 Kč). Accepted: the total is shown before purchase.
- A last monthly period worth under 15 Kč (bought on the 21st–22nd of a month) is not charged at all (§4.4 rule b). Accepted: at most ~15 Kč.
- A monthly buyer on 1 Nov who wants the whole season before 1 Feb has no cheaper path than paying monthly to the end + 149 Kč spring. Accepted by the founder (spring alone is never under 149; switch-with-credit dropped).
- Wallet payments (Apple/Google Pay) may not give a stable fingerprint, so one person could get a second trial that way. Accepted; the account-level rule still applies.
- The referral rule "no prior purchase" is per account; a new email + new card + real payment can still "refer" itself. That costs the attacker more than the 100 Kč they get back, so it is accepted.
- Season constants are hardcoded for the 2026/27 season (UNFORGET item for next season).
