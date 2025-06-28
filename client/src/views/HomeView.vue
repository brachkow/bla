<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface ChatMessage {
  type: 'typing' | 'stop_typing' | 'join' | 'leave' | 'connect'
  sessionId: string
  userId: string
  content?: string
  timestamp: number
}

const props = defineProps<{
  sessionId: string
}>()

const they = ref('')
const you = ref('')
const sessionId = ref('')
const userId = ref('')
const isConnected = ref(false)
const partnerConnected = ref(false)
const partnerUserId = ref('')
const ws = ref<WebSocket | null>(null)
const typingTimeout = ref<number>()
const theyMessageRef = ref<HTMLElement | null>(null)

// Initialize session and user IDs
onMounted(() => {
  // Get sessionId from route params (guaranteed to exist due to route guard)
  sessionId.value = props.sessionId
  userId.value = Math.random().toString(36).substr(2, 9)
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
  const wsUrl = `ws://${import.meta.env.VITE_BACKEND_URL}/ws/${sessionId.value}/${userId.value}`
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
  const link = `${window.location.origin}/${sessionId.value}`
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
  <div class="App">
    <div class="flex justify-between items-center p-4">
      <h2>Bla — real-time chat</h2>
      <button @click="copySessionLink" class="share-btn">Share Session Link</button>
    </div>
    <div
      class="Message Message_They relative"
      :class="{ active: partnerConnected && they.length > 0 }"
    >
      {{ they || (partnerConnected ? 'Nothing yet...' : 'Waiting for partner to join...') }}
      <div
        class="w-16 h-16 rounded-full absolute top-16 right-16 animate-ping"
        :class="{partnerConnected ? 'bg-green-500' : 'bg-red-500'}"
      ></div>
    </div>
    <textarea
      v-model="you"
      :disabled="!isConnected"
      placeholder="Start typing... your partner will see it in real-time!"
      class="Message Message_You"
    ></textarea>
  </div>
</template>

<style>
@reference '@/assets/main.css';

html,
body,
#app,
.App {
  @apply h-full w-full;
}

.App {
  @apply grid gap-4 p-4;
  grid-template-rows: min-content 1fr 1fr;
}

.Message {
  @apply rounded-xl p-4 resize-none outline-none text-center text-2xl;
}

.Message_They {
  @apply bg-gray-200 text-black;
}
.Message_You {
  @apply bg-blue-400 text-white;
}
</style>
