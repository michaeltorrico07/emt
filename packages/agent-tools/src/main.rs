use serde::{Deserialize, Serialize};
use serde_json::json;
use std::thread;
use std::time::{Duration, Instant};
use uiautomation::patterns::UIValuePattern;
use uiautomation::{Result, UIAutomation, UIElement, UITreeWalker};

#[derive(Serialize)]
#[serde(tag = "event", content = "data")]
enum AgentEvent {
    Comment { text: String, context: String },
    Error { message: String },
}

#[derive(Deserialize)]
struct ServerResponse {
    comment: String,
}

fn main() {
    let automation = UIAutomation::new().unwrap();
    let walker = automation.get_control_view_walker().unwrap();

    let interval = Duration::from_secs(20);
    let mut next = Instant::now() + interval;
    let mut last_snapshot = String::new();

    loop {
        match capture_snapshot(&walker, &automation) {
            Ok(snapshot) => {
                // Solo mandar si cambió algo
                if snapshot != last_snapshot {
                    last_snapshot = snapshot.clone();

                    match send_to_server(&snapshot) {
                        Ok(comment) => {
                            let event = AgentEvent::Comment {
                                text: comment,
                                context: snapshot,
                            };
                            println!("{}", serde_json::to_string(&event).unwrap());
                        }
                        Err(e) => {
                            let event = AgentEvent::Error {
                                message: e.to_string(),
                            };
                            eprintln!("{}", serde_json::to_string(&event).unwrap());
                        }
                    }
                }
            }
            Err(e) => eprintln!("[agent] error capturando: {e}"),
        }

        thread::sleep(next.saturating_duration_since(Instant::now()));
        next += interval;
    }
}

fn capture_snapshot(walker: &UITreeWalker, automation: &UIAutomation) -> Result<String> {
    let root = automation.get_root_element()?;

    // Capturar ventana activa para dar contexto al modelo
    let active_window = automation
        .get_focused_element()
        .and_then(|e| e.get_name())
        .unwrap_or_else(|_| "desconocida".to_string());

    let mut lines = Vec::new();
    lines.push(format!("=== Ventana activa: {active_window} ==="));

    collect_element(walker, &root, 0, &mut lines)?;

    let relevant: Vec<String> = lines
        .into_iter()
        .filter(|l| !l.trim().is_empty())
        .take(150)
        .collect();

    Ok(relevant.join("\n"))
}

fn collect_element(
    walker: &UITreeWalker,
    element: &UIElement,
    level: usize,
    lines: &mut Vec<String>,
) -> Result<()> {
    let classname = element.get_classname().unwrap_or_default();
    let name = element.get_name().unwrap_or_default();

    // valor via pattern
    let value = element
        .get_pattern::<UIValuePattern>()
        .and_then(|p| p.get_value())
        .unwrap_or_default();

    let is_text_element = matches!(
        classname.as_str(),
        "TextBlock"
            | "Text"
            | "RichTextBlock"
            | "TextBox"
            | "Edit"
            | "RichEdit20W"
            | "Static"
            | "Button"
            | "MenuItem"
            | "ListItem"
            | "TreeItem"
            | "TabItem"
            | "Chrome_RenderWidgetHostHWND"
    );

    let mut text_parts: Vec<&str> = Vec::new();
    if !name.is_empty() {
        text_parts.push(&name);
    }
    if !value.is_empty() && value != name {
        text_parts.push(&value);
    }

    if !text_parts.is_empty() && (is_text_element || level <= 2) {
        let indent = "  ".repeat(level);
        lines.push(format!("{indent}{}", text_parts.join(" | ")));
    }

    if level >= 5 {
        return Ok(());
    }

    if let Ok(child) = walker.get_first_child(element) {
        collect_element(walker, &child, level + 1, lines)?;

        let mut next = child;
        while let Ok(sibling) = walker.get_next_sibling(&next) {
            collect_element(walker, &sibling, level + 1, lines)?;
            next = sibling;
        }
    }

    Ok(())
}

fn send_to_server(snapshot: &str) -> anyhow::Result<String> {
    let client = reqwest::blocking::Client::new();

    let body = json!({
        "snapshot": snapshot
    });

    let res = client
        .post("http://localhost:3000/test")
        .json(&body)
        .send()?;

    let data: ServerResponse = res.json()?;
    Ok(data.comment)
}
