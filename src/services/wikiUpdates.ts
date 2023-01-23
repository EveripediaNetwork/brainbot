import { injectable, singleton } from 'tsyringe'
import { request, gql } from 'graphql-request'
import {
  ChannelTypes,
  wikiActivities,
} from './types/activityResult.js'
import NodeCache from 'node-cache'
import axios from 'axios'
import { MessageEmbed, TextChannel } from 'discord.js'
import { client } from '../main.js'

const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 })

const retryTime  =  30000
const notifyCount = 20 // every 20 count interval = 10mins
@singleton()
export default class WikiUpdates {
  CHANNEL_IDS: any
  DEV_API_URL: string
  PROD_API_URL: string
  DEV_CHANNEL_ID: string
  PROD_CHANNEL_ID: string
  REVALIDATE_SECRET: string

  constructor() {
    this.DEV_API_URL = process.env.DEV_API_URL
    this.PROD_API_URL = process.env.PROD_API_URL
    this.DEV_CHANNEL_ID = process.env.DEV_API_URL
    this.PROD_CHANNEL_ID = process.env.DEV_API_URL
    this.CHANNEL_IDS = JSON.parse(process.env.CHANNELS)
    this.REVALIDATE_SECRET = process.env.REVALIDATE_SECRET
  }

  getUnixtime(time: string): number {
    return Math.floor(new Date(time).getTime() / 1000)
  }

  async setTime(value: number | undefined, channelType: ChannelTypes) {
    myCache.set(`newUnix-${channelType}`, value, 100)
  }

  async getTime(channelType: ChannelTypes): Promise<number> {
    const cachedTime: number =
      (await myCache.get(`newUnix-${channelType}`)) || 0
    return cachedTime ? cachedTime : Date.now()
  }

  async revalidateWikiPage(id: string, path: string) {
    const url = path.replace('/wiki/', '/api/')
    const revalidateUrl = `${url}/revalidate?secret=${this.REVALIDATE_SECRET}&path=/wiki/${id}`
    try {
      const res = await axios.get(revalidateUrl)
      console.log('🔃 REVALIDATING :', res.data)
    } catch (e) {
      console.log('🚨 ERROR REVALIDATING: ', e)
    }
  }

  private async messageApiErrorStyle(url: string, errorCode: string) {
    const errorEmbed = new MessageEmbed()
      .setColor('#ff0000')
      .setTitle(`⚠️ Request to API failed ⚠️`)
      .setURL(`${url}`)
      .setDescription(`Error code: ${errorCode}`)
      .setTimestamp()
      .setFooter({
        text: 'Served by EP Bot',
      })
    return errorEmbed
  }

  async notifyError(
    count: number,
    channelType: ChannelTypes,
    link: string,
    errorCode: string,
  ) {
    const id =
      channelType === ChannelTypes.PROD
        ? this.CHANNEL_IDS.PROD.WIKI
        : this.CHANNEL_IDS.DEV.WIKI
    const channel = client.channels.cache.get(id) as TextChannel
    if (count % notifyCount === 0) {
      channel.send({
        embeds: [await this.messageApiErrorStyle(link, errorCode)],
      })
      return true
    }
    return true
  }

  async query(
    time: number,
    channelType: ChannelTypes,
  ): Promise<[wikiActivities]> {
    const query = gql`
      {
        activities(lang: "en") {
          id
          wikiId
          type
          datetime
          user {
            id
            profile {
              username
              avatar
              links {
                twitter
              }
            }
          }
          content {
            title
            summary
            categories {
              title
            }
            tags {
              id
            }
            images {
              id
            }
            metadata {
              id
              value
            }
          }
        }
      }
    `

    let result

    if (channelType === ChannelTypes.DEV) {
      return this.makeApiCall(this.DEV_API_URL, query, ChannelTypes.DEV)
    }
    if (channelType === ChannelTypes.PROD) {
      result = await this.makeApiCall(
        this.PROD_API_URL,
        query,
        ChannelTypes.PROD,
      )
    }

    result = result.activities.filter((wiki: wikiActivities) => {
      return this.getUnixtime(wiki.datetime) > time
    })

    return result
  }

  async makeApiCall(link: string, query: string, channelType: ChannelTypes, count = 0) {
    try {
      const apiCall = await request(link, query)
      const newUnixTime = this.getUnixtime(apiCall.activities[0].datetime)
      console.log(`${channelType} time`, newUnixTime)
      await this.setTime(newUnixTime, channelType)
      return apiCall
    } catch (e: any) {
      if (e) {
        await this.notifyError(count, channelType, link, e.code)
        console.error(
          `Error code ${e.code}: API Request to ${link} failed. Retrying in ${retryTime/1000} seconds...`,
        )
        await new Promise(r => setTimeout(r, retryTime))
        await this.makeApiCall(link, query, channelType, count+=1)
      }
    }
  }
}
