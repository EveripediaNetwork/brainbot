import { wikiActivities } from '../services/types/activityResult'
import { TwitterApi } from 'twitter-api-v2'
import {
  convertToCamelCase,
  makeTextFromWords,
  shortenAddress,
} from './textUtilities.js'

export default class WikiUpdatesTweeter {
  private client: TwitterApi
  private TWEET_LIMIT = 280

  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY as string,
      appSecret: process.env.TWITTER_API_SECRET as string,
      accessToken: process.env.TWITTER_ACCESS_TOKEN as string,
      accessSecret: process.env.TWITTER_ACCESS_SECRET as string,
    })
  }

  async tweetWikiActivity(activity: wikiActivities, url: string) {
    try {
      const tweet = this.buildTweet(activity, url)
      const response = await this.client.readWrite.v2.tweet(tweet)
      console.log(`✨ TWEET SENT ! :`, response)
    } catch (e) {
      console.error(`🚨 ERROR SENDING TWEET: `, e)
    }
  }

  private buildTweet(activity: wikiActivities, url: string) {
    const wikiTitle = activity.content[0].title
    const editorName = this.getEditorName(activity)
    const wikiRelatedTwitterAccount = this.getWikiTwitterAccount(activity)
    const wikiURL = `${url.replace('/wiki', '/revision')}${activity.id}`
    const hashTags = this.getHashTags(activity)

    let text = ''
    do {
      if (hashTags.length === 0) {
        throw new Error('No hashtags found')
      }
      text = makeTextFromWords([
        '✨ New wiki activity on',
        wikiTitle,
        wikiRelatedTwitterAccount,
        'by',
        editorName,
        '\n\n',
        ...hashTags,
        '\n\n',
        wikiURL,
      ])
      hashTags.pop()
    } while (text.length > this.TWEET_LIMIT)

    return text
  }

  private getEditorName(activity: wikiActivities) {
    const twitterUsername = `@${
      activity.user.profile?.links?.find(l => l.twitter)?.twitter
    }`.replace('https://twitter.com/', '')
    if (twitterUsername.length > 3) return twitterUsername
    let iqWikiUsername = activity.user.profile?.username || activity.user.id
    if (iqWikiUsername.startsWith('0x')) {
      iqWikiUsername = shortenAddress(iqWikiUsername)
    }
    return iqWikiUsername
  }

  private getHashTags(activity: wikiActivities) {
    const wikiCategories = activity.content[0].categories.map(c => c.title)
    const wikiTags = activity.content[0].tags.map(t => t.id)
    const tags = ['Wiki', ...wikiCategories, ...wikiTags]
    const hashTags = tags.map(tag => convertToCamelCase(`#${tag}`))
    return hashTags
  }

  private getWikiTwitterAccount(activity: wikiActivities) {
    const wikiTwitterAccount = activity.content[0].metadata.find(
      m => m.id === 'twitter_profile',
    )?.value
    return `(@${wikiTwitterAccount})`
      .replace('https://twitter.com/', '')
      .replace('(@)', '')
  }
}
