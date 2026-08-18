import { onBeforeUnmount, ref } from 'vue'

export function useToast(duration = 2400) {
  const message = ref('')
  let timer = 0

  function show(nextMessage: string) {
    message.value = nextMessage
    window.clearTimeout(timer)
    timer = window.setTimeout(() => { message.value = '' }, duration)
  }

  onBeforeUnmount(() => window.clearTimeout(timer))
  return { message, show }
}
