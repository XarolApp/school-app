---
title: Visual direction research — ŠkolaMatch
date: 2026-08-25
status: research reference, not a decision record
---

# Visual Direction Research

## What this document is for

**ŠkolaMatch** is a Czech web + mobile product that helps 9th graders (age 14–15) and their parents choose which high school (*střední škola*) to apply to. In Czechia this choice happens once, around age 15, and substantially shapes the next four years and the university path after. The only comprehensive existing directory (atlasskolstvi.cz) is dated and dense, so students end up trawling dozens of individual school websites.

Product properties that constrain the design:

- **Paid, ~250 Kč (~$10), and both students and parents buy independently.** A 15-year-old paying with their own money is a real customer segment, not a funnel into a parent purchase. The app branches by persona early.
- **Acquisition is Czech teenage TikTok/Instagram influencers.** Most traffic is mobile, arriving from short-form video, with very low initial trust.
- **Used once per person, ever**, over days or weeks during application season. No habit loop, no "come back tomorrow." It must deliver and be trusted almost immediately.
- **Standing rule: zero-shame UX.** Nothing may guilt, shame, or scare a 15-year-old.

**The problem being solved.** A first design pass read as a *developer tool* — GitHub, n8n, Supabase: competent, professional, cold. The specific causes were a navy-blue primary, monospace for numbers, tight radii, no shadows, hairline borders everywhere, and a visual metaphor built on institutional school paperwork (report cards, class registers, a teacher's red pen). The goal is **warm, trustworthy, easy** — and the tension is that "trustworthy" drifts corporate while "warm" drifts childish. A 15-year-old must not feel patronised; a parent must not feel it's a toy.

**Evidence conventions used throughout:** `[SOURCED]` = stated in the linked source. `[INFERENCE]` = reasoning from sources, not stated by them. `[GAP]` = looked for it, does not exist. Age and contestation flags are inline.

---

## Headline findings

**1. The warm/credible tension is not resolved by finding a midpoint. It is resolved by zoning.** Every product examined that pulls this off assigns warmth and sobriety to *different layers*. Monzo's brand book has a "considerate use" rule stating hot coral "is exhausting at scale" and that long-form reading and product UI should **"default to deep navy on soft white."** Oscar Health uses an authoritative serif (Heldane) for display and a *monospace* (Lettera) for body — inverting the obvious assignment. Warmth in acquisition and connective tissue; restraint where the user is transacting or absorbing consequences. `[SOURCED]` — [Monzo brand guidelines breakdown](https://www.deck.gallery/blog/monzo-brand-guidelines-breakdown/), [Oscar Design](https://oscardesign.team/How-we-redesigned-the-Oscar-brand-to-speak-to-our-growing-member-base)

**2. Move the credibility load off the visuals entirely, and the visuals become free to be warm.** Farewill can ship a cartoon blob mascot for a *will-writing and cremation* service because trust is carried by "£150 million in pledged donations" and fixed transparent pricing. Natural Cycles can write conversationally because its efficacy page states 93% typical / 98% perfect use, defines both, names its own failure mode ("the app giving a wrong Green Day"), and puts itself in a comparison table against six competing methods. **Decide which layer carries trust, then let the other layer be genuinely warm.** Half-warm visuals plus half-rigorous data is the worst available outcome. `[SOURCED]` — [Farewill rebrand](https://farewill.com/blog/rebranding-death-how-farewill-is-using-design-to-change-the-way-the-world), [Natural Cycles effectiveness](https://www.naturalcycles.com/how-effective-is-natural-cycles)

**3. For a 14–15 year old, the design *is* a large fraction of the trust argument — more so than for adults.** Brown & Gummerum (2025), n=375 UK adolescents: **over 60% did not mention accuracy at all** when explaining which of two sources they trusted. "Considerations of appearance (aesthetics, colour, readability and detail) accounted for most of participant responses." Note that **detail** sits alongside aesthetics in their reasoning — sparse marketing-page minimalism may actively cost credibility with this group. `[SOURCED]` — [Brown & Gummerum, *BJDP* 2025](https://bpspsychub.onlinelibrary.wiley.com/doi/full/10.1111/bjdp.12559)

**4. Do not ship a headline fit score.** This is the strongest recommendation in the document and it cuts against the obvious product instinct. Hinge — the market leader in intentional matching — ships **no number**, just one recommendation with a stated reason. The single best-matched study to this exact problem (Corcoran et al., NYC 8th graders choosing from ~400 high schools, n≈19,109) achieved its results with **a one-page list of 30 schools, no score**. Products that do ship compressed scores have documented harm: GreatSchools' 1–10 rating was found to correlate with student demographics and to have accompanied *increased housing segregation*; OkCupid's own experiment proved the displayed percentage drives behaviour **largely independent of the underlying compatibility** ("the mere myth of compatibility works just as well as the truth"). Under a zero-shame rule, shipping a number with more persuasive weight than epistemic weight is manipulation, however kind the copy around it. `[SOURCED]` — [Corcoran et al., NBER w24471](https://www.nber.org/system/files/working_papers/w24471/w24471.pdf), [Chalkbeat on GreatSchools](https://www.chalkbeat.org/2019/12/5/21121858/looking-for-a-home-you-ve-seen-greatschools-ratings-here-s-how-they-nudge-families-toward-schools-wi/), [Rudder, OkTrends](https://gwern.net/doc/psychology/okcupid/weexperimentonhumanbeings.html)

**5. Never use a report-card metaphor, letter grades, or a staged score reveal.** Niche.com grades schools A+ to D− — the exact symbol system by which your user is themselves graded. Separately, Somerville et al. (2013, fMRI, n=69) found medial prefrontal response to social evaluation peaks at **~15.3 years**, and that arousal was elevated in the *anticipation* condition, not just during evaluation. `[INFERENCE]` A "calculating your match…" spinner or a number animating upward is likely to trigger evaluative arousal before any content arrives. The existing design's "teacher's red correction pen" metaphor is the single worst idea in the first pass and should be deleted without replacement. `[SOURCED]` — [Somerville et al. 2013](https://bpb-us-e1.wpmucdn.com/sites.harvard.edu/dist/b/261/files/2023/03/somerville2013_psychsci.pdf), [Niche grades](https://www.niche.com/about/where-niche-grades-come-from/)

**6. The dual-audience problem is solved by splitting the second person, not the skin.** Across every mature product examined, the split is in *route*, *argument*, or *permissions* — almost never in the visual identity. Aceable keeps its robot mascot and blue/yellow palette on the page aimed at anxious parents, changing only the argument (independence → scaffolded support). Wyzant addresses the learner in second person and the parent through third-person testimonials. Varsity Tutors sidesteps role entirely by segmenting on **"Select Grade Level."** `[SOURCED]` — [Aceable teen](https://www.aceable.com/drivers-ed/) / [parents](https://www.aceable.com/drivers-ed/parents/), [Wyzant](https://www.wyzant.com/), [Varsity Tutors](https://www.varsitytutors.com/)

**7. When forced to choose, drift adult, not childish — the asymmetry is not symmetric.** NN/g found teens prefer "professional, clean aesthetics," want "neutral graphics rather than childish ones," and that **"the word 'kid' is a teen repellent."** Their highest success rates were on **ecommerce sites — designed for adults, following mainstream conventions**; their greatest difficulty was on "large sites with dense content," naming **government, nonprofit and school sites** specifically. Every teen product examined that changed direction moved *toward* its adult sibling (Revolut's teen app upgrade was described as "a bit more like our main app"); none moved the other way. `[INFERENCE]` A parent who finds your product slightly bright still buys it. A 15-year-old who thinks it's for children will not buy at any price. `[SOURCED]` — [NN/g Teenager's UX](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/), [Revolut <18](https://www.revolut.com/blog/post/revolut-under-18-the-account-built-for-teens/)

**8. Warmth is more often subtractive than additive, and the dark anchor colour does the credibility work.** Lemonade became warm by cutting its renters policy to 2,300 words — **"almost 90% lighter than its predecessor."** Betterment's rebrand *de-bolded* its type as a warming move. Across every credible non-blue brand, the pattern is identical: a restricted warm accent, a warm-neutral ground, and a very dark, slightly warm anchor — never pure black. Wise `#163300`, Ethos `#054742`, Mailchimp `#231E15` (a dark *brown*), Anthropic `#141413`, Notion `#37352f`. `[SOURCED]` — [Lemonade Policy 2.0](https://medium.com/lemonade-stories/worlds-first-open-source-insurance-policy-blog-9c3ebb70edff)

---

## 1. Warmth vs. credibility — how real products resolve it

### The mechanism, product by product

**Monzo (banking).** Oldschool Grotesk for display (friendly, rounded), Monzo Sans for UI. Hot Coral primary — reported as either `#FF4F40` or `#FF4B44` depending on source, **contested, verify before use** — with deep navy `#091723` and soft white. The photography direction is the most transferable thing here because it specifies **technique, not mood**: "Gaussian blur, saturation lift, and position-based lens flare applied to lifestyle photography to brighten faces and add a sunlit feel." That is a recipe anyone can execute; "warm, human photography" is not. Monzo's own framing of the colour is telling: *"Hot coral represents our warmth, our empathy and our human quality"* — they never claim it conveys trust. Trust comes from being a licensed bank. `[SOURCED]` — [Creative Review](https://www.creativereview.co.uk/monzo-branding-ragged-edge/), [Deck.gallery](https://www.deck.gallery/blog/monzo-brand-guidelines-breakdown/), [Monzo blog](https://monzo.com/blog/weve-had-a-little-makeover)

**Headspace (mental health).** The custom Colophon Foundry typeface was explicitly built to **"flex from playful to clinical."** One typeface engineered with enough range to cover both registers — the tension solved in the type design rather than by switching fonts between contexts. The rebrand's stated trigger is precisely this brief's problem: evolving "as a mental health brand exposed the need to evolve the identity to be kind, warm and welcoming" while supporting "more complex issues like anxiety and depression." Post-2024 the illustration system expanded beyond the smile to faces expressing **"stress, sadness, contentment, and every mood in between."** `[INFERENCE]` That expansion is the credibility move: perpetual cheerfulness in an anxiety-adjacent product reads as evasion; an illustration set that can draw distress reads as having met the user. `[SOURCED]` — [It's Nice That, Apr 2024](https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424)

A third-party reconstruction of Headspace's tokens (**weak source — not official**) reports canvas `#f9f4f2`, ink `#2d2c2b`, radii 8/12/24/32, and **no elevation at all**. If accurate, the warmth mechanism is cheap to copy: warm off-white ground and warm-charcoal text instead of `#FFF`/`#000`, generous radii, shadowless. `[SOURCED — weak]` — [oh-my-design.kr](https://oh-my-design.kr/design-systems/headspace)

**CALM (suicide prevention, UK) — the counterexample that matters.** CALM does *not* solve warmth-vs-credibility by being softer. Its identity is "irreverent, bullish, empathetic" — three distinct palettes mapped to those traits, combinable boldly or dialled down per context — with hand-drawn scribbles and physical textures. The governing line: **"Irreverence and a sense of defiance runs through it all, avoiding mental health tropes and anything twee."** It explicitly rejects "'us and them' narratives of the strong helping the weak," positioning as peer rather than authority. `[INFERENCE]` **If the design direction assumes warm = soft, this is the counterexample.** Before committing to soft, check whether a 15-year-old would experience softness as being handled. `[SOURCED]` — [Studio Output](https://www.studio-output.com/work/calm/)

**Farewill (wills and cremation).** Stock photography abandoned entirely for custom illustration — a mascot "Blob," "a soft, protective, big friendly giant," plus a cat and tortoise as metaphors for time. The stated brief: *"you're dealing with someone who's bereaved, so it's important to get the balance right between friendly warmth and legal professionalism"* — moving away from law-firm convention and "fifty shades of blue." Credibility is carried entirely by hard commercial facts and fixed transparent pricing. **The illustration never has to carry trust, so it is free to be genuinely soft.** `[SOURCED, 2020 — dated]` — [Design Week](https://www.designweek.co.uk/issues/27-january-2-february-2020/rebranding-death-farewill-identity/)

**Oscar Health (insurance).** Display: **Heldane**, an upright quirky serif chosen for "maturity and authority." Body: **Lettera**, a monospaced grotesque, "warm, approachable, and veers towards tech." The serif supplies authority; the mono supplies warmth. Illustration uses **visible brushstrokes**; photography is ~50 images of actual members "without heavy post-production styling." Six voice principles: Clear, Caring, Credible, Diverse, Inventive, **Imperfect** — "Imperfect" as a named principle in a health insurer is what licenses the un-retouched photography. `[SOURCED]` — [Oscar Design](https://oscardesign.team/How-we-redesigned-the-Oscar-brand-to-speak-to-our-growing-member-base)

**Natural Cycles (contraception) — sober restraint at exactly the decision point.** Brand voice is conversational and analogical; the *numbers layer* is uncompromising. 93% typical / 98% perfect use, both defined, its own failure mode named in the definition, a comparison carousel against six competing methods, and specific citations (*Contraceptive Technology* Table 26-1, 21st ed.; peer-reviewed study; FDA clearance from "more than 15,000 women over 180,000 cycles"). **Warmth in the connective tissue, zero warmth in the efficacy claim.** `[SOURCED]` — [Natural Cycles](https://www.naturalcycles.com/how-effective-is-natural-cycles)

**Lemonade (insurance) — warmth by subtraction.** Policy 2.0 cut the renters policy to 2,300 words, "almost 90% lighter than its predecessor" against an industry norm around 20,000. It names the archaisms it kills ("pewterware," "smudging," "bailee"). The rationale is quotable: **"an exception is a resentment waiting to be born. And since insurance policies read like a laundry list of exceptions… they ooze resentment."** The credibility counterweight is structural — drafted "in consultation with state regulators," then published open-source for public editing. `[SOURCED, 2018 — dated]` — [Lemonade Stories](https://medium.com/lemonade-stories/worlds-first-open-source-insurance-policy-blog-9c3ebb70edff)

**Flo — a credibility-*repair* case, not a trust exemplar.** Flo's architecture is genuinely instructive: ISO 27001 (2022), ISO 27701 (2024, first period app), an independent Privacy & Security Advisory Board, and **Anonymous Mode** — using the product without sharing identifying information, named as a product feature. But `[CONTESTED]` there was a 2022 FTC settlement over 2016–2019 data-sharing disclosures and a separate $8m privacy settlement. Cite the mechanics, not the halo. `[SOURCED]` — [Flo privacy journey](https://flo.health/our-privacy-journey), [Flo privacy FAQs](https://flo.health/flo-privacy-faqs)

**Parsley Health — the failure mode to name.** Its credibility page leads with "Nearly 9 out of 10 members report symptom improvement within their first year." `[CONTESTED]` That statistic rests on Parsley's own proprietary "Parsley Symptom Index" — internal measurement, not independent validation. **Credential-stacking and self-generated statistics look like rigour at a glance and don't survive scrutiny** — the exact opposite of Natural Cycles' externally-cited comparison table. `[SOURCED]` — [Parsley](https://www.parsleyhealth.com/why-it-works)

### The research literature, honestly aged

**Fogg et al. (2003), n=2,684:** "design look" was mentioned in **46.1% of comments** evaluating web credibility — the single most-cited factor. `[DATED — 2002/2003, ~23 years old, predates mobile and app UI.]` A modern replication at comparable scale does not appear to exist. Cite it as the origin of the idea, not as current evidence. `[SOURCED]` — [ACM](https://dl.acm.org/doi/10.1145/997078.997097)

**Fogg's Stanford Web Credibility Guidelines** (2002, from research with 4,500+ people). The ones that bite here: *show that there's a real organization behind your site*; *highlight the expertise*; *show that honest and trustworthy people stand behind your site*; *design your site so it looks professional **(or is appropriate for your purpose)***; ***use restraint with any promotional content***; *show it's been reviewed recently*. `[INFERENCE]` That parenthetical in guideline 6 — *appropriate for your purpose* — is the licence for everything CALM and Farewill do. `[SOURCED]` — [credibility.stanford.edu](https://credibility.stanford.edu/guidelines)

**Warmth and competence as separate axes.** Kervyn, Fiske & Malone's Brands as Intentional Agents Framework holds that "consumers perceive brands in the same way they perceive people," mapping perceived intentions (warmth) and ability (competence). `[CONTESTED — genuinely]` It was published alongside formal commentaries challenging it, with an author response. Influential, not settled. Aaker's 1997 brand-personality model separates Sincerity from Competence — the empirical ancestor of this whole tension, `[DATED — 29 years old]`. `[SOURCED]` — [Kervyn, Fiske & Malone 2012](https://myscp.onlinelibrary.wiley.com/doi/abs/10.1016/j.jcps.2011.09.006), [Fiske et al. response](https://myscp.onlinelibrary.wiley.com/doi/10.1016/j.jcps.2011.12.002)

---

## 2. Designing for teenagers without being childish

### The evidence base, stated up front

The canonical source — [NN/g's *UX Design for Teenagers (Ages 13–17)*](https://www.nngroup.com/reports/teenagers-on-the-web/), built from 13 years of research, 100 teens, 210 websites, 30 apps across US/UK/Australia — has its **most recent participants born 2001–2005**, meaning the newest data is roughly 2018. NN/g has published essentially nothing new on teen visual design since 2019. `[DATED — flag this wherever it is cited.]` A 2019 teen and a 2026 fourteen-year-old have different reference points.

### Anti-patterns, named concretely

The lexical one first, because it is the most actionable: **"The word 'kid' is a teen repellent."** Sections labelled "Kids" were "perceived as repellent." This extends to *Junior*, *Youth*, *Mini*, *For young people*. `[SOURCED]` — [NN/g](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)

This is directly observable in the market. Compare two live headlines:

- **Greenlight:** "The #1 family finance and safety app. The debit card for **kids**." Body: "**Their** money. **Your** guardrails." — the teen is grammatically a third party being discussed.
- **Step:** "BANKING FOR THE NEXT GENERATION." "financial independence at **your** fingertips." — the teen is the addressee.

`[INFERENCE]` Greenlight's construction is the anti-pattern in pure form: *about* the young person rather than *to* them, with possessive-plus-oversight framing announcing that the teen is not the decision-maker. If your premise is that a 15-year-old is making a real decision, copy that grammatically demotes them to object contradicts the premise on the first screen. `[SOURCED — verbatim from live pages]` — [greenlight.com](https://greenlight.com/), [step.com](https://step.com/)

NN/g's specific visual rejections: **heavy animations and garish colour schemes** designed for younger users; **"neutral graphics rather than childish ones"**; **condescending or babyish tone**; pointless multimedia and overused interactive features; tiny type ("You go to Music and it's real tiny… You have to squint" — 16-year-old participant); dense text on cluttered screens; slow loads ("I hate this waiting… I would go to a different site" — 17-year-old); forced social sharing; popup ads; forced registration creating a public profile, described as something that **"violates trust."** `[SOURCED]`

Note the phrase **"neutral graphics"** — that is NN/g's own word, and it is unusually specific. Not *cool*, not *edgy* — **neutral**. `[INFERENCE]` For a serious-decision product this maps to: photographic or restrained-geometric imagery over character illustration; a dominant neutral with one or two accents rather than a rainbow; illustration that **explains** (diagrams, states, comparisons) rather than **emotes**.

The practitioner framing worth stealing, from [LogRocket's 14 principles](https://blog.logrocket.com/ux-design/14-principles-designing-products-for-teenagers/): treat teens as **"inexperienced young adults"** requiring "respect and seriousness." *Inexperienced*, not *immature* — **the remedy for inexperience is explanation; the remedy for immaturity is simplification, and these produce opposite designs.** `[CONTESTED]` Note this same article simultaneously recommends streaks, points and infinite scroll, which sits badly with its own seriousness principle. Present both, note the tension.

### Tone failure modes to name explicitly

`[INFERENCE — synthesised across NN/g, LogRocket, and the university research in §5]`

1. **The cheerleader.** Exclamation marks, "You've got this!", confetti on trivial actions. Brilliant's own designers describe their mascot Koji as one that "lower[s] the stakes for learners and act[s] as a natural cheerleader" — a defensible choice *for a learning product where lowering stakes helps*, and the wrong choice where stakes are genuinely high and the user knows it. **Lowering the stakes of a real decision reads as dishonesty.** `[SOURCED for Brilliant's intent]` — [Peter Cho on the Brilliant refresh](https://pcho.medium.com/a-brilliant-brand-refresh-4af021c11486)
2. **The buddy.** Slang, emoji in system copy, "Hey!" openers. Performed matiness reads as sales technique to a group documented as commercially sensitised (§2, trust).
3. **The withholder.** Progressive disclosure that hides *consequential* facts (cost, eligibility, deadlines) behind "Learn more" is read as concealment, not tidiness.
4. **Marketese.** The most directly sourced of the four — see §5.

### What teen-respected products actually do

**Step** is the clearest positive case and has real documentation. Its homepage leads with concrete numbers rather than adjectives — 3.00% on savings ("over 7x the national average"), FDIC insurance up to $1,000,000, and a hero screenshot showing **a credit score of 732**. `[INFERENCE]` Showing a credit score in the hero is the most "adult" move available in fintech: it tells the teen the product produces the artifact adults care about. A designer case study reports research conducted with the University of Minnesota finding that teens require "immediate clarity" and that **"trust and legitimacy matter significantly during onboarding."** `[SOURCED]` — [step.com](https://step.com/), [brand.step.com](https://brand.step.com/), [Greg Hill case study](https://www.greghilldesign.com/work/the-step-app)

**Brilliant** complicates the simple story usefully. Its 2024 refresh **added** a mascot and **brightened** the palette while targeting teens through thirties. What makes it work is separation of registers: the mascot carries the *emotional* register while a licensed custom foundry cut (CoFo Sans, custom for Brilliant — an expensive, adult craft signal) carries the *credibility* register. `[INFERENCE]` **The failure mode is when the mascot register bleeds into the informational one — when the cartoon delivers the consequential news.** Cite Brilliant for its type/craft strategy; do not import its stake-lowering strategy. `[SOURCED]`

**Khan Academy's** 2026 colour-system rebuild is worth citing for what it *doesn't* contain: the entire published rationale is structural and accessibility-driven — primitives keyed 0–100 by lightness, every combination stress-tested so foreground tokens hit 4.5:1+ on all backgrounds — with **no commentary on learner age or visual maturity whatsoever** (verified by reading it). `[INFERENCE]` At scale, "does it look grown-up" is downstream of a rigorous token system. **Sloppy contrast reads as amateur, and amateur reads as untrustworthy faster than bright reads as childish.** Their brand illustration is flat and geometric, explicitly built to be "accessible across demographics like age and global location" — age-neutral geometry, which is NN/g's "neutral graphics" in practice. `[SOURCED]` — [Khan Academy colour system](https://blog.khanacademy.org/how-we-rebuilt-khan-academys-color-system-from-the-ground-up), [Natalie Fitzgerald](https://natalie-fitzgerald.com/khan-academy-brand-design)

**Flo's Anonymous Mode** is the most directly stealable pattern in this section: *let the user engage without identifying themselves, name it as a feature, and state your security posture in specifics* (TLS 1.2/1.3, AES-256) *rather than adjectives*. This aligns with NN/g's finding that forced registration violates teen trust. `[SOURCED]`

`[GAP]` No citable design rationale exists for Greenlight, Current, Copper, Revolut <18, Photomath, or Quizlet. No research meeting a citable bar on Notion/Todoist student use. No empirical test of whether teens find any specific product's aesthetic (Duolingo's included) infantilising — all claims either way are practitioner assertion.

### How teens assess trustworthiness — and how it differs from adults

**They judge on appearance and don't know they're doing it.** Brown & Gummerum (2025), n=375, selective-trust task on paired webpages: **over 60% never mentioned accuracy**; appearance — "aesthetics, colour, readability and detail" — dominated. Older adolescents showed significantly stronger selective trust; the younger group (mean 13.74) did not discriminate between typographical and semantic errors at all. **Your user sits at that boundary.** `[SOURCED]` — [BJDP 2025](https://bpspsychub.onlinelibrary.wiley.com/doi/full/10.1111/bjdp.12559)

**They are weak at articulating why, but commercial language is one of the few cues they reliably deploy.** Hämäläinen et al. (2022), n=73 Finnish 16–17 year olds `[caveat: 68.5% female, 2020 pandemic data]`: mean credibility-justification score 20/48; students "relied on salient visual cues (e.g., commercial indicators, advertising language)." **~13.7% failed to question a CEO's benevolent intentions** despite obvious commercial bias. And: **time spent on task was the only statistically significant predictor of justification quality.** `[INFERENCE]` Two implications — any copy that pattern-matches to advertising will be caught fast, and **deliberate friction at the decision point measurably improves evaluation quality**, which reframes slowing the user down as a feature rather than a conversion cost. `[SOURCED]` — [Educ Inf Technol 2022](https://link.springer.com/article/10.1007/s10639-022-10907-x)

**"Teens trust peers not institutions" is the wrong frame.** 81% of teens get news from influencers at least sometimes (vs 57% all ages) — but **"follower count is the least important" reason they choose creators.** What they use instead: whether the person is "getting their information from reliable sources," and **visible connections to established outlets**. Transparency about advertising ranked highly. They want assurance visuals are "made by people and not AI." `[INFERENCE]` This is not peer-vs-institutional trust. It is **shown-working versus asserted-authority.** Institutional authority still counts — but only when *evidenced*, not *claimed*. That means: named humans, visible sourcing, stated method, disclosed commercial interest, hard numbers — **not** testimonial carousels, crests, or "10,000 teens joined this week." `[SOURCED]` — [American Press Institute](https://americanpressinstitute.org/teen-news-media-trust/)

**Visible safeguards are a trust asset for this group, not friction.** Common Sense Media (Jan 2025, n>1,000 US teens 13–18, nationally representative): ~60% doubt tech companies will prioritise their wellbeing over profits, ~50% lack confidence in their responsible-AI decisions — **but ~75% endorse protective measures** (privacy protections, content warnings, AI labelling). `[INFERENCE]` Three-quarters actively *want* the safeguards. For a 15-year-old, "here's what happens to your data" and "this decision is reversible until X" plausibly read as respect where an adult would read them as legal throat-clearing. `[SOURCED]` — [Common Sense Media](https://www.commonsensemedia.org/research/research-brief-teens-trust-and-technology-in-the-age-of-ai)

`[GAP]` No measurement of teen first-impression latency (no teen equivalent of the adult 50ms literature). **No study on teen response to paywalls or upsells in a serious-decision context** — a real hole given this product charges them.

---

## 3. The dual-audience problem

### The finding that matters most

**No precedent exists for this product's actual structure.** Every documented product in this space has an *asymmetric* arrangement — the parent buys and the teen uses, or the parent buys and the teen is monitored. Searching teen banking, family health, tutoring marketplaces, driving schools and admissions consulting turned up **no named product where a teenager and a parent each purchase independently and both are full customers.** The patterns below were evolved to solve a buyer/user split, not a two-buyer split. Mechanisms 1–4 transfer cleanly; the permission-based ones assume a hierarchy this product may not have and may actively want to avoid.

### The one-skin / two-doors model

| Layer | Shared or split? |
|---|---|
| Logo, colour, type, illustration | **Shared** — near-universally |
| Navigation route (`/families`, `/parents`) | **Split** |
| Argument / value proposition | **Split** |
| Second-person "you" | **Split** — the sharpest tool available |
| Data visibility & permissions | Split (not applicable here) |

**Monzo says it out loud:** *"They need the same app as you. We've just added certain restrictions to keep them safe."* The help page describes **no visual difference at all** — differentiation is entirely functional. And a neat secondary move: rather than making the app teen-flavoured, Monzo keeps the adult chassis and hands the teen a **personalisation surface** (wallpaper, icon, profile picture). Self-expression is delegated to the user instead of pre-baked into the brand. `[SOURCED]` — [Monzo Help](https://monzo.com/help/monzo-for-under-16s/under-16s-child-app-web)

**Step routes the parent to a side door.** The homepage is teen-addressed with **zero mention of parental controls**; a single nav link — "Families" — leads to a page where copy shifts to "Step empowers *you* to block merchants, freeze cards, and monitor spend," with FDIC insurance, Visa Zero Liability and press logos. **The visual identity does not change.** `[SOURCED — read directly]` — [step.com/families](https://step.com/families)

**Aceable keeps the mascot on the parent page.** Teen page: "You're a visual, auditory, or hands-on learner," memes, robot voice-over, frame of **independence**. Parent page: "We're not just a Drivers Ed company; we're your partner through this journey," progress tracking, a guide to "effective (and fight-free!) driving lessons," frame of **scaffolded support**. The logo, the blue/yellow palette, and **Ace the Robot all survive the crossing.** `[INFERENCE]` This is a direct counter to the instinct that parents need a soberer skin. `[SOURCED]`

**Wyzant splits the grammar, not the design.** Headlines address the learner in second person ("Your next great tutor"); **all testimonials are in the parent's voice** ("Our 5 year old son enjoys every lesson," "My son is a high school sophomore"). No role selection anywhere. `[INFERENCE]` **Address the user in second person; address the buyer in third-person social proof.** The teen reads copy written *to* them; the parent reads copy written *by people like them*. Neither is displaced and the identity never forks. `[SOURCED]`

**Varsity Tutors sidesteps role entirely.** No parent path, no student path, no "are you a parent or a student?" gate. The primary interaction is **"Select Grade Level."** `[INFERENCE]` This is the most directly transferable trick in the section: **segment by the subject of the service, not the role of the visitor.** A parent and a 15-year-old answer "9th grade" identically, and nobody is forced to declare a role that would reveal the product wasn't built for them. Worth weighing against the existing screen-2 persona branch. `[SOURCED]`

**The counter-recommendation, and why it doesn't apply.** The financial-UX consultancy UXDA explicitly recommends two separate apps: "Kids like animation and sound. They want entertainment" versus parents who are "busy and more goal oriented." `[Scope caveat that matters]` UXDA's case targets roughly **ages 6–8**. `[INFERENCE]` The two-identity recommendation is defensible for young children and collapses for a 15-year-old — who is precisely the user who rejects the animated-character register. Do not import it across the age boundary. `[SOURCED]` — [UXDA](https://theuxda.com/blog/ux-case-study-impact-our-childrens-financial-future-with-banking-app)

### What breaks

1. **The age ceiling — best evidenced.** Every wide-band product drifts young and strands its oldest users. Acorns Early's lessons are "tailored by age" for **6–14** in a product sold as 6–18. A Revolut App Store reviewer: the app "seems like it's made for kids under 14," asking for "different options for different age groups." `[INFERENCE]` A 15-year-old sits exactly at the fracture line — old enough to detect the drift, young enough to still be in range. `[SOURCED]` — [Finder](https://www.finder.com/kids-banking/gohenry-kids-debit-card-app), [App Store](https://apps.apple.com/us/app/revolut-teen-finance/id1499857038)

2. **Visible asymmetric power — the Life360 case.** Teens ran an organised **one-star review campaign** attempting to get Life360 removed from app stores; #Life360 hit 214.8M TikTok views split between ranting and evasion tutorials. Teen sentiment: *"To me, it means that your parents don't trust you."* The fix was **not a teen skin** — it was **Bubbles**, giving the teen a generalised-radius share the parent cannot silently override, plus a CEO who went onto TikTok personally. `[INFERENCE]` **A beautifully teen-styled surveillance product still gets one-starred.** Teen willingness to pay tracks *agency granted*, far more than *how it looks*. `[SOURCED]` — [TechCrunch](https://techcrunch.com/2020/10/12/family-tracking-app-life360-launches-bubbles-a-location-sharing-feature-inspired-by-teens-on-tiktok), [Hi-Life Online](https://hilifenewsmag.com/2890/archive/2020-2021/life-360-adult-supervision-or-adult-superveillance/)

3. **Cutesiness read as condescension.** In a review of period apps aimed at teens, one was dismissed because its design "reminds me of those interactive learning games kids use," while **Clue — a mainstream adult app — was the reviewer's pick for teens**, praised specifically for *not* being "50 shades of pink." `[INFERENCE]` In a category where the teen is the user and often the buyer, the winning aesthetic is adult and neutral. `[SOURCED]` — [Knix](https://www.knixteen.com/blogs/the-rag/the-best-teen-and-tween-period-apps)

### Adult-first or teen-first?

**Evidence for adult-first:** NN/g's ecommerce finding (teens' highest success rates on sites designed for adults). Universal product convergence — Revolut, Current, Monzo all moved teen products *toward* the adult one; none moved the other way. The Clue-over-pink-app finding.

**Evidence for teen-first:** Step's teen-first strategy reached 1M+ users on an interchange model where teen engagement *is* the revenue, while analysts flag Greenlight's parent-first focus as a weakness. Aceable's mascot survives contact with anxious parents.

`[INFERENCE — the reframe]` The axis is slightly wrong. Decompose it:
- On **visual maturity** (ornament density, cuteness, mascots-as-scaffolding, saturation), the evidence points **adult-ward**, and it is unanimous.
- On **energy** (colour confidence, humour, informality), the evidence says the adult tolerates it fine — Aceable is the direct case. `[Suggestive, not proven — no study isolates adult tolerance of playful design.]`

The asymmetry that makes this actionable: **a parent's objection to a teen-energetic design is aesthetic and survivable; a teen's objection to a juvenile design is identity-based and fatal.**

`[GAP]` The "age-inclusive design" literature is almost entirely about older adults and accessibility, and its default recommendation (reduce, simplify, enlarge) is exactly the lowest-common-denominator move to avoid. **Do not source the direction from it.** Buyer-vs-user literature is overwhelmingly B2B.

---

## 4. Colour: trust without coldness

### What is actually known versus folklore

**The honest headline: "blue = trust" is the best-supported claim in colour marketing, and it is still small, context-dependent, and probably learned rather than intrinsic.**

**The one real direct test.** Alberts & van der Geest (2011), 200+ participants, finance/legal/medical sites, identical layouts varying only in colour scheme (red, blue, green, black): **blue rated most trustworthy, black least** — but the effect was **modest relative to other trust factors**. Note what was *not* tested: warm hues other than red, warm neutrals, or accent-vs-dominant application. **Coral, terracotta, amber and warm greys were never in the study.** Anyone extrapolating "warm = untrustworthy" from this is over-reading a four-cell design. `[SOURCED]` — [Twente repository](https://research.utwente.nl/en/publications/color-matters-color-as-trustworthiness-cue-in-web-sites)

**The finding designers should actually use — congruence beats hue.** Bottomley & Doyle (2006): functional products are judged more appropriate in "functional" colours, sensory-social products in "sensory-social" colours; when consumers understand a brand's positioning, they judge colour-aligned choices as more suitable. `[INFERENCE]` **There is no trustworthy hue, only hues congruent or incongruent with a stated positioning.** A warm palette is not a credibility liability if the positioning it signals is the positioning you actually claim. `[SOURCED]` — [Marketing Theory](https://journals.sagepub.com/doi/10.1177/1470593106061263)

**The field's own most prominent researcher says it isn't ready to apply.** Elliot's 2015 review lists blue-and-trust among findings with multi-lab support, but his audit of the field is damning: theory is "either extremely specific or extremely general"; research focuses overwhelmingly on red and **mostly ignores lightness and chroma — exactly the dimensions a designer manipulates most**; colour is inadequately specified at the spectral level; persistent underpowered samples. He recommends "patience and prudence" before real-world application. `[SOURCED]` — [Frontiers in Psychology 2015](https://www.frontiersin.org/articles/10.3389/fpsyg.2015.00368/full)

**A cautionary calibration.** The red-and-attraction effect — far more studied than any colour-trust claim — collapsed under meta-analysis: *d* = 0.26 (I² = 89%) for men rating women, *d* = 0.13 with **clear publication-bias evidence** for women rating men; ~48% and ~64% of the data came from *unpublished* sources. Co-authored by Elliot himself. `[INFERENCE]` **Your prior for any specific hue→trait effect should be "small at best, probably swamped by context."** `[SOURCED]` — [Lehmann, Elliot & Calin-Jageman 2018](https://journals.sagepub.com/doi/10.1177/1474704918802412)

### Named folklore — do not repeat these

| Claim | Reality |
|---|---|
| **"62–90% of snap judgments are based on colour alone"** | Traceable to Singh (2006), *Management Decision* — **a literature review, not original research**, asserting the figure with no cited primary source. Downstream blogs attribute it to an "Institute for Color Research" or "Seoul International Color Expo 2004," neither retrievable as peer-reviewed work. **Unsourced.** |
| **"Red buttons convert better than green" (HubSpot)** | The surrounding page was green. **Contrast won, not hue.** A salience finding dressed as colour psychology. |
| **"Blue conveys trust" as intrinsic** | Even sympathetic design press concedes it operates "through repetition, not inherent properties." Blue is also the most-preferred colour in all 10 countries YouGov surveyed — **and what every finance incumbent already uses.** Perceived credibility from blue is plausibly category-convention learning. `[Testable; as far as I can find, untested.]` |
| **Gendered colour preference charts** | Sourced almost universally to Joe Hallock's **undergraduate coursework**, small Western convenience sample. |
| **Colour-meaning tables ("green = growth, purple = luxury")** | No traceable experimental basis. Recur verbatim across marketing blogs. |
| **Any "colour X raises conversion by Y%"** | Effectively always a single A/B test with confounded contrast, hierarchy and copy. |

`[Not verified — worth chasing]` Su & Cui (2019) "Trustworthy Blue or Untrustworthy Red"; Cyr, Head & Larios (2010) cross-cultural colour-and-trust; Hawlitschek et al. (2016) incentivised trust-game with manipulated UI colour. These three would most change the picture; none were readable.

### The architecture every warm-but-credible brand uses

```
warm saturated hue   → logo, primary CTA, illustration, marketing
near-neutral ground  → 90%+ of surface area (often warm off-white)
very dark warm text  → near-black with a temperature, never #000
```

**Monzo codifies this as a rule.** The brand book's "considerate use" slide states hot coral "is exhausting at scale," should be avoided for long-form reading and product UI, and that product UI should **"default to deep navy on soft white."** `[SOURCED]`

**These brands do not solve warm-vs-credible by finding a magic warm hue. They decouple brand colour from interface colour and let the interface be sober.**

| Product | Warm/accent hue | Dark anchor | Note |
|---|---|---|---|
| **Ethos** (life insurance) | Blaze Orange `#FA640A` | Evening Sea `#054742` | Cream ground `#FFF2E3`. Orange in a maximally trust-sensitive category; the deep teal-green does the holding up. |
| **Mailchimp** | Cavendish Yellow `#FFE01B` | Peppercorn `#231E15` — a dark **brown** | Yellow is unusable as text, so it's *forced* into a hero role. The warmth carried through the product is the brown. |
| **Anthropic / Claude** | Clay `#d97757` | `#141413` | Bone ground `#faf9f5`. The clay is notably **desaturated** vs Monzo's coral. **Closest reference to this brief.** |
| **Wise** | Bright Green `#9FE870` | Forest `#163300` | The lime alone would read as a fitness app. |
| **Notion** | Orange `#d9730d` (accent only) | `#37352f` | Grounds `#f7f6f3`/`#f1f1ef`. **Every neutral is warm-shifted; essentially no brand hue in the UI at all** — the entire personality is neutral temperature. `[community-documented, not official]` |
| **Airbnb** | Rausch `#FF385C` | `#222222` | Note: `#FF5A5F` is the *old* value. Interface is almost entirely `#222` on white. |
| **Parsley Health** | Tradewind `#64BCAE` | Plantation `#284849` | Cream ground `#F8F6F2` for clinical content. |
| **Oscar Health** | Dodger Blue `#4F50FF` | `#0A0B09` | **Negative case:** the "warm, friendly insurer" positioning is carried by illustration and voice, *not* hue. |

`[Method caveat]` Hex values marked from Brandfetch are auto-extracted and can drift from official guidelines; two aggregators contradicted each other on Monzo (`#FF4F40` vs `#FF4B44`). **Verify before use.**

### Warm neutrals — the one piece of real evidence

Rello & Bigham (2017), ASSETS, **n=341** (89 with dyslexia, 252 controls), 10 background colours with black text: **"Warm background colors, Peach, Orange and Yellow, significantly improved reading performance over cool background colors, Blue, Blue Grey and Green."** Fastest: Peach 14.85s, Orange 15.33s, Yellow 16.30s. Slowest: Blue Grey 21.57s. **Both groups showed the same ordering** — this is not a dyslexia accommodation. `[Limitation the authors state: reading time only, not subjective preference.]` `[SOURCED]` — [CMU PDF](https://www.cs.cmu.edu/~jbigham/pubs/pdfs/2017/colors.pdf)

**Use this honestly.** It supports "a warm off-white ground reads at least as well as, probably better than, cool grey." It says **nothing** about trust or credibility. Do not let it migrate into a trust claim.

`[INFERENCE — flagged, no evidence found]` Three further arguments for warm neutrals: (a) a warm ground makes a warm accent legible as *intentional* — coral on cool grey reads as a mismatch, coral on bone reads as a system; (b) warm neutrals let you spend one saturated hue very sparingly while the interface still feels warm; (c) `#FFF` + `#000` + one saturated hue is the visual signature of template work, and warm neutrals are cheap differentiation from that. (c) is a craft-signal argument that plausibly feeds perceived competence, but **no study tests it.**

### Czech and Central European specifics

**The honest headline: no rigorous research exists on Czech colour perception or Czech-specific trust cues.** Searches returned only adjacent consumer-behaviour work. **Anyone claiming a "Czech colour sensibility" is speculating.** What follows is market evidence, which is more useful than invented psychology.

**The state's own answer is blue with an orange secondary.** [Design systém gov.cz](https://designsystem.gov.cz/principy/barvy), maintained by DIA: Light Blue `#9EC8E9`, Blue `#00469B`, Dark Blue `#0C1838` as primary "pro klíčové akční prvky"; **orange as secondary** for contrast and hierarchy. Adoption is mandatory for systems requiring Chief Architect approval. `[INFERENCE]` If you are positioning near or against public services, that is your contrast reference — and the existence of an orange secondary is a small licence for warmth in a Czech civic context. `[SOURCED]`

**The Czech market's most-liked bank is deliberately not blue.** Air Bank uses Atlantis `#99CC33` with Verdun Green `#497D00` — the same bright-hue-plus-dark-anchor architecture as Wise — in a category where Česká spořitelna (`#2870ED`), Komerční banka and ČSOB are all blue. **KPMG's Czech customer-experience survey ranked Air Bank first and Rohlík.cz second.** `[INFERENCE]` This does not prove green caused it — Air Bank's differentiation is overwhelmingly fee transparency and service. But it is a strong existence proof that **a non-blue Czech financial brand can be the trust leader.** `[SOURCED — headline results; methodology not verified]` — [HN.cz on KPMG survey](https://byznys.hn.cz/c1-67823690-pruzkum-kpmg-v-hodnoceni-firem-opet-vyhrala-air-bank-druhy-je-rohlik-cz)

`[Amusing and instructive]` The published rationale for Air Bank's green and mBank's red is anecdotal — aliens and a bullfighter's muleta. **Even the banks' own origin stories are not evidence.** — [Finance.cz](https://www.finance.cz/zpravy/finance/359194-proc-je-air-bank-zelena-a-mbank-cervena-kvuli-ufonum-a-mulete/)

**Two Czech warm-palette leads worth checking directly:** Rohlík.cz (Brown Rust `#AE6E3B`, Narvik `#F1FAF2` — **caveat: may be extracted from the bread-roll logo rather than the interface**) and Zonky (Potters Clay `#8A6D3B` with Surfie Green `#117E77`) — **a peer-to-peer lending brand, genuinely trust-critical, using clay brown with a teal anchor.** Structurally almost identical to Ethos.

**The Czech state's own stated diagnosis is about trust, not beauty.** Designer Jakub Spurný: *"Současný stav, kdy má každé ministerstvo vlastní logo, je matoucí."* Minister Lipavský on a foreign partner facing five institutions with five logos: *"Výsledkem je zmatek a pochybnosti."* The stated goal of the new visual style is *"důvěru, srozumitelnost"* — trust and comprehensibility. `[INFERENCE]` The prior state made citizens unable to tell what was official. **That is exactly the problem a teen product inherits when it looks like an ad-funded directory.** `[SOURCED]` — [Forbes.cz](https://forbes.cz/stat-ziska-vizualni-styl-od-studia-najbrt-soucasny-stav-je-matouci-rekl-designer/), [MZV press release](https://mzv.gov.cz/jnp/cz/udalosti_a_media/tiskove_zpravy/cesko_predstavilo_novy_jednotny_vizualni.html)

`[GAP]` No evidence that Czech audiences read any colour differently from Western European averages. No Czech-language academic work on colour and perceived credibility.

---

## 5. Reducing anxiety in a high-stakes decision interface

### Why the 15-year-old case is genuinely different

Somerville et al. (2013), fMRI, n=69 aged 8–22.9, told a camera was recording their face for a peer: self-reported embarrassment peaked at **~17.2 years**; skin conductance at **~14.4 years**; medial prefrontal response showed an inverted-U peaking at **~15.3 years**. **Arousal was elevated in the *anticipation* condition, not just during evaluation.** `[SOURCED]` — [PDF](https://bpb-us-e1.wpmucdn.com/sites.harvard.edu/dist/b/261/files/2023/03/somerville2013_psychsci.pdf)

`[INFERENCE — no study tests this UI claim]` Your user sits almost exactly at the physiological peak of social-evaluative reactivity. An interface that *looks like* it is about to evaluate them — a loading spinner before a score, "calculating your match…", a number counting up — likely triggers arousal before any content is delivered. **Never stage a reveal. Never use anticipation as an engagement mechanic.**

### The match-score problem

**First, be honest about what the number can carry.** Joel, Eastwick & Finkel (2017, *Psych Science*) applied machine learning to two speed-dating samples with 100+ pre-measured traits: actor and partner variance were predictable, but **partner-specific compatibility — the thing "match %" claims to measure — was not predictable at any meaningful level.** `[SOURCED]` — [SAGE](https://journals.sagepub.com/doi/abs/10.1177/0956797617714580)

**Second, the number moves behaviour regardless of truth.** OkCupid's own published experiment displayed 90% to true-30% pairs and 30% to true-90% pairs. Displayed percentage drove message exchange largely independently of actual compatibility. Rudder: **"the mere myth of compatibility works just as well as the truth."** `[SOURCED]`

`[INFERENCE]` **This is the most design-relevant finding in the brief.** A displayed fit number is not a neutral readout — it is an intervention. It will change which schools a 15-year-old applies to, and much of that effect is the number's *social authority*, not its information content. Under a zero-shame rule this creates an obligation.

**Third, the closest real analogue caused documented harm.** GreatSchools' 1–10 rating: Chalkbeat's investigation found "strikingly few schools serving mostly low-income, Black, or Hispanic students scored well — even if their students were making significant progress each year," and cited research finding that **housing segregation increased** as families moved toward higher-rated schools. The 2020 overhaul shifted weight toward **growth rather than absolute level**. `[INFERENCE]` Two transferable lessons: a compressed score **inherits the biases of its inputs and launders them as objectivity**; and **growth/trajectory framing is less identity-threatening than level framing** — it was the specific fix a major player reached for. `[SOURCED]`

### What each product actually does

| Product | Form | Notes |
|---|---|---|
| **Hinge "Most Compatible"** | **No number.** One pairing per day, with a reason. | *"we're pairing you with someone… this is the best pairing that we think that we can find."* Market leader in intentional matching, ships no score. |
| **OkCupid** | Bold headline percentage | Documented as manipulable and unvalidated against outcomes. |
| **Niche** | **Letter grades A+ … D−**, explicitly a "report card" | The exact grammar of academic judgment. **Uniquely bad for a 15-year-old audience.** |
| **CollegeVine chancing** | Percentage + safety/target/reach | The softening ("don't count yourself out") lives **in the blog, not the UI**. Structural mistake — see §5 on inline caveats. |
| **23andMe** | Categorical + explicit non-diagnosis framing | **Best-worded example found.** Hedges in *both* directions: *"Having a variant… doesn't mean you'll get that condition"* AND *"if you don't have the variant it doesn't mean you are free of risk."* |
| **Function Health** | Count of biomarkers "out of range" | See below. |

**The Function Health cautionary tale.** A *TIME* journalist's results showed "20 of my biomarkers were out of range, and 85 were normal." Her response: *"Each time a measure was off, I dramatically declared that I was dying, and then proceeded to Google every possible explanation, working myself into a stupor."* She started searching for a cardiologist. What resolved it was **a human walking her through interpretation.** `[INFERENCE]` The failure is not accuracy. It is that deviations were presented as a **count** — which reads as a tally of things wrong with you — and that **interpretation was not shipped alongside the data.** A UI showing "3 of your 7 priorities are not met here" replicates this exactly. `[SOURCED]` — [TIME](https://time.com/7176591/function-health-startup-blood-tests-preventive-medicine/)

**The counter-evidence — don't over-correct into vagueness.** The REVEAL Study (randomised, 162 adults) disclosed APOE ε4 Alzheimer's risk status; those learning they were ε4-positive **showed no more anxiety or depression** than those who didn't learn, at 6 weeks, 6 months and 1 year. `[Critical limitation the authors flag]` Participants were "carefully screened for pre-existing emotional problems" and **"trained genetic counselors disclosed the information."** `[INFERENCE]` REVEAL is evidence for *delivery method*, not raw disclosure. Unwelcome probabilistic information, delivered with context by a trusted interpreter, is survivable. **The scaffolding around the number is the intervention, and it must be present in the same moment — not a page away, not in a blog post.** `[SOURCED]` — [BU](https://www.bumc.bu.edu/2009/07/20/disclosing-genetic-risk-for-alzheimers-disease-does-not-cause-psychological-distress)

### Choice overload — build on the right foundation

**Do not cite the jam study.** Scheibehenne, Greifeneder & Todd (2010), meta-analysis of 63 data points: **"The mean effect size of choice overload across all 63 data points… is D = 0.02"** — and "no sufficient conditions could be identified that would lead to a reliable occurrence of choice overload." Published articles showed more overload than unpublished (publication-bias signal); newer studies weaker than older (decline effect). Direct replications with jam, chocolates and jelly beans found no effect. `[SOURCED]` — [PDF](https://scheibehenne.com/ScheibehenneGreifenederTodd2010.pdf)

**Cite Chernev's moderators instead.** Chernev, Böckenholt & Goodman (2015) found that once moderators are modelled a significant effect appears (intercept .41, p = .01), driven by four, all p < .001:

| Moderator | Effect | Meaning |
|---|---|---|
| **Decision goal** | .56 | Effort-minimising goals amplify overload |
| **Choice set complexity** | .55 | Non-alignable attributes, no dominant option |
| **Decision task difficulty** | .37 | Time pressure, accountability, many attributes |
| **Preference uncertainty** | .32 | No expertise, no clear ideal point |

`[INFERENCE]` **A 15-year-old choosing a high school scores maximum on all four.** Non-alignable attributes (you cannot trade "strong arts programme" against "20-minute commute" on a common scale); accountability to parents and teachers; a hard deadline; and profound preference uncertainty — they have never been to high school and may not know what they want. **This is the strongest available case that this product faces real overload, without needing the jam study.** `[SOURCED]` — [PDF](https://chernev.com/wp-content/uploads/2017/02/ChoiceOverload_JCP_2015.pdf)

Chernev also found satisfaction/confidence, regret, choice deferral and switching likelihood are "equally powerful measures of choice overload and can be used interchangeably." `[INFERENCE]` **Deferral rate and post-decision confidence are validated overload proxies and are easy to instrument.**

### Patterns with real evidence

**Categorisation helps novices specifically.** Mogilner, Rudnick & Iyengar (2008, *JCR*): "The mere presence of categories, irrespective of their content, positively influences the satisfaction of choosers who are unfamiliar with the choice domain" — more categories signal greater variety, **enhancing sense of autonomy**. The effect diminishes for experts. `[INFERENCE]` Your user is definitionally a novice; this is the highest-confidence, lowest-risk pattern available. And note the mechanism — categories increase perceived **autonomy**, which is the opposite of feeling judged. `[SOURCED]` — [JCR](https://academic.oup.com/jcr/article-abstract/35/2/202/1806103)

**The directly on-topic RCT.** Corcoran, Jennings, Cohodes & Sattin-Bajaj (NBER w24471) — **literally this product's problem**: NYC 8th graders choosing from a ~400-school directory, 165 middle schools, ~19,109 students. The intervention, **"Fast Facts"**: a customised **one-page list of 30 nearby high schools** with graduation rates ≥70%, sorted descending, showing name, borough, graduation rate, **travel time by public transit**, and admissions methods in **plain language**.

Results: **+9.3pp** more likely to rank a Fast Facts school first; **+1.7pp** graduation rate of matched school; **−6.3pp** likelihood of matching to a low-graduation-rate school; **+3.1–3.5pp** more likely to match to their **own first choice**.

`[INFERENCE]` Note the design: **no score, no ranking of the student, one page, plain language, and a hard-nosed practical attribute (commute time) given equal billing with an outcome attribute.** The intervention that worked was **curation plus legibility, not scoring.** And it improved the student's odds of getting *their own* first choice — agency honoured, not overridden. `[SOURCED]` — [NBER PDF](https://www.nber.org/system/files/working_papers/w24471/w24471.pdf)

**The strongest evidence base nobody in consumer UX cites: patient decision aids.** Stacey et al. (2024) Cochrane review — **209 studies, 107,698 participants, 71 decisions.** High-certainty findings: knowledge +11.90 points; accurate risk perception RR 1.94 (53.2% vs 28.1%); **feeling uninformed −10.02**; **feeling unclear about values −7.86**; **decision regret: no difference**; **"No unwanted effects."**

`[INFERENCE]` Two things matter enormously. First, the **"feeling unclear about my own values" drop** is the mechanism you want — the anxiety in a school choice is largely *"I don't know what I want,"* not *"I don't know the facts."* A **values-clarification exercise** (part of the IPDAS standard) is the evidenced pattern, and it is **structurally non-evaluative because the user supplies the criteria.** Second, decision aids **did not increase regret across 209 trials** — the best available answer to "will giving a 15-year-old honest information hurt them?" `[Caveat: adults, health decisions.]` `[SOURCED]` — [Cochrane](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001431.pub6/full)

`[GAP]` No decision-aid RCTs in adolescent educational choice with anxiety as a measured outcome.

### Communicating uncertainty

**Numbers hedge better than words — this directly answers "how do I say 'probably'."** van der Bles, van der Linden, Freeman & Spiegelhalter (2020, *PNAS*), **5 surveys, 5,780 UK participants**: verbal statements produced **higher perceived uncertainty** than numeric ranges; numeric ranges caused only a **small** decrease in trust in the number while verbal caused a **larger** one; **numeric uncertainty had no significant effect on trust in the source**, verbal caused a small decrease. Conclusion: *"Good epistemic practice is not bad journalistic practice."* `[SOURCED]` — [PNAS](https://www.pnas.org/doi/10.1073/pnas.1913678117)

**"This is a good fit, probably" is the worst of the three options** — a verbal hedge maximises perceived uncertainty *and* costs the most source credibility.

**Verbal probability words are read regressively.** When the IPCC intended "very likely" to mean >90%, respondents interpreted it as **~62% on average**, with large individual variation. The fix — pairing every verbal term with a numeric range — increased differentiation, consistency, and guideline-alignment, **independent of ideology.** `[SOURCED]` — [Budescu et al.](https://link.springer.com/article/10.1007/s10584-011-0330-3)

**Caveats must be inline, never in a tooltip.** Dhami & Mandel (2019, *PLOS ONE*, n=924): correspondence with the standard improved "only when numerical guidelines are **bracketed in text**" — **66% vs 32% control**. Tooltips managed 40%, clickable tables 39%, **because fewer than half of participants ever opened them.** `[INFERENCE]` **Progressive disclosure of uncertainty is a failure pattern — it looks tidy and calm, and it does not work.** This is precisely CollegeVine's structural mistake. `[SOURCED]` — [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0213522)

**Frequency framing beats intervals for actual decisions.** Kay et al. (CHI 2018), n=408, incentivised repeated decisions across 10 uncertainty representations: **quantile dotplots with 50 dots performed best** (expected payoffs 97% of optimal, +5pp over control, and more consistent — within-subject SD 4pp lower). **Textual uncertainty displays significantly underperformed.** `[SOURCED]` — [PDF](https://www.mjskay.com/papers/chi2018-uncertain-bus-decisions.pdf)

`[INFERENCE — untested, flagged]` A quantile dotplot is worth considering for an emotional reason beyond accuracy: **50 dots show a population, not a verdict on you.** The dots visibly include cases on both sides. A bar filling to 70% shows one thing being 70% good. **No study tests whether frequency framing reduces felt threat**, as opposed to improving decision quality. Also: avoid *animated* hypothetical outcome plots here despite their accuracy evidence — an animation that keeps re-rolling the user's future reads as suspenseful, not calm.

**Expect your own team to argue for hiding uncertainty on kindness grounds.** Hullman (IEEE VIS 2019) found **62%** of practitioners omitted uncertainty because they didn't want to "confuse or overwhelm viewers"; 17% worried about making data "seem questionable." Her key observation: practitioners treat trust as a **prerequisite** for showing uncertainty — *"you want trust established before you show uncertainty."* `[SOURCED]` — [PDF](https://users.eecs.northwestern.edu/~jhullman/Value_of_Uncertainty_Vis_CR.pdf)

**The recommended sentence pattern** `[INFERENCE, synthesised from van der Bles + Budescu + Dhami & Mandel]`:

> ❌ "Strong match!" — false confidence, and per OkCupid, a self-fulfilling intervention
> ❌ "This is probably a good fit for you" — verbal hedge; worst trust cost, widest interpretation spread
> ❌ "87% match ⓘ" — precision the model can't support; caveat behind an icon <50% of people open
> ✅ **"Matches 4 of the 5 things you said matter most** — arts programme, 25-minute commute, class size, and clubs. It doesn't have the strong sports programme you mentioned. We're less sure about class size — the data is from 2023."

That sentence is numeric where it can be, **attributed to the user's own stated criteria** (so the model reflects rather than judges), states the miss without a deficit tally, and puts uncertainty inline and specific.

### Avoiding the feeling of being judged

**The one well-evidenced principle, and it is about shame.** Brummelman et al. found **person praise caused children — especially those with low self-esteem — to feel ashamed after failure** ("worthless, inferior, exposed"), while **process praise did not adversely affect children.** In the Mueller & Dweck line, person-praised children avoided challenge, gave up sooner, and lost self-worth. `[SOURCED]` — [The Praise Paradox PDF](https://pure.uva.nl/ws/files/13833921/The_Praise_Paradox.pdf)

`[INFERENCE]` This is the mechanism that most directly serves the zero-shame rule, **and it applies to positive feedback too.** "You're a great fit for selective schools" is *person* feedback. If the student is then rejected, person framing is the condition under which shame appears. **Every result string should describe the school, the data, or the match between stated criteria and school attributes — never the student's qualities.**

**But be honest about the surrounding mindset literature.** The National Study of Learning Mindsets (Yeager et al., 2019, *Nature*, 12,490 ninth-graders, 65 schools) found for lower-achieving students an improvement of **0.10 grade points (d = 0.11)**. Real, well-powered, preregistered — and small and context-dependent. `[INFERENCE]` Do not claim growth-framed copy will meaningfully change outcomes. **The defensible claim is narrower: process framing avoids a documented shame mechanism.** That is a harm-avoidance argument, which is exactly right for a zero-shame rule.

**Strengths-based framing is weaker than it looks.** `[Honest summary]` "Strengths-based framing feels less evaluative" is a well-established *practice belief* with thin, hard-to-verify empirical support for the specific claim that it changes adolescent self-perception in a product context. **Present it as a design heuristic, not a finding.**

**The Barnum trap — name it and refuse it.** A study of 308 Chinese high schoolers (mean 17.19) found MBTI usage → Barnum susceptibility → enhanced ego identity → better mental health (subjective wellbeing indirect β = 0.20; depression β = −0.06). `[Caveats: cross-sectional, single-country, correlational SEM, small effects — and it is essentially a finding that flattering vagueness feels good.]` `[INFERENCE]` There is real commercial pull toward MBTI-style school-personality results: non-threatening, identity-affirming, possibly even wellbeing-positive. **But they work *because* they're unfalsifiable, and pairing one with a consequential recommendation ("you're an Explorer, so apply to Lincoln") launders a Barnum statement into a life decision. A zero-shame rule is not a licence for pleasant meaninglessness.** `[SOURCED]` — [Frontiers 2023](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1097068/full)

### Zero-shame UX and dark patterns

**Confirmshaming is named but under-evidenced.** Brignull's Deceptive Design defines it as "opt-out button labels worded in a derogatory or belittling manner." `[INFERENCE]` It is widely condemned but is *not* the well-evidenced part of dark-pattern research, and the FTC's 2022 dark-patterns report contains **no substantive discussion of shaming or emotional manipulation.** Design leadership here is ahead of both the regulator and the literature. `[SOURCED]` — [deceptive.design](https://deceptive.design/types/confirmshaming/)

**The best empirical evidence, and an uncomfortable finding.** Luguri & Strahilevitz (2021, *Journal of Legal Analysis*), Study 1 n=1,963: acceptance of an unwanted program was **11.3% control / 25.8% mild dark patterns / 41.9% aggressive**. Participants in the aggressive condition "were significantly more likely to express anger"; **mild-condition participants showed no such backlash.** Study 2 (n=3,777): **tripling the price produced negligible change in acceptance** — "decision architecture overwhelmed rational economic calculation."

`[INFERENCE]` Two implications, one uncomfortable. (a) The anger result is a real business argument against shaming copy — aggressive manipulation is *detected*. (b) But **mild manipulation was highly effective and produced no detectable backlash**, which means **"users didn't complain" is not evidence you're clean.** A zero-shame rule must be enforced by review of the copy itself, not by sentiment metrics. `[SOURCED]` — [Oxford JLA](https://academic.oup.com/jla/article/13/1/43/6180579)

**Calm technology (Amber Case)** — a stance, not an evidence base, but three principles bite: *"the right amount of technology is the minimum needed to solve the problem"* is a direct argument against a fit score existing at all if a reasoned short list does the job (and Corcoran showed it does); *"make use of the periphery"* and *"smallest possible amount of attention"* argue against streaks, countdowns, badges and progress pressure; *"work even when it fails"* maps to the missing-data case — **when you lack a school's data the UI must degrade to something honest and non-punishing, not to a low score.** `[SOURCED]` — [calmtech.com](https://calmtech.com/)

`[INFERENCE]` One specific feature to name and kill: **a countdown to the application deadline.** It both raises Chernev's *decision task difficulty* moderator (time pressure) and appears in the FTC's catalogue under misleading urgency.

`[GAP]` No research found on how quiz/assessment **result wording** affects adolescent self-perception in a product context; none on whether non-diagnostic framing measurably reduces felt evaluation; no HCI work on "assessment interfaces that don't feel evaluative." **These are user-research questions, not citations.**

---

## 6. Paying for something you'll use once

### The structural finding

**One-time-use categories mostly do not run consumer paywalls at all.** Wedding planning (Zola, The Knot, Joy), moving tools and most visa tools are free to the end user and monetise the supply side. The categories that *do* charge individuals and survive are ones where **the payment sits adjacent to a much larger, already-accepted cost or an official gate** — tax software (adjacent to a refund), driving theory apps (adjacent to a ~£23 test fee), exam prep (adjacent to tuition).

`[INFERENCE]` **250 Kč is not competing against other apps. It is competing against the perceived stakes of the přijímačky and the four-year decision.** The paywall's job is to attach the price to that stake, not to the artifact.

### The closest structural analogue: driving theory apps

Used once ever, teen payer, ~£6, low-trust discovery. **Driving Theory Test 4 in 1 Kit**: £5.99 paid up front, no in-app paywall, 4.8★ from **382,000 ratings**. Three decisions worth copying:

1. **The trial is a separate free app, not an in-flow paywall** ("Theory Test 4 in 1 UK Lite" as a distinct SKU). The paid app is never a nag screen.
2. **An outcome guarantee, not a product guarantee: "Pass or get your test fee back."** They refund *the government fee*, which is larger than their own price — **reframing the £5.99 as insurance on a bigger bet.**
3. **A specific outcome statistic**: "97% of learners pass their Theory Test using nothing more than this app."

`[INFERENCE]` The 382k-rating count does enormous work. For a Czech product with no rating base **this is the hardest signal to replicate and the one to invest in first** — see the social-proof finding below. `[OBSERVED]` — [App Store](https://apps.apple.com/gb/app/driving-theory-test-4-in-1-kit/id829581836), [drivingtestsuccess.com](https://drivingtestsuccess.com/driving-theory-test-4-in-1-app/)

### The cleanest "show value first" example: Taxfix

**"Preparing your tax return and calculating your estimated tax refund are free."** You pay only when you **submit**. €49.99 one-time. It explicitly states the fee applies **even if you owe money** — disclosing the bad case up front rather than burying it.

**The structure: free = the number you care about; paid = the irreversible action.** The user knows their own upside before deciding. `[OBSERVED]` — [taxfix.de/en/costs](https://taxfix.de/en/costs/)

**FreeTaxUSA takes the transparency-maximalist route** — federal always free, state $15.99, marketed as **"no tiers and no forced upgrades"** and **"Upfront pricing."** `[INFERENCE]` "No tiers, no upsells, one price, here's exactly what you get" is a viable *marketing* position, not just an ethics position — FreeTaxUSA built a business on it. **For an influencer-acquired teen audience primed to expect a scam, this is likely the strongest single message available.** `[OBSERVED]` — [freetaxusa.com/pricing](https://www.freetaxusa.com/pricing/)

### Guarantees: stack two, and make the safety net unconditional

**Magoosh** runs a **score guarantee** (+5 points or full refund, with conditions and paperwork) **plus a separate unconditional 7-day money-back guarantee.** `[INFERENCE — important]` An outcome guarantee alone is a *conditional* promise with paperwork, which a skeptical buyer discounts heavily. **The unconditional short-window refund is what actually de-risks the click.** The score guarantee is persuasion; the 7-day is conversion. **Copy the pair, not just one.** `[OBSERVED]` — [Magoosh](https://gre.magoosh.com/score-guarantee)

**The research says be unconditional and long, not hedged and short.** Suwelack, Hogreve & Hoyer (2011, *Journal of Retailing*): money-back guarantees reduce performance and financial risk and signal quality — **and produce a direct affective response, "liking," which was more influential on behaviour than the risk perceptions.** Critically: **"restrictive return conditions and short timeframes reduced MBG credibility… negating intended benefits."** Janakiraman et al. (2016) meta-analysis (21 papers): **longer time windows *reduced* returns** (endowment effect).

`[INFERENCE]` So: **unconditional, no-questions-asked, 30 days not 7, one email to claim, warm plain wording not legalese** — because the effect runs through *liking* more than risk math. A hedged guarantee is worth less than no guarantee, because it signals you expect complaints. `[SOURCED]` — [Suwelack et al.](https://www.researchgate.net/publication/251479646_Understanding_Money-Back_Guarantees_Cognitive_Affective_and_Behavioral_Outcomes), [Janakiraman et al.](https://www.sciencedirect.com/science/article/abs/pii/S0022435915000822)

### The assessment-product template: 16Personalities

$29 Premium Career Suite. On the page: **"40+ page career guide"** (an explicit page count), downloadable **PDF**, framing that the free test covers ~5% of what exists, **"100% Money-Back Guarantee" — 30 days, "no questions asked," by email**, and provenance ("psychometric testing conducted since 2011"). **The closest commercial template to this product:** free result → paid elaboration → PDF artifact → refund. `[OBSERVED]` — [16personalities](https://www.16personalities.com/premium/premium-report)

**And the cautionary version.** CareerExplorer/Sokanu reviewers report 60–90 minutes of assessment producing "a long ranked list of career matches and **no clearer sense of what to do next**." `[competitor-published — directional only]` `[INFERENCE]` **This is the failure mode to fear most. A ranked list of 40 schools is a worse deliverable than a defended shortlist of 4 with reasoning, even though it looks like more.**

### What the paywall evidence actually supports

**Gate depth, not breadth.** Aral & Dhillon (*Management Science*, 2020), ~29.7M users and 777M page views of NYT data: tightening the meter cut readership ~9.9% but **increased subscriptions ~31%**. The design finding: policies that "let readers choose free content **broadly** from a variety of topical areas, rather than restricting the **variety** of free content available, are more effective." `[INFERENCE]` Let the free tier touch **every** dimension shallowly (fit, distance, admission odds, atmosphere, outcomes) rather than giving one dimension completely and hiding the rest. **Breadth-of-free demonstrates the shape of what's behind the wall.** `[SOURCED]` — [PDF](https://pdhillon.com/papers/dhillon20Paywall.pdf)

**Gate the extra work; never gate "the answer."** The contrast: **Taxfix** (free tier delivers a decision-relevant number you own; paid delivers the action) versus **Mathway/Photomath** (answer free, *steps* paywalled — the widely-voiced student complaint is that this gates the part that actually teaches while marketing as "free"). `[INFERENCE]` For this product, **"which school should I pick" is the answer.** "The full reasoning, backup options, admission-probability detail, and a printable comparison for your parents" is extra work.

`[GAP — do not let anyone claim otherwise]` **No credible published conversion data exists on "show one result free, gate the rest" for one-time digital deliverables.** The paywall A/B literature is vendor content marketing with no methodology and heavy subscription bias. The partial-result paywall is a reasonable inference from adjacent evidence, **not empirically validated for this case.**

### Perceived value of a digital deliverable

**Digital goods are structurally undervalued.** Atasoy & Morewedge (*JCR*, 2018), five experiments: WTP **$9.30 physical vs $5.96 digital** for the same content; mediator was **psychological ownership** (6.04 vs 4.69). Two useful boundary conditions: **the gap disappears under rental framing** rather than purchase, and **widens with identity relevance.** `[INFERENCE]` (a) A downloadable, keepable, printable **PDF** is not cosmetic — it is the cheapest available intervention against the ownership deficit. (b) Frame as **buying, not accessing**: "Your report" beats "access to your report." (c) A report *about them*, named and personalised, is the ideal case for the identity-relevance amplifier. `[SOURCED]` — [PDF](https://marketing.wharton.upenn.edu/wp-content/uploads/2019/04/04.04.2019-Morewedge-Carey-PAPER-DigitalvsPhysicalGoods.pdf)

**The single most actionable finding here — the labor illusion, with a sharp boundary.** Buell & Norton (*Management Science*, 2011): showing a travel search *working* raised perceived value **despite longer waits** (M=5.36 vs 4.96); **62–63% chose a transparent 30–60 second wait over instant results**; the mechanism is effort → reciprocity → value; and transparency raised value **regardless of how much labor actually occurred**.

**But Experiment 5 is the critical boundary: with *unfavorable* outcomes, visible effort backfires.** Favorable: transparent 4.06 > instant 3.34. **Unfavorable: transparent 2.47 < instant 3.24** (p<.05). *"When a service demonstrates that it is trying hard and yet still fails to come up with anything but poor results… people blame the service."*

`[INFERENCE]` Showing the matching engine working ("checking 412 schools… comparing your results against 2024 cut-offs… weighting commute time") should raise willingness to pay — **but only if the result is good. For a student whose realistic options are weak, visible effort makes it worse than a quiet answer. Design a divergent path: when the match set is poor, suppress the theatre and lead with framing and alternatives.** `[SOURCED]` — [HBS PDF](https://www.hbs.edu/ris/Publication%20Files/Norton_Michael_The%20labor%20illusion%20How%20operational_f4269b70-3732-4fc4-8113-72d0c47533e0.pdf)

`[Important caveat]` The related **effort heuristic** (Kruger et al. 2004) replicated only weakly in 2023 and **specifically failed on the willingness-to-pay measure in two of three replication studies.** Lean on Buell & Norton's *reciprocity* mechanism — "they did something for me" — **not** on effort→quality inference. `[SOURCED]` — [Collabra replication](https://online.ucpress.edu/collabra/article/9/1/87489/197632/The-Effort-Heuristic-Revisited-Mixed-Results-for)

**Do not pad the deliverable.** Weaver, Garcia & Schwarz, "Presenter's Paradox" (*JCR*, 2012), seven experiments: **adding mildly favorable items to highly favorable items *lowers* overall evaluation**, because perceivers average rather than add — even spending *more money* to bulk out a bundle reduced perceived value. `[INFERENCE]` This contradicts the instinct to justify 250 Kč by cramming in a generic study-tips chapter and filler infographics. **A tight 12-page report where every page is excellent will likely be valued above a 40-page report where 28 pages are generic** — and post-purchase evaluation is what drives word-of-mouth in a market where every buyer has 200 classmates. `[SOURCED]` — [JCR](https://academic.oup.com/jcr/article-abstract/39/3/445/1822596)

### Young payers

**Adolescents are not natively skeptical, and disclosure doesn't make them so.** Taiwanese study, **n=3,149 aged 15–18**, randomised disclosure conditions: ad recognition 80% / 69% / 65%. Full disclosure improved **conceptual** literacy but **not attitudinal** literacy (skepticism), and **did not reduce purchase intention.** Dutch focus groups (n=20, 12–16) found teens morally accepting of sponsorship ("they also have to make money") but **disliking explicit disclosures**, reporting reactance — one said it "sounds weird" and they "wouldn't like it anymore."

`[INFERENCE]` Two consequences. (a) Influencer acquisition works on this group and heavy disclosure won't kill it — but the reactance finding means **the landing experience must not feel like the reveal of a sales trap.** The transition from creator content to product should feel continuous, not like being handed to a merchant. (b) Because their skepticism is **attitudinally weak but conceptually aware**, they will not scrutinise your claims. **The ethical burden is on you, not on them. Design as if they cannot defend themselves, because at 15 the evidence says they largely can't.** `[SOURCED]` — [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0348505), [Cyberpsychology](https://cyberpsychology.eu/article/view/11976)

**The Czech legal point, which is also a design point.** Czech law gives 15-year-olds capacity for transactions "appropriate to their intellectual and volitional maturity." `[INFERENCE]` **A 250 Kč one-off almost certainly sits inside that; a recurring subscription almost certainly does not**, and would be far more contestable by a parent. This is a legal argument for one-off pricing, not just an ethical one.

`[INFERENCE — significant and easy to miss]` Teen card products in Czechia (Revolut <18) are explicitly parent-supervised, with parents seeing transactions. **For a large share of your teen payers, the purchase is visible to a parent within hours.** Your merchant descriptor, your receipt email, and the first thing a parent sees when they Google you **are part of the paywall.** An opaque payment descriptor will generate parental refund demands regardless of product quality. **Design the receipt as a trust artifact:** what was bought, for whom, price, refund policy, one line on what the product is.

### Anti-extractive design: the named anti-patterns

**TurboTax — the fully documented case, and the rule it produces.** ProPublica found Intuit added `noindex,nofollow` to its Free File page while the paid landing page used `index,follow` (~70% of taxpayers qualified for Free File; **≤3% used it**); users clicking "FREE Guaranteed" were tagged `c5: NONFFA` in source; and users answered **"more than a dozen questions" and entered personal financial data before being told the price.** Confusable product names ("Free Edition" / "Freedom Edition" / "Free File Program") and dual-link misdirection compounded it. The FTC's January 2024 unanimous order requires disclosing the percentage who qualify for free, or stating that a majority do not.

`[INFERENCE] **The named anti-pattern, stated as a rule: never let the user invest effort before knowing the price.** That is the behaviour the FTC's remedy is built around — and it is the exact risk in an "answer the questionnaire, then hit the paywall" design. **Show the price before the questionnaire, not after.** `[SOURCED]` — [ProPublica](https://www.propublica.org/article/turbotax-deliberately-hides-its-free-file-page-from-search-engines), [FTC](https://www.ftc.gov/news-events/news/press-releases/2024/01/ftc-issues-opinion-finding-turbotax-maker-intuit-inc-engaged-deceptive-practices)

**Epic Games / Fortnite — the minors checklist.** $245M FTC settlement. Named patterns: **saved payment method with no re-consent** (children could buy with "the simple press of a button"); **counterintuitive button configuration**; **proximity of preview and purchase controls**; **account lockouts for disputing charges**; and a **hidden refund path** — an Epic designer admitted hiding the refund link where "not a single player found this option" in testing, which the FTC cited specifically.

`[INFERENCE]` This is the compliance-adjacent checklist because your payer may be a minor: **no stored-card silent repurchase; purchase button visually and spatially distinct from every other CTA; refund link findable; no penalty for disputing.** `[SOURCED]` — [FTC](https://www.ftc.gov/business-guidance/blog/2022/12/245-million-ftc-settlement-alleges-fortnite-owner-epic-games-used-digital-dark-patterns-charge)

**The one-off pricing dividend.** Amazon's record $2.5B FTC settlement over Prime cancellation ("Iliad" was the internal name for the flow) is **mostly moot for a one-off product — which is exactly the point. A single non-recurring charge removes exposure to the entire body of subscription enforcement and the whole category of cancellation dark patterns.** A real, cheap, defensible design decision.

**EU direction:** the Digital Fairness Act is in preparation, with named practices in scope including **fake urgency and countdown timers, disguised ads, and emotional manipulation.** The DSA already bans dark patterns on covered platforms. `[SOURCED]` — [EPRS briefing](https://www.europarl.europa.eu/RegData/etudes/ATAG/2025/767191/EPRS_ATA(2025)767191_EN.pdf)

**The named checklist for this product:**
- Price revealed only after the questionnaire (TurboTax)
- Countdown timer or "3 people from your school just bought this" (explicitly in DFA scope)
- Confirmshaming the decline ("No thanks, I'll just guess about my future") — **this is the one that will read as most predatory to a parent reviewing the charge**
- Two similarly-styled buttons where one is free and one is paid (TurboTax dual-link)
- Refund path harder to find than the buy button (Epic)
- Any recurring charge (ROSCA exposure + Czech minor-capacity exposure)
- Padding the report to justify the price (Presenter's Paradox — self-defeating anyway)

### Trust signals at the payment moment

**What actually causes abandonment** (Baymard, excluding "just browsing"): **40%** extra costs too high; **19%** didn't trust the site with card details; **18%** wanted account creation; **17%** checkout too long; **13%** unsatisfactory return policy; **12%** couldn't see total cost upfront. `[Caveat: Baymard doesn't publish sample size/date on that page.]`

`[INFERENCE]` #1 and #6 argue for a single fully-inclusive price shown before any effort. **#3 is a real risk if you require registration before showing the free result — an 18% tax at exactly the moment a TikTok-referred teen is least committed.**

**Social proof — and its optimal shape.** Spiegel Research Center: displaying reviews raises purchase likelihood **~270%**; **peak purchase likelihood is at 4.2–4.7 stars** — ratings near 5.0 are read as "too good to be true" and *decrease* sales; **the first five reviews drive most of the gain**, with nearly all gains within the first 10; **verified-buyer reviews raise purchase probability ~15%** over anonymous.

`[INFERENCE — high leverage]` "Nearly all the gain is in the first 5–10 reviews" means **you do not need scale.** Ten verified, named, dated reviews from real Czech students — ideally naming their school and year — captures most of the available effect. **And do not display a perfect 5.0.** Show the real distribution including the 3-stars. For an audience whose default assumption is that influencer-promoted products are fake, **a visible negative review is a stronger trust signal than a perfect average.** `[SOURCED]` — [Spiegel PDF](https://spiegel.medill.northwestern.edu/wp-content/uploads/sites/2/2021/04/Spiegel_Online-Review_eBook_Jun2017_FINAL.pdf)

**Influencer trust does not survive the handoff by itself.** SEM evidence (n=701, Instagram and TikTok followers) supports parasocial relationship → **brand credibility** → purchase intention (PSR → brand credibility β = .60 IG / .54 TikTok). `[INFERENCE — the central implication]` The credibility path runs *through* a belief about **you**. **The creator's presence should persist visibly into the product** — face/name on the landing page, ideally the creator's own result as the demo, and a creator-specific link so the continuity is explicit. **A generic landing page discards the only asset the acquisition channel gave you.** `[SOURCED]` — [MDPI JTAER](https://www.mdpi.com/0718-1876/21/4/112)

**Trust seals — don't over-invest.** CXL eye-tracking (n=340) found PayPal's badge drew most attention, but the researchers explicitly note this measured **attention and recall, not security perception or conversion.** `[INFERENCE]` Badges are cheap and mildly positive but are not the lever. Spend the trust budget on: **a named human/company with a real Czech address and IČO, a visible refund promise, real reviews, and a payment method the buyer already trusts** — the recognised payment brand *is* the trust seal.

**What belongs next to the payment button** `[INFERENCE, synthesised]`:
1. The price, once, all-in, in CZK, with **"jednorázově"** and **"žádné předplatné."**
2. A concrete enumeration of what arrives — number of schools analysed, what the PDF contains, that it's keepable.
3. The unconditional 30-day refund in plain sentence form, **with the actual email address.**
4. 5–10 verified named student reviews with a **non-perfect** average.
5. The creator's link/face preserved from the referring content.
6. **A line naming where the free public data lives** — inoculation against the "charging for public information" frame that ESTA-lookalike sites earned.
7. Nothing that creates urgency. No timer, no "X spots left," no confirmshame on decline — **and because a parent will see this charge.**

---

## 7. Anti-references

### The portal (what atlasskolstvi.cz belongs to)

**Direct observation, fetched 2026-08-25.** `[Caveat: access was text-extraction, not rendered pixels. Link counts, labels, nesting, verbatim text and ad slot names are reliable; typography, exact colour and mobile rendering are not.]`

**atlasskolstvi.cz — the commercial directory wearing a public-service face.**

- **Ads sit inside the decision surface.** The secondary-school listing carries banner placements with internal slot names visible in markup — `"ERUNI-COLLEGE"` and `"Statistiky oborů"`; the university listing carries `"Střed - Statistiky oborů"`. **`Střed` means *middle* — the ad is deliberately placed between results.** A Google AdSense publisher ID is present. **A 14-year-old choosing a school is being served display advertising for competing schools interleaved with the results they came for.**
- **The homepage's first content slot is a paid school**, unmarked as advertising.
- **Pay-to-appear is confirmed but undisclosed at point of use.** The site's own presentation-options page: *"Základní kontaktní údaje školy v tabulkové části publikace jsou zveřejňovány zdarma"* — basic contacts free, everything richer is a paid article. Operator: **P.F. art, spol. s r. o.**, a commercial publisher. `[INFERENCE]` **Visual prominence is a function of budget, and the teenager has no way to know that.** That is a trust failure, not a taste failure.
- **Results are content-free.** 1,334 secondary schools across **67 pages**; each result carries a logo, a name, and a postal address — **three data points. Nothing a teenager actually wants to know.**
- **Filter-first, guidance-never.** ~8 filter groups, **350+ links on a single listing page, zero explanatory copy.** The interface assumes you already know the answer and just need to look it up.
- **Pagination is `1 / 67` plus "další."** No page numbers, no jump.

**infoabsolvent.cz — the state's careers portal, structurally hostile to its audience.** More interesting because the homepage is competent and the *product* is broken.

- **The school list is an undifferentiated wall of links** — ~200+ schools on one page as bulleted hyperlinked names with addresses, grouped by Prague district. No cards, no metadata, no images. `[INFERENCE]` On a phone this is minutes of scrolling through near-identical blue link text with no visual anchors.
- **Administrative taxonomy exposed raw.** The field-of-study browser is organised around Czech single-letter programme codes — **J, C, H, E, M, L/0, K, P** — plus phrases like *"úplné střední odborné vzdělání."* **A 14-year-old does not know what an "L/0" is, and the page requires them to.**
- **The first filter a teenager meets is disability status.** `"Zdravotní postižení:"` with five checkboxes leads both the `/Obory` and `/Skoly/Seznam` pages. `[INFERENCE]` Serving "what disability do you have?" as the first question to every user, before anything about interests, is an accessibility feature implemented as a demographic interrogation — **a vivid illustration of a portal organised around the administration's data model rather than the user's situation.**
- **The empty state is a dead end:** *"Zadaným parametrům filtru nevyhovuje žádná položka."* No suggestion, no filter relaxation, no path forward.

**Czech government portals — the cross-cutting pattern.** csu.gov.cz: **~120+ homepage links**, four headline figures as bare numbers with no visualisation or trend, plus a "Často navštěvované" block duplicating the nav — **an implicit admission the nav doesn't work.** msmt.gov.cz: **~180+ links**, seven sections × 8–17 children, prime real estate given to a **chronological press-release feed**, footer duplicating the entire menu — **and this site was recently redesigned, so the redesign fixed the surface and not the information architecture.** mojedatovaschranka.cz presents **four login paths as equal peers with no explanation of what a datová schránka is or which method applies to you**, above which sits a banner about a *domain migration*.

**The pattern, stated once:** homepage as exhaustive index rather than entry point; navigation mirroring the org chart; a press feed in the hero; the footer duplicating the whole menu; jargon with no plain-language layer; the highest-demand task buried below institutional self-description.

**And the research that closes the loop:** NN/g found teens had their **greatest difficulty on "large sites with dense content," specifically naming government, nonprofit and school sites** — *"due to dense content and complex navigation rather than design style."* **The exact genre this product is built against is the genre NN/g measured teenagers failing at.** `[SOURCED]`

`[GAP — state this out loud]` **No published usability study, UX audit, or press criticism of atlasskolstvi.cz or infoabsolvent.cz exists.** Czech-language searches returned only the sites' own marketing and school pages recommending them. The direct observations above are the strongest evidence available; there is no secondary literature to lean on.

`[Comparator, sourced]` Csontos & Heckl (2020), 25 Hungarian public-sector sites: *"none… could completely fulfil the recommendations of the Web Content Accessibility Guidelines"*; >50% below acceptable PageSpeed; 25% took **over 6 seconds** to load; **64% used "segregated accessibility"** — a separate "accessible version" rarely updated and lacking full functionality. `[SOURCED]` — [Springer](https://link.springer.com/article/10.1007/s10209-020-00716-9)

### The friendly-but-cheap failure

**Corporate Memphis / Alegria — with its own namer as chief critic.** Mike Merrill, who coined the term, on the style: *"It is all about this idea of, 'Trust me. I'm a trustworthy company.' And let's not look behind the curtain."* And: *"I think it's a really nefarious way to hide behind visual language."* Claire L. Evans: it makes big tech *"look friendly, approachable, and concerned with human-level interaction and community – which is largely the opposite of what they really are."* Merrill also identifies it as a **"safety net"** — free templates let competitors look identical, so nobody has to make a distinct choice. `[SOURCED]` — [Marketplace](https://www.marketplace.org/story/2021/04/15/a-primer-on-corporate-memphis-big-techs-favorite-design-trend)

`[Honest counterweight]` AIGA Eye on Design argues the backlash was partly manufactured, with illustrator Julien Posture noting the "monolithic threat" collections show *"how little consensus there is as to what 'Corporate Memphis' actually is."* `[SOURCED]` — [AIGA](https://eyeondesign.aiga.org/what-the-think-pieces-about-corporate-memphis-tell-us-about-the-state-of-illustration/)

`[INFERENCE]` **The defensible lesson is narrower than "don't use illustration."** It is: *a generic, purchasable, depthless illustration system signals that no specific choice was made* — and it is an anti-reference here mainly because it is **cheap to copy**, which is the same reason a teen product using it will look like every ad-tech landing page.

**Duolingo's owl — warmth with a face becomes leverage.** Reported criticism includes users describing the notification strategy as *"emotional blackmail,"* parents reporting the owl makes children **cry**, and critics calling the messaging *"psychotic," "unhinged," "abusive."* Actual copy: *"🥺It's been three days…"*, *"🤔It looks like you've learned how to say 'quitter' in Portuguese."* Marketing professor Kristen Smirnov on the design intent: *"they created that incredibly obnoxious logo, the owl"* — friction the user wants to avoid.

`[INFERENCE — the mechanism to name]` A mascot is a **persistent character with a relationship to the user.** Once you have one, every retention message is spoken in its voice, and retention pressure converts warmth into guilt. **Warmth that has a face can be weaponised; warmth that is only tone cannot.** For a teenager making a real life decision, a character that "wants" something from them is a conflict of interest made adorable. `[SOURCED]` — [Yahoo Tech](https://tech.yahoo.com/science/articles/duolingo-mean-whiny-annoying-gen-093702461.html)

**Does "friendly" actually reduce credibility? Yes, with caveats.** Glikson, Cheshin & van Kleef (2017), **549 participants across 29 countries**, work emails from unknown senders: smileys had **no effect on perceived warmth** — *"a smiley is not a smile"* — but a **negative effect on perceived competence.** And a behavioural result: **"participants' answers were more detailed and included more content-related information when the e-mail did not include a smiley."** The recipients gave the friendly sender *less* real information. `[FLAG — a 2026 replication exists in *Collabra* and could not be read; it may complicate this. Check before citing Glikson as settled.]` `[SOURCED]` — [ScienceDaily](https://www.sciencedaily.com/releases/2017/08/170814092755.htm)

**Robinhood's confetti — friendly micro-delight as legal liability.** The confetti animation on trades drew regulatory scrutiny for gamifying investing; Robinhood removed it in March 2021, and Massachusetts' case produced a **$7.5m** settlement over gamification practices. `[SOURCED]` — [CNBC](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html)

`[INFERENCE — the synthesis]` The evidence does not say "friendly is bad." It says **celebration attached to a consequential decision is read as manipulation**, and **decorative friendliness with no informational content costs perceived competence without buying warmth.** **Confetti when a 15-year-old picks a school is Robinhood confetti.**

### The dashboard — and why it fails a non-technical audience

**"The Linear look" is real and named.** Daryl Ginn reduces it to rules — *"Dark, your website has to be dark"*, subtle blurred background gradients, animated glowing artefacts — and his demonstration is the argument: shown four sites side by side, *"can you tell they are 4 different websites? I'm not sure I can."* `[SOURCED]` — [The Linear effect](https://rectangle.substack.com/p/the-linear-effect)

`[INFERENCE — assembled]` **The full signature:** dark-by-default surfaces; near-greyscale navy/slate/zinc with one saturated accent; a geometric grotesque plus monospace for anything data-ish; radii around 4–8px; **1px hairline borders at very low contrast doing all the separation work**; hairline-ruled dense data tables; blueprint grids and blurred radial gradients; **no photography and no depiction of people**; a `⌘K` command palette as primary navigation; empty states written in engineer voice. **This is a near-exact description of the first design pass.**

**Honest statement: no published criticism exists of a specific named consumer product for "looking too much like a dev tool."** The homogenisation critique is real and citable; the "it fails consumers" claim is **not** something anyone has written up. But four pieces of hard evidence build the argument properly:

**(a) Dark mode is measurably worse for reading, for most people.** NN/g: Piepenbrock et al. found **"light mode won across all dimensions"** — better for both visual-acuity and proofreading tasks — and **"the smaller the font, the better it is for users to see the text in light mode."** The mechanism is pupil contraction giving greater depth of field. `[Honest caveats NN/g gives: Dobres et al. found no effect in simulated daytime; dark mode helps people with cataract; possible myopia association with sustained light mode.]` **Net: dark-by-default is a legibility tax on the majority, taken for aesthetic reasons.** `[SOURCED]` — [NN/g](https://www.nngroup.com/articles/dark-mode/)

**(b) Hairline borders cost measurable time.** NN/g eyetracking, **71 users, 9 page pairs**: users spent **22% more time** and made **25% more fixations** on weak-signifier versions (both p<0.05). The study's own conditions for when weak signifiers are safe: **low information density, conventional placement, AND high-contrast well-separated targets** — *"all three of those criteria should be met, not just one or two."* **A dense hairline-ruled table fails the first and third simultaneously.** `[SOURCED]` — [NN/g](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty)

**(c) Low-contrast text makes users blame themselves.** NN/g on why designers do it: *"minimalism becomes an issue when there is lots of essential content on a page"* so they mute the text *"so that, at a glance, the page still 'looks' minimal."* Consequences named: eye strain; users who cannot perceive an element cannot use it; **"users blame themselves when they are unable to accomplish tasks"**; near-impossible on mobile in sunlight.

`[INFERENCE]` **The self-blame finding is the one to put in the design doc. A teenager who can't work your interface concludes they are stupid, not that your interface is bad. For a product whose job is to make someone feel capable of a big decision, that is a total failure** — and it is a zero-shame violation delivered by a colour token. `[SOURCED]` — [NN/g](https://www.nngroup.com/articles/low-contrast/)

**(d) The people who design dev tools are statistically nothing like your users.** Nielsen on OECD PIAAC data (**215,942 people, 33 countries, ages 16–65**): ability to complete technology-mediated tasks — **Level 3 (complex, multi-step, ambiguous): 5%.** Level 2: 26%. Level 1: 29%. Below Level 1: 14%. Cannot use a computer: 26%. Nielsen: *"You, dear reader, are almost certainly in the top category."* *"You are not the user, unless you're designing for an elite audience."*

`[INFERENCE — the whole argument in one line]` **Linear, Vercel, Supabase and GitHub serve users drawn almost entirely from that top 5%.** Their language is correctly optimised for people who read dense tables fluently, reach for `⌘K` before a menu, tolerate low contrast because they know where everything is, and read dark palettes as a professional in-group signal. **Every one of those optimisations inverts for a 15-year-old who has never used a dashboard. Adopting the aesthetic imports the assumption along with the pixels.** `[SOURCED]` — [NN/g](https://www.nngroup.com/articles/computer-skill-levels/)

**(e) Jakob's Law works against you here.** `[INFERENCE]` Teenagers' "other sites" are TikTok, Instagram, YouTube, Discord, mobile games and ecommerce — **image-led, large-type, thumb-driven, one decision per screen.** Their mental models come from none of the products the Linear aesthetic descends from. **A dev-tool-styled consumer product isn't neutral to them; it is actively unfamiliar, and unfamiliar reads as *not for me*.**

**(f) What the aesthetic does get right, stated honestly.** A more sophisticated characterisation describes the underlying system as *"a precise, confident typographic system, a clear scale, tight and intentional spacing, high-quality typefaces"*, palettes that are *"near-greyscale with a single, deliberate accent colour used sparingly"*, and motion that is *"subtle, purposeful… never decoration for its own sake."* `[INFERENCE]` **The transferable part is the discipline — restraint, hierarchy, one accent used sparingly. The non-transferable part is the surface — dark default, monospace, hairlines, dense tables, no people, keyboard-first.** `[SOURCED]` — [Studio Maydit](https://studiomaydit.com/blog/linear-vercel-raycast-aesthetic)

---

## Warmth levers, ranked by impact

Specific moves that add warmth without costing credibility. Ranked by expected impact per unit of effort. `[Each lever names its evidence; those marked INFERENCE are reasoned, not measured.]`

**1. Replace `#FFFFFF` and `#000000` with warm neutrals.** Ground around `#faf9f5`–`#f7f6f3`; text around `#141413`–`#37352f`. This is the highest ratio of warmth gained to credibility risked in the entire list — it is nearly free, it is what Notion, Anthropic, Headspace, Parsley and Ethos all do, and it has the only real reading-performance evidence behind it (Rello & Bigham: warm grounds read *faster* than cool). Sourced for readability; `[INFERENCE]` for the warmth effect.

**2. Pick one desaturated warm accent and restrict it to CTAs, logo and illustration.** Compare Anthropic's clay `#d97757` with Monzo's coral `#FF4F40` — both warm, only one reads as serious at rest. **Desaturate if credibility is the priority.** Then apply Monzo's "considerate use" rule explicitly: the accent is banned from long-form reading surfaces and dense UI.

**3. Choose a very dark, slightly warm anchor colour and let it carry the credibility.** `#163300` (Wise), `#054742` (Ethos), `#284849` (Parsley), `#231E15` (Mailchimp). **Never pure black, always a deep colour with a temperature.** Across every case examined this — not the bright hue — is what does the structural credibility work.

**4. Delete the report-card metaphor entirely; do not replace it.** The red correction pen, the class register, the grade grammar. Niche's letter grades are the anti-reference. Somerville's peak-at-15.3 finding and Brummelman's shame mechanism both point the same way, and this metaphor is the single most damaging idea in the first pass.

**5. Show the school's fit as met/unmet named criteria the user supplied — no headline number.** Hinge ships no number; Corcoran's RCT worked with no number; GreatSchools' number caused documented harm; OkCupid proved the number moves behaviour independent of truth. **The model reflects the student's stated values back at them rather than issuing a judgment, which structurally cannot be a verdict on the person.**

**6. Write every result string about the school, never about the student.** Brummelman: person praise produces shame after failure; process framing does not. **"You're a great fit for selective schools" is person feedback and is a zero-shame violation waiting for a rejection letter.**

**7. Ship the interpretation in the same viewport as the signal — and inline, never in a tooltip.** Dhami & Mandel: bracketed-in-text 66% vs tooltip 40% vs control 32%, because fewer than half open tooltips. Function Health's failure was interpretation not shipped alongside the data. CollegeVine's softening lives in a blog post. **Progressive disclosure of uncertainty looks calm and does not work.**

**8. Use photography of real Czech students, and specify the technique rather than the mood.** Monzo's brand book says "Gaussian blur, saturation lift, position-based lens flare… to brighten faces and add a sunlit feel." Write the recipe. NN/g's university research found **stock photography is detected and penalised** — read as evidence about financial motive — while authentic imagery earned *"it seems like it's not about taking your money."* `[INFERENCE]` Real students also solve the dual-audience problem in one move: a photo of a 15-year-old is warm to the teen and reassuring to the parent.

**9. Let the illustration system depict uncertainty and difficulty, not only success.** Headspace's post-2024 faces show "stress, sadness… every mood in between." `[INFERENCE]` Perpetual cheerfulness in an anxiety-adjacent product reads as evasion; a system that can draw "I don't know what I want yet" reads as having met the user.

**10. Warm the copy by cutting it, not by adding exclamation marks.** Lemonade got warm by deleting 90% of its policy; Betterment by *de-bolding* type. `[INFERENCE]` Subtraction is the warmth lever least likely to cost credibility, and the instinct to add — more colour, more illustration, more enthusiasm — is the one most likely to.

**11. Split the second person, not the skin.** Address the teen in "you"; let the parent hear from other parents in testimonials (Wyzant). One nav door for parents, same visual identity, different argument (Step, Aceable). `[INFERENCE]` Consider whether the screen-2 persona branch could be replaced or softened by a subject-based question — Varsity Tutors' "Select Grade Level" — so nobody has to declare a role that reveals the product wasn't built for them.

**12. Give generous radii and drop the hairline borders.** Headspace's reported scale (8/12/24/32) with **no elevation at all**. NN/g's eyetracking puts a real number on the cost of weak signifiers: **22% more time, 25% more fixations.** Separation should come from spacing and warm-neutral surface steps, not from 1px low-contrast rules.

**13. Kill monospace for numbers.** It is the single strongest dev-tool signal in the first pass and it buys nothing here. `[INFERENCE]` Note Oscar Health uses mono deliberately *for body copy* to add warmth-plus-modernity while a serif carries authority — if mono stays anywhere, that inversion is the interesting use, not tabular figures.

**14. Make safeguards visible rather than tucked away.** ~75% of teens endorse protective measures. `[INFERENCE]` "Your answers stay on this device until you choose to save them" and "you can get a refund for 30 days, here's the email" read as respect to a 15-year-old where an adult would read them as boilerplate. This is warmth that *adds* credibility rather than trading against it.

**15. Preserve the creator's presence into the landing page.** Parasocial credibility must convert into a belief about *you*; a generic landing page discards the only asset the acquisition channel provided. `[INFERENCE]` Warm because it is continuous with what the teen was just watching — not a handoff to a merchant.

---

## Open questions and conflicts

**1. Detail versus airiness — a genuine conflict in the evidence.** Brown & Gummerum found "detail" sits alongside aesthetics and colour in adolescents' trust reasoning, suggesting sparse marketing-page minimalism may *cost* credibility with this group. NN/g says *"nothing deters younger audiences more than a cluttered screen full of text"* and recommends small chunks with plenty of whitespace. **These point in opposite directions and both are real findings.** The reconciliation is probably that *legible density* (information-rich but well-structured) differs from *clutter* (dense and unstructured) — but no source tests that distinction. **Test it.**

**2. Warm-soft versus warm-defiant.** Almost every case in §1 solves warmth by softening. CALM explicitly rejects that, arguing softness in mental health reads as twee and condescending, and positions as peer rather than authority. **For a 15-year-old who may experience softness as being handled, this is a live question and it is a taste decision, not an evidence decision.** Worth testing two tones with real students.

**3. Whether the screen-2 persona branch should exist at all.** Varsity Tutors' grade-level segmentation avoids making anyone declare a role. But this product genuinely has two independent buyers who need different arguments, which the branch serves. `[GAP]` **No precedent exists for two independent buyers** — every documented product solves buyer/user asymmetry, not two-buyer symmetry. This has to be decided without evidence.

**4. Whether to show admission probability at all, and in what form.** The recommendation against a *fit* score is well-supported. Admission odds are different — genuinely probabilistic, and the quantile-dotplot evidence (Kay et al.) is strong on decision quality. But `[GAP]` **no study tests whether frequency framing reduces felt threat**, only whether it improves decisions. The inference that 50 dots read as a population rather than a verdict is mine and untested.

**5. Mascot or no mascot.** Brilliant added one successfully for an audience spanning teens to thirties by separating registers. Duolingo's became the vehicle for guilt. Farewill's works because credibility lives entirely elsewhere. `[INFERENCE]` The rule that seems to separate them is whether the character ever delivers consequential information or ever "wants" something from the user — but this is reasoning, not a finding.

**6. Whether Czech families will accept a guided-matching product** when incumbents are browse-first directories. The positioning opportunity is real; so is the risk that a quiz-only product feels incomplete to the parent persona, who has been trained by atlasskolstvi to expect a browsable database. Unanswerable without user testing.

**7. Price-framing device for a teenager.** `[GAP]` No evidence on whether temporal reframing ("less than 1 Kč a day") or stake-comparison ("against four years of school") works better with adolescents. `[INFERENCE]` Temporal reframing is a subscription-style device applied to a non-subscription and a skeptical teen may read it as a trick — but that is a guess.

**8. Where the paywall sits relative to the questionnaire.** The TurboTax rule says **never let the user invest effort before knowing the price**, which argues for showing price before the quiz. The "show value first" pattern and Wagner et al.'s premium-first finding argue for the reverse. `[GAP]` **No credible conversion data exists for partial-result paywalls on one-time digital deliverables.** The honest resolution is probably *price visible early, result still shown free* — but that is reasoning, not evidence.

**9. Verification debts before anything here is treated as settled.** Monzo's coral is either `#FF4F40` or `#FF4B44`. Headspace's token values come from a third-party reconstruction. Rohlík's palette may be extracted from a logo rather than the interface. The 2026 *Collabra* emoji replication may soften the Glikson competence finding. Su & Cui (2019), Cyr et al. (2010) and Hawlitschek et al. (2016) would most change the colour-and-trust picture and none were readable.

**10. The core web-credibility research is two decades old.** Fogg's 46.1% figure is from 2002; his guidelines 2002; NN/g's credibility factors 1999/2016; Aaker 1997; NN/g's teen research has participants born 2001–2005. **All of it predates mobile-first, app UI, and a TikTok-native teenager.** The 2025 Brown & Gummerum adolescent study is the freshest and most directly relevant thing in this document, and it is a single study.

---

## Source index

**Warmth/credibility:** [Monzo brand guidelines](https://www.deck.gallery/blog/monzo-brand-guidelines-breakdown/) · [Creative Review on Monzo](https://www.creativereview.co.uk/monzo-branding-ragged-edge/) · [Monzo makeover blog](https://monzo.com/blog/weve-had-a-little-makeover) · [Headspace rebrand, It's Nice That](https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424) · [Headspace tokens (weak source)](https://oh-my-design.kr/design-systems/headspace) · [CALM, Studio Output](https://www.studio-output.com/work/calm/) · [Farewill rebrand](https://farewill.com/blog/rebranding-death-how-farewill-is-using-design-to-change-the-way-the-world) · [Design Week on Farewill](https://www.designweek.co.uk/issues/27-january-2-february-2020/rebranding-death-farewill-identity/) · [Oscar Design](https://oscardesign.team/How-we-redesigned-the-Oscar-brand-to-speak-to-our-growing-member-base) · [Natural Cycles effectiveness](https://www.naturalcycles.com/how-effective-is-natural-cycles) · [Lemonade Policy 2.0](https://medium.com/lemonade-stories/worlds-first-open-source-insurance-policy-blog-9c3ebb70edff) · [Flo privacy journey](https://flo.health/our-privacy-journey) · [Parsley Health](https://www.parsleyhealth.com/why-it-works) · [Fogg et al. 2003](https://dl.acm.org/doi/10.1145/997078.997097) · [Stanford Web Credibility Guidelines](https://credibility.stanford.edu/guidelines) · [NN/g trustworthy design](https://www.nngroup.com/articles/trustworthy-design/) · [Kervyn, Fiske & Malone 2012](https://myscp.onlinelibrary.wiley.com/doi/abs/10.1016/j.jcps.2011.09.006)

**Teens:** [NN/g Teenager's UX](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/) · [NN/g teen report](https://www.nngroup.com/reports/teenagers-on-the-web/) · [NN/g university sites](https://www.nngroup.com/articles/university-sites/) · [NN/g university UX 2022](https://www.nngroup.com/articles/university-ux-professionals/) · [Brown & Gummerum 2025](https://bpspsychub.onlinelibrary.wiley.com/doi/full/10.1111/bjdp.12559) · [Hämäläinen et al. 2022](https://link.springer.com/article/10.1007/s10639-022-10907-x) · [Common Sense Media 2025](https://www.commonsensemedia.org/research/research-brief-teens-trust-and-technology-in-the-age-of-ai) · [American Press Institute](https://americanpressinstitute.org/teen-news-media-trust/) · [LogRocket teen principles](https://blog.logrocket.com/ux-design/14-principles-designing-products-for-teenagers/) · [Step](https://step.com/) · [Step brand](https://brand.step.com/) · [Greg Hill Step case study](https://www.greghilldesign.com/work/the-step-app) · [Greenlight](https://greenlight.com/) · [Brilliant refresh](https://pcho.medium.com/a-brilliant-brand-refresh-4af021c11486) · [Khan Academy colour system](https://blog.khanacademy.org/how-we-rebuilt-khan-academys-color-system-from-the-ground-up) · [Khan brand design](https://natalie-fitzgerald.com/khan-academy-brand-design)

**Dual audience:** [Monzo under-16s](https://monzo.com/help/monzo-for-under-16s/under-16s-child-app-web) · [Step families](https://step.com/families) · [Aceable teen](https://www.aceable.com/drivers-ed/) · [Aceable parents](https://www.aceable.com/drivers-ed/parents/) · [Wyzant](https://www.wyzant.com/) · [Varsity Tutors](https://www.varsitytutors.com/) · [GoStudent](https://www.gostudent.org/en) · [Revolut <18](https://www.revolut.com/blog/post/revolut-under-18-the-account-built-for-teens/) · [Revolut App Store reviews](https://apps.apple.com/us/app/revolut-teen-finance/id1499857038) · [Acorns Early/GoHenry](https://www.finder.com/kids-banking/gohenry-kids-debit-card-app) · [Contrary on Greenlight](https://research.contrary.com/company/greenlight) · [eMarketer on Step](https://www.emarketer.com/content/banking-app-step-reaches-1m-users-thanks-its-hyper-focus-on-teens) · [UXDA kids banking](https://theuxda.com/blog/ux-case-study-impact-our-childrens-financial-future-with-banking-app) · [Life360 Bubbles](https://techcrunch.com/2020/10/12/family-tracking-app-life360-launches-bubbles-a-location-sharing-feature-inspired-by-teens-on-tiktok) · [Hi-Life on Life360](https://hilifenewsmag.com/2890/archive/2020-2021/life-360-adult-supervision-or-adult-superveillance/) · [Knix teen period apps](https://www.knixteen.com/blogs/the-rag/the-best-teen-and-tween-period-apps)

**Colour:** [Alberts & van der Geest 2011](https://research.utwente.nl/en/publications/color-matters-color-as-trustworthiness-cue-in-web-sites) · [Bottomley & Doyle 2006](https://journals.sagepub.com/doi/10.1177/1470593106061263) · [Labrecque & Milne 2012](https://link.springer.com/article/10.1007/s11747-010-0245-y) · [Elliot 2015 review](https://www.frontiersin.org/articles/10.3389/fpsyg.2015.00368/full) · [Lehmann, Elliot & Calin-Jageman 2018 meta-analysis](https://journals.sagepub.com/doi/10.1177/1474704918802412) · [Jonauskaite et al. 2020](https://eprints.whiterose.ac.uk/169496/) · [YouGov favourite colour](https://yougov.com/en-gb/articles/12331-blue-worlds-favourite-colour) · [Rello & Bigham 2017](https://www.cs.cmu.edu/~jbigham/pubs/pdfs/2017/colors.pdf) · [Mailchimp brand assets](https://mailchimp.com/about/brand-assets/) · [Notion design system (community)](https://github.com/shade-solutions/notion-design-system) · [Wise rebrand](https://wise.com/ie/blog/a-brand-for-everywhere-wise-unveils-bold-new-look) · [Design systém gov.cz](https://designsystem.gov.cz/principy/barvy) · [KPMG CX survey via HN](https://byznys.hn.cz/c1-67823690-pruzkum-kpmg-v-hodnoceni-firem-opet-vyhrala-air-bank-druhy-je-rohlik-cz) · [Finance.cz on Air Bank green](https://www.finance.cz/zpravy/finance/359194-proc-je-air-bank-zelena-a-mbank-cervena-kvuli-ufonum-a-mulete/) · [Forbes.cz on state visual identity](https://forbes.cz/stat-ziska-vizualni-styl-od-studia-najbrt-soucasny-stav-je-matouci-rekl-designer/) · [MZV press release](https://mzv.gov.cz/jnp/cz/udalosti_a_media/tiskove_zpravy/cesko_predstavilo_novy_jednotny_vizualni.html)

**Anxiety and decisions:** [Somerville et al. 2013](https://bpb-us-e1.wpmucdn.com/sites.harvard.edu/dist/b/261/files/2023/03/somerville2013_psychsci.pdf) · [Joel, Eastwick & Finkel 2017](https://journals.sagepub.com/doi/abs/10.1177/0956797617714580) · [Rudder, OkTrends](https://gwern.net/doc/psychology/okcupid/weexperimentonhumanbeings.html) · [Chalkbeat on GreatSchools](https://www.chalkbeat.org/2019/12/5/21121858/looking-for-a-home-you-ve-seen-greatschools-ratings-here-s-how-they-nudge-families-toward-schools-wi/) · [Chalkbeat GreatSchools overhaul](https://www.chalkbeat.org/2020/9/24/21453357/greatschools-overhauls-ratings-reduce-link-race-poverty/) · [Hinge Most Compatible](https://techcrunch.com/2018/07/11/hinge-employs-new-algorithm-to-find-your-most-compatible-match-for-you/) · [Niche grades](https://www.niche.com/about/where-niche-grades-come-from/) · [23andMe GHR](https://www.23andme.org/blog/articles/genetic-health-risk-reports/) · [TIME on Function Health](https://time.com/7176591/function-health-startup-blood-tests-preventive-medicine/) · [REVEAL Study](https://www.bumc.bu.edu/2009/07/20/disclosing-genetic-risk-for-alzheimers-disease-does-not-cause-psychological-distress) · [Scheibehenne et al. 2010](https://scheibehenne.com/ScheibehenneGreifenederTodd2010.pdf) · [Chernev et al. 2015](https://chernev.com/wp-content/uploads/2017/02/ChoiceOverload_JCP_2015.pdf) · [Mogilner, Rudnick & Iyengar 2008](https://academic.oup.com/jcr/article-abstract/35/2/202/1806103) · [Corcoran et al. NBER w24471](https://www.nber.org/system/files/working_papers/w24471/w24471.pdf) · [Stacey et al. 2024 Cochrane](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001431.pub6/full) · [van der Bles et al. 2020](https://www.pnas.org/doi/10.1073/pnas.1913678117) · [Budescu et al.](https://link.springer.com/article/10.1007/s10584-011-0330-3) · [Dhami & Mandel 2019](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0213522) · [Kay et al. CHI 2018](https://www.mjskay.com/papers/chi2018-uncertain-bus-decisions.pdf) · [Hullman 2019](https://users.eecs.northwestern.edu/~jhullman/Value_of_Uncertainty_Vis_CR.pdf) · [Brummelman, Praise Paradox](https://pure.uva.nl/ws/files/13833921/The_Praise_Paradox.pdf) · [Yeager et al. 2019](https://www.nature.com/articles/s41586-019-1466-y) · [Barnum/MBTI adolescents 2023](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1097068/full) · [Deceptive Design: confirmshaming](https://deceptive.design/types/confirmshaming/) · [Luguri & Strahilevitz 2021](https://academic.oup.com/jla/article/13/1/43/6180579) · [Calm Tech](https://calmtech.com/)

**Paywall and value:** [Aral & Dhillon 2020](https://pdhillon.com/papers/dhillon20Paywall.pdf) · [Wagner, Benlian & Hess 2016](https://link.springer.com/article/10.1007/s12525-016-0236-z) · [Buell & Norton 2011](https://www.hbs.edu/ris/Publication%20Files/Norton_Michael_The%20labor%20illusion%20How%20operational_f4269b70-3732-4fc4-8113-72d0c47533e0.pdf) · [Effort heuristic replication 2023](https://online.ucpress.edu/collabra/article/9/1/87489/197632/The-Effort-Heuristic-Revisited-Mixed-Results-for) · [Atasoy & Morewedge 2018](https://marketing.wharton.upenn.edu/wp-content/uploads/2019/04/04.04.2019-Morewedge-Carey-PAPER-DigitalvsPhysicalGoods.pdf) · [Presenter's Paradox](https://academic.oup.com/jcr/article-abstract/39/3/445/1822596) · [Suwelack et al. 2011](https://www.researchgate.net/publication/251479646_Understanding_Money-Back_Guarantees_Cognitive_Affective_and_Behavioral_Outcomes) · [Janakiraman et al. 2016](https://www.sciencedirect.com/science/article/abs/pii/S0022435915000822) · [Baymard cart abandonment](https://baymard.com/lists/cart-abandonment-rate) · [Spiegel review research](https://spiegel.medill.northwestern.edu/wp-content/uploads/sites/2/2021/04/Spiegel_Online-Review_eBook_Jun2017_FINAL.pdf) · [Parasocial credibility SEM](https://www.mdpi.com/0718-1876/21/4/112) · [Adolescent disclosure PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0348505) · [Dutch adolescent focus groups](https://cyberpsychology.eu/article/view/11976) · [Taxfix costs](https://taxfix.de/en/costs/) · [FreeTaxUSA pricing](https://www.freetaxusa.com/pricing/) · [Magoosh score guarantee](https://gre.magoosh.com/score-guarantee) · [16Personalities premium](https://www.16personalities.com/premium/premium-report) · [Driving Test Success](https://drivingtestsuccess.com/driving-theory-test-4-in-1-app/) · [ProPublica TurboTax](https://www.propublica.org/article/turbotax-deliberately-hides-its-free-file-page-from-search-engines) · [FTC v. Intuit](https://www.ftc.gov/news-events/news/press-releases/2024/01/ftc-issues-opinion-finding-turbotax-maker-intuit-inc-engaged-deceptive-practices) · [FTC Epic Games](https://www.ftc.gov/business-guidance/blog/2022/12/245-million-ftc-settlement-alleges-fortnite-owner-epic-games-used-digital-dark-patterns-charge) · [EPRS dark patterns briefing](https://www.europarl.europa.eu/RegData/etudes/ATAG/2025/767191/EPRS_ATA(2025)767191_EN.pdf) · [Mathur et al. Dark Patterns at Scale](https://arxiv.org/abs/1907.07032) · [NCC Deceived by Design](https://storage02.forbrukerradet.no/media/2018/06/2018-06-27-deceived-by-design-final.pdf)

**Anti-references:** [atlasskolstvi.cz](https://www.atlasskolstvi.cz/) · [atlasskolstvi presentation options](https://www.atlasskolstvi.cz/moznosti-prezentace-v-atlasech-skolstvi) · [infoabsolvent.cz](https://www.infoabsolvent.cz/) · [portal.gov.cz](https://portal.gov.cz/) · [csu.gov.cz](https://csu.gov.cz/) · [msmt.gov.cz](https://msmt.gov.cz/) · [mojedatovaschranka.cz](https://www.mojedatovaschranka.cz/) · [Csontos & Heckl 2020](https://link.springer.com/article/10.1007/s10209-020-00716-9) · [Corporate Memphis, Marketplace](https://www.marketplace.org/story/2021/04/15/a-primer-on-corporate-memphis-big-techs-favorite-design-trend) · [AIGA Eye on Design counterpoint](https://eyeondesign.aiga.org/what-the-think-pieces-about-corporate-memphis-tell-us-about-the-state-of-illustration/) · [Duolingo owl criticism](https://tech.yahoo.com/science/articles/duolingo-mean-whiny-annoying-gen-093702461.html) · [Glikson et al. smiley study](https://www.sciencedaily.com/releases/2017/08/170814092755.htm) · [Robinhood confetti](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html) · [The Linear effect](https://rectangle.substack.com/p/the-linear-effect) · [Studio Maydit on the aesthetic](https://studiomaydit.com/blog/linear-vercel-raycast-aesthetic) · [NN/g dark mode](https://www.nngroup.com/articles/dark-mode/) · [NN/g flat UI signifiers](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty) · [NN/g low-contrast text](https://www.nngroup.com/articles/low-contrast/) · [Nielsen on computer skill levels](https://www.nngroup.com/articles/computer-skill-levels/)

---

*Not design law. The strongest findings here are Brown & Gummerum (2025) on adolescent trust, Corcoran et al. on high-school choice specifically, Chernev's overload moderators, van der Bles on numeric hedging, Buell & Norton's labor illusion with its boundary condition, and the NN/g measurements on contrast and signifiers. The weakest are the hex values, the third-party token reconstructions, and anything about Czech colour perception — which does not exist. Every `[INFERENCE]` in this document is reasoning that has not been tested on a Czech 15-year-old.*
