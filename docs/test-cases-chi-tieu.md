# Bộ test chất lượng — AI tách khoản chi tiêu

Bộ này đo **prompt + model**, không đo code. Chạy lại mỗi khi sửa `buildSystemPrompt`
trong `netlify/functions/parse-expense.js` hoặc đổi `GROQ_MODEL`. Đây là thứ duy nhất
cho biết thay đổi vừa rồi làm prompt tốt lên hay tệ đi.

## Chạy

```bash
node scripts/test-parse-expense.mjs
```

Script đọc thẳng khối JSON bên dưới của chính file này, gọi Groq bằng đúng system
prompt đang deploy (import từ `parse-expense.js`, không chép lại), rồi in bảng
đạt/trượt. Cần `GROQ_API_KEY` trong `.env.local`.

Chạy một phần: `node scripts/test-parse-expense.mjs 12 13 14` (theo `id`).

## Cách đọc kết quả

- **Ngày mốc cố định `2026-03-10` (thứ Ba)** — để "hôm qua", "thứ 3 tuần trước"
  luôn quy ra cùng một ngày, kết quả các lần chạy so sánh được với nhau.
- Mỗi case chỉ khai báo phần **bắt buộc đúng**. `note` và `confidence` không được
  assert cứng (trừ vài case cố ý), vì cách diễn đạt của model đổi theo phiên bản
  mà không có nghĩa là sai.
- `"amounts": []` nghĩa là **phải trả về mảng rỗng** — dùng cho câu không phải chi
  tiêu và câu thiếu số tiền. Đây là nhóm dễ hỏng nhất khi nới lỏng prompt: model
  bắt đầu đoán bừa số tiền.

## Bộ case

