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
  // #TODO: Check adddresses on blockchain
  async getData() {
    const addrs = this.search_address.split(',')

    Promise.all(
      addrs.map(async ad => {
        const response = await fetch(
          `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${this.iqAddress}&address=${ad}&tag=latest&apikey=${this.etherScanApiKey}`,
        )

        const data = await response.json()
        console.log(data)
      }),
    )
    console.log(addrs)
    return addrs
  }
}
