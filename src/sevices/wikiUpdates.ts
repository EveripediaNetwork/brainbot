import { singleton } from 'tsyringe'

@singleton()
export default class WikiUpdates {
    database: string

    constructor() {
        console.log('I am database')
        this.database = 'connected'
    }

    query() {
        return this.database
    }
}

