import { Client, auth } from 'twitter-api-sdk'
import { wikiActivities } from '../services/types/activityResult'

export default class WikiUpdatesTweeter {
  private client: Client

  constructor() {
    this.client = new Client(
      new auth.OAuth2User({
        client_id: process.env.CLIENT_ID as string,
        client_secret: process.env.CLIENT_SECRET as string,
        callback: process.env.TWITTER_CALLBACK_URL as string,
        scopes: ['tweet.write'],
      }),
    )
  }

  async tweetWikiActivity(activity: wikiActivities, url: string) {
    const text = `New wiki activity: ${activity.content[0].title} by ${
      activity.user.profile?.username || activity.user.id
    } ${url}${activity.wikiId}`
    try {
      await this.client.tweets.createTweet({ text })
    } catch (e) {
      console.log(`🚨 ERROR SENDING ACTIVITY TWEET: `, e)
    }
  }
}
