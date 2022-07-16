import { MessageEmbed, TextChannel } from 'discord.js'
import urlMetadata from 'url-metadata'
import { singleton } from 'tsyringe'
import WikiUpdates from '../services/wikiUpdates.js'
import { ChannelTypes } from '../services/types/activityResult'

@singleton()
export default class Updates {
  META_URL: string

  constructor(
    private wikiUpdates: WikiUpdates,
    private messageEmbed: MessageEmbed,
  ) {
    this.META_URL = process.env.META_URL
  }

  private async messageStyle(
    status: string,
    url: string,
    id: string,
    editor: any,
    icon: string,
  ) {

    const meta = await urlMetadata(`${url}${id}`)
    const exampleEmbed = this.messageEmbed
      .setColor(status === 'CREATED' ? '#00ff00' : '#e8e805')
      .setTitle(meta['og:title'])
      .setURL(`${url}${id}`)
      .setDescription(meta['og:description'])
      .setImage(meta.image)
      .setTimestamp()
      .setFooter({
        text: `${status.toLowerCase()} by ${editor ? editor : 'user'}  `,
        iconURL: `${this.META_URL}${icon}`,
      })

    return exampleEmbed
  }

  async sendUpdates(
    channelId: TextChannel,
    channelType: ChannelTypes,
    url: string,
  ) {
    const time = await this.wikiUpdates.getTime(channelType)
    console.log('dev epoch', time)
    const response = await this.wikiUpdates.query(time, channelType)

    response.forEach(
      async (e: {
        type: string
        wikiId: string
        user: { profile: { username: string; avatar: string } }
      }) => {
        channelId.send({
          embeds: [
            await this.messageStyle(
              e.type,
              url,
              e.wikiId,
              e.user.profile.username,
              e.user.profile.avatar,
            ),
          ],
        })
      },
    )
  }
}
