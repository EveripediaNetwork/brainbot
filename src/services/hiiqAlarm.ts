import fetch from 'node-fetch'
import { singleton } from 'tsyringe'

@singleton()
export default class HiiqAlarm {
  address: string
  iqAddress: string
  search_address: string
  etherScanApiKey: string

  // #TODO: Set threshold Envs.
  // #TODO: Get addresses
  constructor() {
    this.address = process.env.ADDRESS
    this.iqAddress = process.env.IQ_ADDRESS
    this.search_address = process.env.SEARCH_ADDRESS
    this.etherScanApiKey = process.env.ETHERSCAN_API_KEY
  }
  // #TODO: throw alert for hiiq
  async getHiiq(): Promise<any> {
    const r = [
      {
        '0xb55dcc69d909103b4de773412a22ab8b86e8c602': {
          status: '1',
          message: 'OK',
          result: '39911043491676242482008923',
        },
      },
      {
        '0x6df780198e72f5919c2Da82b6Bd9fe9deB1686ba': {
          status: '1',
          message: 'OK',
          result: '17264728425868770226931883',
        },
      },
    ]
    return
  }
  // #TODO: Check adddresses on blockchain
  async getData() {
    const addrs = this.search_address.split(',')

    const data = await Promise.all(
      addrs.map(async (ad: string )=> {
        console.log(ad)
        const response = await fetch(
          `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${this.iqAddress}&address=${ad}&tag=latest&apikey=${this.etherScanApiKey}`,
        )
        const data = {[`${ad}`]: await response.json()}
        return data
      }),
    )
    console.log(data)
    return addrs
  }
}
