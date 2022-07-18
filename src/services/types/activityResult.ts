export interface wikiActivities {
  wikiId: string
  datetime: string
  type: string
  user: {
    profile: {
        username: string
        avatar: string
    }
  }
}

export enum ChannelTypes {
    DEV = 'DEV',
    PROD = 'PROD'
}