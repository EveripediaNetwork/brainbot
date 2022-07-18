import { singleton } from 'tsyringe'
import { request, gql } from 'graphql-request'
import { ChannelTypes, wikiActivities } from './types/activityResult.js'
import NodeCache from 'node-cache'
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 })

@singleton()
export default class WikiUpdates {
  PROD_API_URL: string
  DEV_API_URL: string

  constructor() {
    this.PROD_API_URL = process.env.PROD_API_URL
    this.DEV_API_URL = process.env.DEV_API_URL
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

  async query(
    time: number,
    channelType: ChannelTypes,
  ): Promise<[wikiActivities]> {
    let newUnixTime
    const query = gql`
      {
        activities(lang: "en") {
          wikiId
          type
          datetime
          user {
            id
            profile {
              username
              avatar
            }
          }
          content {
            title
            summary
            images {
              id
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
