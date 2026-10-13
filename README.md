# BRAND NEW DAY

A scroll-film experience built with React + `@react-three/fiber` + `three.js`.

**Live:** https://lianbeast.github.io/Spider-Man/

## Development

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
npm test         # run unit tests
```

## Deploy to GitHub Pages

Two options:

### Option A — GitHub Actions (auto-deploy on push to main)

The repo includes `.github/workflows/gh-pages.yml`. After pushing to `main`:

1. Go to **Settings → Pages**
2. Set **Source** to *GitHub Actions*
3. The workflow builds and deploys automatically

### Option B — Manual deploy

```bash
npm install gh-pages -D
npm run deploy
```

Then in **Settings → Pages**, set the source to the `gh-pages` branch.

> **Note:** Update the `homepage` field in `package.json` to match your repo URL:
> `https://USERNAME.github.io/repo-name`
