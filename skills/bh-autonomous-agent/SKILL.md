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
   - **Ghim Phiên Điều Phối (`Orchestrator Conversation ID`)**: Ghi ngay `Conversation ID` của phiên hội thoại hiện tại (lấy từ `<user_information>`) vào Mục 4 của `STATE.md` (`- **Orchestrator Conversation ID**: \`<UUID>\``). Sidecar Daemon sẽ chỉ gửi tín hiệu đánh thức vào phiên này.
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
   │       ├── Công cụ sẵn có đáp ứng được tác vụ      ➔ Chuyển sang ACT (tự thực thi & ghi nhận [Procedural Signal])
   │       ├── Bị chặn vì thiếu công cụ / quyền hạn   ➔ Ghi đề xuất vào INBOX.md + Phát Toast Alert (Non-Blocking)
   │       └── Cuối ngày / Ca hợp nhất ký ức           ➔ Gọi Subagent cognitive-dreamer
   ├── 4. ACT      : Giao tác vụ thực thi cho Subagent autonomous-worker (Chỉ đọc hoặc vá thử thách SKILL.md đang có)
   └── 5. SCHEDULE : Cập nhật STATE.md, ghi Daily Signals (kèm #procedural-signal / #skill-patch) và đặt schedule(DurationSeconds) cho mốc kế tiếp
```

---

## 3. Tự Chủ Kỹ Năng & Cơ Chế Escalation Non-Blocking (`INBOX.md`)

1. **Nguyên lý Tự giải quyết trước (Self-Sufficiency First)**:
   - Khi chưa có sẵn hướng dẫn trong `.agents/skills/`, miễn là các công cụ bổ trợ hiện có (MCP tools, CLI có sẵn, database queries, browser, APIs đã cấp quyền...) đáp ứng được mục tiêu, `autonomous-worker` chủ động thực thi và trả kèm **`[Procedural Signal]`** về `STATE.md`.
   - Khi đang dùng một `SKILL.md` có sẵn mà bước thực thi thay đổi, `autonomous-worker` được phép dùng `edit_file` cập nhật bước đó kèm dòng `> 🔄 [PROBATION 1/3 | Fallback cũ: ...]` để các ca tiếp theo kiểm chứng hoặc rollback nếu chỉ là lỗi 1 lần. Khi đạt `3/3` lần thành công liên tiếp, xóa bỏ dòng `PROBATION` để cách mới trở thành quy trình chuẩn tuyệt đối.
2. **Khi nào đưa vào `INBOX.md` (Capability Blocker & Strategic Questions)**:
   - Chỉ sử dụng `INBOX.md` khi Agent cần đạt `Goal` nhưng **không thể tự thực hiện hoặc tự tạo kỹ năng** vì thiếu công cụ bổ trợ/quyền hạn (thiếu MCP server, thiếu CLI/thư viện không tự cài được, thiếu API key/quyền truy cập) hoặc cần quyết định chiến lược vượt ranh giới `SOUL.md`:
     a. Không gọi công cụ `ask_question` để tránh làm gián đoạn tiến trình `/schedule`.
     b. Ghi đề xuất/yêu cầu cấp công cụ vào `.agents/cognition/INBOX.md`.
     c. Phát thông báo Desktop Toast qua PowerShell:
        ```powershell
        powershell -ExecutionPolicy Bypass -File "$HOME/.gemini/config/plugins/bhit-autonomy-plugin/skills/bh-autonomous-agent/scripts/notify-inbox.ps1" -Title "[Tên Agent] INBOX" -Message "[Tóm tắt đề xuất] - Xem tại INBOX.md"
        ```

---

## 4. Chu Trình Hợp Nhất Ký Ức 3 Pha (`cognitive-dreamer`)

Vào cuối mỗi chu kỳ ngày, gọi Subagent `cognitive-dreamer` để hợp nhất cả **Declarative Memory (`MEMORY.md`)** và **Procedural Memory (`.agents/skills/`)**:
1. **Light Sleep**: Đọc `Daily Signals` trong `STATE.md`, lọc nhiễu và gom nhóm tín hiệu nhận thức cùng tín hiệu quy trình (`#procedural-signal`, `#skill-patch`).
2. **REM Sleep**: Đối chiếu tín hiệu trong ngày với `Candidate Truths` và `Candidate Procedures` trong `DREAMS.md`, cập nhật tần suất lặp lại (`hits`) và độ tin cậy (`confidence`).
3. **Deep Sleep**:
   - **Declarative Promotion**: Thăng cấp các quy luật đạt ngưỡng (`hits >= 3`, `confidence >= 0.85` hoặc đã được phê duyệt) vào `MEMORY.md` và lược bỏ quy tắc lỗi thời.
   - **Procedural Skill Synthesis (Độc quyền Tạo mới)**: Kết tinh các quy trình thao tác lặp lại đã kiểm chứng thành `.agents/skills/<domain>-<op>/SKILL.md` theo mẫu `templates/PROCEDURAL_SKILL.template.md`.
   - **Probation Garbage Collection (Chống tràn lịch sử)**: Rà soát các `SKILL.md` có dòng `> 🔄 [PROBATION...]`. Nếu các ca chạy sau đều thành công (hoặc đạt `3/3`), xóa bỏ hoàn toàn dòng `PROBATION / Fallback cũ` để cách giải quyết mới trở thành chân lý hiện tại duy nhất.
   - Ghi nhật ký vào `DREAMS.md` và làm sạch `Daily Signals` trong `STATE.md`.

---

## 5. Cập Nhật Plugin & Đồng Bộ Cấu Trúc (Non-Destructive Migration)

1. **Cập nhật Plugin**:
   - Chạy `git -C "$HOME/.gemini/config/plugins/bhit-autonomy-plugin" pull`.
2. **Đồng bộ cấu trúc nhận thức cho dự án hiện hữu**:
   - Không ghi đè các tệp từ `templates/` lên các tệp đang hoạt động trong `.agents/cognition/`.
   - So sánh cấu trúc tệp hiện tại với `templates/` và dùng `edit_file` bổ sung các mục/trường mới còn thiếu, bảo toàn toàn bộ dữ liệu hiện có của dự án.
