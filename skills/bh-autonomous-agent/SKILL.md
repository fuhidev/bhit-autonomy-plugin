---
name: bh-autonomous-agent
description: Khởi tạo, vận hành và điều phối AI Agent Tự chủ 24/7 trên Antigravity thông qua lịch trình /schedule, kiến trúc nhận thức phân tầng (.agents/cognition/), chu trình hợp nhất bộ nhớ 3 pha và cơ chế đề xuất kỹ năng Non-Blocking.
---

# BHIT Autonomous Agent Kernel

Quy trình khởi tạo, vận hành chu kỳ tự chủ và bảo trì kiến trúc nhận thức cho Autonomous Agent.

---

## 1. Khởi Tạo Dự Án Tự Chủ (Day 0 Bootstrap)

Khi nhận yêu cầu khởi tạo hệ thống tự chủ trong Workspace:

1. **Khởi tạo Cấu trúc Nhận thức**:
   - Tạo thư mục `.agents/cognition/`.
   - Sao chép và điền thông tin ban đầu từ thư mục `templates/` của skill này vào dự án:
     - `AGENTS.router.md` $\rightarrow$ `AGENTS.md` (tại gốc dự án)
     - `SOUL.template.md` $\rightarrow$ `.agents/cognition/SOUL.md`
     - `CHARACTER.template.md` $\rightarrow$ `.agents/cognition/CHARACTER.md`
     - `STATE.template.md` $\rightarrow$ `.agents/cognition/STATE.md`
     - `DREAMS.template.md` $\rightarrow$ `.agents/cognition/DREAMS.md`
     - `MEMORY.template.md` $\rightarrow$ `.agents/cognition/MEMORY.md`
     - `INBOX.template.md` $\rightarrow$ `.agents/cognition/INBOX.md`

2. **Khởi tạo Hạ tầng Lưu trữ (Self-Architecting Storage)**:
   - Dựa trên `Goals` trong `SOUL.md`, thiết lập cơ sở dữ liệu dự án (ví dụ: SQLite `data.db` và script quản lý `scripts/manage_data.py`) nếu cần theo dõi các thực thể có cấu trúc.
   - Ghi nhận thông tin hạ tầng vào mục `## 3. Hạ tầng Dữ liệu Dự án` trong `STATE.md`.

3. **Thiết lập Lịch trình Tự chủ (`/schedule`) & Bảng Điều Khiển Sidecar**:
   - **Cron định kỳ (Heartbeat)**: Gọi công cụ `schedule` với `CronExpression` (ví dụ: `"0 */2 * * *"`), `IsDaemon: true`.
   - **One-shot Timer cho tác vụ kế tiếp**: Tính số giây từ thời điểm hiện tại đến mốc thực thi của tác vụ đầu tiên trong `STATE.md` và gọi `schedule(DurationSeconds: <số_giây>)` (hoặc thực thi ngay nếu đã đến hạn).
   - Ghi nhận đầy đủ các mã `TaskId` vào bảng lịch trình trong `STATE.md`.
   - Cung cấp nút mở bảng điều khiển Aux Pane `[⚡ Mở BHIT Autonomy Engine](sidecar://bhit-autonomy-plugin/autonomy-engine/)` để Người vận hành theo dõi tiến độ, lịch trình bất tử (Auto-Resurrect) và duyệt `INBOX.md` trực tiếp.
   - Kết thúc bước khởi tạo và tự động chuyển sang trạng thái vận hành mà không dừng lại chờ câu trả lời xác nhận thủ công.

---

## 2. Chu Kỳ Vận Hành Tự Chủ (OODA Loop & Schedule Reconciliation)

Tại mỗi nhịp thức dậy từ `/schedule` hoặc từ Sidecar Daemon `bhit-autonomy-plugin/autonomy-engine`:

```text
[WAKEUP / RESURRECT]
   │
   ├── 0. RECONCILE: Gọi manage_task(Action: "list") đối chiếu với TaskId trong STATE.md.
   │                 Nếu Antigravity vừa bật lại làm mất TaskId cũ -> Khôi phục lại Cron/Timer!
   ├── 1. OBSERVE  : Đọc STATE.md và INBOX.md
   ├── 2. ORIENT   : Đối chiếu tiến độ hiện tại với Goals trong SOUL.md
   ├── 3. DECIDE   :
   │       ├── Đủ kỹ năng & Có tác vụ đến hạn/quá hạn ➔ Chuyển sang ACT
   │       ├── Thiếu kỹ năng cần thiết                ➔ Ghi đề xuất vào INBOX.md + Phát Toast Alert
   │       └── Cuối ngày / Ca hợp nhất ký ức           ➔ Gọi Subagent cognitive-dreamer
   ├── 4. ACT      : Giao tác vụ thực thi cho Subagent autonomous-worker
   └── 5. SCHEDULE : Cập nhật STATE.md, ghi Daily Signals và đặt schedule(DurationSeconds) cho mốc kế tiếp
```

---

## 3. Cơ Chế Thông Báo Non-Blocking (`INBOX.md`)

Khi phát sinh đề xuất kỹ năng mới hoặc câu hỏi chiến lược trong lúc chạy tự động:
1. Không gọi công cụ `ask_question` để tránh làm gián đoạn tiến trình `/schedule`.
2. Ghi đề xuất vào `.agents/cognition/INBOX.md`.
3. Phát thông báo Desktop Toast qua PowerShell:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "$HOME/.gemini/config/plugins/bhit-autonomy-plugin/skills/bh-autonomous-agent/scripts/notify-inbox.ps1" -Title "[Tên Agent] INBOX" -Message "[Tóm tắt đề xuất] - Xem tại INBOX.md"
   ```

---

## 4. Chu Trình Hợp Nhất Ký Ức 3 Pha (`cognitive-dreamer`)

Vào cuối mỗi chu kỳ ngày, gọi Subagent `cognitive-dreamer` để thực hiện:
1. **Light Sleep**: Đọc `Daily Signals` trong `STATE.md`, lọc nhiễu và gom nhóm tín hiệu thực tế.
2. **REM Sleep**: Đối chiếu tín hiệu trong ngày với các giả thuyết (`Candidate Truths`) trong `DREAMS.md`, cập nhật tần suất lặp lại (`hits`) và độ tin cậy (`confidence`).
3. **Deep Sleep**: Thăng cấp các quy luật đạt ngưỡng (`hits >= 3`, `confidence >= 0.85` hoặc đã được phê duyệt) vào `MEMORY.md`, lược bỏ quy tắc lỗi thời, ghi nhật ký vào `DREAMS.md` và làm sạch `Daily Signals` trong `STATE.md`.

---

## 5. Cập Nhật Plugin & Đồng Bộ Cấu Trúc (Non-Destructive Migration)

1. **Cập nhật Plugin**:
   - Chạy `git -C "$HOME/.gemini/config/plugins/bhit-autonomy-plugin" pull`.
2. **Đồng bộ cấu trúc nhận thức cho dự án hiện hữu**:
   - Không ghi đè các tệp từ `templates/` lên các tệp đang hoạt động trong `.agents/cognition/`.
   - So sánh cấu trúc tệp hiện tại với `templates/` và dùng `edit_file` bổ sung các mục/trường mới còn thiếu, bảo toàn toàn bộ dữ liệu hiện có của dự án.
