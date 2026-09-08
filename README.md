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
yarn serve        # production build and start http-server
yarn sync         # regenerate content-collection types (.astro/)
```

## Deploy - Vercel

1. `npm i -g vercel@latest`
2. (One time) `vercel login`
3. `git status` - check if all **local** articles are publishable i.e. no drafts in `content\blog`
4. `yarn build`
5. verify: `http-server ".vercel\output\static"`
6. `vercel deploy --prebuilt` - generate draft deploy
7. Check the preview link from CLI output
8. `vercel --prod` - push to live


