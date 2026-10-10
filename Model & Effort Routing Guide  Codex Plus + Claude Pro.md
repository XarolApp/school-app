# Historical Model and Effort Research: Codex Plus + Claude Pro

> **Status checked 10 October 2026.** This is a 23 September repository research snapshot. It predates GPT-6.1 Sol in the current session’s available-model list. Its old model names, benchmark results, prices, message ranges and quota comparisons have not been independently revalidated by the deployment review; they must not be represented as current account limits or guaranteed task outcomes. Active routing is in the project’s current workflow instructions, with session availability/usage tools as evidence for the selected account. The founder explicitly chose GPT-6.1 Sol at xhigh for the ongoing full-project review; this historical comparison does not override that choice. Revalidate the cited primary benchmarks and provider/account pricing before revising routing or budgeting paid work. The original dated analysis is retained below as research, not new recommendations.

September 23, 2026. Covers GPT-6 Luna, GPT-5.6 Terra, GPT-6 Sol, GPT-6 Astra (Codex) and Claude Haiku 4.5, Sonnet 5, Opus 5.5 (Claude Code). Fable is excluded, as you asked.

The original report attributes its numbers to the links beside them; this archive label does not certify those sources or measurements. "IQ" is short for the Artificial Analysis Intelligence Index (v4.3.2). "$/task" is Artificial Analysis's API cost per Intelligence Index task. Treat it as a relative efficiency measure, not your subscription quota.

---

## 1. Routing table: one Codex pick and one Claude pick per task

