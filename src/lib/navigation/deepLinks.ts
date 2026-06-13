export interface DeepLinkParsed {
  screen: string
  params: Record<string, string>
}

export function parseDeepLink(url: string): DeepLinkParsed | null {
  try {
    if (url.startsWith('https://apna.app/join/')) {
      const code = url.split('/join/')[1]
      if (code) {
        return {
          screen: 'JoinGroup',
          params: { code: code.toUpperCase() }
        }
      }
    }

    if (url.startsWith('apna://')) {
      const parts = url.slice(7).split('?')
      const path = parts[0]
      const query = parts[1] || ''
      const params: Record<string, string> = {}
      
      query.split('&').forEach(pair => {
        const [key, value] = pair.split('=')
        if (key && value) {
          params[key] = value
        }
      })

      if (path === 'budget') {
        return { screen: 'Budget', params }
      }
      if (path === 'map') {
        return { screen: 'Map', params }
      }
      if (path === 'memory') {
        return { screen: 'MemoryDetail', params }
      }
    }
  } catch {
    // Fall through
  }
  return null
}

export function buildDeepLink(screen: string, params: Record<string, string>): string {
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return `apna://${screen.toLowerCase()}?${query}`
}
