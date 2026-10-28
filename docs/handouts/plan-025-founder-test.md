# Plan 025 — jak to vyzkoušet na localhostu (Stripe test mode)

Nic z toho není pushnuté. Dokud tenhle test neprojde a neřekneš „jde to“, nepushuje se.

## 0. Příprava (jednou)

1. **Supabase → SQL editor:** vlož celý soubor `migrations/2026-10-28-revenue-model.sql` a spusť. (Obsahuje i novou verzi funkce `apply_stripe_purchase_event`.) Pak spusť ověřovací dotaz z jeho posledních řádků (je v komentáři). Očekávání: `purchase_cols = 10`, `new_tables = 3`, `fns = 1`, `claim_returns_price = true`, `guard_active_only = true`.
2. **Restartuj backend** (port 5001, tak jak ho spouštíš). Frontend běží dál.
3. **Stripe CLI:** `stripe listen --forward-to localhost:5001/webhooks/stripe` (bez `--events`, posílá všechno včetně `invoice.created`). Zkopíruj `whsec_…` do `.env` jako `STRIPE_WEBHOOK_SECRET`, pokud ještě není.
4. `.env` (backend) musí mít `STRIPE_PRICE_ID_MONTHLY`. `frontend/.env` má mít `VITE_STRIPE_PUBLISHABLE_KEY` (kvůli 3-D Secure).
5. Každý případ dělej s **novým účtem** (nový e-mail), pokud není řečeno jinak. Karta `4242 4242 4242 4242`, libovolné datum v budoucnu, libovolné CVC.

## Ceny (co musíš vidět)

Cena sezónního přístupu se počítá jako 90 % toho, co by stálo měsíční předplatné do 22. 2. 2027, plus 49 Kč, nejvýš 499 Kč a nejméně 149 Kč. Dnes (28. 10.) a až do 22. 12. je to **499 Kč**, pak klesá (23. 12. 494 Kč, 1. 1. 445 Kč, 15. 1. 333 Kč, 1. 2. 221 Kč), od 9. 2. je to 149 Kč. Vždy musí odpovídat tomu, co ukazuje `http://localhost:5001/api/prices`.

Měsíční: 249 Kč v den nákupu a pak každý měsíc ve stejný den, poslední platba jen za dny do 22. 2. Dnes (28. 10.) ukazuje „celkem nejvýš 950 Kč“ (1. 11. je to 938 Kč), `monthly.firstChargeCzk` je 249. Od 9. 2. se neprodává (to na localhostu nevyzkoušíš — hlídají to automatické testy).

## 1. Zkušební období
Onboarding → plán „Sezónní přístup“ → uvidíš dnešní cenu (499 Kč), žádnou přeškrtnutou cenu a pod cenou **žádnou** větu „cena klesá“ (do 22. 12. se cena nemění). Dokonči až na Platbu: tlačítko je šedé, dokud nezaškrtneš „Chci přístup hned…“. Zaplať kartou 4242.
Očekávání: účet odemčený, Nastavení → Předplatné ukazuje „Zkušební období. {datum za 3 dny} se strhne 499 Kč“ a kartu Visa •••• 4242.

## 2. Zrušit a obnovit
Nastavení → „Zrušit zkušební období“ → vidíš velké „Ano, zrušit“ jako první a pod ním volitelné důvody. Zruš.
Pak „Obnovit sezónní přístup“ → potvrď. Očekávání: stejné datum platby, stejná cena, žádné nové zkušební dny, nezadáváš kartu.

## 3. Nekonečné zkušební období je zablokované
Zruš trial znovu. Aby šlo ověřit „znovu koupit“, v SQL nastav `users.trial_expires_at` na minulost pro tenhle účet. Jdi na `/predplatne`.
Očekávání: vidíš **před platbou** „Zkušební období už bylo na tomto účtu nebo kartě využité. Zaplatíš hned X Kč“; Checkout stahuje peníze okamžitě (ne trial). Máš také tlačítko „Sezónní přístup za X Kč“ s uloženou kartou (potvrzovací okno, žádné nové zadávání karty).
Dvojklik na tlačítko s uloženou kartou stáhne peníze **jednou** (ve Stripe dashboardu je jediná platba).

## 4. Stejná karta na novém účtu
Nový e-mail, znovu onboarding, trial, ta samá karta 4242.
Očekávání: po zadání karty se objeví „Tahle karta už zkušební období měla“; **nic se nestrhlo a nic není odemčené**, dokud nekliknu „Objednat s povinností platby“. Tlačítko „Nechci, odebrat kartu“ vrátí na výběr plánu.

