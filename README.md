# Scthe's blog - [https://www.sctheblog.com/](https://www.sctheblog.com/)

### Run

1. `$yarn install`
1. `$yarn start`
1. Accessible at: [http://localhost:8080](), [http://localhost:8080/\_\_\_graphql]()

### Upgrade node, yarn, gatsby etc.

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

### Problems with fast-refresh

I hate Gatsby. Open `src\templates\blog-post.tsx` and press `ctrl+s` to reconnect hmr.
