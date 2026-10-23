---
name: bh-autonomous-agent
description: Khởi tạo, vận hành và quản lý AI Agent Tự chủ 24/7 trực tiếp trên Antigravity theo mô hình Hybrid /schedule, tham chiếu Markdown phân tầng (.agents/cognition/), chu trình Dreamer 3 pha OpenClaw v2 và mở rộng kỹ năng Proposal-First 100% Non-Blocking.
---

# BHIT Autonomous Agent Kernel

Skill này đóng vai trò là "Bộ điều phối Tự chủ" cho Agent hoạt động trong bất kỳ Workspace dự án nào trên Google Antigravity.

---

## 1. QUY TRÌNH KHỞI TẠO DỰ ÁN MỚI (DAY 0 BOOTSTRAP)

Khi Người vận hành mở một Workspace mới và yêu cầu: *"Khởi tạo hệ thống tự chủ cho Agent"* hoặc *"Bắt đầu chạy tự chủ"*:

1. **Kiểm tra và Khởi tạo Thư mục Nhận thức**:
   - Tạo thư mục `.agents/cognition/` (nếu chưa có).
   - Sao chép các file mẫu từ thư mục `templates/` của skill này vào dự án:
     - `AGENTS.router.md` ➔ Tạo thành file `AGENTS.md` tại gốc dự án.
     - `SOUL.template.md` ➔ `.agents/cognition/SOUL.md` (Điền Persona, Goal và Điều cấm theo yêu cầu của dự án).
     - `CHARACTER.template.md` ➔ `.agents/cognition/CHARACTER.md`
     - `STATE.template.md` ➔ `.agents/cognition/STATE.md`
     - `DREAMS.template.md` ➔ `.agents/cognition/DREAMS.md`
     - `MEMORY.template.md` ➔ `.agents/cognition/MEMORY.md`
     - `INBOX.template.md` ➔ `.agents/cognition/INBOX.md`

2. **Tự Kiến Tạo Bộ Nhớ & Dữ Liệu Nghiệp Vụ Theo Goal (Self-Architecting Storage)**:
   - Đọc các `Goals` trong `SOUL.md`.
   - Quyết định xem dự án có cần cơ sở dữ liệu lớn không:
     - Nếu cần quản lý nhiều đối tượng (VD: khách hàng, bài đăng, kịch bản, video): Tự tạo file SQLite `data.db` và viết một script helper nhỏ (VD: `scripts/manage_data.py`).
     - Ghi thông tin cấu trúc dữ liệu vào mục `## 3. Hạ tầng Dữ liệu Dự án` trong `STATE.md`.

3. **Cài Đặt Nhịp Đập Tự Chủ Ban Đầu (`/schedule`) & Ràng Buộc Lịch Trình 1:1**:
   - **Bước 3a (Cron nền an toàn)**: Sử dụng công cụ `schedule` để thiết lập Cron nền:
     - `CronExpression`: `"0 */2 * * *"` (mỗi 2 tiếng)
     - `IsDaemon`: `true`
     - `Prompt`: `"Kiểm tra bàn làm việc STATE.md và thực thi chu kỳ tự chủ kế tiếp."`
   - **Bước 3b (One-shot Timer cho Task đầu tiên trong `STATE.md`)**:
     - ⚠️ **BẮT BUỘC**: Nếu trong `STATE.md` vừa lập danh sách các công việc theo khung giờ cụ thể (VD: `16:00`, `17:00`, `19:30`), việc ghi chữ vào `STATE.md` **không** tự tạo bộ hẹn giờ!
     - Bạn **PHẢI** tính số giây từ thời điểm hiện tại đến mốc giờ của công việc đầu tiên và gọi thêm 1 lệnh `schedule(DurationSeconds: <số_giây>, Prompt: "Thực thi công việc [Tên Task] theo STATE.md")` ngay lập tức (hoặc thực thi luôn nếu đã tới giờ).
     - Ghi rõ cả 2 `TaskId` (Cron nền + One-shot Timer) vào bảng Lịch trình trong `STATE.md`.
   - 🚫 **Tuyệt đối không hỏi ngược thụ động**: Không bao giờ kết thúc Bootstrap bằng câu hỏi *"Bạn muốn bắt đầu việc nào trước?"*. Hãy chủ động kích hoạt/hẹn giờ tự động 100%.

---

## 2. QUY TRÌNH VẬN HÀNH CHU KỲ TỰ CHỦ (OODA LOOP TRÊN MỖI NHỊP WAKEUP)

Mỗi khi được `/schedule` đánh thức hoặc sau một sự kiện:

