import { singleton } from 'tsyringe'
import { request, gql } from 'graphql-request'
import schedule from 'node-schedule'
import { wikiActivities, activityResult } from './types/activityResult'

interface scheduleResponse {
  result: activityResult
  time?: number
}

@singleton()
export default class WikiUpdates {
  url: string

  constructor() {
    this.url = process.env.API_URL
  }

  async getUnixtime(time: string) {
    return Math.floor(new Date(time).getTime() / 1000)
  }

  async query(timer?: number): Promise<scheduleResponse> {
    // let respons
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
    const time = await this.getUnixtime(result.activities[0].datetime)
    newUnixTime = time

    if (result.activities.length === 0 && timer) {
      result = result.activities.filter(async (wiki: wikiActivities) => {
        ;(await this.getUnixtime(wiki.datetime)) > timer
      })
      await this.query(newUnixTime)
    }


    return { result, time }
  }
}
