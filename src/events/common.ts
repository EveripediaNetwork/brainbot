import { NotBot } from '@discordx/utilities'
import { TextChannel } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Guard } from 'discordx'
import { Discord, On, Client } from 'discordx'
import { injectable } from 'tsyringe'
import Database from '../sevices/wiki.js'
import 'dotenv/config'

@Discord()
@injectable()
export class AppDiscord {
    constructor(private _database: Database) {
        console.log('constructed me as a singleton and injected _database')
    }

    @On('messageCreate')
    @Guard(
        NotBot, // You can use multiple guard functions, they are executed in the same order!
    )
    onMessage([message]: ArgsOf<'messageCreate'>, client: Client) {
        switch (message.content.toLowerCase()) {
            case 'hello':
                message.reply(
                    `https://alpha.everipedia.org/wiki/wiki-test, ${this._database.query()}`,
                )
                break
            default:
                message.reply('Command not found')
                break
        }
        console.log('Message Deleted', client.user?.username, message.content)
    }

    @On('ready')
    isReady([client]: ArgsOf<'ready'>) {
        // const chan = client.channels
        //     .fetch('974300909351882754')
        //     .then((channel: any) => {
        //         console.log(channel.name)
        //     })
        let type: boolean = false
        const chan = client.channels.cache.get(
            process.env.CHANNEL_ID,
        ) as TextChannel
        if(type){

            chan.send('hello')
        }
        // console.log(chan)
        // ready.reply(
        //     `https://alpha.everipedia.org/wiki/wiki-test, ${this._database.query()}`,
        // )
    }
}
