mport { NotBot } from '@discordx/utilities'
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
    const channelIds = JSON.parse(process.env.CHANNELS || '')

    const devChannel = client.channels.cache.get(channelIds.DEV) as TextChannel
    const prodChannel = client.channels.cache.get(
      channelIds.PROD,
    ) as TextChannel

    // await this.wikiUpdates.getTime()

    schedule.scheduleJob('*/20 * * * * *', async () => {
      console.log('Calling for new wikis 🚀')
      // console.log(time)

      const sendDevUpdates = async () => {
        const time = await this.wikiUpdates.getTime('D')
        console.log('dev epoch', time)
        const response = await this.wikiUpdates.query(time, 'DEV')
        response.forEach(e => {
          devChannel.send(`🚀 ${e.type}: ${this.DEV_URL}${e.wikiId}`)
        })
      }
      const sendProdUpdates = async () => {
        const time = await this.wikiUpdates.getTime('P')
        console.log('prod epoch', time)
        const response = await this.wikiUpdates.query(time, 'PROD')
        response.forEach(e => {
          prodChannel.send(`🚀 ${e.type}: ${this.PROD_URL}${e.wikiId}`)
        })
      }

      await sendDevUpdates()
      await sendProdUpdates()

      //   for await (const channel of Object.keys(channelIds)) {

      //     if (channel === ChannelTypes.DEV) {
      //       const devChannel = client.channels.cache.get(
      //         channelIds[channel],
      //       ) as TextChannel

      //       const response = await this.wikiUpdates.query(time, channel)
      //       response.forEach(e => {
      //         devChannel.send(`🚀 ${e.type}: ${this.DEV_URL}${e.wikiId}`)
      //       })
      //     }

      //     if (channel === ChannelTypes.PROD) {
      //       const prodChannel = client.channels.cache.get(
      //         channelIds[channel],
      //       ) as TextChannel

      //       const response = await this.wikiUpdates.query(time, channel)
      //       response.forEach(e => {
      //         prodChannel.send(`🚀 ${e.type}: ${this.PROD_URL}${e.wikiId}`)
      //       })
      //     }
      //   }
    })
  }
}