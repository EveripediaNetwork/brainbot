import { TextChannel } from 'discord.js'
import { singleton } from 'tsyringe'
import WikiUpdates from '../services/wikiUpdates.js'
import {
  ChannelTypes,
  wikiActivities,
} from '../services/types/activityResult'

@singleton()
export default class Updates {
  constructor(private wikiUpdates: WikiUpdates) {}
  async sendUpdates(
    channelId: TextChannel,
    channelType: ChannelTypes,
    url: string,
  ) {
    const time = await this.wikiUpdates.getTime(channelType)
    console.log('dev epoch', time)
    const response = await this.wikiUpdates.query(time, channelType)
    response.forEach((e: { type: string; wikiId: string }) => {
      channelId.send(`🚀 ${e.type}: ${url}${e.wikiId}`)
    })
  }
}


