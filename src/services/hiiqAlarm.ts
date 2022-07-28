import fetch from 'node-fetch'
import { singleton } from 'tsyringe'
import { BigNumber } from 'ethers/lib/ethers.js'
import { formatEther } from 'ethers/lib/utils.js'

export interface ScanResult {
  address: string
  balance: HiiqResult
}

interface ApiResult {
  status: number
  message: string
  result: string
}

interface HiiqResult extends ApiResult {
  alarm: boolean
  threshold: string
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
      Number(formatEther(BigNumber.from(value))) < Number(threshold)
    )
  }

  private async getData(): Promise<[ApiResult]> {
    const d = await Promise.all(
      Object.values(this.addrs).map(async (ad: any) => {
        const response = await fetch(
          `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${this.iqAddress}&address=${ad.address}&tag=latest&apikey=${this.etherScanApiKey}`,
        )
        const data = { [`${ad.address}`]: await response.json()}
        return data
      }),
    )
    return d as unknown as [ApiResult]
  }

  async checkHiiq(): Promise<[ScanResult]> {
    const response = await this.getData()

    const result = await Promise.all(
      response.map(async (i: ApiResult, index: number) => {
        const r = {
          address: `${Object.keys(i)[0]}`,
          balance: {
            ...Object.values(i)[0],
            alarm: await this.threshold(
              Object.values(i)[0].result,
              Object.values(this.addrs)[index].threshold,
            ),
            threshold: Object.values(this.addrs)[index].threshold,
          },
        }
        return r
      }),
    )
    return result as unknown as [ScanResult]
  }
}
