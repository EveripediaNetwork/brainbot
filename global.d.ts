declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string
    PORT: string
    CHANNELS: string
    DEV_URL: string
    DEV_API_URL: string
    PROD_URL: string
    PROD_API_URL: string
    META_URL: string
    ADDRESS: string
    IQ_ADDRESS: string
    SEARCH_ADDRESS: string
    ETHERSCAN_API_KEY: string
    REVALIDATE_SECRET: string
    TWITTER_API_KEY: string
    TWITTER_API_SECRET: string
    TWITTER_ACCESS_TOKEN: string
    TWITTER_ACCESS_SECRET: string
  }
}
