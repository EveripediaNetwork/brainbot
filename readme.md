# 🧠 Brainbot

# Content


- [Installation](#installation)
- [Use global command only](#use-global-command-only)
- [Use CommonJS](#use-commonjs)
- [Remove rest api server](#remove-rest-api-server)

# Installation

**Clone Repository**

```bash
git clone git@github.com:EveripediaNetwork/brainbot.git
```

**Enter bot directory**

```bash
cd brainbot
```

**Install Dependencies**

```bash
npm install
```

**Build your bot**

```bash
npm run build
```

**Set your bot token**

For windows user only

```bash
# For command prompt
set BOT_TOKEN=REPLACE_THIS_WITH_YOUR_BOT_TOKEN

# For powershell
$ENV:BOT_TOKEN="REPLACE_THIS_WITH_YOUR_BOT_TOKEN"
```

For linux user only

```bash
export BOT_TOKEN=REPLACE_THIS_WITH_YOUR_BOT_TOKEN
```

**Start your bot**

```bash
npm run serve
```

you are done, you will see your bot up and running. For detailed installation guide, please [see this](https://oceanroleplay.github.io/discord.ts/docs/installation)

# Use global command only

This repository uses guild commands instead of global commands by default. This is because global command needs approximately 15 minutes to update itself every time.

## 1. How do I use global command only?

### comment [this line in main.ts](https://github.com/oceanroleplay/discord.ts-example/blob/main/src/main.ts#L18)

## 2. How do I make specific guild command?

### use [@Guild](https://discord-ts.js.org/docs/decorators/general/guild) decorator on [@Slash](https://discord-ts.js.org/docs/decorators/commands/slash), [check more information](https://discord-ts.js.org/docs/decorators/general/guild)

# Use CommonJS

This repo is targeted to use ECMAScript modules by default. Follow these steps to use CommonJS.

## Update package.json

```json
{
  // ...
  "type": "commonjs",
  // ...
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/main.ts",
    "start": "nodemon --exec ts-node src/main.ts",
    "serve": "node build/main.js"
  }
  // ...
}
```

## Update tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "CommonJS"
    // ...
  }
}
```

## Update main.ts

```ts
async function run() {
  // with cjs
  await importx(__dirname + "/{events,commands}/**/*.{ts,js}");
  // with ems
  // await importx(dirname(import.meta.url) + "/{events,commands}/**/*.{ts,js}");
  client.login(process.env.BOT_TOKEN ?? ""); // provide your bot token
}
```

# Remove rest api server

There are only a few lines of basic code, which you need to either comment out or remove to disable the API server

1. Delete the `api` folder from the [src folder](https://github.com/oceanroleplay/discord.ts-example/tree/main/src)
1. Remove api reference from importx path in [main.ts#L57](https://github.com/oceanroleplay/discord.ts-example/blob/main/src/main.ts#L57)
1. Comment out or remove the code from [main.ts#L5](https://github.com/oceanroleplay/discord.ts-example/blob/main/src/main.ts#L5) and [main.ts#L66](https://github.com/oceanroleplay/discord.ts-example/blob/main/src/main.ts#L66) - [main.ts#L81](https://github.com/oceanroleplay/discord.ts-example/blob/main/src/main.ts#L81)
1. Run `npm uninstall koa @koa/router @discordx/koa @types/koa @types/koa__router`

The API server has been removed from the discord bot
