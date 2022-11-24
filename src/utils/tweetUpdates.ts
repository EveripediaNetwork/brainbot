import { wikiActivities } from '../services/types/activityResult'
import { TwitterApi } from 'twitter-api-v2'
import shortenAddress from './shortenAddress'

export default class WikiUpdatesTweeter {
  private client: TwitterApi

  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY as string,
      appSecret: process.env.TWITTER_API_SECRET as string,
      accessToken: process.env.TWITTER_ACCESS_TOKEN as string,
      accessSecret: process.env.TWITTER_ACCESS_SECRET as string,
    })
  }

  async tweetWikiActivity(activity: wikiActivities, url: string) {
    // TWEET ELEMENTS
    const wikiTitle = activity.content[0].title
    let editorName = activity.user.profile?.username || activity.user.id
    if (editorName.startsWith('0x')) {
      editorName = shortenAddress(editorName)
    }
    const wikiRelatedTwitterAccount = `(@${
      activity.content[0].metadata.find(m => m.id === 'twitter_profile')?.value
    }) `
      .replace('https://twitter.com/', '')
      .replace('(@)', '')
    const editorTwitterAccount = `@${
      activity.user.profile?.links?.find(l => l.twitter)?.twitter
    }`.replace('https://twitter.com/', '')

    const wikiURL = `${url.replace('/wiki', '/revision')}${activity.id}`
    const hashTags = [
      '#Wiki',
      ...activity.content[0].categories.map(c =>
        `#${c.title}`
          .split(' ')
          .map(w => w[0].toUpperCase() + w.substring(1))
          .join(''),
      ),
    ]

    // BUILDING TWEET TEXT WITH FORMATTING
    const text = [
      '✨ New wiki activity on',
      wikiTitle,
      wikiRelatedTwitterAccount,
      'by',
      editorTwitterAccount.length > 3 ? editorTwitterAccount : editorName,
      '\n\n',
      ...hashTags,
      '\n\n',
      wikiURL,
    ]
      .filter(Boolean)
      .join(' ')

    // TWEETING THE ACTIVITY
    try {
      const rwClient = this.client.readWrite
      const result = await rwClient.v2.tweet(text)
      console.log(result)
    } catch (e) {
      console.log(`🚨 ERROR SENDING ACTIVITY TWEET: `, e)
    }
  }
}
