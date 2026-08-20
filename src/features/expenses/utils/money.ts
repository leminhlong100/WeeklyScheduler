/**
 * Cộng trừ tiền qua đơn vị nhỏ nhất rồi mới quay về đơn vị chính.
 *
 * Cột `amount` là `numeric(14,2)` chính vì sai số nhị phân làm lệch tổng, nhưng
 * supabase-js trả về `number` của JS nên phép cộng ở client lại là float:
 * `0.1 + 0.2` ra `0.30000000000000004`, và một tháng vài trăm dòng USD thì phần
 * lệch đó nổi lên đúng ở chỗ khó chịu nhất — số dư không khớp với tổng thu trừ
 * tổng chi. Nhân 100, cộng bằng số nguyên, chia lại là hết.
 *
 * VND/JPY không có phần lẻ nên không bị ảnh hưởng; hàm vẫn dùng chung một đường
 * để không có hai cách cộng tiền trong cùng một module.
 */
const MINOR = 100

function toMinor(amount: number): number {
  return Math.round(amount * MINOR)
}

export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((acc, a) => acc + toMinor(a), 0) / MINOR
}

/** `a - b`, cùng cách làm tròn với `sumAmounts` để hai bên luôn khớp nhau. */
export function subtractAmounts(a: number, b: number): number {
  return (toMinor(a) - toMinor(b)) / MINOR
}
