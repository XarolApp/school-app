import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { fetchSchool, fetchSchools } from '../../api';
import { groupProgramsByObor, formatCutoffRange } from '../../lib/schoolPrograms';
import { trialDaysPhrase } from '../../config/pricing';
import { QUESTIONS } from '../onboarding/quizQuestions';
import { PragueScene, COMMUTE_RADIUS } from './PragueScene';
import './landing2.css';
import { useSchoolCount } from '../../lib/useSchoolCount';

gsap.registerPlugin(ScrollTrigger);

/**
 * Landing v2 (2026-09-26, uncommitted redesign — the previous page is
 * pages/Home.jsx, still intact; swap back in App.jsx).
 *
 * The whole argument is told on ONE live 3D map of Prague built from the real
 * /api/schools rows: 223 points → filter by interest → commute radius →
 * admission cutoffs as bars → a short list. Every number shown is real except
 * the match percentages in the results mock, which are labelled "ukázka".
 */

const QUESTION_COUNT = QUESTIONS.length;

const hasProgram = (s, test) => (s.school_programs ?? []).some(test);
const CHIPS = [
  { id: 'gym', label: 'Gymnázium', test: (p) => p.kkov?.startsWith('79-41') || /Gymn/.test(p.typ_skoly ?? '') },
  { id: 'eko', label: 'Ekonomika a obchod', test: (p) => /^(63|64|65|66)-/.test(p.kkov ?? '') },
  { id: 'tech', label: 'Technika a IT', test: (p) => /^(18|21|23|26|28|36|39)-/.test(p.kkov ?? '') },
  { id: 'art', label: 'Umění a design', test: (p) => /^82-/.test(p.kkov ?? '') },
  { id: 'lang', label: 'Výuka v cizím jazyce', test: (p) => p.jazyk_studia && p.jazyk_studia !== 'Český' },
  { id: 'ped', label: 'Pedagogika a sport', test: (p) => /^(74|75)-/.test(p.kkov ?? '') },
  { id: 'nature', label: 'Příroda a zemědělství', test: (p) => /^(16|29|41|43)-/.test(p.kkov ?? '') },
  { id: 'health', label: 'Zdravotnictví', test: (p) => /^53-/.test(p.kkov ?? '') },
];

const makeSteps = (SCHOOL_COUNT) => [
  {
    kicker: 'Databáze',
    title: `${SCHOOL_COUNT} škol. Poprvé na jedné mapě.`,
    body: 'Každý bod je skutečná pražská střední škola, přesně tam, kde stojí. Obory, kapacity a výsledky přijímaček u všech na jednom místě.',
  },
  {
    kicker: 'Co tě baví',
    title: 'Zúžíš je podle toho, co chceš dělat',
    body: null, // filled in with the live chip + count
  },
  {
    kicker: 'Kam dojedeš',
    title: 'Pak podle toho, kam se ti chce jezdit',
    body: 'Vybereš městské části, kam dojedeš. Školy mimo nezmizí, jen ustoupí — kdyby sis to rozmyslel.',
  },
  {
    kicker: 'Hranice přijetí',
    title: 'U každé vidíš, kolik bodů stačilo',
    body: 'Výška sloupce je hranice přijetí nejtěžšího oboru školy v přijímačkách 2026 podle výsledků Cermatu. Čím vyšší, tím těžší se dostat.',
  },
  {
    kicker: 'Výsledek',
    title: `A z ${SCHOOL_COUNT} je najednou pár, které dávají smysl`,
    body: 'Seřazené podle shody a u každé napsané proč. Tohle je ukázka. Tvůj vlastní výběr máš za pár minut.',
  },
];

const ROLES = {
  student: {
    title: 'Vyber si podle sebe, ne podle doslechu',
    points: [
      ['Nemusíš vědět, čím chceš být', 'Stačí vědět, co tě baví víc a co míň. Zbytek dopočítáme.'],
      ['Nevíš? Přeskoč', 'Otázka, kterou přeskočíš, výsledek nezhorší. Jen je méně jistý.'],
      ['Tvoje odpovědi jsou tvoje', 'Během dotazníku zůstávají jen v tvém prohlížeči.'],
    ],
    cta: 'Začít jako student',
  },
  parent: {
    title: 'Mějte přehled, ne další starost',
    points: [
      ['Data ze stejných zdrojů jako školy', 'Hranice přijetí, kapacity a přihlášky z výsledků Cermatu a rejstříku MŠMT.'],
      ['V klidu na vlastním počítači', 'Výsledek vašeho dítěte si otevřete odkazem a projdete, kdy se vám to hodí.'],
      ['Nikdo si nekoupí lepší pořadí', 'Pořadí počítá pevný vzorec z odpovědí a veřejných dat.'],
    ],
    cta: 'Začít jako rodič',
  },
};

