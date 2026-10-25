---
name: <domain>-<operation>
description: <Mô tả ngắn gọn, chính xác mục tiêu của quy trình và điều kiện kích hoạt để Agent tự động nhận diện khi cần thực thi.>
---

# <Tên Quy Trình Thực Thi Chuẩn (Procedural Playbook)>

## 1. Ngữ Cảnh & Điều Kiện Tiên Quyết (Context & Prerequisites)
- **Công cụ bổ trợ sử dụng**: `<Danh sách MCP tools, CLI, Database queries, Browser hoặc APIs đã cấp quyền>`
- **Điều kiện đầu vào**: `<Trạng thái, tham số hoặc tài nguyên cần có trước khi chạy>`
- **Đầu ra kỳ vọng**: `<Kết quả trả về và tiêu chí xác nhận thành công>`

---

## 2. Quy Trình Chuẩn (Canonical Happy Path)
*Chuỗi bước thực thi ngắn gọn và chính xác nhất tại thời điểm hiện tại. Không lưu lịch sử dài dòng tại đây:*

1. **Bước 1 — `<Tên bước>`**: `<Hướng dẫn lệnh / công cụ / tham số cụ thể>`
2. **Bước 2 — `<Tên bước>`**: `<Hướng dẫn lệnh / công cụ / tham số cụ thể>`
   <!-- Mẫu khi autonomous-worker vừa cập nhật bước mới và đang trong giai đoạn thử thách (Xóa dòng dưới khi đạt 3/3):
   > 🔄 [PROBATION 1/3 | Fallback cũ: <cách cũ trước khi sửa> — Lý do đổi: <nguyên nhân kỹ thuật>]
   -->
3. **Bước 3 — `<Tên bước>`**: `<Hướng dẫn kiểm tra kết quả đầu ra>`

---

## 3. Điểm Nghẽn & Trường Hợp Biên (Edge Cases & Environment Gotchas)
*Chỉ lưu các ngoại lệ môi trường, giới hạn tải (rate-limit), dữ liệu dị biệt đã được kiểm chứng và cách xử lý tương ứng:*

- **Tình huống `<Mô tả ngoại lệ / mã lỗi>`**: `<Cách xử lý vượt qua đã kiểm chứng>`.

---

## 4. Giao Thức Tự Thích Nghi & Đồng Thuận (Probationary Override & Garbage Collection)
1. **Khi bước chuẩn có dòng `> 🔄 [PROBATION X/3 | Fallback cũ: ...]`**:
   - **Nếu thực thi theo cách mới THÀNH CÔNG**: Dùng `edit_file` tăng chỉ số lên (`1/3` $\rightarrow$ `2/3`). Khi chạm mốc **`3/3`**, cách mới chính thức trở thành chân lý hiện tại $\rightarrow$ **Xóa bỏ hoàn toàn dòng `> 🔄 [PROBATION...]`** để tránh tràn lịch sử.
   - **Nếu thực thi theo cách mới THẤT BẠI nhưng chạy lại `Fallback cũ` THÀNH CÔNG**: Khôi phục (Rollback) `Fallback cũ` lên làm bước chính, xóa dòng `PROBATION`, và chuyển cách xử lý cá biệt kia xuống Mục 3 (*Edge Cases*).
2. **Khi một bước chuẩn (không có Probation) bị lỗi do môi trường đích thay đổi**:
   - Chẩn đoán nguyên nhân và tìm phương án mới bằng các công cụ sẵn có.
   - Sau khi phương án mới **chạy thành công thực tế**:
     - Nếu chỉ là lỗi dữ liệu/môi trường tạm thời 1 lần: Ghi bổ sung cách xử lý vào Mục 3 (*Edge Cases*), giữ nguyên Mục 2 (*Happy Path*).
     - Nếu quy trình/cấu trúc đích đã thay đổi: Dùng `edit_file` cập nhật cách mới vào đúng bước đó tại Mục 2, đồng thời đính kèm ngay bên dưới dòng `> 🔄 [PROBATION 1/3 | Fallback cũ: <cách cũ> — Lý do đổi: <nguyên nhân>]`.
