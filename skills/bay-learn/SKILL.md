---
name: bay:learn
description: Nạp kiến thức, quy tắc chiến lược, tài liệu nghiệp vụ (SOP/Docs), kết luận từ hội thoại khác (@[conversation:...]) hoặc tài nguyên vận hành vào đúng phân tầng nhận thức (.agents/cognition/MEMORY.md, .agents/knowledge/, STATE.md, data.db) của Autonomous Agent mà không làm phình Context Window. Kích hoạt khi người dùng gọi bay:learn, /bay:learn, hoặc yêu cầu dạy/nạp thêm kiến thức, tài liệu, dữ liệu cho Agent tự chủ.
---

# 🧠 BAY:LEARN — Giao Thức Nạp Tri Thức & Tài Nguyên Tự Chủ (BHIT Tech AutonomY)

Skill này đóng vai trò là **Bộ Phân Loại & Nạp Nhận Thức Thông Minh (Cognitive Knowledge Ingestor)** dành riêng cho AI Agent tự chủ vận hành theo kiến trúc `bhit-autonomy-plugin`.

> [!IMPORTANT]
> **Sự khác biệt với `/learn` mặc định**: Lệnh `/learn` thông thường ghi thẳng quy tắc vào `AGENTS.md`, làm phình System Prompt và tiêu tốn token ở mọi nhịp thức dậy. Ngược lại, **`bay:learn`** bảo vệ tuyệt đối sự tinh gọn của `AGENTS.md` bằng cách phân loại, nén và định tuyến tri thức vào đúng 5 tầng nhận thức (`.agents/cognition/`, `.agents/knowledge/`, `data.db`).

---

## QUY TRÌNH 5 BƯỚC NẠP TRI THỨC TỔNG QUÁT

Khi Người vận hành yêu cầu nạp kiến thức, tài liệu hoặc tài nguyên mới cho Agent:

### Bước 1: Giải Mã & Trích Xuất Nguồn Đầu Vào (Multi-Source Extraction)
Xác định loại nguồn mà Người vận hành cung cấp:
1. **Chỉ đạo trực tiếp trên khung chat (Direct Directive)**: Các quy tắc nghiệp vụ, chính sách, kinh nghiệm xử lý tình huống hoặc hướng dẫn mới.
2. **Tham chiếu Hội thoại (`@[conversation:...]` Cross-Conversation Synthesis)**:
   - Khi Người vận hành đính kèm một cuộc hội thoại khác (nơi họ đã thảo luận nháp hoặc phân tích phương án trước đó), hãy đọc file log `.system_generated/logs/transcript.jsonl` của cuộc hội thoại đó.
   - Lọc bỏ các bước hỏi đáp trung gian, **chỉ rút trích Quyết định / Phương án cuối cùng đã được chốt (Final Consensus)** cùng các ràng buộc đi kèm.
3. **Tài liệu & Cẩm nang (Documents / Files / URLs)**: Đường dẫn tới các tệp tài liệu (`.md`, `.txt`, `.pdf`, `.json`, v.v.) hoặc trang web.
4. **Kho Tài nguyên & Dữ liệu Vận hành (Operational Assets & Datasets)**: Đường dẫn tới thư mục chứa tài nguyên thực thi, mẫu biểu hoặc tệp dữ liệu trên máy.

---

### Bước 2: Phân Loại & Định Tuyến Vào 5 Tầng Nhận Thức (Cognitive Routing)
Tuyệt đối **KHÔNG** ghi nội dung kiến thức vào file `AGENTS.md` ở gốc dự án. Hãy phân loại từng đơn vị tri thức vừa trích xuất vào đúng tầng đích theo bảng sau:

