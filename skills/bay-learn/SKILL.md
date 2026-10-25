---
name: bay:learn
description: Nạp tri thức, quy tắc nghiệp vụ, tài liệu tham khảo, kết luận từ hội thoại (@[conversation:...]) hoặc tài nguyên vận hành vào hệ thống nhận thức phân tầng (.agents/cognition/, .agents/knowledge/, STATE.md, data.db). Kích hoạt khi người dùng gọi bay:learn, /bay:learn, hoặc yêu cầu nạp kiến thức/tài liệu cho Agent tự chủ.
---

# BAY:LEARN — Knowledge & Asset Ingestion Protocol

Quy trình chuẩn hóa để tiếp nhận, phân loại và lưu trữ tri thức hoặc tài nguyên mới vào hệ thống nhận thức của Autonomous Agent.

---

## 1. Giải Mã Nguồn Đầu Vào (Source Extraction)

Xác định loại nguồn dữ liệu được cung cấp:
1. **Chỉ đạo trực tiếp (Direct Input)**: Quy tắc nghiệp vụ, chính sách, ràng buộc vận hành hoặc hướng dẫn thực thi.
2. **Hội thoại tham chiếu (`@[conversation:...]` Cross-Conversation)**:
   - Đọc file `.system_generated/logs/transcript.jsonl` của hội thoại được tham chiếu.
   - Bỏ qua các bước thảo luận trung gian; chỉ trích xuất quyết định, phương án cuối cùng đã chốt và các ràng buộc đi kèm.
3. **Tài liệu (Documents / URLs)**: Tệp văn bản (`.md`, `.txt`, `.pdf`, `.json`, v.v.) hoặc nội dung từ đường dẫn web.
4. **Tài nguyên & Dữ liệu (Assets & Datasets)**: Thư mục chứa tệp đa phương tiện, biểu mẫu hoặc tập dữ liệu phục vụ vận hành.

---

## 2. Phân Loại & Định Tuyến Lưu Trữ (Cognitive Routing)

Tuyệt đối không ghi nội dung tri thức nghiệp vụ vào `AGENTS.md` ở gốc dự án. Định tuyến từng đơn vị thông tin vào đúng tầng nhận thức:

| Phân loại | Đích lưu trữ | Quy tắc xử lý |
| :--- | :--- | :--- |
| **1. Quy tắc vận hành & Chiến lược ngắn** | `.agents/cognition/MEMORY.md` | Đúc kết thành gạch đầu dòng súc tích kèm nhãn phân loại (`#strategy`, `#policy`, `#workflow`, `#rule`) và ghi trực tiếp vào chuyên mục tương ứng. |
| **2. Tài liệu chuyên sâu (> 30 dòng)** | `.agents/knowledge/<slug>.md` + Chỉ mục tại `MEMORY.md` | Lưu nội dung chi tiết vào `.agents/knowledge/<slug>.md`. Tại `MEMORY.md`, chỉ ghi 1 dòng chỉ mục kèm đường dẫn `[<Tiêu đề>](file:///.../.agents/knowledge/<slug>.md)` và điều kiện kích hoạt đọc (`read_file`). |
| **3. Tài nguyên thực thi & Tập dữ liệu** | Cơ sở dữ liệu (`data.db`) + `.agents/cognition/STATE.md` | Quét metadata của tài nguyên, cập nhật vào bảng dữ liệu tương ứng trong `data.db` và ghi nhận đường dẫn tại mục `## 3. Hạ tầng Dữ liệu Dự án` trong `STATE.md`. |
| **4. Giọng văn & Phong cách giao tiếp** | `.agents/cognition/CHARACTER.md` | Dùng `edit_file` cập nhật bổ sung quy chuẩn giao tiếp theo yêu cầu trực tiếp của Người vận hành. |
| **5. Mục tiêu cốt lõi & Ranh giới cấm** | `.agents/cognition/SOUL.md` | Dùng `edit_file` cập nhật mục tiêu hoặc ranh giới hoạt động theo chỉ đạo trực tiếp của Người vận hành (cảnh báo nếu mâu thuẫn với mục tiêu hiện hữu). |
| **6. Quy trình thao tác từng bước (Playbook)** | `.agents/skills/<domain>-<op>/SKILL.md` | Đúc kết chuỗi bước thực thi bằng công cụ sẵn có vào `SKILL.md` theo mẫu `PROCEDURAL_SKILL.template.md` (hoặc cập nhật vào Skill hiện hữu nếu trùng chủ đề). |

---

## 3. Khử Trùng Lặp & Xử Lý Xung Đột (Deduplication)

Trước khi ghi vào `MEMORY.md` hoặc `.agents/knowledge/`:
1. Đọc nội dung hiện có tại chuyên mục đích.
2. **Hợp nhất (Merge)** nếu thông tin mới bổ sung cho quy tắc đã tồn tại.
3. **Ghi đè (Supersede)** nếu thông tin mới thay thế quy tắc cũ, đảm bảo không tồn tại hai quy tắc mâu thuẫn nhau.

---

## 4. Liên Kết Vòng Lặp Hiện Hành (Loop Binding)

- Kiểm tra mục `## 2. Các vòng lặp đang mở (Open Loops)` trong `.agents/cognition/STATE.md`.
- Nếu tri thức hoặc tài nguyên vừa nạp liên quan trực tiếp đến các tác vụ sắp thực thi, bổ sung ghi chú tham chiếu vào tác vụ đó trong `STATE.md`.

---

## 5. Kiểm Toán & Xác Nhận (Audit & Output)

1. Ghi nhật ký vào mục `## 5. Nhật ký Tín hiệu Trong ngày (Daily Signals)` trong `STATE.md`:
   - Định dạng: `- [YYYY-MM-DD HH:MM] #bay-learn: Nạp [<Tóm tắt>] vào [<Đích lưu trữ>].`
2. Báo cáo ngắn gọn kết quả thực thi:
   - Nội dung đã trích xuất.
   - Các tệp tin nhận thức đã cập nhật (kèm liên kết `file:///`).
   - Các tác vụ trong `STATE.md` sẽ áp dụng tri thức này.
