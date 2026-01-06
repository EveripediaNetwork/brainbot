import axios from 'axios'
import { singleton } from 'tsyringe'
import { writeFile } from '../utils/helpers.js'

@singleton()
export default class RevalidateService {
  REVALIDATE_SECRET: string

  constructor() {
    this.REVALIDATE_SECRET = process.env.REVALIDATE_SECRET
  }

  url(path: string) {
    return path.replace('/wiki/', '/api/')
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

  async extractLinks(link: string) {
    let wikis
    try {
      const url = `${this.url(link)}sitemap.xml`

      const res = await axios.get(url, {
        responseType: 'text',
      })
      wikis = res.data.match(/\/wiki\/[^\s<]*?(?=<)/g)
    } catch (e: any) {
      console.error(e.data || e.response)
    }
    return wikis
  }

  async revalidateRandomWiki(url: string, path: string) {
    const { links } = await import(path)

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
