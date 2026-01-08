import type { ArgsOf } from 'discordx'
import { Discord, On } from 'discordx'
import { injectable } from 'tsyringe'
import schedule from 'node-schedule'
import Updates from '../utils/sendUpdates.js'
import { ChannelTypes, UpdateTypes } from '../services/types/activityResult.js'
import RevalidateService from '../services/revalidate.js'
import WikiUpdates from '../services/wikiUpdates.js'
import { writeFile } from '../utils/helpers.js'
import axios from 'axios'

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
  PROD_URL: string
  DEV_URL: string
  DEV_API_URL: string
  private scheduledJobs: schedule.Job[] = []
  private urlFailureCount: Map<string, number> = new Map()
  private webhooks: {
    devWiki: string
    devHiiq: string
    prodWiki: string
    prodAlarms: string
  }

  constructor(
    private updates: Updates,
    private revalidate: RevalidateService,
    private wikiUpdates: WikiUpdates,
  ) {
    this.PROD_URL = process.env.PROD_URL
    this.DEV_URL = process.env.DEV_URL
    this.DEV_API_URL = process.env.DEV_API_URL
    this.webhooks = {
      devWiki: process.env.DEV_WIKI_WEBHOOK || '',
      devHiiq: process.env.DEV_HIIQ_WEBHOOK || '',
      prodWiki: process.env.PROD_WIKI_WEBHOOK || '',
      prodAlarms: process.env.PROD_ALARMS_WEBHOOK || '',
    }
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

  private createScheduledJobs(): ScheduledJobConfig[] {
    return [
      {
        name: 'Wiki Updates Check',
        schedule: '* * * * *',
        enabled: true,
        task: async () => {
          await Promise.all([
            this.updates.sendUpdates({
              webhookUrl: this.webhooks.devWiki,
              channelType: ChannelTypes.DEV,
              url: this.DEV_URL,
              updateType: UpdateTypes.WIKI,
            }),
            this.updates.sendUpdates({
              webhookUrl: this.webhooks.prodWiki,
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
            webhookUrl: this.webhooks.devHiiq,
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
            // this.revalidate.revalidateRandomWiki(
            //   this.DEV_URL,
            //   `${process.cwd()}/build/utils/devWikiLinks.js`,
            // ),
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
            // ...pages.map(page =>
            //   this.revalidate.revalidateWikiPage(this.DEV_URL, page),
            // ),
          ])
        },
      },
      {
        name: 'Website Status Check',
        schedule: '*/30 * * * *',
        enabled: true,
        task: async () => {
          await this.checkWebpageStatus(urls, this.webhooks.prodAlarms)
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

  @On({ event: 'clientReady' })
  async isReady([client]: ArgsOf<'clientReady'>) {
    console.log('🤖 Bot is ready! Setting up scheduled tasks...')

    // Validate webhook URLs
    Object.entries(this.webhooks).forEach(([name, url]) => {
      if (!url) {
        console.warn(`⚠️ Webhook ${name} not configured`)
      } else {
        console.log(`✅ Webhook ${name} configured`)
      }
    })

    await this.executeWithErrorHandling('Initial Wiki Links Extraction', () =>
      this.callAndExtractWikis(),
    )

    await this.executeWithErrorHandling('API Health Monitoring Setup', () =>
      this.wikiUpdates.startApiHealthMonitoring(),
    )

    const jobConfigs = this.createScheduledJobs()

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
        this.revalidate.extractLinks(this.DEV_API_URL),
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

  private async checkSingleUrl(
    url: string,
    timeout: number,
  ): Promise<{ url: string; status: number | string; success: boolean; error?: string }> {
    try {
      const response = await axios.get(url, {
        timeout,
        validateStatus: status => status < 500,
      })
      return { url, status: response.status, success: true }
    } catch (error: any) {
      const status = error.response?.status || 'TIMEOUT/NETWORK_ERROR'
      return { url, status, success: false, error: error.message }
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async checkWebpageStatus(
    urls: string[],
    webhookUrl: string,
  ): Promise<void> {
    console.log(`🔍 Checking status of ${urls.length} websites...`)

    const timeout = 30000
    const maxRetries = 3
    const retryDelay = 30000 // 30 seconds

    const finalResults = await Promise.all(
      urls.map(async url => {
        let lastResult = await this.checkSingleUrl(url, timeout)

        // Retry up to 3 times with 30 second delays if failed
        for (let attempt = 1; attempt < maxRetries && !lastResult.success; attempt++) {
          console.log(`⏳ ${url} failed (attempt ${attempt}/${maxRetries}), retrying in 30 seconds...`)
          await this.sleep(retryDelay)
          lastResult = await this.checkSingleUrl(url, timeout)
        }

        if (!lastResult.success) {
          console.error(`❌ ${url} failed after ${maxRetries} attempts:`, lastResult.status)
        }

        return lastResult
      }),
    )

    const failedResults = finalResults.filter(result => !result.success)
    const successfulResults = finalResults.filter(result => result.success)

    console.log(`✅ ${successfulResults.length}/${urls.length} websites are up`)

    // Reset failure count for successful URLs
    successfulResults.forEach(result => {
      if (this.urlFailureCount.has(result.url)) {
        console.log(`✅ ${result.url} is back online, resetting failure count`)
        this.urlFailureCount.delete(result.url)
      }
    })

    if (failedResults.length > 0) {
      console.log(`🚧 ${failedResults.length} websites are down after ${maxRetries} retry attempts:`)

      const notifications = failedResults.map(async result => {
        if (result) {
          console.log(`  - ${result.url}: ${result.status}`)
          console.log(`🚨 Sending alert for ${result.url} after ${maxRetries} failed attempts`)
          await this.updates.sendUpdates({
            webhookUrl: webhookUrl,
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
