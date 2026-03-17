import { nativeTheme } from 'electron'
import path from 'path'

const ASSETS_DIR = path.join(__dirname, '../../../assets')

export function getTrayIcon(): string {
  const isDark = nativeTheme.shouldUseDarkColors
  const iconName = isDark ? 'whatsapp-outline-white-padded.png' : 'whatsapp-outline-black-padded.png'
  return path.join(ASSETS_DIR, iconName)
}

export function getAppIcon(): string {
  return path.join(ASSETS_DIR, 'whatsapp.png')
}
