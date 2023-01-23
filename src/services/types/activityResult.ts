export interface wikiActivities {
  id: string
  wikiId: string
  datetime: string
  type: string
  content: [
    {
      summary: string
      images: [{ id: string }]
      title: string
      metadata: [{ id: string; value: string }]
      categories: [{ title: string }]
      tags: [{ id: string }]
    },
  ]
  user: {
    id: string
    profile?: {
      username?: string
      avatar?: string
      links?: [
        {
          twitter?: string
        },
      ]
    } | null
  }
}

export enum ChannelTypes {
  DEV = 'DEV',
  PROD = 'PROD',
}

export enum UpdateTypes {
  WIKI = 'WIKI',
  HIIQ = 'HIIQ',
  ERROR = 'ERROR',
}