"Go-to side" means which plan to use first for the best quality per unit of quota. Quota notes: Codex Plus gives 350–3,000 Luna, 15–150 Sol and 5–45 Astra messages per 5h ([ChatGPT Learn](https://learn.chatgpt.com/docs/pricing)). On Claude Pro, Opus "costs several times more per turn than Sonnet", and Haiku is the cheapest model ([Claude Help](https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code)).

| # | Real-world task | Codex pick (effort) | Claude Code pick (effort) | Evidence | Go-to side |
|---|---|---|---|---|---|
| 1 | Mechanical edits: rename across files, add log lines, explain a regex, boilerplate, commit messages | **GPT-6 Luna (medium)** | **Haiku 4.5** (no effort setting) | Luna medium: IQ 29, $0.02/task ([AA](https://artificialanalysis.ai/models/releases/gpt-6-luna)). Haiku 4.5: IQ 17, $0.21 ([AA](https://artificialanalysis.ai/models/releases/comparisons/claude-sonnet-5-vs-claude-4-5-haiku)). Anthropic lists exactly these tasks as Haiku work ([Claude Help](https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code)) | Codex. Luna is smarter and ~10× cheaper |
| 2 | Everyday coding from a detailed plan: add an API endpoint, build a React component to spec, write unit tests, fix a known bug | **GPT-6 Luna (high)** | **Sonnet 5 (medium)** | Luna high: DeepSWE 59.3% at $0.084 ([Kingy AI, OpenAI chart data](https://kingy.ai/blog/gpt-6-sol-luna-specs-benchmarks-pricing-comparison/)). Sonnet 5 medium: IQ 28, $1.00, ≈ Sonnet 4.6 at high ([AA](https://artificialanalysis.ai/models/releases/claude-sonnet-5), [Claude Docs](https://platform.claude.com/docs/en/build-with-claude/effort)); Anthropic's "Sonnet work" list ([Claude Help](https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code)) | Codex |
| 3 | Larger multi-file implementation; fixing failing tests after an implementation | **GPT-6 Luna (max)** | **Sonnet 5 (high)**, the Claude Code default | Luna max: DeepSWE 66.6% at $0.22, equal to Sol xhigh at ~1/5 the cost ([Kingy AI](https://kingy.ai/blog/gpt-6-sol-luna-specs-benchmarks-pricing-comparison/), [OpenAI](https://openai.com/index/introducing-gpt-6-sol-and-luna/)). Sonnet 5 high: IQ 32, $1.79 ([AA](https://artificialanalysis.ai/models/releases/claude-sonnet-5)) | Codex |
| 4 | Medium-difficulty debugging; a task Luna/Sonnet already failed on | **GPT-6 Sol (high)** | **Opus 5.5 (low)** | Sol high: DeepSWE 65.3%, $0.64 ([Kingy AI](https://kingy.ai/blog/gpt-6-sol-luna-specs-benchmarks-pricing-comparison/)). Opus 5.5 low: IQ 42, $0.55, smarter than Sonnet 5 at max (38) ([AA](https://artificialanalysis.ai/models/releases/claude-opus-5-5), [AA](https://artificialanalysis.ai/models/releases/claude-sonnet-5)) | Either. Codex if you're short on Claude quota |
| 5 | Website / app UI build (landing page, dashboard, mobile layout) | **GPT-6 Sol (high)** | **Opus 5.5 (medium)**; use Sonnet 5 high for small iterations | Sol: OpenAI's example shows it checking desktop, narrow mobile and back navigation ([OpenAI](https://openai.com/index/introducing-gpt-6-sol-and-luna/)). Opus 5.5: on Lovable (app-builder) workloads it finished in 1/3 to 1/2 fewer steps ([Anthropic](https://www.anthropic.com/claude/opus)). No independent UI benchmark exists for these models yet | Test both on one page and keep the winner |
| 6 | Automations across apps (CRM → email → sheet, Zapier-style); browser/computer-use testing | **GPT-6 Sol (xhigh)** | **Opus 5.5 (medium)** | On AA's AutomationBench, Sol xhigh 61.7% ($0.53) ≈ Opus 5.5 medium 61.2% ($1.34) ([Digital Applied, AA data](https://www.digitalapplied.com/blog/gpt-6-sol-vs-claude-opus-5-5-cost-benchmarks)). Sol peaks at xhigh; max is worse (33.2% vs 32.0% on OpenAI's run) ([Kingy AI](https://kingy.ai/blog/gpt-6-sol-luna-specs-benchmarks-pricing-comparison/)) | Codex. Same score at ~40% of the cost |
| 7 | Fact-heavy content: social posts with stats, product comparisons, marketing claims | **GPT-6 Sol (xhigh)** | **Opus 5.5 (low)** | Sol factual error rate: 4.5% at xhigh vs 4.6% at max ([Kingy AI](https://kingy.ai/blog/gpt-6-sol-luna-specs-benchmarks-pricing-comparison/)). Opus 5.5: 16 of 18 earnings reports passed a zero-invented-numbers bar ([MarkTechPost](https://www.marktechpost.com/2026/09/22/anthropic-claude-opus-5-5-release/)); at low effort it matched higher settings on a consulting analysis with half the output ([Anthropic](https://www.anthropic.com/claude/opus)) | Codex for volume, Claude for important pieces |
| 8 | Creative drafts: captions, hooks, video script outlines, content calendar (you check facts later) | **GPT-6 Luna (high–max)** | **Sonnet 5 (low)** | Luna factual error rate 12.5% at high, 7.6% at max ([Kingy AI](https://kingy.ai/blog/gpt-6-sol-luna-specs-benchmarks-pricing-comparison/)). Anthropic recommends Sonnet 5 low for chat and non-coding tasks where speed matters (IQ 24, $0.51) ([Claude Docs](https://platform.claude.com/docs/en/build-with-claude/effort), [AA](https://artificialanalysis.ai/models/releases/claude-sonnet-5)). Neither model renders video; use a video tool for that | Codex |
| 9 | Code review of a PR or of your implementation | **GPT-6 Sol (high)** | **Opus 5.5 (low)** | Opus 5.5 at lowest effort caught 72% of known bugs vs 56% for Opus 5 at high ([Anthropic](https://www.anthropic.com/claude/opus)). There's no public code-review benchmark for Sol. The closest is FrontierCode (merge-readiness, test quality, scope), where Sol high scores 47.7% at $1.08 vs max 49.3% at $2.14 ([Kingy AI](https://kingy.ai/blog/gpt-6-sol-luna-specs-benchmarks-pricing-comparison/)) | Claude. Strongest evidence |
| 10 | Write the detailed implementation plan / architecture | **GPT-6 Astra (high)**; cheaper option: Sol (max) | **Opus 5.5 (medium)** | Opus 5.5 medium: FrontierCode 54.6%, above its own max (54.4%) and Astra's top (53.3%) at ~1/5 Astra's cost ([MarkTechPost](https://www.marktechpost.com/2026/09/22/anthropic-claude-opus-5-5-release/)). Astra max IQ 53 ($3.26) ([AA](https://artificialanalysis.ai/articles/benchmarking-gpt-6-astra)). Sol max IQ 47.5 ($1.06) ([Digital Applied](https://www.digitalapplied.com/blog/gpt-6-sol-vs-claude-opus-5-5-cost-benchmarks)) | Claude |
| 11 | Research reports, market or competitor analysis, long document synthesis | **GPT-6 Sol (max)** | **Opus 5.5 (medium)** | AA-Briefcase knowledge work: Opus 5.5 medium 1,642 Elo vs Sol max 1,483; GDPval-AA 1,576 vs 1,487 ([Digital Applied, AA data](https://www.digitalapplied.com/blog/gpt-6-sol-vs-claude-opus-5-5-cost-benchmarks)). Sol max: Agents' Last Exam 56.4% ([OpenAI](https://openai.com/index/introducing-gpt-6-sol-and-luna/)) | Claude |
| 12 | Hard debugging, refactors that touch many parts of the code | **GPT-6 Astra (high)** | **Opus 5.5 (high)** | Astra's best Terminal-Bench 4.0 score (57.9%) came at high ([Anthropic](https://www.anthropic.com/claude/opus)). Opus 5.5 high: IQ 54, $1.82; CursorBench rises from 52.5% at medium to 57.8% at max, so harder coding does gain from more effort ([MarkTechPost](https://www.marktechpost.com/2026/09/22/anthropic-claude-opus-5-5-release/)) | Claude. Opus 5.5 leads Terminal-Bench 66.4% vs 57.9% |
| 13 | Long unattended runs over 30 minutes: migrations, multi-repo changes | **GPT-6 Sol (max)**; hardest cases: Astra (high) | **Opus 5.5 (xhigh)** | Anthropic designed xhigh for tasks over 30 minutes ([Claude Docs](https://platform.claude.com/docs/en/build-with-claude/effort)); Opus 5.5 ran one task unattended for 18+ hours ([Anthropic](https://www.anthropic.com/claude/opus)). Sol max: DeepSWE 68.8%, OSWorld 64.4% ([Kingy AI](https://kingy.ai/blog/gpt-6-sol-luna-specs-benchmarks-pricing-comparison/)). Astra uses ~27k output tokens per task vs ~119k for Opus 5.5 max ([AA on X](https://x.com/ArtificialAnlys/status/2102438210798514391)) | Codex. Long runs will probably drain a Claude Pro 5h window |
| 14 | Math, science or security-heavy work (algorithm design, auth/security audit) | **GPT-6 Astra (high)** | **Opus 5.5 (high)** | Terminal-Bench-Science: Astra 64.6% vs Opus 5.5 58.7%; AutomationBench 41.4% vs 40.0% ([MarkTechPost](https://www.marktechpost.com/2026/09/22/anthropic-claude-opus-5-5-release/)); Astra FrontierMath T4 97.6%, ExploitBench 100% ([VentureBeat](https://venturebeat.com/technology/welcome-to-the-agi-era-openai-launches-gpt-6-astra)) | Codex |
| **Total** | **OVERALL WINNER** | **OpenAI (Codex): wins 8 of 14 tasks** | **Anthropic (Claude): wins 4 of 14 tasks** | 2 ties (#4 medium debugging, #5 UI build). OpenAI wins cheap, high-volume work (edits, implementation, automations, content, long runs, math/science) because Luna and Sol give far more quota per message ([ChatGPT Learn](https://learn.chatgpt.com/docs/pricing)). Anthropic wins the tasks that need the most intelligence: code review, planning, research and hard debugging, where Opus 5.5 leads the benchmarks ([AA on X](https://x.com/ArtificialAnlys/status/2102438210798514391), [Anthropic](https://www.anthropic.com/claude/opus)) | **OpenAI on efficiency; Anthropic on quality for thinking tasks** |

### Avoid on both sides

| Codex | Claude Code | Why |
|---|---|---|
| **GPT-5.6 Terra** | **Opus 5.5 max** | Terra: for every Terra effort level, a Sol or Luna level is smarter at the same cost or equal for less ([AA](https://artificialanalysis.ai/articles/gpt-5-6-intelligence-vs-cost-across-sol-terra-luna)); it also costs more per output token than GPT-6 Sol (300 vs 250 credits) ([ChatGPT Learn](https://learn.chatgpt.com/docs/pricing)). Opus max adds 1.6 IQ over xhigh for +73% cost ([Digital Applied](https://www.digitalapplied.com/blog/gpt-6-sol-vs-claude-opus-5-5-cost-benchmarks)) |
| **GPT-6 Luna low** for code | **Sonnet 5 max / xhigh** | Luna low: DeepSWE 2.4% ([Kingy AI](https://kingy.ai/blog/gpt-6-sol-luna-specs-benchmarks-pricing-comparison/)). Sonnet 5 max (IQ 38, $5.09) and xhigh (34, $2.87) cost more and score lower than Opus 5.5 low (42, $0.55) ([AA](https://artificialanalysis.ai/models/releases/claude-sonnet-5)) |
| **Fast mode** | **Fast mode** | Codex Fast mode costs 2.5× the credit rate ([ChatGPT Learn](https://learn.chatgpt.com/docs/pricing)); Opus 5.5 Fast mode is 2× the price ([Claude Pricing](https://claude.com/pricing)) |

---

## 2. The cost data behind the table

### IQ and cost per task by effort (Artificial Analysis)

| Model | low | medium | high | xhigh | max |
|---|---|---|---|---|---|
| GPT-6 Luna | 21 / $0.0045 | 29 / $0.02 | 32 / $0.03 | 34 / $0.04 | 37 / $0.07 |
| GPT-6 Sol | 33.9 / $0.13 | 39.8 / $0.25 | 42.8 / $0.37 | 44.1 / $0.53 | 47.5 / $1.06 |
| GPT-6 Astra | ? / $0.82 | n.a. | n.a. | n.a. | 53 / $3.26 |
| Claude Haiku 4.5 | — | — | — | — | 17 / $0.21 (reasoning) |
| Claude Sonnet 5 | 24 / $0.51 | 28 / $1.00 | 32 / $1.79 (default) | 34 / $2.87 | 38 / $5.09 |
| Claude Opus 5.5 | 42 / $0.55 | 51 / $1.34 (default) | 54 / $1.82 | 56 / $3.46 | 58 / $5.98 |

Sources: [AA — GPT-6 Luna](https://artificialanalysis.ai/models/releases/gpt-6-luna), [Digital Applied (AA data) — Sol & Opus 5.5](https://www.digitalapplied.com/blog/gpt-6-sol-vs-claude-opus-5-5-cost-benchmarks), [AA — Astra](https://artificialanalysis.ai/articles/benchmarking-gpt-6-astra), [AA — Sonnet 5 vs Haiku 4.5](https://artificialanalysis.ai/models/releases/comparisons/claude-sonnet-5-vs-claude-4-5-haiku), [AA — Opus 5.5](https://artificialanalysis.ai/models/releases/claude-opus-5-5). Haiku 4.5 is the current Haiku; there is no Haiku 5 ([Claude Docs](https://platform.claude.com/docs/en/about-claude/models/overview)).

What this shows:
- **Your claim is correct at the API level.** Opus 5.5 low (IQ 42, $0.55) is both cheaper and much smarter than Sonnet 5 medium (IQ 28, $1.00). Opus 5.5 at its default medium (51, $1.34) is cheaper than Sonnet 5 at its default high (32, $1.79). In my previous report I said I couldn't verify the Sonnet 5 medium figure. Artificial Analysis now publishes it, and it supports your claim.
- **Sonnet 5 is dominated on API cost** by Opus 5.5 at every effort level, and by GPT-6 Luna/Sol on the Codex side.
- **GPT-6 Luna is in a different league for price.** Luna max (IQ 37, $0.07) roughly matches Sonnet 5 max (IQ 38, $5.09) at about 1/70 of the cost.

### Cases where more effort gave a worse or equal result

| Model | Benchmark | Lower effort | Higher effort |
|---|---|---|---|
| Opus 5.5 | FrontierCode | medium 54.6% | max 54.4% |
| GPT-6 Sol | AutomationBench | xhigh 33.2% ($0.27) | max 32.0% ($0.34) |
| GPT-6 Sol | Agents' Last Exam | medium 53.1% ($1.27) | high 52.6% ($1.53) |
| GPT-6 Sol | Factual error rate (lower = better) | xhigh 4.5% | max 4.6% |
| GPT-6 Luna | Agents' Last Exam | medium 46.8% | high 43.6% |
| GPT-6 Luna | AutomationBench | high 14.5% | xhigh 12.6% |

Sources: [MarkTechPost](https://www.marktechpost.com/2026/09/22/anthropic-claude-opus-5-5-release/), [Kingy AI (from OpenAI chart data)](https://kingy.ai/blog/gpt-6-sol-luna-specs-benchmarks-pricing-comparison/). OpenAI's help center says the same thing: higher effort "can use more of the allowance and does not always produce a better result" ([OpenAI Help](https://help.openai.com/en/articles/20001516-managing-usage-with-gpt-6-astra-in-work-and-codex)).

Rule: start at the default (Opus 5.5 medium, Sol medium/high). Raise effort only after a real failure, not by reflex.

---

## 3. How your two $20 plans consume quota

### Codex (ChatGPT Plus): published per-model allowances

| Model | Local messages per 5h (Plus) | Output credits per 1M tokens | Relative cost vs GPT-6 Sol |
|---|---:|---:|---:|
| GPT-6 Luna | 350–3,000 | 12.5 | ~1/20 |
| GPT-5.6 Terra | 25–200 | 300 | ~same or worse |
| GPT-6 Sol | 15–150 | 250 | 1× |
| GPT-6 Astra | 5–45 | 1,250 | ~3–5× |

Source: [ChatGPT Learn — Pricing](https://learn.chatgpt.com/docs/pricing). Weekly limits also apply. Higher effort, larger context, multi-step tasks and Fast mode all use more of the allowance, and Fast mode costs 2.5× the credit rate ([ChatGPT Learn](https://learn.chatgpt.com/docs/pricing), [OpenAI Help](https://help.openai.com/en/articles/20001516-managing-usage-with-gpt-6-astra-in-work-and-codex)). Keep Fast mode off.

### Claude Code (Claude Pro): no published multiplier

- Claude Pro uses a rolling 5-hour window plus a weekly limit. Chat, desktop, mobile and Claude Code all draw from one pool, and there is no fixed message count ([Claude Pricing](https://claude.com/pricing)).
- Anthropic's official line is that Opus "costs several times more per turn than Sonnet" and that using Opus for routine work is "the fastest way to drain a daily limit" ([Claude Help](https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code)).
- Anthropic does not publish an exact multiplier. A third-party guide estimates Opus at ~5× Sonnet and Haiku at ~0.2× Sonnet, but that was measured for Opus 5, not 5.5 ([Usagebar](https://usagebar.com/blog/claude-weekly-limit-all-models-explained)).
- Effort level also counts towards usage ([Claude Help](https://support.claude.com/en/articles/9797557-usage-limit-best-practices)).

**Why API cost and quota disagree:** the API data says Opus 5.5 is cheaper per task than Sonnet 5. Anthropic's plan docs say Opus uses several times more quota per turn. Both can be true because Pro quota is not billed at API prices. Your experience of faster burn matches the official plan guidance. In practice, the API figure helps you if you pay per token (API or usage credits). It does not tell you how fast your Pro quota drains.

**How to measure your own multiplier:** open Settings → Usage. Run the same medium-sized task once with Sonnet 5 medium and once with Opus 5.5 low in fresh sessions, and note how many percent of the 5-hour bar each one used. That gives you your real ratio. If Opus 5.5 low costs less than about 2× Sonnet medium, it's worth using as your main Claude model.

---

## 4. Suggested workflow for your setup

1. **Plan:** Claude Opus 5.5, medium effort. Use Codex GPT-6 Astra (high) only for math-, science- or security-heavy plans.
2. **Implement:** Codex GPT-6 Luna at high, or max for multi-file work. Escalate to GPT-6 Sol high only when Luna fails twice. This moves the bulk token work onto your cheapest allowance and saves Claude Pro quota for thinking tasks.
3. **Review:** Claude Opus 5.5 at low effort.
4. **Mechanical chores:** Luna medium in Codex, or Haiku 4.5 if you're already in Claude Code.
5. **Content:** Luna for drafts, Sol xhigh for anything with facts or claims.
6. **Session hygiene:** start fresh sessions per task, because long context makes every message cost more on both plans ([ChatGPT Learn](https://learn.chatgpt.com/docs/pricing), [Claude Help](https://support.claude.com/en/articles/9797557-usage-limit-best-practices)). On the Claude API, changing effort mid-conversation invalidates the prompt cache ([Digital Applied](https://www.digitalapplied.com/blog/gpt-6-sol-vs-claude-opus-5-5-cost-benchmarks)). Whether the same happens inside Claude Code isn't documented, so pick the effort level at the start.

---

## 5. Limitations

- Per-effort results for Sol and Luna come from OpenAI's own chart data (via Kingy AI), not independent testing. The IQ and cost-per-task figures come from Artificial Analysis, which is independent.
- Artificial Analysis publishes only low and max for GPT-6 Astra. A secondary source's Astra effort table conflicts with AA, so I left it out.
- There is no independent UI/UX design benchmark yet for Opus 5.5, GPT-6 Sol or GPT-6 Astra.
- Neither Anthropic nor OpenAI publishes exact subscription multipliers. Codex publishes message ranges; Anthropic publishes only qualitative guidance.
- Model research: this turn ran on Claude Opus 5.5 (Anthropic), which conflicts with your earlier request. All recommendations rest on the cited sources.
