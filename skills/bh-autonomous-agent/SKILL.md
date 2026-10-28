---
name: bh-autonomous-agent
description: Khởi tạo, phỏng vấn định hình hồ sơ (bay:init / bay:onboard -> SOUL.md & CHARACTER.md), vận hành và điều phối AI Agent Tự chủ 24/7 trên Antigravity thông qua lịch trình /schedule, kiến trúc nhận thức phân tầng (.agents/cognition/), chu trình hợp nhất bộ nhớ 3 pha và cơ chế đề xuất kỹ năng Non-Blocking.
---

# BHIT Autonomous Agent Kernel

Quy trình phỏng vấn định hình hồ sơ (OpenClaw-style Onboarding), khởi tạo kiến trúc nhận thức, vận hành chu kỳ tự chủ 24/7 và hợp nhất bộ nhớ cho Autonomous Agent.

---

## 1. Khởi Tạo Dự Án Tự Chủ & Phỏng Vấn Hồ Sơ (`bay:init` / `bay:onboard` / Day 0 Bootstrap)

Khi nhận yêu cầu khởi tạo hệ thống tự chủ trong Workspace, khi `.agents/cognition/SOUL.md` hoặc `CHARACTER.md` chưa tồn tại / còn chứa biến giữ chỗ (`[TÊN_AGENT]`), hoặc khi Người vận hành gọi lệnh `bay:init` / `bay:onboard`:

### Bước 0: Quét Ngữ Cảnh Trước Phỏng Vấn (Context Pre-Scanning)
Trước khi đặt câu hỏi đầu tiên, thực hiện quét nhanh (không hỏi người dùng):
1. **Ngữ cảnh Workspace & Yêu cầu ban đầu**: Đọc câu lệnh (Prompt) của người dùng, kiểm tra nhanh các tệp sẵn có trong dự án (`README.md`, `docs/`, dữ liệu hiện hữu) và thông tin doanh nghiệp trong Global Rules (hoặc đọc `SOUL.md` / `CHARACTER.md` hiện tại nếu chạy lại `bay:init` trên dự án đã có Profile).
2. **Kiểm kê Vũ khí / Công cụ hiện có (Capability Inventory)**: Đối chiếu danh sách **MCP Servers** đang kết nối (ví dụ: `camoufox`, `browser-use`, `gmail-mcp`, `gws-calendar`, `gws-drive`, `StitchMCP`, `github`, `gitlab`...) và danh sách **Skills** có sẵn trên hệ thống để chuẩn bị gợi ý sát thực tế.

### Pha 0: Phỏng Vấn Tương Tác 4 Bước Cố Định (Strict 4-Step Interactive Onboarding)
> ⚠️ **QUY TẮC BẮT BUỘC**:
> - **Luôn đi đủ cả 4 bước phỏng vấn theo thứ tự cố định** dưới đây bằng công cụ `ask_question` (mỗi bước là 1 lần gọi `ask_question` riêng biệt) bất kể Prompt ban đầu đã mô tả chi tiết đến đâu, nhằm đảm bảo rà soát kỹ từng tầng nhận thức của Agent.
> - Ở mỗi bước, dùng kết quả từ **Bước 0 (Quét ngữ cảnh & Prompt ban đầu)** để biên soạn sẵn phương án tối ưu nhất đặt ở vị trí đầu tiên với tiền tố **`(Recommended)`**, giúp Người vận hành chỉ cần bấm chọn nhanh hoặc tinh chỉnh thêm.
> - Định hướng các hồ sơ Agent tự chủ vào **các lĩnh vực nghiệp vụ phi lập trình (Non-Coding Domains)** — vì bản thân Antigravity đã là Trợ lý Lập trình mặc định.

