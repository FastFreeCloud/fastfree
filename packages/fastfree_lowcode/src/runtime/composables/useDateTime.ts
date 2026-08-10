import { ref, onMounted, onUnmounted } from 'vue'
import umalqura from '@umalqura/core'

export interface DateTimeInfo {
  time: string
  gregorianDate: string
  hijriDate: string
}

export const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
]

export function useDateTime() {
  const dateTime = ref<DateTimeInfo>({ time: '', gregorianDate: '', hijriDate: '' })
  let timer: ReturnType<typeof setInterval> | null = null

  function update() {
    const now = new Date()
    dateTime.value.time = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      numberingSystem: 'latn',
    })
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    dateTime.value.gregorianDate = `${y}-${m}-${d}`

    try {
      const hijri = umalqura(now)
      const hy = hijri.hy
      const hm = String(hijri.hm).padStart(2, '0')
      const hd = String(hijri.hd).padStart(2, '0')
      const monthName = HIJRI_MONTHS[hijri.hm - 1] || ''
      dateTime.value.hijriDate = `${hy}-${hm}-${hd} ${monthName}`.trim()
    } catch {
      dateTime.value.hijriDate = ''
    }
  }

  onMounted(() => {
    update()
    timer = setInterval(update, 1000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { dateTime }
}