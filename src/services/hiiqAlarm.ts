import fetch from 'node-fetch'
import { singleton } from 'tsyringe'
import { BigNumber } from 'ethers/lib/ethers.js'
import { formatEther } from 'ethers/lib/utils.js'

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

const LIMIT = "40000000000000000000000000"

@singleton()
export class HiiqAlarm {
  iqAddress: string
  search_address: string
  etherScanApiKey: string

  constructor() {
    this.iqAddress = process.env.IQ_ADDRESS
    this.search_address = process.env.SEARCH_ADDRESS
    this.etherScanApiKey = process.env.ETHERSCAN_API_KEY
  }

  private async threshold(value: string): Promise<boolean>{
    return formatEther(BigNumber.from(value)) > formatEther(BigNumber.from(LIMIT))
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
  
  async checkHiiq(): Promise<[HiiqResult]> {
    const response = await this.getData()

    const result = await Promise.all(response.map( async (i: ScanResult) => {
      // Below 40M
      const r = {
        [`${Object.keys(i)[0]}`]: {
          ...Object.values(i)[0],
            alarm: await this.threshold((Object.values(i)[0].result)),
        },
      }
      return r
    }))
    return result as unknown as [HiiqResult]
  }
}
