import json
import os
import sys
import urllib.parse

sys.stdout.reconfigure(encoding="utf-8")


def uri_to_path(uri: str) -> str:
    if not uri:
        return ""
    if uri.startswith("file:///"):
        raw = urllib.parse.unquote(uri[len("file:///"):])
        if os.name == "nt":
            raw = raw.replace("/", "\\")
        return os.path.abspath(raw)
    return os.path.abspath(uri)


def main():
    try:
        raw_in = sys.stdin.read()
        payload = json.loads(raw_in) if raw_in.strip() else {}
    except Exception:
        payload = {}

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

    msg = (
        "⚡ **[BHIT AUTONOMY ENGINE - SESSION GUARD ACTIVE]**\n"
        f"- Phát hiện dự án tự chủ tại `{found_state_path}`.\n"
        "- Sidecar Daemon `bhit-autonomy-plugin/autonomy-engine` (`restart_policy: always`) đang bảo vệ lịch trình 24/7.\n"
        "- Khi thực hiện nhịp tự chủ hoặc khởi động lại phiên, hãy gọi `manage_task(Action: 'list')` để đối soát các `TaskId` trong `STATE.md` (Schedule Reconciliation) và hiển thị nút mở bảng điều khiển cho người vận hành: "
        "`[⚡ Mở BHIT Autonomy Engine](sidecar://bhit-autonomy-plugin/autonomy-engine/)`."
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
