export function getSystemInfo() {
  return {
    desktopEnv: process.env.XDG_CURRENT_DESKTOP || 'unknown',
    sessionType: process.env.XDG_SESSION_TYPE || 'unknown',
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    platform: process.platform,
    isWayland: process.env.XDG_SESSION_TYPE === 'wayland',
    isGnome: (process.env.XDG_CURRENT_DESKTOP || '').includes('GNOME')
  }
}
