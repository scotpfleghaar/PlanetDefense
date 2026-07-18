# Planet Defense

Static build, no bundler — plain ES modules served directly from `src/`.

Live at https://scotpfleghaar.github.io/PlanetDefense

## Running locally

```
npm start   # serves on http://localhost:8123 (ES modules need http(s), not file://)
npm stop    # kills the dev server
```

## Dev cheats

### Add salvage

Persistent currency (`salvage`) lives in `localStorage` under the key
`planet_defense_v1`, in the shape defined by `defaultSave()` in
[src/state/save.js](src/state/save.js). To bump it for testing (e.g. meta
upgrades in the shop), paste this into the browser DevTools console while the
game is open, then reload the page:

```js
(() => {
  const KEY = 'planet_defense_v1';
  const save = JSON.parse(localStorage.getItem(KEY)) || {};
  save.salvage = (save.salvage || 0) + 1000;
  localStorage.setItem(KEY, JSON.stringify(save));
  console.log('Salvage is now', save.salvage, '— reload the page to see it.');
})();
```

Note: this only affects the persistent `salvage` total (used in the meta
shop). It does not touch `coresCollected` / `salvageRun`, which live only on
the in-memory `game` object during an active run and reset every run.
