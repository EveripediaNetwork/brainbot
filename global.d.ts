declare namespace NodeJS {
    interface ProcessEnv {
        NODE_ENV: string
        PORT: string
        CHANNELS: string
        DEV_URL: string
        DEV_API_URL: string
        PROD_URL: string
        PROD_API_URL: string
    }
}
