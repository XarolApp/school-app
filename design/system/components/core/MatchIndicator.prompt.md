The only place Tertiary (moss) appears. Shows met/unmet criteria the student supplied — no percentage, no score, no staged reveal.

```jsx
<MatchIndicator criteria={[
  { text: 'Nabízí IT zaměření, které jste označili jako důležité' },
  { text: 'Dojezd 22 minut z vaší adresy' },
  { text: 'Loňská hranice přijetí byla nad vaším odhadem', met: false },
]} />
```

Write every string about the school ("Nabízí…", "Loňská hranice…"), never about the student ("Jste vhodný kandidát…").
