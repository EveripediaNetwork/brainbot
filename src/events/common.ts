import { NotBot } from '@discordx/utilities'
import { TextChannel } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Client, Discord, Guard, On } from 'discordx'
import { injectable } from 'tsyringe'
import schedule from 'node-schedule'
import Updates from '../utils/sendUpdates.js'
import { ChannelTypes, UpdateTypes } from '../services/types/activityResult.js'

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

    const devWikiChannel = client.channels.cache.get(
      channelIds.DEV.WIKI,
    ) as TextChannel
    const devHiiqChannel = client.channels.cache.get(
      channelIds.DEV.HIIQ,
    ) as TextChannel
    const prodWikiChannel = client.channels.cache.get(
      channelIds.PROD.WIKI,
    ) as TextChannel

    schedule.scheduleJob('* * * *', async () => {
      console.log('Calling for new wikis 🚀')
      console.log('prod channels', channelIds.DEV.HIIQ)

      await this.updates.sendUpdates({
        channelId: devWikiChannel,
        channelType: ChannelTypes.DEV,
        url: `${this.DEV_URL}`,
        updateType: UpdateTypes.WIKI,
      })

      await this.updates.sendUpdates({
        channelId: prodWikiChannel,
        channelType: ChannelTypes.PROD,
        url: `${this.PROD_URL}`,
        updateType: UpdateTypes.WIKI,
      })
    })

    // #TODO: check every one hr for hiiqAlarm
    // #FIXME: Set back time to 1hr interval
    schedule.scheduleJob('*/10 * * * * *', async () => {
      await this.updates.sendUpdates({
        channelId: devHiiqChannel,
        channelType: ChannelTypes.DEV,
        url: '',
        updateType: UpdateTypes.HIIQ,
      })
    })
  }
}
