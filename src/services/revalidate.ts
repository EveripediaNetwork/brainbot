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

    if (id === '/' || id === '/activity') {
      revalidateUrl = `${url}revalidate?secret=${this.REVALIDATE_SECRET}&path=${id}`
    } else {
      revalidateUrl = `${url}/revalidate?secret=${this.REVALIDATE_SECRET}&path=/wiki/${id}`
    }

    try {
      const res = await axios.get(revalidateUrl)
      console.log('♻️  REVALIDATING :', res.data)
    } catch (e) {
      console.log('🚨 ERROR REVALIDATING: ', e)
    }
  }

  async extractLinks(link: string) {
    const res = await axios.get(`${this.url(link)}sitemap`)
    const wikis = res.data.match(/\/wiki\/[^\s<]*?(?=<)/g)
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
