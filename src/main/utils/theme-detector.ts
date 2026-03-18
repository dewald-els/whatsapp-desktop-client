import path from 'node:path'
import { nativeTheme } from 'electron'

const ASSETS_DIR = path.join(__dirname, '../../../assets')

export function getTrayIcon(): string {
  const isDark = nativeTheme.shouldUseDarkColors
  const iconName = isDark ? 'whatsapp-outline-white.png' : 'whatsapp-outline-black.png'
  return path.join(ASSETS_DIR, iconName)
}

export function getAppIcon(): string {
  return path.join(ASSETS_DIR, 'whatsapp.png')
}
