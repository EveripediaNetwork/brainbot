import { injectable, singleton } from 'tsyringe'
import { ChannelTypes, wikiActivities } from './types/activityResult.js'
import NodeCache from 'node-cache'
import { gql, request } from 'graphql-request'
import { EmbedBuilder, TextChannel } from 'discord.js'
import { client } from '../main.js'

interface ApiResponse {
  activities: wikiActivities[]
}

const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 })

const retryTime = 15000
const notifyCount = 20
@singleton()
export default class WikiUpdates {
  CHANNEL_IDS: any
  DEV_API_URL: string
  PROD_API_URL: string
  DEV_CHANNEL_ID: string
  PROD_CHANNEL_ID: string
  REVALIDATE_SECRET: string

  private apiHealthStatus = new Map<
    ChannelTypes,
    { isHealthy: boolean; lastCheck: number }
  >()

  constructor() {
    this.DEV_API_URL = process.env.DEV_API_URL
    this.PROD_API_URL = process.env.PROD_API_URL
    this.CHANNEL_IDS = JSON.parse(process.env.CHANNELS)
    this.DEV_CHANNEL_ID = this.CHANNEL_IDS.DEV.WIKI
    this.PROD_CHANNEL_ID = this.CHANNEL_IDS.PROD.WIKI
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

  private async messageApiErrorStyle(
    url: string,
    errorCode: string,
    env: ChannelTypes,
  ) {
    let description = `Error code: ${errorCode}`
    let color: number = 0xff0000
    let title = `⚠️ Request to ${env} API failed ⚠️`

    if (errorCode === 'TIMEOUT') {
      description = `🕐 API is unresponsive (timeout after 60 seconds)\n⚡ This indicates the API server is not responding within the expected timeframe.`
      color = 0xff6600
      title = `⏰ ${env} API Timeout`
    } else if (errorCode === 'HEALTH_CHECK_FAILED') {
      description = `🏥 API health check failed - service may be down\n🔍 Automated monitoring detected an issue with the API endpoint.`
      color = 0xcc0000
      title = `🚨 ${env} API Health Check Failed`
    }

    const errorEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setURL(url)
      .setDescription(description)
      .addFields([
        { name: '🌐 Environment', value: env, inline: true },
        { name: '🔗 URL', value: url, inline: false },
        { name: '⏰ Time', value: new Date().toLocaleString(), inline: true },
      ])
      .setTimestamp()
      .setFooter({
        text: 'EP Bot API Monitor',
      })
    return errorEmbed
  }

  async notifyError(
    count: number,
    channelType: ChannelTypes,
    link: string,
    errorCode: string,
  ) {
    try {
      const channelId =
        channelType === ChannelTypes.DEV
          ? this.CHANNEL_IDS.DEV.WIKI
          : this.CHANNEL_IDS.PROD.WIKI

      const channel = client.channels.cache.get(channelId) as TextChannel

      if (!channel) {
        console.error(
          `❌ Discord channel not found for ${channelType}: ${channelId}`,
        )
        return
      }

      const shouldNotify =
        errorCode === 'HEALTH_CHECK_FAILED' || count % notifyCount === 0

      if (shouldNotify) {
        console.log(
          `🚨 Sending error notification to ${channelType} channel for ${errorCode}`,
        )
        await channel.send({
          embeds: [
            await this.messageApiErrorStyle(link, errorCode, channelType),
          ],
        })
      }
    } catch (error) {
      console.error(`❌ Failed to send error notification:`, error)
    }
  }

  async query(
    time: number,
    channelType: ChannelTypes,
  ): Promise<wikiActivities[]> {
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
      result = await this.makeApiCall(this.DEV_API_URL, query, ChannelTypes.DEV)
    }
    if (channelType === ChannelTypes.PROD) {
      result = await this.makeApiCall(
        this.PROD_API_URL,
        query,
        ChannelTypes.PROD,
      )
    }
    result = result?.activities.filter((wiki: wikiActivities) => {
      return this.getUnixtime(wiki.datetime) > time
    })

    return result as wikiActivities[]
  }