#### 🔹 Bước 1/4: Định danh, Sứ mệnh & Hình mẫu Nhân cách (`Archetype & Identity` $\rightarrow$ `SOUL.md` Mục 1 & 2)
Gọi `ask_question` để chốt Tên Agent, Vai trò, Đối tượng phục vụ và Giá trị cốt lõi.
- **Cách tạo lựa chọn (`options`)**:
  1. **`(Recommended)`**: Phương án được **cá nhân hóa sát nhất với lĩnh vực/bài toán thực tế** vừa suy luận từ Prompt và Workspace của người dùng.
  2. Kết hợp cùng **4 nhóm Archetype phi lập trình chuẩn** làm mẫu tham chiếu (tự động điều chỉnh nội dung cho khớp ngữ cảnh):
     - **Marketing, Sáng tạo Nội dung & Truyền thông Đa kênh**: Quản trị fanpage/social, viết bài chuẩn SEO/Facebook, sản xuất kịch bản & video/slideshow, lan tỏa thương hiệu.
     - **Phát triển Kinh doanh, Sales B2B & Chăm sóc Khách hàng**: Săn tìm khách hàng tiềm năng (Lead Gen), tư vấn giải pháp, lập báo giá/proposal thương mại, bám đuổi (follow-up) và chăm sóc khách hàng.
     - **Nghiên cứu Thị trường, Săn Tin tức & Phân tích Đối thủ**: Theo dõi xu hướng ngành, thu thập tin tức/báo cáo tự động, phân tích đối thủ cạnh tranh và tổng hợp bản tin chiến lược (Market Intelligence).
     - **Trợ lý Điều hành, Quản trị Hành chính - Hợp đồng - Công nợ**: Theo dõi tiến độ dự án, soạn thảo hợp đồng/phụ lục/nghiệm thu/đề nghị thanh toán, quản lý lịch biểu và nhắc việc công nợ.

#### 🔹 Bước 2/4: Mục tiêu Chiến lược (`Goals / KPIs`) & Nhịp Thức Dậy (`/schedule` Rhythm $\rightarrow$ `SOUL.md` Mục 3 & `STATE.md` Mục 4)
Gọi `ask_question` dựa trên câu trả lời ở Bước 1 để chốt:
- **Mục tiêu đo lường được (`Autonomous Goals`)** và **Chỉ số KPI cụ thể** (theo ngày/tuần/tháng).
- **Nhịp độ thức dậy tự động (`CronExpression` & Mốc chạy đầu tiên)**: Ví dụ mỗi 2 giờ (`0 */2 * * *`), mỗi buổi sáng/chiều (`0 8,14 * * *`), hoặc theo khung giờ nghiệp vụ cụ thể.
- Lựa chọn đầu tiên **`(Recommended)`** phải đề xuất sẵn bộ KPI định lượng + chu kỳ Cron hợp lý nhất với Sứ mệnh vừa chọn ở Bước 1.

#### 🔹 Bước 3/4: Tính cách, Tông giọng, Xưng hô & Phản biện (`Persona & Tone` $\rightarrow$ `CHARACTER.md` Mục 1, 2, 3)
Gọi `ask_question` để định hình phong cách giao tiếp:
- **Tông giọng đối ngoại & tạo nội dung**: Chuyên nghiệp - chuẩn mực B2B, Sáng tạo - giàu cảm xúc - bắt trend, hay Súc tích - sắc bén - giàu số liệu dẫn chứng.
- **Quy ước xưng hô với Người vận hành**: Ví dụ `Em - Anh/Chị`, `Tôi - Giám đốc`, `Trợ lý - Anh/Chị`.
- **Mức độ phản biện chuyên gia (`ADOPT` / `ADAPT` / `REJECT`)**: Từ linh hoạt hỗ trợ đến thẳng thắn phản biện bảo vệ KPI dài hạn.
- Đặt tổ hợp phù hợp nhất với Archetype đã chọn lên làm phương án **`(Recommended)`**.

#### 🔹 Bước 4/4: Khả năng Công cụ (`Authorized Capabilities & Toolset`) & Ranh giới Cấm kỵ (`Boundaries` $\rightarrow$ `SOUL.md` Mục 4 & 5)
Gọi `ask_question` để chốt quyền hạn tác nghiệp và giới hạn an toàn:
- **Khả năng & Bộ công cụ được cấp quyền**: Tự động liệt kê các **MCP Servers** (như `camoufox`, `browser-use`, `gmail-mcp`, `gws-calendar`, `gws-drive`...) và **Skills** hiện có trên máy phù hợp với mục tiêu ở Bước 2 vào phương án **`(Recommended)`** để người dùng bật/tắt hoặc yêu cầu thêm khả năng mới.
- **Cấp độ tự chủ (`Autonomy Tier`) & Ranh giới cấm kỵ (`Forbidden Behaviors`)**: Xác định rõ việc gì Agent được tự quyết 100%, việc gì (như gửi email cho khách thật, đăng bài công khai, chốt cam kết tài chính) cần đẩy qua `INBOX.md` chờ duyệt.

