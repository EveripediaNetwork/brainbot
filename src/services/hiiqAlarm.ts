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

interface AddressBody {
  address: string
  threshold: string
}

@singleton()
export class HiiqAlarm {
  iqAddress: string
  search_address: string
  etherScanApiKey: string
  addrs: { [s: string]: AddressBody } 

  constructor() {
    this.iqAddress = process.env.IQ_ADDRESS
    this.search_address = process.env.SEARCH_ADDRESS
    this.etherScanApiKey = process.env.ETHERSCAN_API_KEY
    this.addrs = JSON.parse(this.search_address)
  }

  private async threshold(value: string, threshold: string): Promise<boolean> {
    return (
      formatEther(BigNumber.from(value)) >
      formatEther(BigNumber.from(threshold))
    )
  }

  private async getData(): Promise<[ScanResult]> {
    const d = await Promise.all(
      Object.values(this.addrs).map(async (ad: any) => {
        const response = await fetch(
          `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${this.iqAddress}&address=${ad.address}&tag=latest&apikey=${this.etherScanApiKey}`,
        )
        const data = { [`${ad.address}`]: await response.json() }
        return data
      }),
    )
    return d as unknown as [ScanResult]
  }

  async checkHiiq(): Promise<[HiiqResult]> {
    const response = await this.getData()

    const result = await Promise.all(
      response.map(async (i: ScanResult, index: number) => {
        const r = {
          [`${Object.keys(i)[0]}`]: {
            ...Object.values(i)[0],
            alarm: await this.threshold(
              Object.values(i)[0].result,
              Object.values(this.addrs)[index].threshold,
            ),
          },
        }
        return r
      }),
    )
    return result as unknown as [HiiqResult]
  }
}