## 5. Měsíční plán
Nový účet → měsíční → Platba (platí se hned 249 Kč). Nastavení: „Platí se každý měsíc ve stejný den. Předplatné samo skončí 22. 2. 2027“. Zruš → zkus znovu koupit měsíční: **zablokuje se**, nabídne „Obnovit předplatné“ → funguje.
Ve Stripe dashboardu (test mode) u předplatného: `Cancels` = 22. 2. 2027.
**V Nastavení u aktivního měsíčního se NEOBJEVÍ tlačítko „Prodloužit do 30. 6.“** (objeví se až od 1. 2. 2027).

## 6. Stripe test clock (nejdůležitější — poslední měsíční platba)
Ve Stripe dashboardu (test mode) → Test clocks. Tři hodiny, předplatné měsíční cena `STRIPE_PRICE_ID_MONTHLY`, `cancel_at` = 22. 2. 2027 23:59:59 (nastavuje ho náš webhook — vytvoř předplatné přes naši aplikaci, zákazníka pak připoj k hodinám, nebo ho vytvoř v dashboardu s `cancel_at`):
1. Start **18. 11. 2026 12:00**, posuň za 18. 12., 18. 1., 18. 2., 22. 2. Očekávané faktury: **249, 249, 249, ~40 Kč** (18. 2.), potom nic, stav `canceled`.
2. Start **1. 2. 2027 12:00** (jedna platba: k vytvoření použij `billing_cycle_anchor` = 22. 2. 2027 23:59:59) → jedna faktura ~191 Kč, potom nic.
3. Start **22. 1. 2027 10:00** → 249 Kč; renewal 22. 2. musí skončit na **0 Kč** (náš `invoice.created` ho dorovná).
Zapiš skutečné částky a to, jestli poslední období zkrátil Stripe sám, nebo naše úprava (v logu backendu je `deadline-credit`). Když to nevychází, **neposouvej se dál** a pošli mi výsledek.

## 7. Odstoupení
Účet s zaplaceným sezónním přístupem (třeba z případu 3). Nastavení → „Odstoupit od smlouvy“ → v okně vidíš „Za dny, kdy jsi měl/a placený přístup, zaplatíš X Kč. Vrátíme ti Y Kč.“ → potvrď.
Očekávání: ve Stripe je refund přesně Y Kč (ne celá částka). Starý účet bez zaškrtnutého souhlasu (nebo SQL: `immediate_start_consent_at = null`) dostane celou částku zpět.
Po 14 dnech od `plan_started_at` (v SQL posuň o 15 dní zpátky) tlačítko zmizí.

## 8. Pozvánka
Účet A s zaplaceným sezónním přístupem → Nastavení → „Pozvi kamaráda“ → zkopíruj odkaz. V anonymním okně otevři odkaz, udělej onboarding nového účtu B: u plánu je „Pozvánka uplatněna: −100 Kč“, zaplatí se o 100 Kč méně (399 Kč). Pak:
- SQL: `update purchases set access_starts_at = now() - interval '15 days' where user_id = '<B>';`
- restartuj backend (settlement běží při startu a pak každou hodinu) → A dostane ve Stripe refund 100 Kč.
- Účet A zkusí použít kód účtu B: nic se nesleví. Vlastní kód sám na sebe: nic.

## 9. 3-D Secure
Zopakuj případ 3 s kartou `4000 0025 0000 3155`. Očekávání: otevře se bankovní okno (Stripe test), po potvrzení se přístup odemkne.

## 10. Karta rodiče
Dítě pošle odkaz na platbu, rodič zaplatí svou kartou. Pak se přihlas jako dítě → Nastavení: **není vidět uložená karta** a tlačítko „Koupit … za X Kč“ jedním klikem se nenabízí.

## Co se nedá zkusit na localhostu (kryjí to automatické testy)
- „Prodloužit do 30. 6.“ (od 1. 2. 2027): částka 149 Kč (+ případná poslední měsíční platba).
- Cena 149 Kč od 9. 2., konec prodeje měsíčního, konec zkušebního období od 9. 2.

## Ověření po všech případech (SQL)
```sql
select u.email, p.plan, p.status, p.trial, p.price_amount_minor/100 as kc,
       p.discount_kind, p.needs_payment_confirmation, p.refund_amount_minor
from purchases p join users u on u.id = p.user_id order by p.created_at desc limit 20;
```
