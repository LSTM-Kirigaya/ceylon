import fs from 'fs-extra'
import path from 'path'
import os from 'os'

const CONFIG_DIR = path.join(os.homedir(), '.ceylonm')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const TOKEN_FILE = path.join(CONFIG_DIR, 'token')

export interface Config {
  apiUrl: string
  lastProjectId?: string
  lastViewId?: string
}

export const defaultConfig: Config = {
  apiUrl: process.env.CEYLON_API_URL || 'http://localhost:3000/api',
}

export async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR)
}

export async function getConfig(): Promise<Config> {
  try {
    const exists = await fs.pathExists(CONFIG_FILE)
    if (!exists) {
      return defaultConfig
    }
    const config = await fs.readJson(CONFIG_FILE)
    return { ...defaultConfig, ...config }
  } catch {
    return defaultConfig
  }
}

export async function saveConfig(config: Partial<Config>): Promise<void> {
  await ensureConfigDir()
  const current = await getConfig()
  await fs.writeJson(CONFIG_FILE, { ...current, ...config }, { spaces: 2 })
}

export async function getToken(): Promise<string | null> {
  try {
    const exists = await fs.pathExists(TOKEN_FILE)
    if (!exists) return null
    return fs.readFile(TOKEN_FILE, 'utf-8')
  } catch {
    return null
  }
}

export async function saveToken(token: string): Promise<void> {
  await ensureConfigDir()
  await fs.writeFile(TOKEN_FILE, token, { mode: 0o600 })
}

export async function removeToken(): Promise<void> {
  try {
    await fs.remove(TOKEN_FILE)
  } catch {
    // Ignore errors
  }
}
