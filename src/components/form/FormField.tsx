import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { useTheme } from '@/features/theme/ThemeContext'

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
}

/**
 * Nhãn + ô + lỗi. Lỗi được nối với ô bằng `aria-invalid` / `aria-describedby`
 * (khi ô là phần tử con trực tiếp) để trình đọc màn hình đọc lỗi cùng ô, và
 * dùng màu `theme.danger` đã được chỉnh đạt tương phản 4.5:1.
 */
export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  const { theme } = useTheme()
  const errorId = `${htmlFor}-error`
  const field =
    error && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          'aria-invalid': true,
          'aria-describedby': errorId,
        })
      : children

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {field}
      {error && (
        <p id={errorId} className="text-xs font-semibold" style={{ color: theme.danger }}>
          {error}
        </p>
      )}
    </div>
  )
}
