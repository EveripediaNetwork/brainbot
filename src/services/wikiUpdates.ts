import { singleton } from 'tsyringe'
import { request, gql } from 'graphql-request'
import { wikiActivities } from './types/activityResult'
import NodeCache from 'node-cache'
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 })

@singleton()
export default class WikiUpdates {
  url: string

  constructor() {
    this.url = process.env.API_URL
  }

  getUnixtime(time: string): number {
    return Math.floor(new Date(time).getTime() / 1000)
  }

  async setTime(value: number | undefined) {
    myCache.set('newUnix', value, 100)
  }

  async getTime(): Promise<number> {
    const cachedTime: number = await myCache.get('newUnix') || 0
    return cachedTime ? cachedTime : Date.now();
  }

  async query(time: number): Promise<[wikiActivities]> {
    let newUnixTime
    const query = gql`
      {
        activities(lang: "en") {
          wikiId
          type
          datetime
        }
      }
    `

    let result = await request(this.url, query)
    newUnixTime = this.getUnixtime(result.activities[0].datetime)
    console.log(newUnixTime)
    await this.setTime(newUnixTime)

    result = result.activities.filter((wiki: wikiActivities) => {
      return this.getUnixtime(wiki.datetime) > time
    })

    return result
  }
}
