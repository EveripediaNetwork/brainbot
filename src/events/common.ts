import { TextChannel } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Discord, On } from 'discordx'
import { injectable } from 'tsyringe'
import schedule from 'node-schedule'
import Updates from '../utils/sendUpdates.js'
import { ChannelTypes, UpdateTypes } from '../services/types/activityResult.js'
import RevalidateService from '../services/revalidate.js'
import WikiUpdates from '../services/wikiUpdates.js'
import { writeFile } from '../utils/helpers.js'
import axios, { AxiosError } from 'axios'

const urls = [
  'https://iq.wiki/categories/daos',
  'https://iq.wiki/',
  'https://iq.wiki/wiki/hiiq',
  'https://iq.social',
  'https://iq.braindao.org',
  'https://iq.braindao.org/dashboard/treasury',
  'https://iq.braindao.org/dashboard/stats',
  'https://braindao.org',
]

interface ScheduledJobConfig {
  name: string
  schedule: string
  task: () => Promise<void>
  enabled: boolean
}

@Discord()
@injectable()
export class AppDiscord {
  PROD_ALARMS: string
  PROD_URL: string
  DEV_URL: string
  private scheduledJobs: schedule.Job[] = []

  constructor(
    private updates: Updates,
    private revalidate: RevalidateService,
    private wikiUpdates: WikiUpdates,
  ) {
    this.PROD_ALARMS = JSON.parse(process.env.CHANNELS).ALARMS
    this.PROD_URL = process.env.PROD_URL
    this.DEV_URL = process.env.DEV_URL
  }

  private async executeWithErrorHandling(
    taskName: string,
    task: () => Promise<void>,
  ): Promise<void> {
    try {
      console.log(`🚀 Starting ${taskName}...`)
      await task()
      console.log(`✅ Completed ${taskName}`)
    } catch (error) {
      console.error(`❌ Error in ${taskName}:`, error)
    }
  }

  private createScheduledJobs(channels: any): ScheduledJobConfig[] {
    const devWikiChannel = channels.devWikiChannel
    const devHiiqChannel = channels.devHiiqChannel
    const prodWikiChannel = channels.prodWikiChannel
    const prodAlertChannel = channels.prodAlertChannel

    return [
      {
        name: 'Wiki Updates Check',
        schedule: '* * * * *',
        enabled: true,
        task: async () => {
          await Promise.all([
            this.updates.sendUpdates({
              channelId: devWikiChannel,
              channelType: ChannelTypes.DEV,
              url: this.DEV_URL,
              updateType: UpdateTypes.WIKI,
            }),
            this.updates.sendUpdates({
              channelId: prodWikiChannel,
              channelType: ChannelTypes.PROD,
              url: this.PROD_URL,
              updateType: UpdateTypes.WIKI,
            }),
          ])
        },
      },
      {
        name: 'HIIQ Updates Check',
        schedule: '0 */1 * * *',
        enabled: true,
        task: async () => {
          await this.updates.sendUpdates({
            channelId: devHiiqChannel,
            channelType: ChannelTypes.DEV,
            url: '',
            updateType: UpdateTypes.HIIQ,
          })
        },
      },
      {
        name: 'Random Wiki Revalidation',
        schedule: '* * * * *',
        enabled: true,
        task: async () => {
          await Promise.all([
            this.revalidate.revalidateRandomWiki(
              this.PROD_URL,
              `${process.cwd()}/build/utils/prodWikiLinks.js`,
            ),
            this.revalidate.revalidateRandomWiki(
              this.DEV_URL,
              `${process.cwd()}/build/utils/devWikiLinks.js`,
            ),
          ])
        },
      },
      {
        name: 'Core Pages Revalidation',
        schedule: '*/5 * * * *',
        enabled: true,
        task: async () => {
          const pages = ['/activity', '/']
          await Promise.all([
            ...pages.map(page =>
              this.revalidate.revalidateWikiPage(this.PROD_URL, page),
            ),
            ...pages.map(page =>
              this.revalidate.revalidateWikiPage(this.DEV_URL, page),
            ),
          ])
        },
      },
      {
        name: 'Website Status Check',
        schedule: '*/30 * * * *',
        enabled: true,
        task: async () => {
          await this.checkWebpageStatus(urls, prodAlertChannel)
        },
      },
      {
        name: 'Daily Wiki Links Extraction',
        schedule: '0 0 * * *',
        enabled: true,
        task: async () => {
          await this.callAndExtractWikis()
        },
      },
    ]
  }

