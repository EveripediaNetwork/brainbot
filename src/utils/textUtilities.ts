const TWITTER_USERNAME_MIN_LENGTH = 4
const TWITTER_USERNAME_MAX_LENGTH = 15

export const shortenAddress = (address: string) => {
  const match = address.match(
    /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/,
  )
  if (!match) return address
  return `${match[1]}…${match[2]}`
}

export const convertToCamelCase = (str: string) => {
  return str
    .split(' ')
    .map(w => w[0].toUpperCase() + w.substring(1))
    .join('')
}

export const makeTextFromWords = (words: Array<string | null>) => {
  return words.filter(Boolean).join(' ')
}

export const getTwitterMention = (twitterAccount?: string) => {
  if (!twitterAccount) return null
  let account = twitterAccount.trim()
  if (twitterAccount.startsWith('https')) {
    account = account.match(/twitter\.com\/([^/?]+)/)?.[1] || account
  }
  if (
    account &&
    account.length >= TWITTER_USERNAME_MIN_LENGTH &&
    account.length <= TWITTER_USERNAME_MAX_LENGTH
  )
    return account.startsWith('@') ? account : `@${account}`
  else return null
}
