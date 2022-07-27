import {
  wikiActivities,
  ChannelTypes,
  UpdateTypes,
} from './../services/types/activityResult.js'
import { MessageEmbed, TextChannel } from 'discord.js'
import { singleton } from 'tsyringe'
import WikiUpdates from '../services/wikiUpdates.js'
import { HiiqAlarm, HiiqResult } from '../services/hiiqAlarm.js'
import { BigNumber } from 'ethers/lib/ethers.js'
import { formatEther } from 'ethers/lib/utils.js'

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
    private hiiqAlarm: HiiqAlarm,
  ) {
    this.META_URL = process.env.META_URL
  }

  private async messageWikiStyle(wiki: wikiActivities, url: string) {
    const content = Object.values(wiki.content)
    const exampleEmbed = new MessageEmbed()
      .setColor(wiki.type === 'CREATED' ? '#00ff00' : '#e8e805')
      .setTitle(content[0].title)
      .setURL(`${url}${wiki.wikiId}`)
      .setDescription(content[0].summary)
      .setImage(`${this.META_URL}${content[0].images[0].id}`)
      .setTimestamp()
      .setFooter({
        text: `${wiki.type.toLowerCase()} by ${
          wiki.user.profile?.username ? wiki.user.profile.username : 'user'
        }  `,
        iconURL: `${this.META_URL}${
          wiki.user.profile?.avatar
            ? wiki.user.profile.avatar
            : 'QmXqCRoaA61P3KamAd8UgGYyrcdb5Fu2REL6jrcVBSawwE'
        }`,
      })
    return exampleEmbed
  }
  private messageHiiqStyle(iq: HiiqResult) {
    const address = Object.keys(iq)[0]
    const content = Object.values(iq)[0]
    const value = BigNumber.from(content.result)
    const exampleEmbed = new MessageEmbed()
      .setColor(content.alarm ? '#00ff00' : '#ff0000')
      .setTitle(content.alarm ? 'Hiiq High' : 'Hiiq Low')
      .setDescription(`value ${Number(formatEther(value)).toFixed(2)}`)
      .setFooter({ text: `On address ${address}` })
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
          embeds: [await this.messageWikiStyle(e, messageUpdates.url)],
        })
      })
    }

    if (messageUpdates.updateType === UpdateTypes.HIIQ) {
      const response = await this.hiiqAlarm.checkHiiq()
      response.forEach((e: HiiqResult) => {
        messageUpdates.channelId.send({
              embeds: [this.messageHiiqStyle(e)],
        })
      })
    }
  }
}
