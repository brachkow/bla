import { ref, watch } from 'vue'

interface ChatMessage {
  type: 'typing' | 'stop_typing' | 'join' | 'leave' | 'connect'
  sessionId: string
  userId: string
  content?: string
  timestamp: number
}

export function useWebSocket(sessionId: string) {
  const userId = ref(Math.random().toString(36).substr(2, 9))
  const isConnected = ref(false)
  const partnerConnected = ref(false)
  const partnerUserId = ref('')
  const ws = ref<WebSocket | null>(null)
  const typingTimeout = ref<number>()
  const they = ref('')
  const you = ref('')

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${import.meta.env.VITE_BACKEND_URL}/ws/${sessionId}/${userId.value}`
    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      console.log('WebSocket connected')
      isConnected.value = true

      sendMessage({
        type: 'connect',
        sessionId,
        userId: userId.value,
        timestamp: Date.now(),
      })
    }

    ws.value.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    }

    ws.value.onclose = () => {
      console.log('WebSocket disconnected')
      isConnected.value = false
      partnerConnected.value = false

      setTimeout(() => {
        if (!isConnected.value) {
          connectWebSocket()
        }
      }, 3000)
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  const handleMessage = (message: ChatMessage) => {
    switch (message.type) {
      case 'join':
        partnerConnected.value = true
        partnerUserId.value = message.userId
        console.log(`Partner ${message.userId} joined`)
        break

      case 'leave':
        if (message.userId === partnerUserId.value) {
          partnerConnected.value = false
          they.value = ''
          console.log(`Partner ${message.userId} left`)
        }
        break

      case 'typing':
        if (message.content !== undefined) {
          they.value = message.content
        }
        break

      case 'stop_typing':
        break
    }
  }

  const sendMessage = (message: ChatMessage) => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message))
    }
  }

  let lastContent = ''
  watch(you, (newValue) => {
    if (newValue !== lastContent) {
      lastContent = newValue

      sendMessage({
        type: 'typing',
        sessionId,
        userId: userId.value,
        content: newValue,
        timestamp: Date.now(),
      })

      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
      }

      typingTimeout.value = setTimeout(() => {
        sendMessage({
          type: 'stop_typing',
          sessionId,
          userId: userId.value,
          timestamp: Date.now(),
        })
      }, 500)
    }
  })

  const cleanup = () => {
    if (ws.value) {
      ws.value.close()
    }
    if (typingTimeout.value) {
      clearTimeout(typingTimeout.value)
    }
  }

  return {
    isConnected,
    partnerConnected,
    they,
    you,
    connectWebSocket,
    cleanup,
  }
}
