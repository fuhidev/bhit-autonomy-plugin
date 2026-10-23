# 🚀 BHIT Autonomy Plugin for Google Antigravity

Hệ điều hành AI Agent tự chủ vận hành 24/7 trực tiếp trên Google Antigravity.

---

## 🌟 TÍNH NĂNG CỐT LÕI

1. **Kiến Trúc Nhận Thức Phân Tầng (`.agents/cognition/`)**:
   - `AGENTS.md` tại gốc dự án đóng vai trò là Router mỏng, chỉ nạp tự động `@[SOUL](.agents/cognition/SOUL.md)`.
   - Các tệp `CHARACTER.md`, `STATE.md`, `DREAMS.md`, `MEMORY.md`, `INBOX.md` được truy xuất theo ngữ cảnh (On-Demand).

2. **Quản Trị Quyền Ghi (Write Governance)**:
   - `SOUL.md` và `CHARACTER.md` ở chế độ Read-Only trong các chu kỳ tự động.
   - Mọi đề xuất thay đổi mục tiêu hoặc tính cách tự phát đều phải thông qua `INBOX.md`.

3. **Mở Rộng Kỹ Năng Proposal-First & Non-Blocking**:
   - Khi thiếu công cụ thực thi, Agent ghi đặc tả đề xuất vào `INBOX.md` và phát thông báo **Windows Toast Notification** (`notify-inbox.ps1`) mà không làm gián đoạn lịch trình `/schedule`.

4. **Hợp Nhất Ký Ức 3 Pha (`cognitive-dreamer`)**:
   - Xử lý tín hiệu qua 3 pha: Light Sleep (Thu gom & Lọc nhiễu từ `STATE.md`) $\rightarrow$ REM Sleep (Theo dõi giả thuyết tại `DREAMS.md`) $\rightarrow$ Deep Sleep (Thăng cấp quy tắc đạt ngưỡng vào `MEMORY.md` và làm sạch `STATE.md`).

5. **Thin Orchestrator & Subagents**:
   - Luồng chính giữ lịch trình `/schedule` gọn nhẹ và ủy quyền tác vụ thực thi cho `autonomous-worker`.

6. **Giao Thức Nạp Tri Thức & Tài Nguyên (`bay:learn`)**:
   - Tiếp nhận tri thức từ chỉ đạo trực tiếp, hội thoại tham chiếu (`@[conversation:...]`), tài liệu chuyên môn hoặc tài nguyên vận hành và định tuyến vào đúng tầng nhận thức (`MEMORY.md`, `.agents/knowledge/*.md`, `data.db` + `STATE.md`, `CHARACTER.md`, `SOUL.md`).

---

## 📁 CẤU TRÚC PLUGIN

```text
bhit-autonomy-plugin/
├── plugin.json                        # Manifest cấu hình plugin
├── README.md                          # Tài liệu hướng dẫn
├── rules/
│   └── AGENTS.md                      # Giao thức vận hành tự chủ
├── agents/
│   ├── autonomous-worker.md           # Subagent thực thi tác vụ
│   └── cognitive-dreamer.md           # Subagent hợp nhất ký ức 3 pha
└── skills/
    ├── bay-learn/                     # Skill bay:learn nạp & định tuyến tri thức
    │   └── SKILL.md
    └── bh-autonomous-agent/           # Skill khởi tạo & điều phối chu kỳ tự chủ
        ├── SKILL.md
        ├── scripts/
        │   └── notify-inbox.ps1       # Script thông báo Windows Toast
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

## 📦 CÀI ĐẶT & CẬP NHẬT

### 1. Cài đặt (Install)

**Windows (PowerShell):**
```powershell
git clone https://github.com/fuhidev/bhit-autonomy-plugin.git "$HOME\.gemini\config\plugins\bhit-autonomy-plugin"
```

**macOS / Linux:**
```bash
git clone https://github.com/fuhidev/bhit-autonomy-plugin.git ~/.gemini/config/plugins/bhit-autonomy-plugin
```

### 2. Cập nhật (Update)
```powershell
git -C "$HOME\.gemini\config\plugins\bhit-autonomy-plugin" pull
```
