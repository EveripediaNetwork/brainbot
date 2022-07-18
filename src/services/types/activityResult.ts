export interface wikiActivities {
  wikiId: string
  datetime: string
  type: string
  user: {
    profile?:  {
        username?: string 
        avatar?: string 
    } | null
  }
}

export enum ChannelTypes {
    DEV = 'DEV',
    PROD = 'PROD'
}