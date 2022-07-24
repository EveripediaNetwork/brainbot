import {
  wikiActivities,
  ChannelTypes,
  UpdateTypes,
} from './../services/types/activityResult.js'
import { MessageEmbed, TextChannel } from 'discord.js'
import { singleton } from 'tsyringe'
import WikiUpdates from '../services/wikiUpdates.js'
import { HiiqAlarm, HiiqResult } from '../services/hiiqAlarm.js'

interface MessageUpdates {
  channelId: TextChannel
  channelType: ChannelTypes
  url: string
  updateType: UpdateTypes
}

@singleton()
export default class Updates {
  META_URL: string

  constructor(
    private wikiUpdates: WikiUpdates,
    private messageEmbed: MessageEmbed,
    private hiiqAlarm: HiiqAlarm,
  ) {
    this.META_URL = process.env.META_URL
  }

  private async messageStyle(result: wikiActivities, url: string) {
    const content = Object.values(result.content)
    const exampleEmbed = this.messageEmbed
      .setColor(result.type === 'CREATED' ? '#00ff00' : '#e8e805')
      .setTitle(content[0].title)
      .setURL(`${url}${result.wikiId}`)
      .setDescription(content[0].summary)
      .setImage(`${this.META_URL}${content[0].images[0].id}`)
      .setTimestamp()
      .setFooter({
        text: `${result.type.toLowerCase()} by ${
          result.user.profile?.username ? result.user.profile.username : 'user'
        }  `,
        iconURL: `${this.META_URL}${
          result.user.profile?.avatar
            ? result.user.profile.avatar
            : 'QmXqCRoaA61P3KamAd8UgGYyrcdb5Fu2REL6jrcVBSawwE'
        }`,
      })
    return exampleEmbed
  }

  async sendUpdates(messageUpdates: MessageUpdates) {
    if (messageUpdates.updateType === UpdateTypes.WIKI) {
      const time = await this.wikiUpdates.getTime(messageUpdates.channelType)
      const response = await this.wikiUpdates.query(
        time,
        messageUpdates.channelType,
      )

      response.forEach(async (e: wikiActivities) => {
        messageUpdates.channelId.send({
          embeds: [await this.messageStyle(e, messageUpdates.url)],
        })
      })
    }

    if (messageUpdates.updateType === UpdateTypes.HIIQ) {
      const response = await this.hiiqAlarm.checkHiiq()
        // console.log(messageUpdates.channelId)
      messageUpdates.channelId.send('here')
      response.forEach(async (e: HiiqResult) => {
        // messageUpdates.channelId.send({
          //     embeds: [await this.messageStyle(e, messageUpdates.url)],
        // })
      })
    }
  }
}
