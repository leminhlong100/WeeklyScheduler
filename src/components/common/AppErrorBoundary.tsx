import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Chặn lỗi render để trang không trắng tinh. Không có nó, chỉ một component lỗi
 * (hay file JS của trang tải hỏng) là React gỡ cả cây và chỉ còn nền trắng —
 * trên điện thoại thì không có console để xem vì sao. Ở đây hiện luôn nội dung
 * lỗi để chụp màn hình gửi lại, kèm nút tải lại.
 *
 * Chữ viết cứng (không qua i18n): boundary nằm ngoài cùng, lỗi có khi đến từ
 * chính các provider.
 */
export class AppErrorBoundary extends Component<
  { children: ReactNode; resetKey?: string },
  { error: Error | null; stack: string }
> {
  state = { error: null as Error | null, stack: '' }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack)
    this.setState({ stack: info.componentStack ?? '' })
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    // Đổi trang (vd. từ chi tiêu về lịch tuần) thì thử render lại.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null, stack: '' })
    }
  }

  render() {
    const { error, stack } = this.state
    if (!error) return this.props.children

    const details = [
      `${error.name}: ${error.message}`,
      error.stack?.split('\n').slice(0, 6).join('\n'),
      stack.trim().split('\n').slice(0, 6).join('\n'),
      `${location.pathname}${location.search}`,
      navigator.userAgent,
    ]
      .filter(Boolean)
      .join('\n\n')

    return (
      <div
        className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 overflow-auto px-4 py-10"
        style={{ background: '#fff7f2', color: '#3a2a22' }}
      >
        <div className="text-4xl">😵</div>
        <h1 className="text-center text-lg font-extrabold">Trang gặp lỗi</h1>
        <p className="max-w-md text-center text-sm opacity-80">
          Chụp màn hình phần bên dưới gửi lại để sửa. Thử tải lại trước nhé.
          <br />
          <span className="text-xs opacity-70">Something went wrong — details below.</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => location.reload()}
            className="min-h-11 rounded-[12px] px-4 text-sm font-extrabold text-white"
            style={{ background: '#7c5cff' }}
          >
            Tải lại
          </button>
          <button
            type="button"
            onClick={() => location.assign('/')}
            className="min-h-11 rounded-[12px] border-[1.5px] px-4 text-sm font-extrabold"
            style={{ borderColor: '#d9c9bf' }}
          >
            Về lịch tuần
          </button>
        </div>
        <pre
          className="w-full max-w-xl overflow-auto whitespace-pre-wrap break-words rounded-[12px] p-3 text-[11px] leading-snug select-text"
          style={{ background: '#fff', border: '1.5px solid #ecdcd2' }}
        >
          {details}
        </pre>
      </div>
    )
  }
}
