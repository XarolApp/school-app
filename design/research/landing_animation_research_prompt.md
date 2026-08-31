# Research prompt: ambient/autoplay landing-page animation

Paste this into Cowork (or another research tool) as-is. Save the output as
`landing_animation_research.md` in this same folder — Claude will pick it up
from there.

---

## The prompt

I'm designing the pre-signup landing page (úvodní stránka) for ŠkolaMatch, a
high-school-selection app for Czech 9th graders and their parents. The brand
voice is warm, calm, and trustworthy — never childish, never corporate-cold.
Reference points already in use: Monzo (colour discipline), YNAB (warmth on a
consequential decision without being cute), Duolingo (the specific animation
style I want to reference).

I want **ambient, autoplay animation on the landing page only** — motion that
plays on its own the moment the page loads, with NO user action required. This
is explicitly NOT:
- scroll-triggered entrance animation (elements fading in as you scroll down)
- hover effects or click/press feedback
- loading spinners or progress indicators

It IS the category of animation Duolingo's own marketing/landing pages use:
looping illustrations, an idle character animation, a subtle continuous motion
in a hero graphic, something that feels alive and produced rather than static
— running by itself, indefinitely or on a loop, the way a hero video or a
Lottie animation would.

### What I need from the research

1. **Real, named products that ship this pattern well**, ideally with a link
   or clear description of what's actually moving (e.g. "Linear's hero has a
   looping gradient mesh that slowly drifts," "Duolingo's homepage owl blinks
   and reacts on a loop"). At least 8-10 examples across different categories
   — not just language-learning apps. Include at least a few outside
   consumer/edtech (fintech, health, productivity) so the pattern isn't
   assumed to only work in one category.

2. **What specifically is animating** in each case — is it an illustrated
   character, an abstract shape/gradient, a product screenshot with a subtle
   live element (e.g. a cursor moving, a chart drawing itself), a video loop,
   particle/confetti-style ambient motion, or something else? Categorize the
   techniques.

3. **Technical approach** for each pattern where identifiable — CSS
   animation/keyframes, Lottie/After Effects export, SVG animation, WebGL/
   canvas, autoplay muted video loop, or a JS animation library (Framer
   Motion, GSAP, Rive). I need to know what's actually implementable without
   a huge performance cost, since this is a mobile-first product and the
   animation must not hurt load time or battery on a phone.

4. **Where the line is between "alive/warm" and "distracting/childish"** for
   this specific audience — a 15-year-old making a real decision, and a
   skeptical parent evaluating whether to pay. Cite any UX research or
   documented reasoning (not just vibes) on ambient motion and trust,
   attention, or perceived product quality. If you can find research
   specifically on autoplay animation and accessibility/vestibular concerns,
   include it — I need to know what the accessibility floor is (I already
   have `prefers-reduced-motion` handling elsewhere in the product and will
   need the same here).

5. **Failure modes** — real examples of this pattern done badly (distracting,
   performance-heavy, reads as try-hard or unserious for the product category)
   so I know what to avoid.

6. **Duolingo specifically** — describe in detail what animates on their
   actual marketing/landing page (not the app itself) right now, and how it's
   built if you can determine that, since that's the direct reference point
   I'm designing against.

### Format

Structure the output as a markdown file I can drop straight into a docs
folder: a short intro, then the findings organized under headers per the
numbered points above, with real citations/links wherever you have them. Be
honest about gaps — if you can't verify how something is built, say so rather
than guessing.
