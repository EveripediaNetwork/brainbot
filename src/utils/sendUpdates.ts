import {
  wikiActivities,
  ChannelTypes,
} from './../services/types/activityResult'
import { MessageEmbed, TextChannel } from 'discord.js'
import { singleton } from 'tsyringe'
import WikiUpdates from '../services/wikiUpdates.js'

@singleton()
export default class Updates {
  META_URL: string

  constructor(
    private wikiUpdates: WikiUpdates,
    private messageEmbed: MessageEmbed,
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
      .setImage(
        `${this.META_URL}${content[0].images[0].id}`,
      )
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

  async sendUpdates(
    channelId: TextChannel,
    channelType: ChannelTypes,
    url: string,
  ) {
    const time = await this.wikiUpdates.getTime(channelType)
    const response = await this.wikiUpdates.query(time, channelType)

    response.forEach(async (e: wikiActivities) => {
      channelId.send({
        embeds: [
          await this.messageStyle(
            e,
            url,
          ),
        ],
      })
    })
  }
}
