import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router'
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary'

function App() {
  return (
    // Ngoài cùng: bắt cả lỗi từ provider. Trong router còn một lớp nữa, tự hồi
    // lại khi đổi trang.
    <AppErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </AppErrorBoundary>
  )
}

export default App
