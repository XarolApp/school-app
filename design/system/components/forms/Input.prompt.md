Text field with label, optional hint, and an error state that is always fill + icon + message.

```jsx
<Input label="E-mail" placeholder="jmeno@email.cz" />
<Input label="PSČ" value="1" error="Zadejte pět číslic." />
```

Focus and error both use a 1.5px border (primary / error) so the box does not shift. Never signal invalidity with colour alone — pass `error` text.