const makeFaq = (SCHOOL_COUNT) => [
  ['Co je Střední na míru?', 'Průvodce výběrem střední školy v Praze. Všechny školy s obory a výsledky přijímaček na jednom místě a dotazník, který z nich vybere ty, které sedí tomu, co hledáš.'],
  ['Kolik to stojí?', `Dotazník, základní výsledek a celá databáze škol jsou zdarma. Placený přístup odemyká podrobné porovnání, rozhodovací matici a plánování přihlášek. Prvních ${trialDaysPhrase()} je zdarma a zrušit se to dá jedním kliknutím v nastavení.`],
  ['Odkud máte data o školách?', 'Obory, kapacity a hranice přijetí jsou z veřejných výsledků jednotné přijímací zkoušky (Cermat) a z rejstříku škol MŠMT. U každého čísla uvádíme rok.'],
  ['Znamená vysoké procento shody, že mě vezmou?', 'Ne. Shoda říká, jak škola odpovídá tomu, co jsi napsal. O přijetí rozhodují přijímačky a známky, proto u škol zvlášť ukazujeme hranice přijetí.'],
  ['Platí mi školy za lepší umístění?', 'Ne. Pořadí počítá pevný vzorec z tvých odpovědí a z veřejných dat. Nikdo si v něm nemůže koupit místo.'],
  ['Co se děje s mými odpověďmi?', 'Během dotazníku zůstávají jen v tvém prohlížeči. Uložíme je, až si založíš účet, a smazat je můžeš kdykoli i s celým účtem.'],
  ['Je to jen pro Prahu?', `Zatím ano, všech ${SCHOOL_COUNT} pražských středních škol. Další kraje přidáme, až bude Praha fungovat tak, jak má.`],
];

const ILLUSTRATIVE_MATCH = [94, 89, 85, 81, 77, 72];

/** Story timeline position of each presentation page: 0 = hero, 1–5 = the steps. */
const PAGE_AT = [0, 1.4, 2.6, 3.8, 5.2, 6.5];
const LAST_PAGE = PAGE_AT.length - 1;
/** Wheel events closer together than this belong to one gesture (trackpad inertia included). */
const GESTURE_GAP_MS = 220;
/** Minimum time between two page changes, so a long swipe cannot skip pages. */
const PAGE_LOCK_MS = 900;

/** Shoda shown on the map's last page. Illustrative like the results mock — the
 *  shortlist gets the mock's numbers, everyone else stays below them. */
function demoMatch(s, rank, inFilter) {
  if (rank >= 0) return ILLUSTRATIVE_MATCH[rank];
  const inRadius = s.home < COMMUTE_RADIUS ? 1 : 0;
  return Math.round(28 + 22 * (inFilter ? 1 : 0) + 14 * inRadius + 6 * Math.max(0, 1 - s.home / 8));
}

/** Best obor for the 3-year chart: one with 2+ years of cutoffs, else any with a cutoff. */
function chartEntry(full) {
  const entries = groupProgramsByObor(full);
  const years = (e) => Object.values(e.years).filter((y) => y.cutoff != null).length;
  return entries.find((e) => years(e) >= 2) ?? entries.find((e) => years(e) >= 1) ?? null;
}

function czSchools(n) {
  if (n === 1) return 'škola';
  if (n >= 2 && n <= 4) return 'školy';
  return 'škol';
}

