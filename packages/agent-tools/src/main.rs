use image::codecs::jpeg::JpegEncoder;
use image::ImageBuffer;
use image::Rgba;
use reqwest::blocking::multipart;
use serde::{Deserialize, Serialize};
use std::thread;
use std::time::{Duration, Instant};
use xcap::Monitor;

#[derive(Serialize)]
#[serde(tag = "event", content = "data")]
enum AgentEvent {
    Comment { text: String },
    Error { message: String },
}

#[derive(Deserialize)]
struct ServerResponse {
    comment: String,
}

fn main() {
    let interval = Duration::from_secs(20);
    let mut next = Instant::now() + interval;

    loop {
        let monitors = Monitor::all().unwrap();
        let primary = monitors
            .into_iter()
            .find(|m| m.is_primary().unwrap_or(false))
            .expect("No se encontró monitor primario");
        let image = primary.capture_image().unwrap();
        match send_to_server(&image) {
            Ok(comment) => {
                let event = AgentEvent::Comment { text: comment };
                println!("{}", serde_json::to_string(&event).unwrap());
            }
            Err(e) => {
                let event = AgentEvent::Error {
                    message: e.to_string(),
                };
                eprintln!("{}", serde_json::to_string(&event).unwrap());
            }
        }
        thread::sleep(next.saturating_duration_since(Instant::now()));
        next += interval;
    }
}

fn send_to_server(shot: &ImageBuffer<Rgba<u8>, Vec<u8>>) -> anyhow::Result<String> {
    let client = reqwest::blocking::Client::new();
    let rgb: Vec<u8> = shot
        .as_raw()
        .chunks(4)
        .flat_map(|p| [p[0], p[1], p[2]])
        .collect();

    let mut jpeg_bytes = Vec::new();
    let mut encoder = JpegEncoder::new_with_quality(&mut jpeg_bytes, 85);
    encoder
        .encode(
            &rgb,
            shot.width(),
            shot.height(),
            image::ExtendedColorType::Rgb8,
        )
        .unwrap();

    let form = multipart::Form::new().text("session_id", "EMT_TEST").part(
        "image",
        multipart::Part::bytes(jpeg_bytes)
            .file_name("screenshot.jpg")
            .mime_str("image/jpeg")?,
    );

    let res = client
        .post("http://localhost:3000/test")
        .multipart(form)
        .send()?;

    let data: ServerResponse = res.json()?;
    Ok(data.comment)
}
