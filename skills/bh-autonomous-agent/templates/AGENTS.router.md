# 🧭 BẢNG ĐIỀU HƯỚNG NHẬN THỨC AGENT (COGNITIVE ROUTER)

@[SOUL](.agents/cognition/SOUL.md)

## 📂 HỆ THỐNG THAM CHIẾU NHẬN THỨC (ON-DEMAND REFERENCES)
Không nạp toàn bộ các file dưới đây cùng lúc. Chỉ dùng `read_file` đọc đúng file cần thiết theo ngữ cảnh:

1. **Tính cách & Văn phong**: [CHARACTER.md](.agents/cognition/CHARACTER.md)
   - *Khi nào đọc*: Trước khi soạn thảo nội dung, giao tiếp với bên ngoài, hoặc phản biện chuyên môn.
2. **Bàn làm việc & Tín hiệu trong ngày**: [STATE.md](.agents/cognition/STATE.md)
   - *Khi nào đọc & cập nhật*: Đọc đầu tiên mỗi khi `/schedule` đánh thức để nắm tiến độ Goal, các vòng lặp đang mở (Open Loops), hạ tầng dữ liệu; ghi nhận các tín hiệu thực thi trong ngày vào cuối file.
3. **Sổ tay Giấc mơ & Ứng viên (Nhận thức + Quy trình)**: [DREAMS.md](.agents/cognition/DREAMS.md)
   - *Khi nào đọc & cập nhật*: Dùng trong chu trình `cognitive-dreamer` cuối ngày để theo dõi các quy luật (`Candidate Truths`) và quy trình lặp lại (`Candidate Procedures`) trước khi thăng cấp lên `MEMORY.md` hoặc kết tinh thành `.agents/skills/*/SKILL.md`.
4. **Ký ức & Quy tắc dài hạn**: [MEMORY.md](.agents/cognition/MEMORY.md)
   - *Khi nào đọc & cập nhật*: Đọc khi lập kế hoạch; chỉ ghi những quy tắc đã vượt qua Promotion Gate của `cognitive-dreamer` hoặc được nạp qua `bay:learn` / phê duyệt trực tiếp từ Người vận hành.
5. **Ký ức Quy trình Thực thi (Playbook Skills)**: `.agents/skills/<domain>-<op>/SKILL.md`
   - *Khi nào đọc & cập nhật*: `autonomous-worker` đọc khi thực thi và chỉ được phép sửa bước lỗi trên `SKILL.md` đang có theo cơ chế `Probationary Override (1/3 -> 3/3)` kèm dòng `Fallback cũ` tạm thời. Chỉ `cognitive-dreamer` được tạo mới `SKILL.md` và xóa sạch dòng `PROBATION` khi đạt đồng thuận `3/3` để chống tràn lịch sử.
6. **Hộp thư Escalation & Phê duyệt (Non-Blocking)**: [INBOX.md](.agents/cognition/INBOX.md)
   - *Khi nào đọc & cập nhật*: Chỉ ghi vào đây khi Agent bị chặn bởi giới hạn công cụ/quyền hạn (thiếu MCP, thiếu CLI/API key, thiếu quyền truy cập mà không thể tự tạo kỹ năng), câu hỏi chiến lược, hoặc đề xuất sửa `SOUL.md`/`CHARACTER.md` (kèm phát Windows Toast Notification). Kiểm tra mỗi nhịp `/schedule` để xử lý các mục đã duyệt.

## 🛡️ QUY TẮC QUYỀN GHI (WRITE GOVERNANCE)
- Không tự ý dùng công cụ sửa đổi `AGENTS.md`, `SOUL.md` hoặc `CHARACTER.md` trong chu kỳ tự động. Mọi nhu cầu thay đổi 3 file này phải được ghi thành đề xuất trong `INBOX.md` (trừ khi Người vận hành chủ động yêu cầu qua `bay:init`, `bay:onboard` hoặc `bay:learn`).
- Trong ngày, các quan sát và vết quy trình mới (`#procedural-signal`) chỉ được ghi vào `STATE.md`, không ghi trực tiếp vào `MEMORY.md` hoặc tự tạo file `SKILL.md` mới khi chưa qua `cognitive-dreamer`.
