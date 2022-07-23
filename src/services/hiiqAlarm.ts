import fetch from 'node-fetch'
import { singleton } from 'tsyringe'

@singleton()
export default class HiiqAlarm {
    address: string
    search_address: string

  // #TODO: Set threshold Envs.
  // #TODO: Get addresses
  constructor(){
    this.address =  process.env.ADDRESS 
    this.search_address =  process.env.SEARCH_ADDRESS 
  }
  // #TODO: throw alert for hiiq
  // #TODO: Check adddresses on blockchain
  async getData() {
    const c =  this.search_address.split(',')
    console.log(c)
    const response = await fetch(
      `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=0x579cea1889991f68acc35ff5c3dd0621ff29b0c9&address=${this.address}&tag=latest&apikey=WPY7SVQCJEXTMXE9PBHIBPSF17XUGWFNRH`,
    )
    const data = await response.json()
    console.log(data)
  }
}
