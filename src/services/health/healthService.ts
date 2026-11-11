export type ProcessHealth = {
  status: 'ok'
  uptime: number
  timestamp: string
}

export const getProcessHealth = (): ProcessHealth => ({
  status: 'ok',
  uptime: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
})
