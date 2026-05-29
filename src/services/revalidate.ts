import axios from 'axios'
import fs from 'fs'
import { singleton } from 'tsyringe'
import { writeFile } from '../utils/helpers.js'

@singleton()
export default class RevalidateService {
  REVALIDATE_SECRET: string

  constructor() {
    this.REVALIDATE_SECRET = process.env.REVALIDATE_SECRET
  }

  url(path: string) {
    return path.replace('/wiki/', '/')
  }

  async revalidateWikiPage(path: string, id?: string) {
    let url = this.url(path)
    let revalidateUrl: string

    if (url.includes('dev')) return

    if (id === '/' || id === '/activity') {
      return
    } else {
      revalidateUrl = `${url}revalidation?wikiId=${id}`
    }

    try {
      const res = await axios.post(revalidateUrl)
      console.log('♻️  REVALIDATING :', res.data)
    } catch (e) {
      console.log('🚨 ERROR REVALIDATING: ', e)
    }
  }

  async extractLinks(link: string): Promise<string[]> {
    try {
      const url = new URL('sitemap.xml', this.url(link)).toString()

      const res = await axios.get<string>(url, {
        responseType: 'text',
      })
      const matches = res.data.match(/\/wiki\/[a-z0-9-]+/gi) ?? []
      return [...new Set<string>(matches)]
    } catch (e: any) {
      console.error(e.data || e.response)
      return []
    }
  }

  async revalidateRandomWiki(url: string, path: string) {
    if (!fs.existsSync(path)) {
      console.log(`⚠️ Wiki links file not found: ${path}, skipping revalidation`)
      return
    }

    let links: string[]
    try {
      ;({ links } = await import(path))
    } catch (e) {
      console.error(`🚨 Failed to load wiki links from ${path}:`, e)
      return
    }

    if (links.length !== 0) {
      const randomIndex = Math.floor(Math.random() * links.length)
      const randomLink = links[randomIndex]
      const index = links.indexOf(randomLink)

      await this.revalidateWikiPage(url, randomLink.split('/wiki/')[1])

      if (index > -1) {
        links.splice(index, 1)
        console.log(`🗑️  deleting ${randomLink}`)
      }

      writeFile(links, path)
    }
  }
}
