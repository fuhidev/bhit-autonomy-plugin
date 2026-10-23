# 🧭 BẢNG ĐIỀU HƯỚNG NHẬN THỨC AGENT (COGNITIVE ROUTER)

@[SOUL](.agents/cognition/SOUL.md)

## 📂 HỆ THỐNG THAM CHIẾU NHẬN THỨC (ON-DEMAND REFERENCES)
Tuyệt đối không nạp toàn bộ các file dưới đây cùng lúc. Chỉ dùng `read_file` đọc đúng file cần thiết theo ngữ cảnh:

1. **Tính cách & Văn phong**: [CHARACTER.md](.agents/cognition/CHARACTER.md)
   - *Khi nào đọc*: Trước khi soạn thảo nội dung, giao tiếp với bên ngoài, hoặc thảo luận/phản biện với Người vận hành.
2. **Bàn làm việc & Tín hiệu trong ngày**: [STATE.md](.agents/cognition/STATE.md)
   - *Khi nào đọc & cập nhật*: Đọc ĐẦU TIÊN mỗi khi `/schedule` đánh thức để nắm tiến độ Goal, các vòng lặp đang mở (Open Loops), hạ tầng dữ liệu; ghi nhận các tín hiệu/kết quả thực thi trong ngày vào cuối file.
3. **Sổ tay Giấc mơ & Giả thuyết ứng viên (OpenClaw v2)**: [DREAMS.md](.agents/cognition/DREAMS.md)
   - *Khi nào đọc & cập nhật*: Dùng trong chu trình `cognitive-dreamer` cuối ngày để theo dõi các mẫu lặp lại (Candidate Truths) trước khi thăng cấp lên `MEMORY.md`.
4. **Ký ức & Chân lý dài hạn**: [MEMORY.md](.agents/cognition/MEMORY.md)
   - *Khi nào đọc & cập nhật*: Đọc khi lập kế hoạch chiến dịch; chỉ ghi những quy tắc đã vượt qua Promotion Gate của `Dreamer` hoặc đã chốt `Adopt/Adapt` với Người vận hành.
5. **Hộp thư Đàm phán & Phê duyệt (Non-Blocking)**: [INBOX.md](.agents/cognition/INBOX.md)
   - *Khi nào đọc & cập nhật*: Ghi đề xuất tạo Skill mới, câu hỏi xin ý kiến, hoặc đề xuất sửa `SOUL.md`/`CHARACTER.md` (kèm phát Windows Toast Notification). Kiểm tra mỗi nhịp `/schedule` xem Người vận hành đã duyệt chưa.

## 🛡️ QUY TẮC BẤT BIẾN VỀ QUYỀN GHI (WRITE GOVERNANCE)
- **TUYỆT ĐỐI KHÔNG** tự ý dùng công cụ sửa đổi `AGENTS.md`, `SOUL.md` hoặc `CHARACTER.md`. Mọi nhu cầu thay đổi 3 file này phải được ghi thành đề xuất trong `INBOX.md` chờ Người vận hành phê duyệt.
- Trong ngày, các quan sát/bài học lẻ tẻ chỉ được ghi vào `STATE.md`, không ghi trực tiếp vào `MEMORY.md` để tránh làm nhiễu bộ nhớ dài hạn.
