import { NotBot } from '@discordx/utilities'
import {  TextChannel } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Guard } from 'discordx'
import { Discord, On, Client } from 'discordx'
import { injectable } from 'tsyringe'
import activityResult from '../sevices/types/activityResult.js'
import wikiUpdates from '../sevices/wikiUpdates.js'

@Discord()
@injectable()
export class AppDiscord {
  constructor(private wikiUpdates: wikiUpdates) {
    console.log('constructed me as a singleton and injected _database')
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
    let type = client
    const chan = client.channels.cache.get(
      process.env.CHANNEL_ID,
    ) as TextChannel
    const result: activityResult = await this.wikiUpdates.query()
    if (type) {
      if (result !== null) {
        result.activities.forEach(e => {
          chan.send(`${process.env.PAGE_URL}${e.wikiId}`)
        })
      }
    }
  }
}
