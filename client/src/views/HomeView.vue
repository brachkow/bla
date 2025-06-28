<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick, ref } from 'vue'
import VOnlineIndicator from '@/components/VOnlineIndicator.vue'
import VShare from '@/components/VShare.vue'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useWebSocket } from '@/composables/useWebSocket'

gsap.registerPlugin(SplitText)

const props = defineProps<{
  sessionId: string
}>()

const { isConnected, partnerConnected, they, you, connectWebSocket, cleanup } = useWebSocket(
  props.sessionId,
)

onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  cleanup()
})

const prevLength = ref(0)

watch(
  () => they.value,
  async () => {
    await nextTick()
    const split = SplitText.create('.animate-they-text', {
      type: 'chars',
      autoSplit: true,
      propIndex: true,
    })

    gsap.from(
      split.chars.filter((char) => {
        const charIndex = Number((char as HTMLElement).style.getPropertyValue('--char'))
        if (split.chars.length > prevLength.value) return charIndex > prevLength.value
      }),
      {
        duration: 0.3 * (Math.random() + 0.5),
        autoAlpha: 0,
        stagger: 0.05,
        scale: 1.5,
        rotate: 10 * Math.random() * (Math.random() > 0.5 ? 1 : -1),
        ease: 'power2.inOut',
      },
    )
    prevLength.value = split.chars.length
  },
  {
    immediate: true,
  },
)
</script>

<template>
  <div class="App">
    <div class="flex justify-between items-center p-4">
      <h2>Bla — real-time chat</h2>
      <VShare :session-id="props.sessionId" />
    </div>
    <div
      class="Message Message_They relative"
      :class="{ active: partnerConnected && they.length > 0 }"
    >
      <div class="Message__Text animate-they-text" v-if="they">
        {{ they }}
      </div>
      <div class="Message__Placeholder" v-else-if="!partnerConnected">
        Waiting other user to join...
      </div>
      <VOnlineIndicator :connected="partnerConnected" />
    </div>
    <div class="relative">
      <textarea
        v-model="you"
        :disabled="!isConnected"
        placeholder="Start typing... your partner will see it in real-time!"
        class="Message Message_You absolute inset-0"
      ></textarea>
      <VOnlineIndicator :connected="isConnected" />
    </div>
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
  @apply rounded-xl p-4 resize-none outline-none text-center text-4xl font-extrabold;
}

.Message_They {
  @apply bg-gray-200 text-black flex items-center justify-center;
}
.Message_You {
  @apply bg-blue-400 text-white;
}

.Message__Text {
  @apply text-black;
}

.Message__Placeholder {
  @apply text-gray-400;
}
</style>