export default function Landing() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const labelsRef = useRef(null);
  const tipRef = useRef(null);
  const sceneRef = useRef(null);
  const countRef = useRef(null);
  const heroRef = useRef(null);
  const lenisRef = useRef(null);
  const storyRef = useRef(null);
  const storyTweenRef = useRef(null);
  const pageRef = useRef(0);
  const hoverCtxRef = useRef({ chip: CHIPS[0], topIds: [] });
  const detailCache = useRef(new Map());

  const [schools, setSchools] = useState([]);
  const [chip, setChip] = useState(null);
  const [shortlist, setShortlist] = useState([]);
  const [detail, setDetail] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [page, setPage] = useState(0);
  const [role, setRole] = useState('student');
  const [webgl, setWebgl] = useState(true);

  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const activeChip = CHIPS.find((c) => c.id === chip) ?? CHIPS[0];
  const counts = useMemo(
    () => Object.fromEntries(CHIPS.map((c) => [c.id, schools.filter((s) => hasProgram(s, c.test)).length])),
    [schools],
  );
  const liveCount = useSchoolCount();
  const total = schools.length || liveCount;
  const STEPS = makeSteps(total);
  const FAQ = makeFaq(total);
  const shown = chip ? counts[chip] : total;
  hoverCtxRef.current = { chip: activeChip, topIds: shortlist.map((s) => s.id) };

  // ---------- data ----------
  // The hero is ~730px tall; on short laptop screens it would overflow the
  // stage under the sticky top bar. Shrink it to fit instead of clipping.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;
    const fit = () => {
      const room = hero.parentElement.clientHeight - 48;
      hero.style.scale = String(Math.min(1, room / hero.offsetHeight));
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchSchools()
      .then((rows) => alive && setSchools(Array.isArray(rows) ? rows : rows?.schools ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // ---------- smooth scroll ----------
  useEffect(() => {
    if (reduced) return undefined;
    const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) });
    lenisRef.current = lenis;
    if (import.meta.env.DEV) window.__lenis = lenis; // manual frame stepping while debugging
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  // ---------- 3D scene ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    let scene;
    try {
      scene = new PragueScene(canvas, {
        reduced,
        onHover: (s, x, y) => {
          const tip = tipRef.current;
          if (!tip) return;
          if (!s) {
            tip.classList.remove('is-on');
            return;
          }
          // Pages 0–3: name + district + cutoff. Page 4 (hranice) and 5 (výsledek)
          // lift their number out into a big metric line.
          const at = pageRef.current;
          const range = formatCutoffRange(s.adm);
          const { chip: c, topIds } = hoverCtxRef.current;
          let metric = '';
          if (at === 4) metric = range ? `hranice ${s.adm.year}: ${range}` : 'hranice zatím neznáme';
          if (at === 5) metric = `shoda ${demoMatch(s, topIds.indexOf(s.id), hasProgram(s, c.test))} % · ukázka`;
          tip.querySelector('b').textContent = s.name;
          tip.querySelector('span').textContent = [s.district, at < 4 && range ? `hranice ${s.adm.year} ${range}` : null]
            .filter(Boolean)
            .join(' · ');
          const m = tip.querySelector('i');
          m.textContent = metric;
          m.dataset.kind = at === 5 ? 'match' : 'cutoff';
          // Keep the tooltip on screen on narrow stages.
          const maxX = tip.parentElement.clientWidth - tip.offsetWidth - 24;
          tip.style.transform = `translate3d(${Math.max(0, Math.min(x, maxX))}px, ${y}px, 0)`;
          tip.classList.add('is-on');
        },
        onSelect: (s) => navigate(`/skoly/${s.id}`),
      });
    } catch {
      setWebgl(false);
      return undefined;
    }
    sceneRef.current = scene;
    if (import.meta.env.DEV) window.__l2scene = scene; // manual frame stepping while debugging
    scene.setLabelLayer(labelsRef.current);
    scene.start();

    const ro = new ResizeObserver(() => scene.resize());
    ro.observe(canvas);

    // Repaint on theme switch (palette/mode attributes or OS scheme).
    const mo = new MutationObserver(() => requestAnimationFrame(() => scene.readColors()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => requestAnimationFrame(() => scene.readColors());
    mq.addEventListener('change', onScheme);

    // Stop rendering once the stage has scrolled away.
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? scene.start() : scene.stop()));
    io.observe(stageRef.current);

    return () => {
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      mq.removeEventListener('change', onScheme);
      scene.destroy();
      sceneRef.current = null;
    };
  }, [navigate, reduced]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !schools.length) return;
    scene.setSchools(schools);
    scene.setPredicate((s) => hasProgram(s, activeChip.test), !!chip);
    setShortlist(scene.topList ?? []);
    // `chip` changes are handled by the effect below.
  }, [schools]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene?.schools.length) return;
    scene.setPredicate((s) => hasProgram(s, activeChip.test), !!chip);
    setShortlist(scene.topList ?? []);
  }, [chip, activeChip]);

  // Live counter tween on the hero.
  useEffect(() => {
    const el = countRef.current;
    if (!el) return;
    const from = Number(el.dataset.v || total);
    const obj = { v: from };
    const tw = gsap.to(obj, {
      v: shown,
      duration: reduced ? 0 : 0.7,
      ease: 'power3.out',
      onUpdate: () => {
        el.textContent = Math.round(obj.v);
      },
    });
    el.dataset.v = shown;
    return () => tw.kill();
  }, [shown, total, reduced]);

  // The detail mock follows the row hovered in the results mock. All five rows
  // are fetched up front so hovering is instant.
  const loadDetail = (id) => {
    const cache = detailCache.current;
    if (!cache.has(id)) {
      cache.set(id, fetchSchool(id).then((full) => ({ school: full, entry: chartEntry(full) })));
      cache.get(id).catch(() => cache.delete(id));
    }
    return cache.get(id);
  };

  useEffect(() => {
    const five = shortlist.slice(0, 5);
    if (!five.length) return;
    five.forEach((s) => loadDetail(s.id).catch(() => {}));
    setActiveId((cur) => (five.some((s) => s.id === cur) ? cur : five[0].id));
  }, [shortlist]);

  useEffect(() => {
    if (activeId == null) return undefined;
    let alive = true;
    loadDetail(activeId)
      .then((d) => alive && setDetail(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [activeId]);

  // ---------- scroll choreography ----------
  useEffect(() => {
    const ctx = gsap.context(() => {
      const scene = sceneRef.current;

      // Hero entrance.
      const intro = gsap.timeline({ defaults: { ease: 'expo.out', duration: reduced ? 0 : 1.2 } });
      intro
        .from('.l2-hero .l2-kicker', { y: 16, opacity: 0 })
        .from('.l2-title-line > span', { yPercent: 110, stagger: 0.08 }, '<0.05')
        .from('.l2-hero .l2-lede', { y: 20, opacity: 0 }, '<0.3')
        .from('.l2-chip', { y: 12, opacity: 0, stagger: 0.035, duration: reduced ? 0 : 0.8 }, '<0.1')
        .from('.l2-hero-actions > *', { y: 12, opacity: 0, stagger: 0.08 }, '<0.2');

      // The map story: one paused timeline, played page by page (see the
      // paging effect below). Each page's positions end exactly at PAGE_AT.
      const steps = gsap.utils.toArray('.l2-step');
      gsap.set(steps, { autoAlpha: 0, y: 40 });
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
      const st = scene?.state ?? {};
      tl.to('.l2-hero', { autoAlpha: 0, y: -60, duration: 0.8 }, 0)
        .to('.l2-scrollhint', { autoAlpha: 0, duration: 0.3 }, 0)
        .to(st, { chipFilter: 0, duration: 0.6 }, 0)
        .to(st, { tilt: 0.28, rot: 0, dist: 17, offset: 0.16, duration: 1.4 }, 0)
        .to(steps[0], { autoAlpha: 1, y: 0, duration: 0.6 }, 0.8)
        // 01 → 02: the camera swings round as the map filters, so the change is hard to miss.
        .to(steps[0], { autoAlpha: 0, y: -40, duration: 0.5 }, 1.4)
        .to(st, { filterMix: 1, duration: 0.8 }, 1.5)
        .to(st, { tilt: 0.66, rot: 0.6, dist: 15.5, duration: 1.2 }, 1.4)
        .to(steps[1], { autoAlpha: 1, y: 0, duration: 0.6 }, 2.0)
        .to(steps[1], { autoAlpha: 0, y: -40, duration: 0.5 }, 2.6)
        .to(st, { radiusMix: 1, tilt: 0.3, rot: 0.1, dist: 13.5, duration: 1.1 }, 2.7)
        .to(steps[2], { autoAlpha: 1, y: 0, duration: 0.6 }, 3.2)
        .to(steps[2], { autoAlpha: 0, y: -40, duration: 0.5 }, 3.8)
        .to(st, { barsMix: 1, tilt: 1.02, rot: -0.55, dist: 14, duration: 1.3 }, 3.9)
        .to(steps[3], { autoAlpha: 1, y: 0, duration: 0.6 }, 4.6)
        .to(steps[3], { autoAlpha: 0, y: -40, duration: 0.5 }, 5.2)
        .to(st, { topMix: 1, dist: 12.5, rot: -0.3, offset: 0.24, duration: 1.2 }, 5.3)
        .to(steps[4], { autoAlpha: 1, y: 0, duration: 0.6 }, 5.9);
      storyRef.current = tl;

      // Generic fade-ups.
      ScrollTrigger.batch('[data-rise]', {
        start: 'top 88%',
        once: true,
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { y: 48, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: reduced ? 0 : 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true },
          ),
      });
      gsap.set('[data-rise]', { autoAlpha: 0 });

      // Mock parallax.
      if (!reduced) {
        gsap.to('.l2-mock--detail', {
          yPercent: -18,
          ease: 'none',
          scrollTrigger: { trigger: '.l2-inside', start: 'top bottom', end: 'bottom top', scrub: true },
        });
        gsap.to('.l2-mock--results', {
          yPercent: 6,
          ease: 'none',
          scrollTrigger: { trigger: '.l2-inside', start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }

      ScrollTrigger.create({
        trigger: '.l2-mock--results',
        start: 'top 70%',
        once: true,
        onEnter: () => document.querySelector('.l2-mock--results')?.classList.add('is-in'),
      });

      // Statement words scrub from muted to full ink.
      gsap.fromTo(
        '.l2-statement span',
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: { trigger: '.l2-statement', start: 'top 80%', end: 'bottom 45%', scrub: true },
        },
      );

      // Big numbers count up once.
      gsap.utils.toArray('[data-count]').forEach((el) => {
        const to = Number(el.dataset.count);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: to,
          duration: reduced ? 0 : 1.6,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => {
            el.textContent = Math.round(obj.v);
          },
        });
      });
    }, rootRef);

    return () => {
      storyTweenRef.current?.kill();
      storyRef.current = null;
      ctx.revert();
    };
  }, [reduced]);

  // ---------- paging ----------
  // While the page sits at the very top, the stage is a slideshow: one wheel
  // gesture, swipe or key press = exactly one page, never more. Scrolling down
  // from the last page leaves it for the normal page; scrolling back up to the
  // top lands on the last page again.
  useEffect(() => {
    const goTo = (n) => {
      const next = Math.max(0, Math.min(LAST_PAGE, n));
      if (next === pageRef.current) return;
      pageRef.current = next;
      setPage(next);
      sceneRef.current?.clearPointer();
      storyTweenRef.current?.kill();
      storyTweenRef.current = storyRef.current?.tweenTo(PAGE_AT[next], {
        duration: reduced ? 0 : 1.1,
        ease: 'power2.inOut',
      });
    };

    let lastWheel = 0;
    let gestureUsed = false; // this gesture already moved a page, or began below the stage
    let swallow = false; // the gesture that left the stage: keep its inertia from scrolling on
    let lockUntil = 0;
    let touchY = null;

    const atStage = () => window.scrollY <= 2;
    const leave = () => {
      swallow = true;
      const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
      const top = stageRef.current.getBoundingClientRect().bottom + window.scrollY - navH;
      if (lenisRef.current) lenisRef.current.scrollTo(top, { duration: 1.1 });
      else window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    };
    const move = (dir) => {
      const now = performance.now();
      if (now < lockUntil) return;
      lockUntil = now + (reduced ? 150 : PAGE_LOCK_MS);
      if (dir > 0 && pageRef.current === LAST_PAGE) leave();
      else goTo(pageRef.current + dir);
    };
    const block = (e) => {
      e.preventDefault();
      e.stopPropagation(); // keep Lenis from scrolling too
    };

    const onWheel = (e) => {
      if (e.ctrlKey) return; // pinch-zoom
      const dir = Math.sign(e.deltaY);
      if (!dir) return;
      const now = performance.now();
      if (now - lastWheel > GESTURE_GAP_MS) {
        gestureUsed = false;
        swallow = false;
      }
      lastWheel = now;
      if (!atStage()) {
        if (swallow) block(e);
        else gestureUsed = true; // arriving at the top mid-gesture must not flip a page
        return;
      }
      block(e);
      if (gestureUsed) return;
      gestureUsed = true;
      move(dir);
    };

    const onKey = (e) => {
      if (!atStage() || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest?.('input, textarea, select, button, a, [contenteditable]') && e.key === ' ') return;
      const dir = { ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };

    const onTouchStart = (e) => {
      touchY = atStage() ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e) => {
      if (touchY != null && e.cancelable) e.preventDefault();
    };
    const onTouchEnd = (e) => {
      if (touchY == null) return;
      const dy = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) <= 40) return;
      // Same as the wheel: a swipe during the lock is ignored AND restarts it.
      const now = performance.now();
      if (now < lockUntil) lockUntil = now + (reduced ? 150 : PAGE_LOCK_MS);
      else move(Math.sign(dy));
    };

    // The presentation only works from the top: never let a reload restore
    // the page halfway into it.
    const restore = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      history.scrollRestoration = restore;
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [reduced]);

  // Chart draws itself when the detail mock arrives / scrolls in.
  useEffect(() => {
    if (!detail) return undefined;
    const ctx = gsap.context(() => {
      const path = document.querySelector('.l2-chart-line');
      if (!path) return;
      const len = path.getTotalLength();
      gsap.fromTo(
        path,
        { strokeDasharray: len, strokeDashoffset: len },
        {
          strokeDashoffset: 0,
          duration: reduced ? 0 : 1.8,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: '.l2-mock--detail', start: 'top 75%', once: true },
        },
      );
      gsap.from('.l2-chart-dot', {
        scale: 0,
        transformOrigin: 'center',
        stagger: 0.3,
        duration: reduced ? 0 : 0.5,
        ease: 'back.out(3)',
        delay: reduced ? 0 : 0.5,
        scrollTrigger: { trigger: '.l2-mock--detail', start: 'top 75%', once: true },
      });
    }, rootRef);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [detail, reduced]);

  // Role switch crossfade.
  const switchRole = (next) => {
    if (next === role) return;
    gsap.to('.l2-role-body', {
      autoAlpha: 0,
      y: 10,
      duration: reduced ? 0 : 0.18,
      ease: 'power2.in',
      onComplete: () => {
        setRole(next);
        gsap.fromTo('.l2-role-body', { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: reduced ? 0 : 0.45, ease: 'expo.out' });
      },
    });
  };

  // Magnetic primary buttons (pointer devices only).
  useEffect(() => {
    if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const buttons = [...document.querySelectorAll('.l2-magnet')];
    const handlers = buttons.map((btn) => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
      const move = (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      };
      const leave = () => {
        xTo(0);
        yTo(0);
      };
      btn.addEventListener('pointermove', move);
      btn.addEventListener('pointerleave', leave);
      return () => {
        btn.removeEventListener('pointermove', move);
        btn.removeEventListener('pointerleave', leave);
      };
    });
    return () => handlers.forEach((off) => off());
  }, [reduced]);

  const chartData = useMemo(() => {
    if (!detail?.entry) return null;
    const years = Object.keys(detail.entry.years).map(Number).sort();
    const rows = years.map((y) => ({ year: y, ...detail.entry.years[y] }));
    const cutoffs = rows.map((r) => r.cutoff).filter((c) => c != null);
    const lo = Math.max(0, Math.min(...cutoffs) - 10);
    const hi = Math.min(100, Math.max(...cutoffs) + 10);
    const W = 360;
    const H = 150;
    const pts = rows.map((r, i) => ({
      ...r,
      x: 24 + (i * (W - 48)) / Math.max(1, rows.length - 1),
      y: r.cutoff == null ? null : H - 16 - ((r.cutoff - lo) / (hi - lo || 1)) * (H - 40),
    }));
    const line = pts.filter((p) => p.y != null).map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    return { pts, line, W, H };
  }, [detail]);

  const statement = 'Nevybíráme za tebe. Ukážeme ti všechno, co potřebuješ vědět, abys mohl vybrat sám.';

  return (
    <div ref={rootRef} className="l2">
      {/* ================= STAGE: hero + map story ================= */}
      <section ref={stageRef} className="l2-stage" aria-label="Úvod">
        <div className="l2-sticky">
          <canvas ref={canvasRef} className="l2-canvas" aria-hidden="true" hidden={!webgl} />
          <div ref={labelsRef} className="l2-labels" aria-hidden="true" />
          <div ref={tipRef} className="l2-tip" aria-hidden="true">
            <b />
            <span />
            <i className="l2-tip-metric" />
            <em>Klikni pro detail</em>
          </div>

          <div ref={heroRef} className="l2-hero">
            <p className="l2-kicker">
              <span className="l2-dot" /> Výběr střední školy · Praha
            </p>
            <h1 className="l2-title">
              <span className="l2-title-line"><span>Najdi střední,</span></span>
              <span className="l2-title-line"><span>která ti opravdu</span></span>
              <span className="l2-title-line"><span className="l2-title-accent">sedí.</span></span>
            </h1>
            <p className="l2-lede">
              Všech {total} pražských středních škol na jedné mapě. Odpovíš na {QUESTION_COUNT} otázek
              a uvidíš, které odpovídají tomu, co tě baví, kam dojedeš a jak se ti učí.
            </p>

            <div className="l2-try">
              <p className="l2-try-label">
                Zkus to: co tě baví?
                <span className="l2-try-count">
                  <b ref={countRef}>{total}</b> {czSchools(shown)}
                </span>
              </p>
              <div className="l2-chips" role="group" aria-label="Obor zájmu">
                {CHIPS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="l2-chip"
                    aria-pressed={chip === c.id}
                    onClick={() => setChip(chip === c.id ? null : c.id)}
                  >
                    {c.label}
                    <span className="l2-chip-n">{counts[c.id] ?? ''}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="l2-hero-actions">
              <Link to="/onboarding" className="l2-btn l2-magnet">
                Začít dotazník zdarma
                <span className="l2-btn-arrow" aria-hidden="true">→</span>
              </Link>
              <Link to="/skoly" className="l2-link">nebo projdi databázi</Link>
            </div>
            <p className="l2-fine">Bez registrace · {QUESTION_COUNT} otázek · přeskočit můžeš cokoli</p>
          </div>

          <div className="l2-steps">
            {STEPS.map((s, i) => (
              <div key={s.kicker} className="l2-step">
                <p className="l2-kicker">
                  <span className="l2-step-n">0{i + 1}</span> {s.kicker}
                </p>
                <h2 className="l2-step-title">{s.title}</h2>
                <p className="l2-step-body">
                  {s.body ??
                    `${activeChip.label}: ${counts[activeChip.id] ?? '…'} ${czSchools(counts[activeChip.id] ?? 5)}. Ostatní ustoupí do pozadí. V dotazníku těch věcí zvážíš víc najednou.`}
                </p>
                {i === STEPS.length - 1 && (
                  <Link to="/onboarding" className="l2-btn l2-magnet">
                    Najít svoje školy
                    <span className="l2-btn-arrow" aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="l2-progress" aria-hidden="true">
            {STEPS.map((s, i) => (
              <i key={s.kicker} className={i < page ? 'is-on' : undefined} />
            ))}
          </div>
          <div className="l2-scrollhint" aria-hidden="true">
            <span>Scrolluj</span>
            <i />
          </div>
        </div>
      </section>

      {/* ================= NUMBERS ================= */}
      <section className="l2-numbers">
        <div className="l2-number" data-rise>
          <b data-count={total}>0</b>
          <span>pražských středních škol, u každé obory a přijímačky</span>
        </div>
        <div className="l2-number" data-rise>
          <b data-count={QUESTION_COUNT}>0</b>
          <span>otázek, žádná povinná</span>
        </div>
        <div className="l2-number" data-rise>
          <b>
            <span data-count="3">0</span>
            <small> roky</small>
          </b>
          <span>hranic přijetí u každého oboru</span>
        </div>
        <div className="l2-number" data-rise>
          <b>
            <span data-count="0">0</span>
            <small> Kč</small>
          </b>
          <span>za dotazník, výsledek a databázi</span>
        </div>
      </section>

      {/* ================= INSIDE THE APP ================= */}
      <section className="l2-inside">
        <header className="l2-head" data-rise>
          <p className="l2-kicker">Uvnitř</p>
          <h2 className="l2-h2">Žádná tabulka o dvou stech řádcích</h2>
          <p className="l2-sub">
            Výsledek je krátký seznam s důvody. Detail školy ukáže, jak se na obor
            dostávalo poslední tři roky.
          </p>
        </header>

        <div className="l2-mocks">
          <div className="l2-mock l2-mock--results" data-rise>
            <div className="l2-mock-bar">
              <i /><i /><i />
              <span>Tvoje výsledky</span>
              <em>ukázka</em>
            </div>
            <ol className="l2-results">
              {(shortlist.length ? shortlist : Array.from({ length: 5 }, () => null)).slice(0, 5).map((s, i) => (
                <li
                  key={s?.id ?? i}
                  className={`l2-result${s && s.id === activeId ? ' is-active' : ''}`}
                  tabIndex={s ? 0 : undefined}
                  onMouseEnter={s ? () => setActiveId(s.id) : undefined}
                  onFocus={s ? () => setActiveId(s.id) : undefined}
                >
                  <div className="l2-result-main">
                    <span className="l2-result-rank">{i + 1}</span>
                    <div className="l2-result-name">
                      <b>{s?.name ?? 'Načítám…'}</b>
                      <span>{s?.district ?? ''}</span>
                    </div>
                    <div className="l2-match">
                      <span className="l2-match-track">
                        <span className="l2-match-fill" style={{ '--w': `${ILLUSTRATIVE_MATCH[i]}%` }} />
                      </span>
                      <b>{ILLUSTRATIVE_MATCH[i]} %</b>
                    </div>
                  </div>
                  {s && (
                    <div className="l2-result-why">
                      <span className="l2-tag">{activeChip.label}</span>
                      <span className="l2-tag">{s.district}</span>
                      {formatCutoffRange(s.adm) && (
                        <span className="l2-tag">hranice {formatCutoffRange(s.adm)}</span>
                      )}
                      {s.adm?.acceptance != null && (
                        <span className="l2-tag">přijato {Math.round(s.adm.acceptance)} %</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <p className="l2-mock-note">
              Školy a čísla jsou skutečné. Procenta shody jsou ukázka, tvoje spočítáme z tvých odpovědí.
            </p>
          </div>

          <div className="l2-mock l2-mock--detail" data-rise>
            <div className="l2-mock-bar">
              <i /><i /><i />
              <span>Detail školy</span>
            </div>
            {detail && !detail.entry ? (
              <div className="l2-detail">
                <p className="l2-detail-school">{detail.school.name}</p>
                <p className="l2-detail-note">U této školy zatím nemáme výsledky přijímaček.</p>
              </div>
            ) : detail && chartData ? (
              <div className="l2-detail">
                <p className="l2-detail-school">{detail.school.name}</p>
                <p className="l2-detail-obor">{detail.entry.oborNazev}</p>
                <svg viewBox={`0 0 ${chartData.W} ${chartData.H}`} className="l2-chart" role="img"
                  aria-label={`Hranice přijetí ${chartData.pts.map((p) => `${p.year}: ${p.cutoff ?? 'neuvedeno'}`).join(', ')}`}>
                  {chartData.pts.map((p) => (
                    <line key={p.year} x1={p.x} x2={p.x} y1="10" y2={chartData.H - 16} className="l2-chart-grid" />
                  ))}
                  <path d={chartData.line} className="l2-chart-line" />
                  {chartData.pts.filter((p) => p.y != null).map((p) => (
                    <g key={p.year}>
                      <circle cx={p.x} cy={p.y} r="5" className="l2-chart-dot" />
                      <text x={p.x} y={p.y - 12} className="l2-chart-val">{Math.round(p.cutoff)}</text>
                    </g>
                  ))}
                  {chartData.pts.map((p) => (
                    <text key={p.year} x={p.x} y={chartData.H - 2} className="l2-chart-year">{p.year}</text>
                  ))}
                </svg>
                <dl className="l2-detail-stats">
                  <div><dt>Míst</dt><dd>{detail.entry.latest.kapacita ?? '—'}</dd></div>
                  <div><dt>Přihlášek</dt><dd>{detail.entry.latest.prihlasky ?? '—'}</dd></div>
                  <div><dt>Přijato</dt><dd>{detail.entry.latest.prijati ?? '—'}</dd></div>
                </dl>
                {detail.entry.trend && <p className="l2-detail-note">{detail.entry.trend.note}</p>}
              </div>
            ) : (
              <div className="l2-detail l2-detail--loading">
                <span className="l2-skel" />
                <span className="l2-skel l2-skel--short" />
                <span className="l2-skel l2-skel--chart" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= STATEMENT ================= */}
      <section className="l2-statement-wrap">
        <p className="l2-statement">
          {statement.split(' ').map((w, i) => (
            <span key={i}>{w} </span>
          ))}
        </p>
      </section>

      {/* ================= ROLES ================= */}
      <section className="l2-roles">
        <div className="l2-roles-side" data-rise>
          <p className="l2-kicker">Pro koho</p>
          <h2 className="l2-h2">Jeden nástroj, dva pohledy</h2>
          <div className="l2-switch" role="tablist" aria-label="Kdo jsi">
            <span className="l2-switch-pill" data-at={role} aria-hidden="true" />
            <button type="button" role="tab" aria-selected={role === 'student'} onClick={() => switchRole('student')}>
              Jsem student
            </button>
            <button type="button" role="tab" aria-selected={role === 'parent'} onClick={() => switchRole('parent')}>
              Jsem rodič
            </button>
          </div>
          <p className="l2-sub">
            Na začátku dotazníku si vybereš, kdo ho vyplňuje. Otázky i výsledek se tomu přizpůsobí.
          </p>
        </div>
        <div className="l2-role-body" role="tabpanel" data-rise>
          <h3 className="l2-role-title">{ROLES[role].title}</h3>
          <ul className="l2-role-points">
            {ROLES[role].points.map(([t, b], i) => (
              <li key={t}>
                <span className="l2-role-i">0{i + 1}</span>
                <div>
                  <b>{t}</b>
                  <p>{b}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/onboarding" className="l2-link l2-link--arrow">{ROLES[role].cta} →</Link>
        </div>
      </section>

      {/* ================= HONESTY ================= */}
      <section className="l2-honest">
        <header className="l2-head" data-rise>
          <p className="l2-kicker">Na rovinu</p>
          <h2 className="l2-h2">Co Střední na míru je, a co není</h2>
        </header>
        <div className="l2-honest-grid">
          <div className="l2-honest-col" data-rise>
            <p className="l2-honest-label l2-honest-label--yes">Je to</p>
            <ul>
              <li>Přehled všech pražských středních škol s veřejnými daty</li>
              <li>Pořadí podle tvých odpovědí, s vysvětlením u každé školy</li>
              <li>Pomůcka pro rozhodnutí, které nakonec uděláš ty</li>
            </ul>
          </div>
          <div className="l2-honest-col l2-honest-col--no" data-rise>
            <p className="l2-honest-label">Není to</p>
            <ul>
              <li>Záruka přijetí ani odhad tvých šancí u zkoušky</li>
              <li>Žebříček „nejlepších“ škol</li>
              <li>Reklama, za kterou si školy platí</li>
            </ul>
          </div>
        </div>
        <p className="l2-source" data-rise>
          Zdroje: výsledky jednotné přijímací zkoušky (Cermat), rejstřík škol a školských zařízení (MŠMT).
          U každého čísla v aplikaci uvádíme rok.
        </p>
      </section>

      {/* ================= PRICE ================= */}
      <section className="l2-price">
        <header className="l2-head" data-rise>
          <p className="l2-kicker">Cena</p>
          <h2 className="l2-h2">Začátek je zdarma. Opravdu.</h2>
        </header>
        <div className="l2-price-grid">
          <div className="l2-plan" data-rise>
            <p className="l2-plan-name">Zdarma</p>
            <p className="l2-plan-price">0 Kč</p>
            <ul>
              <li>Dotazník a výsledek se shodou</li>
              <li>Databáze všech {total} škol</li>
              <li>Detail školy s hranicemi přijetí</li>
            </ul>
          </div>
          <div className="l2-plan l2-plan--full" data-rise>
            <p className="l2-plan-name">Plný přístup</p>
            <p className="l2-plan-price">{trialDaysPhrase()} zdarma</p>
            <ul>
              <li>Porovnání škol vedle sebe a rozhodovací matice</li>
              <li>Plán tří přihlášek se skóre z přijímaček</li>
              <li>Poznámky a sdílení s rodiči</li>
            </ul>
            <p className="l2-plan-fine">Zrušení jedním kliknutím v nastavení</p>
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="l2-faq">
        <header className="l2-head l2-faq-head" data-rise>
          <p className="l2-kicker">Otázky</p>
          <h2 className="l2-h2">Na co se lidé ptají</h2>
        </header>
        <div className="l2-faq-list" data-rise>
          {FAQ.map(([q, a]) => (
            <details key={q} className="l2-faq-item">
              <summary>
                {q}
                <span className="l2-faq-icon" aria-hidden="true" />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="l2-final">
        <div className="l2-final-inner" data-rise>
          <p className="l2-kicker">Máš na to pár minut?</p>
          <h2 className="l2-final-title">Tvůj krátký seznam je {QUESTION_COUNT} otázek daleko.</h2>
          <Link to="/onboarding" className="l2-btn l2-btn--lg l2-magnet">
            Začít dotazník zdarma
            <span className="l2-btn-arrow" aria-hidden="true">→</span>
          </Link>
          <p className="l2-fine">Bez registrace · přeskočit můžeš cokoli</p>
        </div>
      </section>

    </div>
  );
}
