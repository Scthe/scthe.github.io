# Scthe's blog - [https://www.sctheblog.com/](https://www.sctheblog.com/)

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