---

### Bước Thực Thi Ngay Sau Bước 4 (Zero-Friction Post-Interview Execution)
> 🚀 **KHÔNG HỎI XÁC NHẬN LẦN THỨ 5**: Ngay khi người dùng trả lời xong Bước 4, lập tức thực thi chuỗi hành động sau trong cùng một lượt phản hồi:

1. **Khởi tạo / Cập nhật Cấu trúc Nhận thức (`.agents/cognition/`)**:
   - Tạo thư mục `.agents/cognition/` (nếu chưa có).
   - Điền đầy đủ thông tin đã chốt qua 4 bước phỏng vấn vào các tệp theo mẫu tại `templates/`:
     - `AGENTS.router.md` $\rightarrow$ `AGENTS.md` (tại gốc dự án)
     - `SOUL.template.md` $\rightarrow$ `.agents/cognition/SOUL.md` (Bao gồm đầy đủ 5 mục: Định danh, Sứ mệnh, Mục tiêu & Nhịp vận hành, Khả năng & Công cụ được cấp quyền, Ranh giới cấm)
     - `CHARACTER.template.md` $\rightarrow$ `.agents/cognition/CHARACTER.md` (Bao gồm Hình mẫu Archetype, Tông giọng, Xưng hô & Nguyên tắc phản biện)
     - `STATE.template.md` $\rightarrow$ `.agents/cognition/STATE.md`
     - `DREAMS.template.md` $\rightarrow$ `.agents/cognition/DREAMS.md`
     - `MEMORY.template.md` $\rightarrow$ `.agents/cognition/MEMORY.md`
     - `INBOX.template.md` $\rightarrow$ `.agents/cognition/INBOX.md`

2. **Đồng bộ Khả năng & Xử lý Công cụ Thiếu hụt (Capability Provisioning)**:
   - Nếu ở Bước 4 người dùng yêu cầu kỹ năng có thể tải về từ kho Agentic Awesome Skills: Chủ động kích hoạt `aas-skill-fetcher` để cài đặt vào `.agents/skills/`.
   - Nếu có khả năng/công cụ cần thiết cho Goal nhưng đang thiếu MCP server, API key hoặc quyền truy cập: Ghi ngay mục đề xuất `#INBOX-YYYYMMDD-01` vào `.agents/cognition/INBOX.md` và phát thông báo Windows Toast (`notify-inbox.ps1`).

3. **Khởi tạo Hạ tầng Lưu trữ (Self-Architecting Storage)**:
   - Dựa trên `Goals` trong `SOUL.md`, thiết lập cơ sở dữ liệu dự án (ví dụ: SQLite `data.db` và script quản lý `scripts/manage_data.py`) để theo dõi các thực thể nghiệp vụ (bài viết, khách hàng, tin tức, hợp đồng...).
   - Ghi nhận thông tin hạ tầng vào mục `## 3. Hạ tầng Dữ liệu Dự án` trong `STATE.md`.

