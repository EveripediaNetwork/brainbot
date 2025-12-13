import { Client, DIService, tsyringeDependencyRegistryEngine } from "discordx";
import "reflect-metadata";
import { IntentsBitField, Interaction, Message } from "discord.js";
import { dirname, importx } from "@discordx/importer";
import 'dotenv/config'
import { container } from 'tsyringe'

export const client = new Client({
    simpleCommand: {
        prefix: "!",
    },
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildVoiceStates,
    ],
    // If you only want to use global commands only, comment this line
    botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
});


client.once("clientReady", async () => {
    // make sure all guilds are in cache
    await client.guilds.fetch();

    // init all application commands
    await client.initApplicationCommands();

  // init permissions; enabled log to see changes
//   await client.initApplicationPermissions(true);

  // uncomment this line to clear all guild commands,
  // useful when moving to global commands from guild commands
  //  await client.clearApplicationCommands(
  //    ...client.guilds.cache.map((g) => g.id)
  //  );
  
  console.log("Bot started");
});

client.on("interactionCreate", (interaction: Interaction) => {
  client.executeInteraction(interaction);
});

client.on("messageCreate", (message: Message) => {
  client.executeCommand(message);
});

async function run() {
    
  DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container)
    // with cjs
    // await importx(dirname + "/{events,commands}/**/*.{ts,js}");
    // with ems
    await importx(
        dirname(import.meta.url) + "/{events,commands,services,utils}/**/*.{ts,js}"
  );

  // let's start the bot
  if (!process.env.BOT_TOKEN) {
    throw Error("Could not find BOT_TOKEN in your environment");
  }
  await client.login(process.env.BOT_TOKEN); // provide your bot token
  
}

run();
