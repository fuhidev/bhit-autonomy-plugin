# ⚡ STATE.md - BÀN LÀM VIỆC HIỆN TẠI & NHẬT KÝ TÍN HIỆU NGẮN HẠN

> ✏️ **READ/WRITE LIÊN TỤC**: Đọc đầu tiên ở mỗi nhịp `/schedule`. Cập nhật tiến độ sau mỗi hành động. Làm sạch nhật ký tín hiệu sau ca hợp nhất ký ức cuối ngày.

---

## 1. TIẾN ĐỘ THỰC HIỆN MỤC TIÊU CHIẾN LƯỢC (GOAL PROGRESS)
- **Chu kỳ hiện tại**: `[Chu kỳ / Giai đoạn]`
- **Tiến độ đo lường**: `0 / [MỤC_TIÊU_KPI]`
- **Khoảng cách đến mục tiêu (Goal Gap)**: `[Mô tả các hạng mục cần hoàn thành tiếp theo]`

---

## 2. CÁC VÒNG LẶP ĐANG MỞ (OPEN LOOPS)
*Danh sách các tác vụ đang chờ thực thi hoặc cần kiểm tra kết quả:*
- [ ] `[YYYY-MM-DD HH:MM] - [Mô tả tác vụ và điều kiện hoàn thành]`

---

## 3. HẠ TẦNG DỮ LIỆU & TÀI NGUYÊN DỰ ÁN
*Cấu trúc cơ sở dữ liệu và tài nguyên vận hành của dự án:*
- **Cơ sở dữ liệu**: `data.db` (SQLite)
- **Bảng dữ liệu chính**: `[danh_sach_bang]`
- **Công cụ truy vấn**: `python scripts/manage_data.py`

---

## 4. NHỊP ĐẬP `/schedule` HIỆN HÀNH (PHẢI CÓ `TaskId` THỰC TẾ)
> ⚠️ **QUY TẮC BẮT BUỘC**: Mọi mốc giờ dự kiến tiếp theo ghi tại đây **PHẢI** đi kèm `TaskId` trả về từ công cụ `schedule` (`DurationSeconds` hoặc `CronExpression`).

| Loại Schedule | Mã Task (`TaskId`) | Thời gian / Chu kỳ | Nhiệm vụ khi thức dậy | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **Cron định kỳ (Daemon)** | `task-XX` | `0 */2 * * *` | Kiểm tra bàn làm việc `STATE.md` định kỳ | 🟢 Active |
| **One-shot Timer** | `task-YY` | `[YYYY-MM-DD HH:MM:SS]` | `[Nhiệm vụ cụ thể tiếp theo]` | 🟢 Active |

---

## 5. NHẬT KÝ TÍN HIỆU TRONG NGÀY (DAILY SIGNALS)
*Ghi nhận kết quả thực thi, bài học ngắn hạn hoặc tín hiệu phát sinh trong ngày:*

- `[YYYY-MM-DD HH:MM]` `#tag`: `[Nội dung tín hiệu hoặc quan sát thực tế]`
