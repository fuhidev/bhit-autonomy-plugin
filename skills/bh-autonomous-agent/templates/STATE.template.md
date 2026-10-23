# ⚡ STATE.md - BÀN LÀM VIỆC HIỆN TẠI & NHẬT KÝ TÍN HIỆU NGẮN HẠN

> ✏️ **READ/WRITE LIÊN TỤC**: Đọc ĐẦU TIÊN ở mỗi nhịp `/schedule`. Cập nhật tiến độ sau mỗi hành động. Làm sạch nhật ký ngày sau ca Dreaming đêm.

---

## 1. TIẾN ĐỘ THỰC HIỆN MỤC TIÊU CHIẾN LƯỢC (GOAL PROGRESS)
- **Chu kỳ hiện tại**: [Tuần 1 - Tháng MM/YYYY]
- **Tiến độ đo lường**: 0 / [MỤC_TIÊU_KPI]
- **Khoảng cách đến mục tiêu (Goal Gap)**: Cần tiếp cận thêm X khách hàng / sản xuất thêm Y nội dung.

---

## 2. CÁC VÒNG LẶP ĐANG MỞ (OPEN LOOPS)
*Danh sách các tác vụ đang chờ tín hiệu phản hồi hoặc cần kiểm tra lại:*
- [ ] *[Ví dụ: 2026-10-23 14:00 - Đã gửi Zalo cho Khách hàng A. Hẹn 15:30 kiểm tra phản hồi.]*

---

## 3. HẠ TẦNG DỮ LIỆU & CƠ SỞ DỮ LIỆU DỰ ÁN
*Cấu trúc dữ liệu mà Agent tự kiến tạo cho dự án này (nếu có):*
- CSDL chính: `data.db` (SQLite)
- Bảng chính: `[danh_sach_thuc_the]`, `[lich_su_tuong_tac]`
- Script truy vấn: `python scripts/manage_data.py status`

---

## 4. NHỊP ĐẬP `/schedule` HIỆN HÀNH (PHẢI CÓ `TaskId` THỰC TẾ)
> ⚠️ **QUY TẮC BẮT BUỘC**: Mọi mốc giờ dự kiến tiếp theo ghi tại đây **PHẢI** đi kèm `TaskId` trả về từ công cụ `schedule` (One-shot Timer `DurationSeconds` hoặc `CronExpression`). Ghi chữ vào `STATE.md` mà không gọi tool `schedule` thì Agent sẽ không thức dậy đúng giờ!

| Loại Schedule | Mã Task (`TaskId`) | Thời gian / Chu kỳ | Nhiệm vụ khi thức dậy | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **Cron nền (Daemon)** | `task-XX` | `0 */2 * * *` | Kiểm tra bàn làm việc `STATE.md` định kỳ | 🟢 Active |
| **One-shot Timer** | `task-YY` | `[YYYY-MM-DD HH:MM:SS]` | `[Nhiệm vụ cụ thể tiếp theo]` | 🟢 Active |

---

## 5. NHẬT KÝ TÍN HIỆU TRONG NGÀY (DAILY SIGNALS - OPENCLAW v2 INGESTION)
*Các tín hiệu, bài học ngắn hạn, phản hồi của khách hoặc kết quả thực thi trong ngày. Cuối ngày Subagent cognitive-dreamer sẽ đọc phần này để chạy 3 pha ngủ rồi làm sạch lại:*

- `[2026-10-23 09:30]` #timing: Đăng bài lúc 07:30 sáng có tỷ lệ tương tác cao hơn 40% so với 09:00.
- `[2026-10-23 11:15]` #tool-need: Cần thêm skill quét bình luận TikTok để khép kín vòng lặp. Đã ghi đề xuất #INBOX-01.
