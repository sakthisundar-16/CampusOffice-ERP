import React, { createContext, useContext, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

interface WebSocketContextType {
  sendMessage: (msg: any) => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  const connect = () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      return
    }

    if (socketRef.current) {
      socketRef.current.close()
    }

    const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin
    const wsHost = apiBaseUrl.replace(/^https?:\/\//, '')
    const isLocalhost = wsHost.includes('localhost') || wsHost.includes('127.0.0.1')
    const protocol = isLocalhost ? 'ws:' : 'wss:'
    const defaultWsUrl = `${protocol}//${wsHost}/ws/notifications?token=${token}`
    
    // If VITE_WS_URL is provided, use it (e.g., ws://localhost:8000/ws/notifications). Otherwise use defaultWsUrl.
    let baseWsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl
    
    // In production, VITE_WS_URL might be "/ws/notifications", so we prepend protocol+host
    if (baseWsUrl.startsWith('/')) {
        baseWsUrl = `${protocol}//${wsHost}${baseWsUrl}`
    }
    
    const wsUrl = baseWsUrl.includes('?') ? `${baseWsUrl}&token=${token}` : `${baseWsUrl}?token=${token}`

    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      console.log('Real-time notification WebSocket connected')
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Received WebSocket notification:', data)

        if (data.title && data.message) {
          toast.custom((t) => (
            <div className={`flex flex-col gap-1 max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4 ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
              <div className="font-bold text-gray-900 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                🔔 {data.title}
              </div>
              <div className="text-sm text-gray-600">{data.message}</div>
            </div>
          ), {
            duration: 5000,
            position: 'top-right',
          })
        }

        // Invalidate queries to refresh current UI data in real-time
        queryClient.invalidateQueries()
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }

    ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.reason)
      if (localStorage.getItem('access_token')) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect()
        }, 5000)
      }
    }

    ws.onerror = (err) => {
      console.warn('WebSocket connection error:', err)
    }
  }

  useEffect(() => {
    if (user) {
      connect()
    } else {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [user])

  const sendMessage = (msg: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg))
    }
  }

  return (
    <WebSocketContext.Provider value={{ sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  )
}
