<h1 align="center">
  <br>
  <a href="https://github.com/Cog-Creators/Red-DiscordBot/tree/V3/develop"><img src="https://ipfs.everipedia.org/ipfs/QmeYq5z5431h5Vdh6xgHns1Lu9V73PSsitNfnwyJUEAJ8G" alt="BrainDAO" width="35%" height="35%"></a>
  <br>
  Everipedia Brain Bot
  <br>
</h1>

# Overview

Everipedia brain bot is a bot built on the discord api, it sends schdeduled live wiki updates in a discord channel. more updates coming soon!!


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

In brainbot folder
```yml
# Create a .env similar to sample env
CHANNEL_ID= {{channel where bot sends message}}
BOT_TOKEN= {{your bot token}}
API_URL= {{where data is gotten from}}
PAGE_URL= {{basic url for a wiki page appended with a wiki slug}}
```
Alternatively, you can set each token in the termial. Repeat process for each env

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

Join us on our [Official Discord Server](https://discord.gg/MmysbVj9)!
