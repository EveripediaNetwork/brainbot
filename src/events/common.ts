import { NotBot } from '@discordx/utilities'
import { TextChannel } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Client, Discord, Guard, On } from 'discordx'
import { injectable } from 'tsyringe'
import schedule from 'node-schedule'
import WikiUpdates from '../services/wikiUpdates.js'
import { ChannelTypes } from '../services/types/activityResult.js'

@Discord()
@injectable()
export class AppDiscord {
  DEV_URL?: string
  PROD_URL?: string

  constructor(private wikiUpdates: WikiUpdates) {
    this.PROD_URL = process.env.PROD_URL
    this.DEV_URL = process.env.DEV_URL
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
        message.reply('Awaiting new wikis ......')
        break
    }
    console.log('Message Deleted', client.user?.username, message.content)
  }

  @On('ready')
  async isReady([client]: ArgsOf<'ready'>) {
    const channels = JSON.parse(process.env.CHANNELS || '')

    await this.wikiUpdates.getTime()

    client.channels.cache.get(channels.dev) as TextChannel

    schedule.scheduleJob('* * * *', async () => {
      const time = await this.wikiUpdates.getTime()

      console.log('Calling for new wikis 🚀')
      console.log(time)

      for (const channel in channels) {
        if (channel === ChannelTypes.DEV) {
          const devChannel = client.channels.cache.get(
            channels[channel],
          ) as TextChannel

          const response = await this.wikiUpdates.query(time, channel)
          response.forEach(e => {
            devChannel.send(`🚀 ${e.type}: ${this.DEV_URL}${e.wikiId}`)
          })
        }
        if (channel === ChannelTypes.PROD) {
          const prodChannel = client.channels.cache.get(
            channels[channel],
          ) as TextChannel

          const response = await this.wikiUpdates.query(time, channel)
          response.forEach(e => {
            prodChannel.send(`🚀 ${e.type}: ${this.PROD_URL}${e.wikiId}`)
          })
        }
      }
    })
  }
}
