# Scthe's blog - [https://www.sctheblog.com/](https://www.sctheblog.com/)

## Run locally

1. `yarn install`
1. `yarn start`
1. Accessible at: [http://localhost:8080](http://localhost:8080), [http://localhost:8080/\_\_\_graphql](http://localhost:8080/___graphql)

### Problems with ???

- `yarn gatsby clean`

I hate Gatsby.

### Problems with fast-refresh

I hate Gatsby. Open `src\templates\blog-post.tsx` and press `ctrl+s` to reconnect hmr.

## Deploy

Vercel's Gatsby integration throws errors on git push hook: `Field "image" of type "File" must have a selection of subfields`. "We'll do it live":

### Initial setup:

1. `npm i -g vercel`
2. (Optional) `npm i -g vercel@latest`
3. (One time) `vercel login`

### Push:

1. `git s` - check if all **local** articles are publishable i.e. no drafts in `content\blog`
1. `yarn build`
1. `vercel build`
1. verify: `http-server .` in `.vercel\output\static`
1. `vercel deploy --prebuilt` - generate draft deploy
1. Check the preview link from CLI output
1. `vercel --prod` - push to live

## Upgrade node, yarn, gatsby etc.

1. Install node and yarn
   1. `nvm install v20.10.0`
   1. `nvm use v20.10.0`
   1. `corepack enable` - add yarn
2. Clean repo
   1. `yarn cache clean` - just in case
   1. Delete `yarn.lock`
3. Upgrade packages
   1. `yarn upgrade-interactive` - select packages to upgrade
   1. `yarn install`
4. `yarn dlx @yarnpkg/sdks vscode` - one time only
5. `yarn start` - dev server

## Misc

### Why use `useStaticQuery()` everywhere? Why not query for single object using variables?

`useStaticQuery()` can be used from everywhere. Other types of queries have some constraints.