  private async makeApiCallWithTimeout(
    link: string,
    query: string,
    timeout: number = 60000,
  ): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('API_TIMEOUT'))
      }, timeout)

      request(link, query)
        .then(response => {
          clearTimeout(timeoutId)
          resolve(response as ApiResponse)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  async makeApiCall(
    link: string,
    query: string,
    channelType: ChannelTypes,
    count = 0,
  ): Promise<ApiResponse> {
    let result
    const maxRetries = 5
    const timeout = 60000

    try {
      console.log(`Making API call to ${channelType} (attempt ${count + 1})`)
      const apiCall: ApiResponse = await this.makeApiCallWithTimeout(
        link,
        query,
        timeout,
      )

      if (apiCall.activities && apiCall.activities.length > 0) {
        const newUnixTime = this.getUnixtime(
          apiCall.activities[0].datetime as string,
        )
        console.log(`${channelType} time`, newUnixTime)
        await this.setTime(newUnixTime, channelType)
      }

      result = apiCall
    } catch (e: any) {
      const errorCode =
        e.message === 'API_TIMEOUT' ? 'TIMEOUT' : e.code || 'UNKNOWN_ERROR'

      console.error(
        `Error ${errorCode}: API Request to ${link} failed. Attempt ${count + 1}/${maxRetries}`,
      )


      if (count >= maxRetries - 1) {
        await this.notifyError(count + 1, channelType, link, errorCode)
        throw new Error(
          `API ${channelType} failed after ${maxRetries} attempts: ${errorCode}`,
        )
      }

      const waitTime =
        channelType === ChannelTypes.DEV ? retryTime * 100 : retryTime
      console.log(`Retrying in ${waitTime / 1000} seconds...`)
      await new Promise(r => setTimeout(r, waitTime))

      return await this.makeApiCall(link, query, channelType, count + 1)
    }

    return result as ApiResponse
  }

  async checkApiHealth(channelType: ChannelTypes): Promise<boolean> {
    const link =
      channelType === ChannelTypes.DEV ? this.DEV_API_URL : this.PROD_API_URL
    const simpleQuery = gql`
      {
        activities(lang: "en", limit: 1) {
          id
          datetime
        }
      }
    `

    try {
      await this.makeApiCallWithTimeout(link, simpleQuery, 30000)
      this.apiHealthStatus.set(channelType, {
        isHealthy: true,
        lastCheck: Date.now(),
      })
      return true
    } catch (error) {
      this.apiHealthStatus.set(channelType, {
        isHealthy: false,
        lastCheck: Date.now(),
      })
      console.error(`API Health Check Failed for ${channelType}:`, error)
      return false
    }
  }

  async startApiHealthMonitoring(): Promise<void> {
    const checkInterval = 60000

    console.log('🔍 Starting API Health Monitoring - checking every 1 minute')

    this.apiHealthStatus.set(ChannelTypes.DEV, {
      isHealthy: true,
      lastCheck: 0,
    })
    this.apiHealthStatus.set(ChannelTypes.PROD, {
      isHealthy: true,
      lastCheck: 0,
    })

    setInterval(async () => {
      console.log('🏥 Running API health checks...')

      for (const channelType of [ChannelTypes.DEV, ChannelTypes.PROD]) {
        const previousStatus = this.apiHealthStatus.get(channelType)
        const isHealthy = await this.checkApiHealth(channelType)

        if (!isHealthy) {
          console.warn(
            `⚠️ API ${channelType} is unresponsive at ${new Date().toISOString()}`,
          )

          await this.notifyError(
            1,
            channelType,
            channelType === ChannelTypes.DEV
              ? this.DEV_API_URL
              : this.PROD_API_URL,
            'HEALTH_CHECK_FAILED',
          )
        } else {
          console.log(
            `✅ API ${channelType} is healthy at ${new Date().toISOString()}`,
          )

          if (previousStatus && !previousStatus.isHealthy) {
            console.log(`🎉 API ${channelType} has recovered!`)
          }
        }
      }
    }, checkInterval)
  }

  async testNotifications(): Promise<void> {
    console.log('🧪 Testing Discord notifications...')

    try {
      await this.notifyError(
        1,
        ChannelTypes.DEV,
        this.DEV_API_URL,
        'TEST_NOTIFICATION',
      )
      await this.notifyError(
        1,
        ChannelTypes.PROD,
        this.PROD_API_URL,
        'TEST_NOTIFICATION',
      )
      console.log('✅ Test notifications sent successfully')
    } catch (error) {
      console.error('❌ Failed to send test notifications:', error)
    }
  }

  getApiHealthStatus(): Map<
    ChannelTypes,
    { isHealthy: boolean; lastCheck: number }
  > {
    return new Map(this.apiHealthStatus)
  }
}
