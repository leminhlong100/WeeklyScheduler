import { useCallback, useEffect, useRef, useState } from 'react'
import type { Locale } from '@/features/i18n/types'

/** Mã lỗi rút gọn — mỗi mã ứng với một câu trong dictionary. */
export type SpeechErrorCode = 'denied' | 'no-speech' | 'no-mic' | 'network' | 'generic'

/**
 * TypeScript có sẵn type cho `SpeechRecognitionEvent`/`SpeechRecognitionErrorEvent`
 * nhưng KHÔNG có cho chính đối tượng recognition (API vẫn là bản nháp của W3C).
 * Khai báo tối thiểu đúng những gì dùng, thay vì `any`.
 */
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Ngôn ngữ nhận diện theo đúng ngôn ngữ giao diện: đó là tín hiệu duy nhất có
 * được về thứ tiếng người dùng sẽ nói. Đặt sai `lang` thì kết quả ra chữ vô
 * nghĩa chứ không báo lỗi, nên không để mặc định của trình duyệt.
 */
const SPEECH_LANG: Record<Locale, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
}

function toErrorCode(error: string): SpeechErrorCode {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'denied'
    case 'no-speech':
      return 'no-speech'
    case 'audio-capture':
      return 'no-mic'
    case 'network':
      return 'network'
    default:
      return 'generic'
  }
}

interface UseSpeechRecognitionOptions {
  locale: Locale
  /** Gọi khi có một đoạn đã nhận diện xong. KHÔNG tự gửi đi đâu — chỗ gọi đổ
   *  vào ô nhập để người dùng sửa trước. */
  onFinalTranscript: (text: string) => void
}

export interface SpeechRecognitionController {
  /**
   * `false` khi trình duyệt không có API — chỗ gọi phải **ẩn hẳn** nút mic chứ
   * không hiện rồi báo lỗi. Đọc một lần lúc mount nên không nhấp nháy.
   */
  supported: boolean
  listening: boolean
  /** Đoạn đang nghe dở, để hiện tạm. Xoá khi phiên kết thúc. */
  interim: string
  error: SpeechErrorCode | null
  start: () => void
  stop: () => void
  clearError: () => void
}

/**
 * Bọc Web Speech API cho ô nhập nhanh.
 *
 * Web Speech API chạy tốt trên Chrome (desktop + Android) nhưng hỗ trợ chắp vá
 * trên Safari/iOS. Cách xử lý ở đây: thiếu API thì `supported = false` và nút
 * mic biến mất; có API nhưng chạy hỏng thì trả mã lỗi để hiện một câu dễ hiểu.
 * Cả hai đường đều không chặn ô nhập chữ — đó vẫn là đường chính.
 */
export function useSpeechRecognition({
  locale,
  onFinalTranscript,
}: UseSpeechRecognitionOptions): SpeechRecognitionController {
  const [supported] = useState(() => getRecognitionCtor() !== null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<SpeechErrorCode | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Giữ callback trong ref: nếu đưa vào deps thì mỗi lần render lại phải dựng
  // recognition mới, và dựng lại giữa phiên sẽ cắt ngang câu đang nói.
  const onFinalRef = useRef(onFinalTranscript)
  // Gán trong effect chứ không giữa render: React coi việc ghi ref lúc render là
  // side effect, và callback của recognition chỉ chạy sau khi paint xong nên
  // cập nhật muộn một nhịp không ảnh hưởng gì.
  useEffect(() => {
    onFinalRef.current = onFinalTranscript
  })

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (recognitionRef.current) return
    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    // Dựng instance mới cho mỗi phiên: dùng lại một instance sau khi stop() là
    // nguồn lỗi kinh điển của API này trên Chrome.
    const recognition = new Ctor()
    recognition.lang = SPEECH_LANG[locale]
    // Một lượt bấm = một câu. `continuous` bật thì mic mở mãi và người dùng
    // không biết lúc nào nó ngừng nghe.
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let pending = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) onFinalRef.current(text.trim())
        else pending += text
      }
      setInterim(pending)
    }

    recognition.onerror = (event) => {
      // 'aborted' là do chính mình gọi abort() lúc unmount — không phải lỗi của
      // người dùng, báo ra chỉ gây hoang mang.
      if (event.error !== 'aborted') setError(toErrorCode(event.error))
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
      setInterim('')
    }

    try {
      recognition.start()
    } catch {
      // Bấm quá nhanh hai lần khiến start() ném InvalidStateError.
      setError('generic')
      return
    }

    recognitionRef.current = recognition
    setError(null)
    setListening(true)
  }, [locale])

  useEffect(
    () => () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    },
    [],
  )

  return {
    supported,
    listening,
    interim,
    error,
    start,
    stop,
    clearError: useCallback(() => setError(null), []),
  }
}