```json
{
  "today": "2026-03-10",
  "categories": [
    "Ăn uống",
    "Di chuyển",
    "Nhà cửa",
    "Mua sắm",
    "Sức khoẻ",
    "Giải trí",
    "Khác"
  ],
  "incomeCategories": ["Lương", "Thưởng", "Đầu tư", "Thu khác"],
  "defaultCurrency": "VND",
  "cases": [
    {
      "id": 1,
      "group": "nhiều khoản trong một câu",
      "text": "sáng ăn bún 40k, trưa cà phê 35 nghìn, tối đổ xăng 100k",
      "amounts": [40000, 35000, 100000],
      "categories": ["Ăn uống", "Ăn uống", "Di chuyển"]
    },
    {
      "id": 2,
      "group": "nhiều khoản trong một câu",
      "text": "hôm nay mua rau 25k với thịt 120k",
      "amounts": [25000, 120000]
    },
    {
      "id": 3,
      "group": "nhiều khoản trong một câu",
      "text": "ăn sáng 30k rồi grab đi làm 45k, chiều trà sữa 55k, tối xem phim 120k",
      "amounts": [30000, 45000, 55000, 120000]
    },
    {
      "id": 4,
      "group": "đơn vị k",
      "text": "cà phê 35k",
      "amounts": [35000]
    },
    {
      "id": 5,
      "group": "đơn vị nghìn",
      "text": "gửi xe 5 nghìn",
      "amounts": [5000]
    },
    {
      "id": 6,
      "group": "đơn vị ngàn",
      "text": "mua ổ bánh mì 20 ngàn",
      "amounts": [20000]
    },
    {
      "id": 7,
      "group": "đơn vị triệu",
      "text": "đóng tiền nhà 4 triệu",
      "amounts": [4000000],
      "categories": ["Nhà cửa"]
    },
    {
      "id": 8,
      "group": "đơn vị tr",
      "text": "mua điện thoại 12tr",
      "amounts": [12000000],
      "categories": ["Mua sắm"]
    },
    {
      "id": 9,
      "group": "đơn vị xị",
      "text": "nhậu hết 3 xị",
      "amounts": [300000]
    },
    {
      "id": 10,
      "group": "rưỡi",
      "text": "taxi về nhà hai trăm rưỡi",
      "amounts": [250000]
    },
    {
      "id": 11,
      "group": "rưỡi",
      "text": "tiền internet 1 triệu rưỡi",
      "amounts": [1500000]
    },
    {
      "id": 12,
      "group": "số viết bằng chữ",
      "text": "ăn phở bốn mươi nghìn",
      "amounts": [40000]
    },
    {
      "id": 13,
      "group": "số viết bằng chữ",
      "text": "mua thuốc hai trăm nghìn",
      "amounts": [200000],
      "categories": ["Sức khoẻ"]
    },
    {
      "id": 14,
      "group": "ngày tương đối",
      "text": "hôm qua ăn lẩu 300k",
      "amounts": [300000],
      "dates": ["2026-03-09"]
    },
    {
      "id": 15,
      "group": "ngày tương đối",
      "text": "tối qua đi ăn ốc 150k",
      "amounts": [150000],
      "dates": ["2026-03-09"]
    },
    {
      "id": 16,
      "group": "ngày tương đối",
      "text": "hôm kia đổ xăng 80k",
      "amounts": [80000],
      "dates": ["2026-03-08"]
    },
    {
      "id": 17,
      "group": "ngày tương đối",
      "text": "thứ 3 tuần trước mua sách 250k",
      "amounts": [250000],
      "dates": ["2026-03-03"]
    },
    {
      "id": 18,
      "group": "ngày tương đối",
      "text": "mùng 5 đóng tiền điện 600k",
      "amounts": [600000],
      "dates": ["2026-03-05"]
    },
    {
      "id": 19,
      "group": "không nêu ngày",
      "text": "mua cà phê mang đi 45k",
      "amounts": [45000],
      "dates": ["2026-03-10"]
    },
    {
      "id": 20,
      "group": "thiếu số tiền — phải bỏ",
      "text": "sáng nay ăn bún",
      "amounts": []
    },
    {
      "id": 21,
      "group": "thiếu số tiền — phải bỏ",
      "text": "mua cái áo, quên mất giá rồi",
      "amounts": []
    },
    {
      "id": 22,
      "group": "thiếu số tiền — chỉ giữ khoản có tiền",
      "text": "sáng ăn bún 40k, trưa ăn cơm nhưng quên giá",
      "amounts": [40000]
    },
    {
      "id": 23,
      "group": "không phải chi tiêu",
      "text": "nhắc tôi họp lúc 3h chiều",
      "amounts": []
    },
    {
      "id": 24,
      "group": "không phải chi tiêu",
      "text": "mai nhớ gọi cho mẹ",
      "amounts": []
    },
    {
      "id": 25,
      "group": "không phải chi tiêu",
      "text": "hôm nay mệt quá",
      "amounts": []
    },
    {
      "id": 26,
      "group": "danh mục không rõ -> Khác",
      "text": "lì xì cho cháu 200k",
      "amounts": [200000],
      "categories": ["Khác"]
    },
    {
      "id": 27,
      "group": "danh mục không rõ -> Khác",
      "text": "đóng quỹ lớp 150k",
      "amounts": [150000],
      "categories": ["Khác"]
    },
    {
      "id": 28,
      "group": "JPY",
      "text": "ăn ramen ở Tokyo 1200 yên",
      "amounts": [1200],
      "currencies": ["JPY"]
    },
    {
      "id": 29,
      "group": "JPY",
      "text": "mua vé tàu 500 yên, cà phê 380 yên",
      "amounts": [500, 380],
      "currencies": ["JPY", "JPY"]
    },
    {
      "id": 30,
      "group": "USD",
      "text": "mua app 20 đô",
      "amounts": [20],
      "currencies": ["USD"]
    },
    {
      "id": 31,
      "group": "danh mục rõ ràng",
      "text": "khám răng 500k",
      "amounts": [500000],
      "categories": ["Sức khoẻ"]
    },
    {
      "id": 32,
      "group": "danh mục rõ ràng",
      "text": "mua vé xem phim 120k",
      "amounts": [120000],
      "categories": ["Giải trí"]
    },
    {
      "id": 33,
      "group": "danh mục rõ ràng",
      "text": "grab về nhà 65k",
      "amounts": [65000],
      "categories": ["Di chuyển"]
    },
    {
      "id": 34,
      "group": "số mơ hồ",
      "text": "mua đồ 500",
      "amounts": [500],
      "confidences": ["low"]
    },
    {
      "id": 35,
      "group": "câu dài đời thường",
      "text": "sáng cà phê 30k, trưa cơm văn phòng 45k, chiều gửi xe 5k, tối hôm qua nhậu 400k",
      "amounts": [30000, 45000, 5000, 400000],
      "dates": ["2026-03-10", "2026-03-10", "2026-03-10", "2026-03-09"]
    },
    {
      "id": 36,
      "group": "thu nhập",
      "text": "nhận lương tháng này 20 triệu",
      "amounts": [20000000],
      "kinds": ["income"],
      "categories": ["Lương"]
    },
    {
      "id": 37,
      "group": "thu nhập",
      "text": "được thưởng 2tr",
      "amounts": [2000000],
      "kinds": ["income"]
    },
    {
      "id": 38,
      "group": "thu nhập",
      "text": "bán con xe cũ được 15 triệu",
      "amounts": [15000000],
      "kinds": ["income"]
    },
    {
      "id": 39,
      "group": "thu nhập lẫn chi trong một câu",
      "text": "nhận lương 20tr, đóng tiền nhà 5tr",
      "amounts": [20000000, 5000000],
      "kinds": ["income", "expense"]
    },
    {
      "id": 40,
      "group": "thu nhập — không được nhận nhầm",
      "text": "trả tiền điện 800k",
      "amounts": [800000],
      "kinds": ["expense"]
    },
    {
      "id": 41,
      "group": "thu nhập — không được nhận nhầm",
      "text": "chuyển khoản cho mẹ 3 triệu",
      "amounts": [3000000],
      "kinds": ["expense"]
    }
  ]
}
```

