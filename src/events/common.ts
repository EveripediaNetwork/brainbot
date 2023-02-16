import { TextChannel } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Discord, On } from 'discordx'
import { injectable } from 'tsyringe'
import schedule from 'node-schedule'
import Updates from '../utils/sendUpdates.js'
import { ChannelTypes, UpdateTypes } from '../services/types/activityResult.js'
import RevalidateService from '../services/revalidate.js'
import { writeFile } from '../utils/helpers.js'

@Discord()
@injectable()
export class AppDiscord {
  PROD_URL: string
  DEV_URL: string

  constructor(private updates: Updates, private revalidate: RevalidateService) {
    this.PROD_URL = process.env.PROD_URL
    this.DEV_URL = process.env.DEV_URL
  }

  @On('ready')
  async isReady([client]: ArgsOf<'ready'>) {
    const channelIds = JSON.parse(process.env.CHANNELS)

    const devWikiChannel = client.channels.cache.get(
      channelIds.DEV.WIKI,
    ) as TextChannel
    const devHiiqChannel = client.channels.cache.get(
      channelIds.DEV.HIIQ,
    ) as TextChannel
    const prodWikiChannel = client.channels.cache.get(
      channelIds.PROD.WIKI,
    ) as TextChannel

    schedule.scheduleJob('* * * *', async () => {
      console.log('Calling for new wikis 🚀')

      await this.updates.sendUpdates({
        channelId: devWikiChannel,
        channelType: ChannelTypes.DEV,
        url: `${this.DEV_URL}`,
        updateType: UpdateTypes.WIKI,
      })

      await this.updates.sendUpdates({
        channelId: prodWikiChannel,
        channelType: ChannelTypes.PROD,
        url: `${this.PROD_URL}`,
        updateType: UpdateTypes.WIKI,
      })
    })

    schedule.scheduleJob('0 */1 * * *', async () => {
      console.log(new Date())
      await this.updates.sendUpdates({
        channelId: devHiiqChannel,
        channelType: ChannelTypes.DEV,
        url: '',
        updateType: UpdateTypes.HIIQ,
      })
    })

    await this.callAndExtractWikis()

    // Every 12am
    schedule.scheduleJob('0 0 * * *', async () => {
      await this.callAndExtractWikis()
    })

    // Every 5 minutes
    schedule.scheduleJob('*/5 * * * *', async () => {
      await this.revalidate.revalidateWikiPage(this.PROD_URL, '/activity')
      await this.revalidate.revalidateWikiPage(this.PROD_URL, '/')

      await this.revalidate.revalidateWikiPage(this.DEV_URL, '/activity')
      await this.revalidate.revalidateWikiPage(this.DEV_URL, '/')
    })

    // Every minute
    schedule.scheduleJob('* * * * *', async () => {
      await this.revalidate.revalidateRandomWiki(
        this.PROD_URL,
        `${process.cwd()}/build/utils/prodWikiLinks.js`,
      )
      await this.revalidate.revalidateRandomWiki(
        this.DEV_URL,
        `${process.cwd()}/build/utils/devWikiLinks.js`,
      )
    })
  }

  async callAndExtractWikis(){
    const extractedProdLinks = await this.revalidate.extractLinks(this.PROD_URL)
    writeFile(
      extractedProdLinks,
      `${process.cwd()}/build/utils/prodWikiLinks.js`,
    )

    const extractedDevLinks = await this.revalidate.extractLinks(this.DEV_URL)
    writeFile(extractedDevLinks, `${process.cwd()}/build/utils/devWikiLinks.js`)
  }
}
