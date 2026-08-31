Primary/secondary action button — sentence case, never uppercase, never a ghost or tertiary variant (this system has exactly two).

```jsx
<Button onClick={next}>Zobrazit výsledky</Button>
<Button variant="secondary" size="sm">Zpět</Button>
```

Primary is solid `--primary` with `--text-on-primary`, hovering to `--primary-strong`. Secondary is `--surface` fill with a terracotta label and no visible border until hover. Sizes sm/md/lg; `fullWidth` for mobile CTAs. Primary is a CTA colour — do not place two primaries in one viewport.
