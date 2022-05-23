import { NotBot } from '@discordx/utilities'
import { TextChannel } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Client, Discord, Guard, On } from 'discordx'
import { injectable } from 'tsyringe'
import schedule from 'node-schedule'
import WikiUpdates from '../services/wikiUpdates.js'

@Discord()
@injectable()
export class AppDiscord {
  PAGE_URL?: string

  constructor(private wikiUpdates: WikiUpdates) {
    this.PAGE_URL = process.env.PAGE_URL
  }

  @On('messageCreate')
  @Guard(
    NotBot, // You can use multiple guard functions, they are executed in the same order!
  )
  onMessage([message]: ArgsOf<'messageCreate'>, client: Client) {
    switch (message.content.toLowerCase()) {
      case 'hello':
        message.react('🧠')
        message.reply(`Hello`)
        break
      default:
        message.reply('Command not found')
        break
    }
    console.log('Message Deleted', client.user?.username, message.content)
  }

  @On('ready')
  async isReady([client]: ArgsOf<'ready'>) {
    const chan = client.channels.cache.get(
      process.env.CHANNEL_ID,
    ) as TextChannel

    await this.wikiUpdates.getTime()

    schedule.scheduleJob('* * * *', async () => {
      console.log('Calling for new wikis 🚀')

      const time = await this.wikiUpdates.getTime()
      console.log(time)
      const response = await this.wikiUpdates.query(time)
        response.forEach(e => {
          chan.send(`🚀 ${e.type}: ${this.PAGE_URL}${e.wikiId}`)
        })
    })
  }
}
