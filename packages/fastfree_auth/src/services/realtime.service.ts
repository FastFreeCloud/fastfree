import { io, Socket } from 'socket.io-client'

interface RealtimeConfig {
  url: string
  token?: string
  reconnect?: boolean
  reconnectAttempts?: number
  reconnectDelay?: number
}

type RealtimeEvent =
  | 'doc_update'
  | 'doc_insert'
  | 'doc_delete'
  | 'user_typing'
  | 'notification'

interface DocEvent {
  doctype: string
  docname: string
  user: string
  timestamp: number
}

interface NotificationEvent {
  user: string
  message: string
  timestamp: number
  read: boolean
}

type EventCallback = (data: DocEvent | NotificationEvent) => void

let socketInstance: Socket | null = null

function createFrappeSocket(config: RealtimeConfig): Socket {
  const {
    url,
    token,
    reconnect = true,
    reconnectAttempts = 10,
    reconnectDelay = 5000
  } = config

  const options: Record<string, unknown> = {
    reconnection: reconnect,
    reconnectionAttempts: reconnectAttempts,
    reconnectionDelay: reconnectDelay,
    transports: ['websocket', 'polling']
  }

  if (token) {
    options.auth = { token }
  }

  const socket = io(url, options)

  socket.on('connect', () => {
    // connected
  })

  socket.on('disconnect', (_reason) => {
    // disconnected
  })

  socket.on('connect_error', (error) => {
    console.error('[Realtime] Connection error:', error.message)
  })

  return socket
}

export function initRealtime(config: RealtimeConfig): Socket {
  if (!socketInstance) {
    socketInstance = createFrappeSocket(config)
  }
  return socketInstance
}

export function getRealtime(): Socket | null {
  return socketInstance
}

export function disconnectRealtime(): void {
  socketInstance?.disconnect()
  socketInstance = null
}

export function onRealtimeEvent(event: RealtimeEvent, callback: EventCallback): void {
  if (!socketInstance) {
    console.warn('[Realtime] No active connection. Call initRealtime first.')
    return
  }
  socketInstance.on(event, callback)
}

export function offRealtimeEvent(event: RealtimeEvent, callback?: EventCallback): void {
  if (!socketInstance) {
    return
  }
  socketInstance.off(event, callback)
}

export function emitRealtimeEvent(event: string, data?: unknown): void {
  if (!socketInstance) {
    console.warn('[Realtime] No active connection. Call initRealtime first.')
    return
  }
  socketInstance.emit(event, data)
}

export type {
  RealtimeConfig,
  RealtimeEvent,
  DocEvent,
  NotificationEvent,
  EventCallback
}
