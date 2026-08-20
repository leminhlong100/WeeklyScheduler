import { useState } from 'react'
import { MicIcon, SparklesIcon, SquareIcon } from 'lucide-react'
import { GradientButton } from '@/components/common/GradientButton'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import type { Dictionary } from '@/features/i18n/dictionary'
import { todayISO } from '@/lib/utils/date'
import {
  MAX_PARSE_TEXT_LENGTH,
  ParseExpenseError,
  parseExpenseText,
  type ParsedExpenseItem,
  type ParseExpenseErrorCode,
} from '../api/parseExpenseApi'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useSpeechRecognition, type SpeechErrorCode } from '../hooks/useSpeechRecognition'
import { DEFAULT_CURRENCY } from '../schemas/expenseSchema'

/** Lỗi thô của Groq không bao giờ đến tay người dùng — mỗi mã một câu dễ hiểu. */
function errorMessage(code: ParseExpenseErrorCode, t: Dictionary): string {
  switch (code) {
    case 'auth':
      return t.aiErrorAuth
    case 'rate_limited':
      return t.aiErrorRateLimited
    case 'timeout':
      return t.aiErrorTimeout
    case 'parse_failed':
      return t.aiErrorParseFailed
    case 'config':
      return t.aiErrorConfig
    default:
      return t.aiErrorGeneric
  }
}

function speechErrorMessage(code: SpeechErrorCode, t: Dictionary): string {
  switch (code) {
    case 'denied':
      return t.voiceErrorDenied
    case 'no-speech':
      return t.voiceErrorNoSpeech
    case 'no-mic':
      return t.voiceErrorNoMic
    case 'network':
      return t.voiceErrorNetwork
    default:
      return t.voiceErrorGeneric
  }
}

interface QuickAddSheetProps {
  /** Gọi khi AI trả về ít nhất một khoản — trang mở bảng nháp để user xác nhận. */
  onDrafts: (items: ParsedExpenseItem[], rawText: string) => void
  /** Mở form nhập tay khi AI lỗi hoặc không đọc được câu. */
  onEnterManually: () => void
}

