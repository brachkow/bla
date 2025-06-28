<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  connected: boolean
}>()

const connectedClass = computed(() => {
  return props.connected ? 'VOnlineIndicator_Connected' : 'VOnlineIndicator_Disconnected'
})
</script>

<template>
  <div class="VOnlineIndicator animate-ping" :class="connectedClass"></div>
  <div class="VOnlineIndicator" :class="connectedClass"></div>
</template>

<style>
@reference '../assets/main.css';

.VOnlineIndicator {
  @apply w-4 h-4 rounded-full absolute top-2 right-2;
}

.VOnlineIndicator_Connected {
  @apply bg-green-500;
}

.VOnlineIndicator_Disconnected {
  @apply bg-red-500;
}
</style>
