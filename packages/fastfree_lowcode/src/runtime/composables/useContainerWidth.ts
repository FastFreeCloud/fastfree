import { ref, onMounted, onUnmounted } from 'vue'

export function useContainerWidth() {
  const containerRef = ref<HTMLElement | null>(null)
  const containerWidth = ref(0)
  let resizeObserver: ResizeObserver | null = null
  let frameId: number | null = null
  let pendingWidth: number | null = null

  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(true)

  function updateBreakpoints() {
    isMobile.value = containerWidth.value < 600
    isTablet.value = containerWidth.value >= 600 && containerWidth.value < 1024
    isDesktop.value = containerWidth.value >= 1024
  }

  function setContainerWidth(width: number) {
    const nextWidth = Math.max(0, Math.round(width))
    if (nextWidth === containerWidth.value) return
    containerWidth.value = nextWidth
    updateBreakpoints()
  }

  function scheduleContainerWidth(width: number) {
    pendingWidth = width
    if (frameId !== null) return
    frameId = requestAnimationFrame(() => {
      frameId = null
      if (pendingWidth === null) return
      setContainerWidth(pendingWidth)
      pendingWidth = null
    })
  }

  onMounted(() => {
    if (containerRef.value) {
      setContainerWidth(containerRef.value.getBoundingClientRect().width)
    }
    if (typeof ResizeObserver === 'undefined') return
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        scheduleContainerWidth(entry.contentRect.width)
      }
    })
    if (containerRef.value) {
      resizeObserver.observe(containerRef.value)
    }
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    if (frameId !== null) cancelAnimationFrame(frameId)
  })

  return { containerRef, containerWidth, isMobile, isTablet, isDesktop }
}
