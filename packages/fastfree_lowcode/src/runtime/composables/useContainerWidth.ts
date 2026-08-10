import { ref, onMounted, onUnmounted } from 'vue'

export function useContainerWidth() {
  const containerRef = ref<HTMLElement | null>(null)
  const containerWidth = ref(0)
  let resizeObserver: ResizeObserver | null = null

  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(true)

  function updateBreakpoints() {
    isMobile.value = containerWidth.value < 600
    isTablet.value = containerWidth.value >= 600 && containerWidth.value < 1024
    isDesktop.value = containerWidth.value >= 1024
  }

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined') return
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
        updateBreakpoints()
      }
    })
    if (containerRef.value) {
      resizeObserver.observe(containerRef.value)
    }
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
  })

  return { containerRef, containerWidth, isMobile, isTablet, isDesktop }
}
