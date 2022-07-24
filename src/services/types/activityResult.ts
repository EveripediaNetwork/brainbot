export interface wikiActivities {
  wikiId: string
  datetime: string
  type: string
  content: [
    {
      summary: string
      images: [{ id: string }]
      title: string
    },
  ]
  user: {
    id: string
    profile?: {
      username?: string
      avatar?: string
    } | null
  }
}

export enum ChannelTypes {
  DEV = 'DEV',
  PROD = 'PROD',
}

export enum UpdateTypes {
    WIKI = 'WIKI',
    HIIQ = 'HIIQ'
}