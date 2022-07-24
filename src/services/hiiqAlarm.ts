import fetch from 'node-fetch'
import { singleton } from 'tsyringe'

interface ScanResult {
  [key: string]: ApiResult
}

 interface ApiResult {
  status: number
  message: string
  result: string 
}

export interface HiiqResult {
    alarm: boolean
}

@singleton()
export class HiiqAlarm {
  address: string
  iqAddress: string
  search_address: string
  etherScanApiKey: string

  // #TODO: Set threshold Envs.

  constructor() {
    this.address = process.env.ADDRESS
    this.iqAddress = process.env.IQ_ADDRESS
    this.search_address = process.env.SEARCH_ADDRESS
    this.etherScanApiKey = process.env.ETHERSCAN_API_KEY
  }

  private async getData(): Promise<[ScanResult]> {
    const addrs = this.search_address.split(',')
    const d = await Promise.all(
      addrs.map(async (ad: string) => {
        const response = await fetch(
          `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${this.iqAddress}&address=${ad}&tag=latest&apikey=${this.etherScanApiKey}`,
        )
        const data = { [`${ad}`]: await response.json() }
        return data
      }),
    )
    return d as unknown as [ScanResult]
  }
  // #TODO: throw alert for hiiq
  async checkHiiq(): Promise<[HiiqResult]> {
    const response = await this.getData()

    const result = response.map((i: ScanResult) => {
      // Below 40M
      const r = {
        [`${Object.keys(i)[0]}`]: {
          ...Object.values(i)[0],
          alarm:
            !(Object.values(i)[0].result.startsWith('4') &&
            Object.values(i)[0].result.length < 26),
        },
      }

      return r
    })
    return result as unknown as [HiiqResult]
  }
}