  @On({ event: 'ready' })
  async isReady([client]: ArgsOf<'ready'>) {
    console.log('🤖 Bot is ready! Setting up scheduled tasks...')

    const channelIds = JSON.parse(process.env.CHANNELS)

    const channels = {
      devWikiChannel: client.channels.cache.get(
        channelIds.DEV.WIKI,
      ) as TextChannel,
      devHiiqChannel: client.channels.cache.get(
        channelIds.DEV.HIIQ,
      ) as TextChannel,
      prodWikiChannel: client.channels.cache.get(
        channelIds.PROD.WIKI,
      ) as TextChannel,
      prodAlertChannel: client.channels.cache.get(
        channelIds.PROD.ALARMS,
      ) as TextChannel,
    }

    Object.entries(channels).forEach(([name, channel]) => {
      if (!channel) {
        console.error(`❌ Channel ${name} not found!`)
      }
    })

    await this.executeWithErrorHandling('Initial Wiki Links Extraction', () =>
      this.callAndExtractWikis(),
    )

    await this.executeWithErrorHandling('API Health Monitoring Setup', () =>
      this.wikiUpdates.startApiHealthMonitoring(),
    )

    const jobConfigs = this.createScheduledJobs(channels)

    jobConfigs.forEach(config => {
      if (config.enabled) {
        const job = schedule.scheduleJob(
          config.name,
          config.schedule,
          async () => {
            await this.executeWithErrorHandling(config.name, config.task)
          },
        )

        this.scheduledJobs.push(job)
        console.log(`📅 Scheduled: ${config.name} (${config.schedule})`)
      }
    })

    console.log(`✅ Successfully scheduled ${this.scheduledJobs.length} jobs`)
  }

  async callAndExtractWikis(): Promise<void> {
    try {
      console.log('📋 Extracting wiki links from both environments...')

      const [extractedProdLinks, extractedDevLinks] = await Promise.all([
        this.revalidate.extractLinks(this.PROD_URL),
        this.revalidate.extractLinks(this.DEV_URL),
      ])

      await Promise.all([
        writeFile(
          extractedProdLinks,
          `${process.cwd()}/build/utils/prodWikiLinks.js`,
        ),
        writeFile(
          extractedDevLinks,
          `${process.cwd()}/build/utils/devWikiLinks.js`,
        ),
      ])

      console.log('✅ Wiki links extraction completed successfully')
    } catch (error) {
      console.error('❌ Failed to extract wiki links:', error)
      throw error
    }
  }

  async checkWebpageStatus(
    urls: string[],
    channel: TextChannel,
  ): Promise<void> {
    console.log(`🔍 Checking status of ${urls.length} websites...`)

    const timeout = 30000
    const results = await Promise.allSettled(
      urls.map(async url => {
        try {
          const response = await axios.get(url, {
            timeout,
            validateStatus: status => status < 500,
          })
          return { url, status: response.status, success: true }
        } catch (error: any) {
          const status = error.response?.status || 'TIMEOUT/NETWORK_ERROR'
          console.error(`❌ ${url} failed:`, status)
          return { url, status, success: false, error: error.message }
        }
      }),
    )

    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        console.error(`❌ Promise rejected for ${urls[index]}:`, result.reason)
        return {
          url: urls[index],
          status: 'PROMISE_REJECTED',
          success: false,
          error: result.reason,
        }
      }
    })

    const failedResults = processedResults.filter(result => !result.success)
    const successfulResults = processedResults.filter(result => result.success)

    console.log(`✅ ${successfulResults.length}/${urls.length} websites are up`)

    if (failedResults.length > 0) {
      console.log(`🚧 ${failedResults.length} websites are down:`)

      const notifications = failedResults.map(async result => {
        if (result) {
          console.log(`  - ${result.url}: ${result.status}`)
          await this.updates.sendUpdates({
            channelId: channel,
            channelType: ChannelTypes.PROD,
            url: result.url,
            updateType: UpdateTypes.DOWNTIME,
          })
        }
      })

      await Promise.allSettled(notifications)
    }
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down scheduled jobs...')

    this.scheduledJobs.forEach((job, index) => {
      try {
        job.cancel()
        console.log(`✅ Cancelled job ${index + 1}`)
      } catch (error) {
        console.error(`❌ Error cancelling job ${index + 1}:`, error)
      }
    })

    console.log('✅ All scheduled jobs cancelled')
  }
}
