<script setup lang="ts">
const props = defineProps<{
  sessionId: string
}>()

const copySessionLink = async () => {
  const link = `${window.location.origin}/${props.sessionId}`
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
  <button
    @click="copySessionLink"
    class="bg-blue-400 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-500 transition-all cursor-pointer"
  >
    Share Session Link
  </button>
</template>
