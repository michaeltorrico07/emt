import fs from "fs"
import path from "path"

fs.mkdirSync("apps/desktop/src-tauri/binaries", { recursive: true })

fs.copyFileSync(
  "target/release/agent-tools.exe",
  "apps/desktop/src-tauri/binaries/agent-tools-x86_64-pc-windows-msvc.exe"
)