```text
[WAKEUP]
   │
   ├── 1. OBSERVE: Đọc STATE.md và INBOX.md (Nắm tiến độ & phản hồi mới)
   │
   ├── 2. ORIENT: Đối chiếu khoảng cách đến Goal trong SOUL.md
   │
   ├── 3. DECIDE:
   │       ├── Đủ kỹ năng & Có việc cần làm ➔ Chuyển sang ACT
   │       ├── Thiếu kỹ năng ➔ Ghi Proposal vào INBOX.md + Bắn Toast Alert
   │       └── Cuối ngày / Ca đêm ➔ Kích hoạt Chu trình Dreamer 3 pha
   │
   ├── 4. ACT:
   │       └── Giao việc nặng cho Subagent (invoke_subagent) để giữ Context nhẹ
   │
   └── 5. REFLECT & SCHEDULE:
           └── Cập nhật STATE.md, ghi Daily Signals và đặt Timer hẹn giờ tiếp theo.
```

---

## 3. PHÁT THÔNG BÁO WINDOWS TOAST (100% NON-BLOCKING)

Khi ghi đề xuất mới vào `INBOX.md` (hoặc có câu hỏi quan trọng cần xin ý kiến):
- **TUYỆT ĐỐI KHÔNG DÙNG `ask_question`** (để tránh dừng luồng `/schedule`).
- Chạy lệnh PowerShell để đẩy thông báo Desktop Toast kèm âm báo:
  ```powershell
  powershell -ExecutionPolicy Bypass -File "$HOME/.gemini/config/plugins/bhit-autonomy-plugin/skills/bh-autonomous-agent/scripts/notify-inbox.ps1" -Title "[Tên Agent] INBOX MỚI" -Message "[Tóm tắt đề xuất / câu hỏi] - Xem tại INBOX.md"
  ```
- In thông báo ra khung chat rồi kết thúc lượt ngay.

---

## 4. CHU TRÌNH DREAMER 3 PHA (OPENCLAW v2 RÚT GỌN)

Vào cuối mỗi ngày (hoặc ca đêm theo `/schedule`):
1. **Gọi Subagent `cognitive-dreamer`**:
   - Dùng `invoke_subagent` khởi chạy Subagent loại `cognitive-dreamer`.
2. **Quy trình 3 pha**:
   - **Pha 1 (Light Sleep)**: Quét mục `Daily Signals` trong `STATE.md`, lọc trùng, gom tín hiệu có giá trị.
   - **Pha 2 (REM Sleep)**: Đối chiếu với `DREAMS.md` để phát hiện quy luật lặp lại, cập nhật Candidate Truths.
   - **Pha 3 (Deep Sleep)**: Thăng cấp chân lý đủ điều kiện (`hits >= 3` hoặc đã `Adopt`) sang `MEMORY.md`, cắt tỉa quy tắc cũ trong `MEMORY.md`, ghi Dream Diary vào `DREAMS.md` và làm sạch nhật ký ngày trong `STATE.md`.

---

## 5. CẬP NHẬT PLUGIN & ĐỒNG BỘ DỰ ÁN CŨ (NON-DESTRUCTIVE MIGRATION)

### 5.1. Khi Người vận hành yêu cầu cập nhật Plugin từ GitHub:
- Chạy lệnh `git -C "$HOME/.gemini/config/plugins/bhit-autonomy-plugin" pull` để kéo bản cập nhật mới nhất về máy.
- Chạy `agy plugin validate "$HOME/.gemini/config/plugins/bhit-autonomy-plugin" --strict` để xác nhận tính toàn vẹn.

### 5.2. Khi nâng cấp một Dự án đã khởi tạo từ phiên bản cũ (Smart Schema Merge):
- **Tự động có hiệu lực ngay (Zero-Touch)**: Các thay đổi về Luật vận hành (`rules/AGENTS.md`), quyền công cụ của Subagent (`agents/*.md`), và quy trình trong `SKILL.md` nằm ở tầng Plugin toàn cục nên **tự động áp dụng ngay lập tức** ở nhịp `/schedule` kế tiếp của mọi dự án cũ mà không cần sửa file dự án.
- **Đồng bộ cấu trúc Template (`STATE.md`, `DREAMS.md`, `AGENTS.md`) không mất dữ liệu**:
  - ⚠️ **TUYỆT ĐỐI CẤM** copy đè file từ `templates/` lên các file đang chạy trong `.agents/cognition/` của dự án (vì sẽ làm mất Goal, Ký ức và Tiến độ đang chạy!).
  - Chỉ dùng `read_file` đối chiếu file hiện tại của dự án với file trong `templates/`, sau đó dùng `edit_file` **chèn bổ sung các mục/cột còn thiếu** (ví dụ: bổ sung cột `TaskId` vào bảng `## 4. NHỊP ĐẬP /schedule HIỆN HÀNH` trong `STATE.md`) và giữ nguyên 100% dữ liệu nghiệp vụ hiện có.
