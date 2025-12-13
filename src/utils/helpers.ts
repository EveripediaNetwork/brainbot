import fs from 'fs'
import path from 'path'

export const writeFile = (arr: string[] | undefined, filePath: string) => {
  if (!arr || arr.length === 0) {
    console.log(`⚠️ No data to write to ${filePath}`)
    return
  }
  
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  let cleanArray = arr.map((e: string) => `"${e}"`)
  try {
    fs.writeFile(filePath, `export const links = [${cleanArray}]\n`, err => {
      if (err) throw err
    })
  } catch (err) {
    console.error(err)
  }
}