export function QuickAddSheet({ onDrafts, onEnterManually }: QuickAddSheetProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const { data: categories = [] } = useExpenseCategories()

  const [text, setText] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const speech = useSpeechRecognition({
    locale,
    // Đổ vào ô nhập chứ KHÔNG gửi thẳng lên AI: nhận diện giọng nói sai chính tả
    // là chuyện thường, gửi luôn thì người dùng mất một lượt quota để sửa.
    onFinalTranscript: (transcript) =>
      setText((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript)),
  })

  const trimmed = text.trim()
  const tooLong = trimmed.length > MAX_PARSE_TEXT_LENGTH
  // Chặn gửi trùng ngay ở nút: bấm hai lần trên mạng chậm là lỗi hay gặp nhất,
  // và mỗi lần bấm là một lần tiêu quota AI.
  const canSend = trimmed.length > 0 && !tooLong && !isPending && categories.length > 0

  // Đoạn đang nghe dở hiện ngay trong ô nhập để thấy máy đang bắt được gì, nhưng
  // chưa nhập vào state — chỉ phần `isFinal` mới được giữ lại.
  const displayText = speech.interim ? `${trimmed ? `${trimmed} ` : ''}${speech.interim}` : text

  const submit = async () => {
    if (!canSend) return
    setIsPending(true)
    setError(null)
    try {
      const items = await parseExpenseText({
        text: trimmed,
        today: todayISO(),
        // Hai danh sách tách nhau: server dùng chúng làm allowlist theo từng
        // kind, nên "nhận lương 20tr" không thể rơi vào một danh mục chi.
        categories: categories.filter((c) => c.kind === 'expense').map((c) => c.name),
        incomeCategories: categories.filter((c) => c.kind === 'income').map((c) => c.name),
        defaultCurrency: DEFAULT_CURRENCY,
      })
      if (items.length === 0) {
        setError(t.aiNoItems)
        return
      }
      onDrafts(items, trimmed)
      setText('')
    } catch (e) {
      setError(e instanceof ParseExpenseError ? errorMessage(e.code, t) : t.aiErrorGeneric)
    } finally {
      setIsPending(false)
    }
  }

  const toggleListening = () => {
    setError(null)
    speech.clearError()
    if (speech.listening) speech.stop()
    else speech.start()
  }

  const shownError = error ?? (speech.error ? speechErrorMessage(speech.error, t) : null)

  return (
    <section
      className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] p-3.5"
      style={{ borderColor: theme.border, background: theme.chip }}
    >
      <div
        className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider"
        style={{ color: theme.muted }}
      >
        <SparklesIcon className="size-3.5" />
        {t.quickAdd}
      </div>

      <textarea
        value={displayText}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Enter gửi, Shift+Enter xuống dòng — câu nhiều khoản vẫn thường là một dòng.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void submit()
          }
        }}
        rows={2}
        placeholder={t.quickAddPh}
        disabled={isPending}
        // Bàn phím điện thoại đổi nút Enter thành "Gửi" nhờ cái này. Không có nó
        // thì phím đó là xuống dòng và người dùng không biết phải bấm vào đâu để
        // xong — nút gửi bên dưới mới là đường chính, đây chỉ là đường thứ hai.
        enterKeyHint="send"
        // Khoá lúc đang nghe: giá trị hiển thị đang gồm cả đoạn tạm chưa vào
        // state, gõ chen vào lúc này sẽ mất chữ khi đoạn tạm bị thay.
        readOnly={speech.listening}
        className="w-full resize-none rounded-xl border-[1.5px] px-3 py-2.5 text-[13.5px] font-semibold outline-none disabled:opacity-60"
        style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
      />

      {tooLong && (
        <p className="text-xs font-semibold text-[#ff5d7a]">
          {t.quickAddTooLong.replace('{n}', String(MAX_PARSE_TEXT_LENGTH))}
        </p>
      )}

      {shownError && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 text-xs font-semibold text-[#ff5d7a]">{shownError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEnterManually}
            style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
          >
            {t.enterManually}
          </Button>
        </div>
      )}

      {/* Trên điện thoại nút gửi chiếm hết chiều ngang còn lại và cao 44px: đây
          là hành động kết thúc việc gõ, và Enter của bàn phím ảo không phải thứ
          ai cũng nghĩ ra. Từ sm trở lên thì thu về kích thước thường, dồn phải
          như các thanh hành động khác. `flex-wrap` để hai nút không bao giờ bị
          đẩy ra ngoài khung trên máy hẹp. */}
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {/* Trình duyệt không có Web Speech API thì nút biến mất hẳn — hiện nút rồi
            báo "không hỗ trợ" chỉ làm người dùng bấm một lần vô ích. Ô nhập chữ
            luôn còn đó, nên mất nút này không mất đường nào. */}
        {speech.supported && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={isPending}
            aria-label={speech.listening ? t.voiceListening : t.voiceInput}
            aria-pressed={speech.listening}
            className="flex h-11 flex-shrink-0 items-center gap-1.5 rounded-[13px] border-[1.5px] px-3 text-[13px] font-bold transition-transform duration-150 active:scale-95 disabled:opacity-60 sm:h-9"
            style={{
              borderColor: speech.listening ? '#d93a3a' : theme.border,
              background: speech.listening ? '#d93a3a1f' : theme.inputBg,
              color: speech.listening ? '#d93a3a' : theme.text,
            }}
          >
            {speech.listening ? (
              <SquareIcon className="size-3.5 fill-current" />
            ) : (
              <MicIcon className="size-4" />
            )}
            {speech.listening ? t.voiceListening : t.voiceInput}
          </button>
        )}

        <GradientButton
          type="button"
          onClick={() => void submit()}
          disabled={!canSend || speech.listening}
          className="h-11 min-w-[140px] flex-1 text-[14px] sm:h-9 sm:flex-none sm:px-4 sm:text-[13px]"
        >
          {isPending ? t.quickAddThinking : t.quickAddSend}
        </GradientButton>
      </div>
    </section>
  )
}
