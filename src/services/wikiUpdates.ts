import { singleton } from 'tsyringe'
import { request, gql } from 'graphql-request'
import { ChannelTypes, wikiActivities } from './types/activityResult.js'
import NodeCache from 'node-cache'
import axios from 'axios'

const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 })

@singleton()
export default class WikiUpdates {
  PROD_API_URL: string
  DEV_API_URL: string
  REVALIDATE_SECRET: string
  constructor() {
    this.PROD_API_URL = process.env.PROD_API_URL
    this.DEV_API_URL = process.env.DEV_API_URL
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

  async query(
    time: number,
    channelType: ChannelTypes,
  ): Promise<[wikiActivities]> {
    let newUnixTime
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
      result = await request(this.DEV_API_URL, query)
      newUnixTime = this.getUnixtime(result.activities[0].datetime)
      console.log(`${channelType} time`, newUnixTime)
      await this.setTime(newUnixTime, ChannelTypes.DEV)
    }

    if (channelType === ChannelTypes.PROD) {
      result = await request(this.PROD_API_URL, query)
      newUnixTime = this.getUnixtime(result.activities[0].datetime)
      console.log(`${channelType} time`, newUnixTime)
      await this.setTime(newUnixTime, ChannelTypes.PROD)
    }

    result = result.activities.filter((wiki: wikiActivities) => {
      return this.getUnixtime(wiki.datetime) > time
    })

    return result
  }
}
