import {
  wikiActivities,
  ChannelTypes,
  UpdateTypes,
} from './../services/types/activityResult.js'
import { MessageEmbed, TextChannel } from 'discord.js'
import { singleton } from 'tsyringe'
import WikiUpdates from '../services/wikiUpdates.js'
import { HiiqAlarm, ScanResult } from '../services/hiiqAlarm.js'
import { BigNumber } from 'ethers/lib/ethers.js'
import { formatEther } from 'ethers/lib/utils.js'
import WikiUpdatesTweeter from '../services/tweetUpdates.js'

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
    private twitter: WikiUpdatesTweeter,
  ) {
    this.META_URL = process.env.META_URL
  }

  private async messageWikiStyle(wiki: wikiActivities, url: string) {
    const content = Object.values(wiki.content)
    const wikiEmbed = new MessageEmbed()
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
    return wikiEmbed
  }

  private async messageHiiqStyle(iq: ScanResult) {
    let formatter = Intl.NumberFormat('en', { notation: 'compact' })
    const value = BigNumber.from(iq.balance.result)
    const hiiqEmbed = new MessageEmbed()
      .setColor('#ff0000')
      .setAuthor({
        name: 'https://etherscan.io/address/Ox...',
        url: `https://etherscan.io/address/${iq.address}`,
      })
      .setDescription(
        `🛑 IQ low, value: ${formatter.format(
          Number(formatEther(value)),
        )}\n Threshold: ${formatter.format(Number(iq.balance.threshold))}`,
      )
      .setFooter({ text: `On address ${iq.address}` })
    return hiiqEmbed
  }

  private async checkAndTweet(
    messageUpdates: MessageUpdates,
    wikiActivity: wikiActivities,
  ) {
    if (messageUpdates.channelType !== ChannelTypes.PROD) return

    const twoHoursAgo = Math.floor(new Date().getTime() / 1000 - 60 * 60 * 2)
    const activitiesPast2hrs = await this.wikiUpdates.query(
      twoHoursAgo,
      messageUpdates.channelType,
    )

    if (
      activitiesPast2hrs.filter(e => e.wikiId === wikiActivity.wikiId).length >
      1
    ) {
      console.log(
        `🌲 SKIPPING TWEET, ${wikiActivity.wikiId} ALREADY TWEETED IN THE LAST 2 HOURS`,
      )
      return
    }

    await this.twitter.tweetWikiActivity(wikiActivity, messageUpdates.url)
  }

  async sendUpdates(messageUpdates: MessageUpdates) {
    if (messageUpdates.updateType === UpdateTypes.WIKI) {
      const time = await this.wikiUpdates.getTime(messageUpdates.channelType)
      const response = await this.wikiUpdates.query(
        time,
        messageUpdates.channelType,
      )
      response.forEach(async (activity: wikiActivities) => {
        messageUpdates.channelId.send({
          embeds: [await this.messageWikiStyle(activity, messageUpdates.url)],
        })
        await this.checkAndTweet(messageUpdates, activity)
        await this.wikiUpdates.revalidateWikiPage(
          activity.wikiId,
          messageUpdates.url,
        )
      })
    }

    if (messageUpdates.updateType === UpdateTypes.HIIQ) {
      const response = await this.hiiqAlarm.checkHiiq()
      response.forEach(async (e: ScanResult) => {
        if (e.balance.alarm) {
          messageUpdates.channelId.send({
            embeds: [await this.messageHiiqStyle(e)],
          })
        }
      })
    }
  }
}