4. **Thiết lập Lịch trình Tự chủ (`/schedule`) & Bảng Điều Khiển Sidecar**:
   - **Ghim Phiên Điều Phối (`Orchestrator Conversation ID`)**: Ghi ngay `Conversation ID` của phiên hội thoại hiện tại (lấy từ `<user_information>`) vào Mục 4 của `STATE.md` (`- **Orchestrator Conversation ID**: \`<UUID>\``). Sidecar Daemon sẽ chỉ gửi tín hiệu đánh thức vào phiên này.
   - **Cron định kỳ (Heartbeat)**: Gọi công cụ `schedule` với `CronExpression` đã chốt ở Bước 2 (ví dụ: `"0 */2 * * *"`), `IsDaemon: true`.
   - **One-shot Timer cho tác vụ kế tiếp**: Tính số giây từ thời điểm hiện tại đến mốc thực thi của tác vụ đầu tiên trong `STATE.md` và gọi `schedule(DurationSeconds: <số_giây>)` (hoặc thực thi ngay nếu đã đến hạn).
   - Ghi nhận đầy đủ các mã `TaskId` vào bảng lịch trình trong `STATE.md`.
   - Xuất **Bảng Tóm Tắt Hồ Sơ Agent (Agent Profile Card)** kèm liên kết tới [`SOUL.md`](file:///.agents/cognition/SOUL.md), [`CHARACTER.md`](file:///.agents/cognition/CHARACTER.md), [`STATE.md`](file:///.agents/cognition/STATE.md) và nút mở bảng điều khiển `[⚡ Mở BHIT Autonomy Engine](sidecar://bhit-autonomy-plugin/autonomy-engine/)`.
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
   │       ├── Cần duyệt bất cứ vấn đề gì (kế hoạch/hành động/công cụ/chiến lược) ➔ Tạo nháp tại .agents/cognition/drafts/ (nếu cần), ghi vào INBOX.md + Phát Toast Alert (Non-Blocking)
   │       └── Cuối ngày / Ca hợp nhất ký ức           ➔ Gọi Subagent cognitive-dreamer
   ├── 4. ACT      : Giao tác vụ thực thi cho Subagent autonomous-worker (Chỉ đọc hoặc vá thử thách SKILL.md đang có)
   └── 5. SCHEDULE : Cập nhật STATE.md, ghi Daily Signals (kèm #procedural-signal / #skill-patch) và đặt schedule(DurationSeconds) cho mốc kế tiếp
```

---

## 3. Tự Chủ Kỹ Năng & Cơ Chế Escalation Non-Blocking (`INBOX.md`)

1. **Nguyên lý Tự giải quyết trước (Self-Sufficiency First)**:
   - Khi chưa có sẵn hướng dẫn trong `.agents/skills/`, miễn là các công cụ bổ trợ hiện có (MCP tools, CLI có sẵn, database queries, browser, APIs đã cấp quyền...) đáp ứng được mục tiêu, `autonomous-worker` chủ động thực thi và trả kèm **`[Procedural Signal]`** về `STATE.md`.
   - Khi đang dùng một `SKILL.md` có sẵn mà bước thực thi thay đổi, `autonomous-worker` được phép dùng `edit_file` cập nhật bước đó kèm dòng `> 🔄 [PROBATION 1/3 | Fallback cũ: ...]` để các ca tiếp theo kiểm chứng hoặc rollback nếu chỉ là lỗi 1 lần. Khi đạt `3/3` lần thành công liên tiếp, xóa bỏ dòng `PROBATION` để cách mới trở thành quy trình chuẩn tuyệt đối.
2. **Chỉ thị Bắt Buộc Đưa Mọi Vấn Đề Chờ Duyệt Vào `INBOX.md` (Mandatory Escalation & Draft Lifecycle)**:
   - Trong luồng chạy nền tự chủ (Background OODA loop / `/schedule`), khi Agent cần Người vận hành **phê duyệt bất cứ vấn đề gì** (phê duyệt kế hoạch thực thi nhạy cảm, phê duyệt nội dung/xuất bản, hành động rủi ro cao, yêu cầu cấp thêm công cụ/quyền hạn khi chạm giới hạn năng lực, hoặc quyết định chiến lược vượt ranh giới `SOUL.md`):
     a. **Tuyệt đối không dùng `ask_question`** hay dừng thụ động chờ phản hồi trong chat.
     b. **Khởi tạo file nháp chi tiết**: Khi nội dung cần phê duyệt có độ dài, chứa kế hoạch chi tiết, bản thảo tài liệu, mã nguồn hoặc dữ liệu kỹ thuật, Agent **bắt buộc phải tự tạo file markdown nháp chi tiết** lưu trực tiếp vào thư mục `.agents/cognition/drafts/` (ví dụ: `.agents/cognition/drafts/INBOX-YYYYMMDD-XX-ten-van-de.md`).
     c. **Ghi mục chờ duyệt vào `.agents/cognition/INBOX.md`**: Ghi rõ mã `#INBOX-YYYYMMDD-XX`, tiêu đề ngắn gọn, lý do, mục tiêu liên quan, và đính kèm liên kết markdown chuẩn Antigravity trỏ đến file nháp: `- **Tài liệu chi tiết**: [Xem chi tiết bản thảo](file:///<đường_dẫn_tuyệt_đối_đến_file_nháp>)`.
     d. **Phát Windows Toast Notification**:
        ```powershell
        powershell -ExecutionPolicy Bypass -File "$HOME/.gemini/config/plugins/bhit-autonomy-plugin/skills/bh-autonomous-agent/scripts/notify-inbox.ps1" -Title "[Tên Agent] INBOX" -Message "Yêu cầu phê duyệt mới: [Tiêu đề] - Xem tại INBOX.md"
        ```
     e. **Vòng đời và dọn dẹp file nháp (Draft Lifecycle)**:
        - Khi Người vận hành **Duyệt (`APPROVED`)**: Agent thức dậy đọc nội dung từ file nháp trong `.agents/cognition/drafts/` để thực thi tác vụ. Sau khi hoàn thành thực thi, Agent **bắt buộc phải xóa hoàn toàn file nháp** để giữ sạch thư mục dự án.
        - Khi Người vận hành **Từ chối (`REJECTED`)**: Agent thức dậy **xóa hoàn toàn file nháp ngay lập tức**, hủy bỏ tác vụ và tiếp tục nhịp vận hành bình thường.

---

## 4. Chu Trình Hợp Nhất Ký Ức 3 Pha (`cognitive-dreamer`)

Vào cuối mỗi chu kỳ ngày, gọi Subagent `cognitive-dreamer` để hợp nhất cả **Declarative Memory (`MEMORY.md`)** và **Procedural Memory (`.agents/skills/`)**:
1. **Light Sleep**: Đọc `Daily Signals` trong `STATE.md`, lọc nhiễu và gom nhóm tín hiệu nhận thức cùng tín hiệu quy trình (`#procedural-signal`, `#skill-patch`).
2. **REM Sleep**: Đối chiếu tín hiệu trong ngày với `Candidate Truths` và `Candidate Procedures` trong `DREAMS.md`, cập nhật tần suất lặp lại (`hits`) và độ tin cậy (`confidence`).
3. **Deep Sleep**:
   - **Declarative Promotion**: Thăng cấp các quy luật đạt ngưỡng (`hits >= 3`, `confidence >= 0.85` hoặc đã được phê duyệt) vào `MEMORY.md` và lược bỏ quy tắc lỗi thời.
   - **Procedural Skill Synthesis (Độc quyền Tạo mới)**: Kết tinh các quy trình thao tác lặp lại đã kiểm chứng thành `.agents/skills/<domain>-<op>/SKILL.md` theo mẫu `templates/PROCEDURAL_SKILL.template.md`.
   - **Probation Garbage Collection (Chống tràn lịch sử)**: Rà soát các `SKILL.md` có dòng `> 🔄 [PROBATION...]`. Nếu các ca chạy sau đều thành công (hoặc đạt `3/3`), xóa bỏ hoàn toàn dòng `PROBATION / Fallback cũ` để cách giải quyết mới trở thành chân lý hiện tại duy nhất.
   - **Skill Roster Review**: Rà skill đang có (workspace + global), cấp vào `MEMORY.md` → `## Skill Roster` các skill phục vụ được Goal; thu hồi skill không còn cần hoặc ít dùng theo `Daily Signals`. Roster chỉ để tham khảo, không ràng buộc.
   - Ghi nhật ký vào `DREAMS.md` và làm sạch `Daily Signals` trong `STATE.md`.

---

## 5. Cập Nhật Plugin & Đồng Bộ Cấu Trúc (Non-Destructive Migration)

1. **Cập nhật Plugin**:
   - Chạy `git -C "$HOME/.gemini/config/plugins/bhit-autonomy-plugin" pull`.
2. **Đồng bộ cấu trúc nhận thức cho dự án hiện hữu**:
   - Không ghi đè các tệp từ `templates/` lên các tệp đang hoạt động trong `.agents/cognition/`.
   - So sánh cấu trúc tệp hiện tại với `templates/` và dùng `edit_file` bổ sung các mục/trường mới còn thiếu, bảo toàn toàn bộ dữ liệu hiện có của dự án.
