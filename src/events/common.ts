import { NotBot } from '@discordx/utilities'
import { TextChannel } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Client, Discord, Guard, On } from 'discordx'
import { injectable } from 'tsyringe'
import schedule from 'node-schedule'
import Updates from '../utils/sendUpdates.js'
import { ChannelTypes } from '../services/types/activityResult.js'

@Discord()
@injectable()
export class AppDiscord {
  PROD_URL: string
  DEV_URL: string

  constructor(private updates: Updates) {
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
    const channelIds = JSON.parse(process.env.CHANNELS)

    const devChannel = client.channels.cache.get(channelIds.DEV) as TextChannel
    const prodChannel = client.channels.cache.get(
      channelIds.PROD,
    ) as TextChannel

    schedule.scheduleJob('* * * *', async () => {
      console.log('Calling for new wikis 🚀')

      await this.updates.sendUpdates(devChannel, ChannelTypes.DEV, this.DEV_URL)

      await this.updates.sendUpdates(prodChannel, ChannelTypes.PROD, this.PROD_URL)

    })

    // #TODO: check every one hr for hiiqAlarm
  }
}
