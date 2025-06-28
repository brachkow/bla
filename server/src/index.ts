import { Hono } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'

interface ChatMessage {
  type: 'typing' | 'stop_typing' | 'join' | 'leave' | 'connect'
  sessionId: string
  userId: string
  content?: string
  timestamp: number
}

interface SessionData {
  connections: Map<string, any>
  userCount: number
}

const app = new Hono()

// Create WebSocket upgrader for Node.js
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

// Store active sessions and their connections
const sessions = new Map<string, SessionData>()

app.use('/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/', (c) => {
  return c.text('Real-time Chat Server - Node.js')
})

app.get('/ws/:sessionId/:userId', upgradeWebSocket((c) => {
  const sessionId = c.req.param('sessionId')
  const userId = c.req.param('userId')

  return {
    onOpen(event: any, ws: any) {
      console.log(`User ${userId} connected to session ${sessionId}`)
      
      // Initialize session if it doesn't exist
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          connections: new Map(),
          userCount: 0
        })
      }
      
      const session = sessions.get(sessionId)!
      session.connections.set(userId, ws)
      session.userCount++
      
      // Notify other users in the session
      const joinMessage: ChatMessage = {
        type: 'join',
        sessionId,
        userId,
        timestamp: Date.now()
      }
      
      // Broadcast join message to other users
      for (const [otherUserId, otherWs] of session.connections.entries()) {
        if (otherUserId !== userId && otherWs.readyState === 1) { // 1 = OPEN
          try {
            otherWs.send(JSON.stringify(joinMessage))
          } catch (error) {
            console.error('Error sending join message:', error)
            // Remove dead connection
            session.connections.delete(otherUserId)
            session.userCount--
          }
        }
      }
    },

    onMessage(event: any, ws: any) {
      try {
        const message: ChatMessage = JSON.parse(event.data.toString())
        message.timestamp = Date.now()
        
        const session = sessions.get(message.sessionId)
        if (!session) return
        
        console.log(`Broadcasting message in session ${message.sessionId}: ${message.type}`)
        
        // Broadcast message to all other users in the session
        for (const [otherUserId, otherWs] of session.connections.entries()) {
          if (otherUserId !== message.userId && otherWs.readyState === 1) { // 1 = OPEN
            try {
              otherWs.send(JSON.stringify(message))
            } catch (error) {
              console.error('Error broadcasting message:', error)
              // Remove dead connection
              session.connections.delete(otherUserId)
              session.userCount--
            }
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    },

    onClose() {
      console.log(`User ${userId} left session ${sessionId}`)
      
      const session = sessions.get(sessionId)
      if (session) {
        session.connections.delete(userId)
        session.userCount--
        
        // Notify other users
        const leaveMessage: ChatMessage = {
          type: 'leave',
          sessionId,
          userId,
          timestamp: Date.now()
        }
        
        for (const [otherUserId, otherWs] of session.connections.entries()) {
          if (otherWs.readyState === 1) { // 1 = OPEN
            try {
              otherWs.send(JSON.stringify(leaveMessage))
            } catch (error) {
              console.error('Error sending leave message:', error)
            }
          }
        }
        
        // Clean up empty sessions
        if (session.userCount === 0) {
          sessions.delete(sessionId)
          console.log(`Cleaned up empty session: ${sessionId}`)
        }
      }
    },

    onError(event: any) {
      console.error('WebSocket error:', event)
    }
  }
}))

// API endpoint to get session info
app.get('/api/session/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId')
  const session = sessions.get(sessionId)
  
  return c.json({
    exists: !!session,
    userCount: session?.userCount || 0
  })
})

// Start the server
const port = Number(process.env.PORT) || 8787
console.log(`Starting server on port ${port}`)

const server = serve({
  fetch: app.fetch,
  port
})

// Inject WebSocket functionality
injectWebSocket(server)

export default server
