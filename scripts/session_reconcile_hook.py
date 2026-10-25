import json
import os
import re
import sys
import urllib.parse

sys.stdout.reconfigure(encoding="utf-8")

UUID_RE = re.compile(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", re.IGNORECASE)
ORCH_LINE_RE = re.compile(r"Orchestrator\s+Conversation(?:\s+ID)?|Conversation\s+ID\s+điều\s+phối", re.IGNORECASE)


def uri_to_path(uri: str) -> str:
    if not uri:
        return ""
    if uri.startswith("file:///"):
        raw = urllib.parse.unquote(uri[len("file:///"):])
        if os.name == "nt":
            raw = raw.replace("/", "\\")
        return os.path.abspath(raw)
    return os.path.abspath(uri)


def parse_orchestrator_conversation_id(state_file: str) -> str:
    try:
        with open(state_file, "r", encoding="utf-8") as f:
            for line in f:
                if ORCH_LINE_RE.search(line):
                    m = UUID_RE.search(line)
                    if m:
                        return m.group(1).lower()
    except Exception:
        pass
    return ""


def main():
    try:
        raw_in = sys.stdin.read()
        payload = json.loads(raw_in) if raw_in.strip() else {}
    except Exception:
        payload = {}

    conversation_id = (payload.get("conversationId") or "").strip().lower()
    workspace_paths = payload.get("workspacePaths", [])
    has_autonomous_state = False
    found_state_path = ""

    for wp in workspace_paths:
        p = uri_to_path(wp)
        state_file = os.path.join(p, ".agents", "cognition", "STATE.md")
        if os.path.exists(state_file):
            has_autonomous_state = True
            found_state_path = state_file
            break

    if not has_autonomous_state:
        print(json.dumps({}))
        return

    orchestrator_id = parse_orchestrator_conversation_id(found_state_path)

    if orchestrator_id and conversation_id and conversation_id != orchestrator_id:
        msg = (
            "ℹ️ **[BHIT AUTONOMY ENGINE - AD-HOC SUPPORT SESSION]**\n"
            f"- Dự án tự chủ tại `{found_state_path}` đang ghim cố định **Orchestrator Conversation ID**: `{orchestrator_id}` trong `STATE.md`.\n"
            f"- Phiên hội thoại hiện tại (`{conversation_id}`) là **phiên hỗ trợ / debug phụ (Ad-hoc Session)**: "
            "Chỉ tập trung giải quyết yêu cầu trực tiếp của Người vận hành, **TUYỆT ĐỐI KHÔNG** tự ý gọi công cụ `schedule()` (Cron/Timer) "
            "và không ghi đè `TaskId` hay `Orchestrator Conversation ID` của phiên chính trong `STATE.md`."
        )
    elif orchestrator_id and conversation_id == orchestrator_id:
        msg = (
            "⚡ **[BHIT AUTONOMY ENGINE - ORCHESTRATOR SESSION ACTIVE]**\n"
            f"- Phiên hiện tại (`{conversation_id}`) là **Orchestrator Conversation** chính thức được ghim trong `{found_state_path}`.\n"
            "- Sidecar Daemon `bhit-autonomy-plugin/autonomy-engine` (`restart_policy: always`) đang bảo vệ lịch trình 24/7 và chỉ gửi tín hiệu đánh thức vào phiên này.\n"
            "- Khi thực hiện nhịp tự chủ hoặc khởi động lại phiên, hãy gọi `manage_task(Action: 'list')` để đối soát các `TaskId` trong `STATE.md` (Schedule Reconciliation) và hiển thị nút mở bảng điều khiển: "
            "`[⚡ Mở BHIT Autonomy Engine](sidecar://bhit-autonomy-plugin/autonomy-engine/)`."
        )
    else:
        msg = (
            "⚡ **[BHIT AUTONOMY ENGINE - SESSION GUARD ACTIVE]**\n"
            f"- Phát hiện dự án tự chủ tại `{found_state_path}` (chưa có `Orchestrator Conversation ID` cố định trong `STATE.md`).\n"
            f"- Nếu phiên này (`{conversation_id}`) là phiên điều phối tự chủ chính (Orchestrator), hãy ghi `- **Orchestrator Conversation ID**: \\`{conversation_id}\\`` vào Mục 4 của `STATE.md` và gọi `manage_task(Action: 'list')` để đối soát lịch trình.\n"
            "- Nếu đây chỉ là phiên hỏi đáp/debug phụ, không gọi công cụ `schedule()`.\n"
            "- Bảng điều khiển: `[⚡ Mở BHIT Autonomy Engine](sidecar://bhit-autonomy-plugin/autonomy-engine/)`."
        )

    out = {
        "injectSteps": [
            {
                "systemMessage": {
                    "systemMessage": msg
                }
            }
        ]
    }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
