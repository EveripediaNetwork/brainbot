import { singleton } from 'tsyringe'
import { request, gql } from 'graphql-request'
import { wikiActivities, activityResult } from './types/activityResult'
import NodeCache from 'node-cache'
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 })

interface scheduleResponse {
  result: activityResult
  newUnixTime: number | undefined
}

@singleton()
export default class WikiUpdates {
  url: string

  constructor() {
    this.url = process.env.API_URL
  }

  getUnixtime(time: string) {
    return Math.floor(new Date(time).getTime() / 1000)
  }

  async setTime(value: number | undefined) {
    myCache.set('newUnix', value, 100)
  }

  async getTime(): Promise<number | undefined> {
    return await myCache.get('newUnix')
  }

  async query(time?: number): Promise<scheduleResponse> {
    let newUnixTime
    const query = gql`
      {
        activities(lang: "en") {
          wikiId
          datetime
        }
      }
    `

    let result = await request(this.url, query)
    newUnixTime = this.getUnixtime(result.activities[0].datetime)
    await this.setTime(newUnixTime)

    if (time) {
        result = result.activities.filter((wiki: wikiActivities) => {
          const tt = this.getUnixtime(wiki.datetime)
        return this.getUnixtime(wiki.datetime) > time
      })
    }

    return { result, newUnixTime }
  }
}