| Loại Tri Thức (Knowledge Category) | Tầng Đích Lưu Trữ (Target Layer) | Quy Tắc Xử Lý & Nạp (Ingestion Protocol) |
| :--- | :--- | :--- |
| **1. Quy tắc vận hành, Chiến lược & Bài học đã chốt** *(Procedural & Strategic Rules)* | `.agents/cognition/MEMORY.md` | **Direct Promotion (Thăng cấp trực tiếp)**: Bỏ qua vùng đệm `DREAMS.md` vì đây là tri thức đã được Người vận hành phê duyệt. Đúc kết thành các gạch đầu dòng súc tích, gắn nhãn (`#strategy`, `#policy`, `#workflow`, `#domain-rule`) và ghi vào đúng chuyên mục trong `MEMORY.md`. |
| **2. Tài liệu chuyên sâu, Quy trình SOP, Kiến thức dài** *(Deep Reference Docs > 30 dòng)* | `.agents/knowledge/<ten-tai-lieu>.md` + Chỉ mục trong `MEMORY.md` | **Progressive Disclosure (Nạp theo nhu cầu)**: Lưu toàn văn nội dung đã chuẩn hóa vào `.agents/knowledge/<ten-tai-lieu>.md`. Trong `MEMORY.md`, chỉ thêm **1 dòng chỉ mục kèm đường dẫn `[Tên tài liệu](file:///.../.agents/knowledge/<ten-tai-lieu>.md)`** và ghi rõ: *"Chỉ dùng `read_file` đọc khi thực hiện tác vụ [X]"*. |
| **3. Tài nguyên Thực thi & Tập dữ liệu** *(Operational Assets & Datasets)* | Cơ sở dữ liệu dự án (`data.db`) + `.agents/cognition/STATE.md` | Dùng script/lệnh quét danh mục và metadata của tài nguyên, nạp vào bảng quản lý tương ứng trong `data.db` (tự tạo bảng/cột nếu chưa có). Đồng thời cập nhật đường dẫn và trạng thái sẵn sàng vào mục `## 3. Hạ tầng Dữ liệu Dự án` trong `STATE.md`. |
| **4. Giọng văn, Phong cách giao tiếp & Xưng hô** *(Persona & Tone Guidelines)* | `.agents/cognition/CHARACTER.md` | Vì `bay:learn` là lệnh chủ động từ Người vận hành, bạn được phép dùng `edit_file` cập nhật bổ sung quy chuẩn giao tiếp vào `CHARACTER.md`. |
| **5. Mục tiêu KPI cốt lõi & Ranh giới cấm** *(Core Goals & Taboos)* | `.agents/cognition/SOUL.md` | Nếu Người vận hành chủ động yêu cầu thay đổi Mục tiêu hoặc Điều cấm qua `bay:learn`, dùng `edit_file` cập nhật `SOUL.md` (nếu phát hiện mâu thuẫn nghiêm trọng với sứ mệnh cũ, hãy nêu rõ để xác nhận). |

---

### Bước 3: Khử Trùng Lặp & Giải Quyết Xung Đột (Deduplication & Conflict Resolution)
Trước khi dùng `edit_file` ghi vào `MEMORY.md` hoặc `.agents/knowledge/`:
1. Đọc toàn bộ phần liên quan trong `MEMORY.md`.
2. Nếu kiến thức mới **bổ sung** cho quy tắc cũ $\rightarrow$ Gộp (Merge) vào cùng một mục để giữ cấu trúc gọn gàng.
3. Nếu kiến thức mới **thay thế hoặc phủ định** quy tắc cũ $\rightarrow$ Cập nhật đè lên quy tắc cũ (Supersede), tuyệt đối không để tồn tại hai quy tắc mâu thuẫn nhau trong `MEMORY.md`.

---

### Bước 4: Liên Kết Với Các Vòng Lặp Đang Mở (Active Loop Binding)
- Đọc mục `## 2. Các vòng lặp đang mở (Open Loops)` trong `.agents/cognition/STATE.md`.
- Nếu kiến thức hoặc tài nguyên vừa nạp phục vụ trực tiếp cho các nhiệm vụ sắp tới trong lịch trình, hãy bổ sung ghi chú tham chiếu ngắn gọn vào nhiệm vụ đó trong `STATE.md` để Subagent `autonomous-worker` biết và áp dụng ngay ở nhịp thức dậy kế tiếp.

---

### Bước 5: Ghi Nhật Ký Tín Hiệu & Báo Cáo Xác Nhận (Audit & Report)
1. Ghi 1 dòng log vào mục `## 5. Nhật ký Tín hiệu Trong ngày (Daily Signals)` trong `STATE.md`:
   - Định dạng: `- [YYYY-MM-DD HH:MM] #bay-learn: Đã nạp tri thức [<Tóm tắt>] vào [<Tầng lưu trữ>].`
2. In báo cáo xác nhận ngắn gọn ra màn hình chat cho Người vận hành theo mẫu:
   - **Tri thức / Tài nguyên đã trích xuất**: ...
   - **Tầng nhận thức đã lưu trữ**: (Kèm link `file:///` tới các file vừa cập nhật).
   - **Tác động vận hành**: Sẽ được áp dụng như thế nào ở các chu kỳ `/schedule` tiếp theo.