## Lưu ý khi chạy

- **Free tier Groq rất dễ 429** khi bắn 35 request liên tiếp. Script đã tự giãn
  nhịp (`PACE_MS`) và thử lại khi gặp 429, nhưng nếu vẫn thấy hàng loạt dòng
  `429` thì đó là **hạn mức, không phải prompt hỏng** — đợi vài phút rồi chạy lại
  trước khi đi sửa prompt.
  Hạn mức tính theo ngày, và một lần chạy đủ bộ tốn ~35 request. Chạy 3–4 lượt
  liên tiếp là hết quota ngày; khi sửa prompt nên chạy riêng vài case liên quan
  (`node scripts/test-parse-expense.mjs 10 11`) rồi mới chạy full một lượt chốt.
- Model là loại reasoning nên **không tuyệt đối tất định** dù `temperature: 0`.
  Một case lẻ chệch giữa hai lần chạy là bình thường; chỉ coi là hồi quy khi nó
  trượt lại ở lần chạy thứ hai.

## Kết quả gần nhất

Ghi lại ngày chạy + model + tỉ lệ đạt mỗi lần đổi prompt, để lần sau còn so sánh được.

| Ngày | Model | Đạt | Ghi chú |
|---|---|---|---|
| 2026-08-20 | `openai/gpt-oss-120b` | 9/10 (chạy chọn lọc) | Sau khi thêm phần THU vào prompt (`kind`, danh mục thu riêng). Chạy case 1, 10, 11, 34 (hồi quy phần chi) + 36–41 (thu): 6/6 case thu đạt, chi chỉ trượt #10 — đúng cái vốn đã chệch từ trước, và đạt khi chạy riêng. **Chưa chạy full 41 case** để tiết kiệm quota ngày. |
| 2026-08-19 | `openai/gpt-oss-120b` | 34/35 | Sau khi thêm bảng ngày tính sẵn + từ khoá danh mục + quy tắc "rưỡi". Case còn chệch: #10 "hai trăm rưỡi" (đạt khi chạy riêng, trượt trong lần chạy dài). |
| 2026-08-19 | `openai/gpt-oss-120b` | 33/35 | Prompt gốc: model tự cộng trừ lịch ("thứ 3 tuần trước" ra sai một tuần rưỡi) và xếp "grab về nhà" vào Ăn uống. |

## Đã sửa gì sau lần chạy đầu

1. **Ngày không còn để model tự tính.** `buildDateReference()` trong
   `parse-expense.js` dựng sẵn bảng "hôm qua / thứ Hai tuần này / thứ Ba tuần
   trước = YYYY-MM-DD" bằng JS rồi nhét vào prompt. Model chỉ còn phải *chọn*
   dòng đúng. Đây là loại việc code làm chính xác 100% còn model thì không.
2. **Từ khoá danh mục hay gặp** đưa thẳng vào prompt (grab/xe ôm/taxi ->
   Di chuyển, grabfood -> Ăn uống, tiền nhà/điện/nước -> Nhà cửa…).
3. **Quy tắc "rưỡi"** viết thành phép cộng kèm phản ví dụ
   ("hai trăm rưỡi = 200 + 50 = 250 nghìn, KHÔNG phải 300000").
