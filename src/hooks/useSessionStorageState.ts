import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * `useState` nhưng sống qua một lần tải lại trang, lưu trong `sessionStorage`.
 *
 * Cố ý là `sessionStorage` chứ không phải `localStorage`: thứ cần giữ ở đây là
 * việc đang làm dở trong tab này (bản nháp AI vừa tách xong, chưa xác nhận). Để
 * ở `localStorage` thì mở lại app ba ngày sau vẫn thấy một bản nháp cũ hiện lên
 * mà không rõ từ đâu ra, và hai tab sẽ ghi đè lẫn nhau.
 *
 * Giá trị hỏng (đổi shape sau một bản deploy, hoặc ai đó sửa tay) bị bỏ qua và
 * thay bằng `initialValue` — một JSON.parse ném lỗi lúc khởi tạo state sẽ làm
 * trắng cả trang.
 */
export function useSessionStorageState<T>(
  key: string,
  initialValue: T,
  /** Chặn dữ liệu cũ sai shape trước khi nó vào state. */
  isValid: (value: unknown) => value is T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.sessionStorage.getItem(key)
      if (raw === null) return initialValue
      const parsed: unknown = JSON.parse(raw)
      return isValid(parsed) ? parsed : initialValue
    } catch {
      return initialValue
    }
  })

  // Đọc `isValid` qua ref: hàm này gần như luôn là một arrow mới mỗi render, đưa
  // vào deps của effect bên dưới là ghi storage lại sau từng lần render.
  const isValidRef = useRef(isValid)
  useEffect(() => {
    isValidRef.current = isValid
  })

  useEffect(() => {
    try {
      // `null`/undefined coi như "không có gì để giữ" — xoá hẳn key thay vì lưu
      // chuỗi "null", để lần sau đọc ra đúng initialValue.
      if (value === null || value === undefined) window.sessionStorage.removeItem(key)
      else window.sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Hết quota hoặc storage bị chặn (chế độ ẩn danh của một số trình duyệt):
      // mất khả năng giữ qua reload thì đành, không phải lý do để app dừng lại.
    }
  }, [key, value])

  const set = useCallback((next: T) => setValue(next), [])

  return [value, set]
}
