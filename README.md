# 🚀 BHIT Autonomy Plugin for Google Antigravity

Hệ điều hành AI Agent tự chủ thế hệ mới, vận hành 24/7 trực tiếp trên Google Antigravity.

---

## 🌟 TÍNH NĂNG CỐT LÕI

1. **Phân Tầng Nhận Thức Siêu Tiết Kiệm Token**:
   - `AGENTS.md` tại gốc dự án chỉ đóng vai trò là Router mỏng (~25 dòng).
   - Chỉ nạp tự động `@[SOUL](.agents/cognition/SOUL.md)`.
   - Các file `CHARACTER.md`, `STATE.md`, `DREAMS.md`, `MEMORY.md`, `INBOX.md` được đọc theo ngữ cảnh (On-Demand), giúp tiết kiệm 80% token cho mỗi nhịp thức dậy.

2. **Quyền Ghi Bất Biến (Write Governance)**:
   - `SOUL.md` (Mục tiêu, Tôn chỉ) và `CHARACTER.md` (Tính cách) là Read-Only đối với Agent.
   - Mọi thay đổi vào 2 file này đều phải qua đề xuất trong `INBOX.md` và được Người vận hành phê duyệt.

3. **Mở Rộng Kỹ Năng Proposal-First & 100% Non-Blocking**:
   - Khi thiếu công cụ, Agent không tự ý viết code ngay mà tạo đề xuất vào `INBOX.md`.
   - Bắn thông báo **Windows Toast Notification + Âm báo nhẹ** ở góc màn hình máy tính (`notify-inbox.ps1`) mà không bao giờ làm dừng luồng chạy tự động của `/schedule`.

4. **Chu Trình Dreamer 3 Pha Theo Chuẩn OpenClaw v2**:
   - Vận hành qua mô hình 3 pha: Light Sleep (Lọc nhiễu) ➔ REM Sleep (Nhận diện quy luật liên ngày) ➔ Deep Sleep (Thăng cấp chân lý bền vững vào `MEMORY.md` và dọn sạch bàn làm việc `STATE.md`).
   - Có sổ tay giải trình minh bạch `DREAMS.md` (*Dream Diary*).

5. **Mô Hình Thin Orchestrator + Subagents**:
   - Luồng hội thoại chính giữ lịch `/schedule` siêu nhẹ.
   - Các tác vụ nặng được ủy quyền cho `autonomous-worker` subagent chạy ngầm song song.

---

## 📁 CẤU TRÚC PLUGIN

```text
bhit-autonomy-plugin/
├── plugin.json                        # Cấu hình plugin Antigravity
├── README.md                          # Tài liệu hướng dẫn
├── rules/
│   └── AGENTS.md                      # Giao thức Tự chủ (Kích hoạt khi có .agents/cognition/SOUL.md)
├── agents/
│   ├── autonomous-worker.md           # Worker Subagent thực thi tác vụ nặng
│   └── cognitive-dreamer.md           # Dreamer Subagent chạy ca ngủ 3 pha
└── skills/
    └── bh-autonomous-agent/           # Skill hạt nhân điều phối
        ├── SKILL.md
        ├── scripts/
        │   └── notify-inbox.ps1       # Script Windows Toast Notification
         └── templates/                 # Bộ mẫu chuẩn cho .agents/cognition/
             ├── AGENTS.router.md
             ├── SOUL.template.md
             ├── CHARACTER.template.md
             ├── STATE.template.md
             ├── DREAMS.template.md
             ├── MEMORY.template.md
             └── INBOX.template.md
 ```

---

## 📦 CÀI ĐẶT & CẬP NHẬT TỪ GITHUB (DÀNH CHO CỘNG ĐỒNG)

### 1. Cài đặt lần đầu (Install)
Clone trực tiếp vào thư mục Plugins toàn cục của Google Antigravity:

**Windows (PowerShell):**
```powershell
git clone https://github.com/fuhidev/bhit-autonomy-plugin.git "$HOME\.gemini\config\plugins\bhit-autonomy-plugin"
agy plugin validate "$HOME\.gemini\config\plugins\bhit-autonomy-plugin" --strict
```

**macOS / Linux:**
```bash
git clone https://github.com/fuhidev/bhit-autonomy-plugin.git ~/.gemini/config/plugins/bhit-autonomy-plugin
agy plugin validate ~/.gemini/config/plugins/bhit-autonomy-plugin --strict
```
*(Sau khi cài đặt lần đầu, khởi động lại Antigravity hoặc Reload Window để nạp Subagents).*

### 2. Cập nhật Plugin lên phiên bản mới (Update)
Khi tác giả phát hành bản vá hoặc tính năng mới trên GitHub, người dùng chỉ cần chạy:
```powershell
git -C "$HOME\.gemini\config\plugins\bhit-autonomy-plugin" pull
```
Hoặc gõ trực tiếp vào khung chat Antigravity:
> *"Cập nhật plugin bhit-autonomy-plugin từ GitHub và đồng bộ cấu trúc STATE.md cho dự án hiện tại."*

### 3. Cơ chế Tương thích Ngược cho các Project đã tạo (Zero-Data-Loss)
- **Tầng Engine (`rules/AGENTS.md`, `agents/*.md`, `skills/bh-autonomous-agent/SKILL.md`)**: Nằm tập trung trong Plugin nên ngay khi `git pull`, **mọi Project cũ tự động được thừa hưởng bộ luật và công cụ mới ở nhịp `/schedule` kế tiếp** mà không cần chỉnh sửa file trong project.
- **Tầng Dữ liệu Nhận thức (`.agents/cognition/*.md`)**: Khi có thay đổi về biểu mẫu (ví dụ thêm cột `TaskId` trong `STATE.md`), Agent sử dụng cơ chế **Smart Schema Merge** (`edit_file` bổ sung cột mới, giữ nguyên 100% dữ liệu tiến độ, `SOUL.md`, `MEMORY.md` và `data.db` của dự án).
