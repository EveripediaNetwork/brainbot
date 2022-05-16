import { singleton } from 'tsyringe'
import { request, gql } from 'graphql-request'
import activityResult from './types/activityResult'

@singleton()
export default class WikiUpdates {
  url: string

  constructor() {
    this.url = process.env.API_URL
  }

  async query(): Promise<activityResult> {
    const query = gql`
      {
        activities(lang: "en") {
          wikiId
          datetime
        }
      }
    `
    const response = await request(this.url, query)
    return response
  }
}