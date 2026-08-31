The questionnaire's answer choice row — the main interactive surface of the quiz.

```jsx
<OptionRow label="Informatika a programování" description="Maturitní obor s IT zaměřením"
  selected={pick === 'it'} onSelect={() => setPick('it')} />
```

`multiple` swaps the round marker for a square one. Stack rows in a flex column with `gap: var(--space-sm)`.
