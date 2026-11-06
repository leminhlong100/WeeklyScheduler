import { useAmountVisibility, type AmountScope } from '../AmountVisibilityContext'

/** Giữ layout ổn định: dài hơn số gốc một chút để không trông như số 0. */
const MASK = '••••••'

/**
 * Bọc quanh một số tiền đã format sẵn (`formatMoney`/`formatAmount`). Khi
 * đang ẩn, thay toàn bộ bằng chấm tròn — không ẩn riêng phần số để không lộ
 * vị trí dấu phẩy/số chữ số, vốn cũng tiết lộ độ lớn của khoản tiền.
 *
 * `scope` và `categoryId` cho biết số này thuộc khối tổng nào / danh mục nào,
 * để người dùng chọn ẩn riêng từng mục.
 */
export function MaskedAmount({
  children,
  scope,
  categoryId,
}: {
  children: string
  scope?: AmountScope
  categoryId?: string | null
}) {
  const { isMasked } = useAmountVisibility()
  return <>{isMasked(scope, categoryId) ? MASK : children}</>
}
