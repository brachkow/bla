<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface ChatMessage {
  type: 'typing' | 'stop_typing' | 'join' | 'leave' | 'connect'
  sessionId: string
  userId: string
  content?: string
  timestamp: number
}

const they = ref('')
const you = ref('')
const sessionId = ref('')
const userId = ref('')
const isConnected = ref(false)
const partnerConnected = ref(false)
const partnerUserId = ref('')
const ws = ref<WebSocket | null>(null)
const typingTimeout = ref<NodeJS.Timeout>()

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9)

// Initialize session and user IDs
onMounted(() => {
  // Get or create session ID from URL params or generate new one
  const urlParams = new URLSearchParams(window.location.search)
  sessionId.value = urlParams.get('session') || generateId()
  userId.value = generateId()

  // Update URL with session ID
  if (!urlParams.get('session')) {
    const newUrl = `${window.location.pathname}?session=${sessionId.value}`
    window.history.replaceState({}, '', newUrl)
  }

  connectWebSocket()
})

onUnmounted(() => {
  if (ws.value) {
    ws.value.close()
  }
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }
})

const connectWebSocket = () => {
  const wsUrl = `ws://localhost:8787/ws/${sessionId.value}/${userId.value}`
  ws.value = new WebSocket(wsUrl)

  ws.value.onopen = () => {
    console.log('WebSocket connected')
    isConnected.value = true

    // Send connect message to register this connection
    sendMessage({
      type: 'connect',
      sessionId: sessionId.value,
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

    // Attempt to reconnect after 3 seconds
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
      // Optional: Could add a delay before clearing to show they stopped typing
      break
  }
}

const sendMessage = (message: ChatMessage) => {
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify(message))
  }
}

// Watch for changes in the "you" textarea and broadcast typing
let lastContent = ''
watch(you, (newValue) => {
  if (newValue !== lastContent) {
    lastContent = newValue

    // Send typing message
    sendMessage({
      type: 'typing',
      sessionId: sessionId.value,
      userId: userId.value,
      content: newValue,
      timestamp: Date.now(),
    })

    // Clear existing timeout
    if (typingTimeout.value) {
      clearTimeout(typingTimeout.value)
    }

    // Set timeout to send stop_typing message if no changes for 500ms
    typingTimeout.value = setTimeout(() => {
      sendMessage({
        type: 'stop_typing',
        sessionId: sessionId.value,
        userId: userId.value,
        timestamp: Date.now(),
      })
    }, 500)
  }
})

const copySessionLink = async () => {
  const link = `${window.location.origin}${window.location.pathname}?session=${sessionId.value}`
  try {
    await navigator.clipboard.writeText(link)
    alert('Session link copied to clipboard!')
  } catch (error) {
    console.error('Failed to copy link:', error)
    // Fallback: show the link
    prompt('Copy this link to share:', link)
  }
}
</script>

<template>
  <div class="chat-container">
    <div class="header">
      <h2>Real-time Chat</h2>
      <div class="status">
        <span class="connection-status" :class="{ connected: isConnected }">
          {{ isConnected ? 'Connected' : 'Connecting...' }}
        </span>
        <span class="partner-status" :class="{ connected: partnerConnected }">
          {{ partnerConnected ? 'Partner Online' : 'Waiting for partner...' }}
        </span>
      </div>
      <button @click="copySessionLink" class="share-btn">Share Session Link</button>
    </div>

    <div class="chat-areas">
      <div class="chat-section">
        <h3>They're typing:</h3>
        <div class="text-display" :class="{ active: partnerConnected && they.length > 0 }">
          {{ they || (partnerConnected ? 'Nothing yet...' : 'Waiting for partner to join...') }}
        </div>
      </div>

      <div class="chat-section">
        <h3>You're typing:</h3>
        <textarea
          v-model="you"
          :disabled="!isConnected"
          placeholder="Start typing... your partner will see it in real-time!"
          class="text-input"
        ></textarea>
      </div>
    </div>

    <div class="info">
      <p><strong>Session ID:</strong> {{ sessionId }}</p>
      <p><strong>Your ID:</strong> {{ userId }}</p>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #eee;
}

.header h2 {
  margin: 0 0 1rem 0;
  color: #333;
}

.status {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
}

.connection-status,
.partner-status {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.connection-status {
  background: #ffebee;
  color: #c62828;
}

.connection-status.connected {
  background: #e8f5e8;
  color: #2e7d32;
}

.partner-status {
  background: #fff3e0;
  color: #ef6c00;
}

.partner-status.connected {
  background: #e3f2fd;
  color: #1976d2;
}

.share-btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.3s ease;
}

.share-btn:hover {
  background: #45a049;
}

.chat-areas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.chat-section h3 {
  margin: 0 0 1rem 0;
  color: #555;
  font-size: 1.2rem;
}

.text-display {
  min-height: 200px;
  padding: 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.4;
  transition: all 0.3s ease;
}

.text-display.active {
  border-color: #4caf50;
  background: #f1f8e9;
}

.text-input {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.4;
  resize: vertical;
  transition: border-color 0.3s ease;
}

.text-input:focus {
  outline: none;
  border-color: #2196f3;
}

.text-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.info {
  text-align: center;
  color: #666;
  font-size: 0.9rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.info p {
  margin: 0.5rem 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .chat-areas {
    grid-template-columns: 1fr;
  }

  .status {
    flex-direction: column;
    gap: 0.5rem;
  }

  .chat-container {
    padding: 1rem;
  }
}
</style>
