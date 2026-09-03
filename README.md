# Scthe's blog - [https://www.sctheblog.com/](https://www.sctheblog.com/)

Static blog built with **Astro 7** + **React 18** + **MDX**, styled with
**Sass + CSS Modules**, deployed via **Vercel** (prebuilt static output).

## Run locally

1. `yarn install`
2. `yarn dev` (Astro dev server on [http://localhost:8080](http://localhost:8080))

### Commands

```bash
yarn start        # astro dev on 0.0.0.0:8080
yarn build        # production build to ./dist
yarn preview      # serve the production build
yarn sync         # regenerate content-collection types (.astro/)
yarn type-check   # astro check (tsc-based)
yarn lint         # eslint on src
yarn lint-fix     # eslint --fix
yarn format       # prettier --write on src
yarn test-all     # lint + type-check (the local CI gate)
```

## Deploy

### Initial setup

1. `npm i -g vercel@latest`
1. (One time) `vercel login`

### Auto deploy

Vercel + prebuilt output:

```bash
yarn build
vercel build       # uses the @astrojs/vercel adapter, writes .vercel/output
vercel deploy --prebuilt
vercel --prod
```

### Manual deploy

1. `git status` - check if all **local** articles are publishable i.e. no drafts in `content\blog`
1. `vercel build`
1. verify: `http-server .` in `.vercel\output\static`
1. `vercel deploy --prebuilt` - generate draft deploy
1. Check the preview link from CLI output
1. `vercel --prod` - push to live


