const YT_URL = "https://www.youtube.com/live/Z7rtQEa62RI?si=NP4Hv2yirAy2hFGA";

const express = require("express");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const fetch = require("node-fetch");

const app = express();
const PORT = 3000;

const OUTPUT_DIR = path.join(__dirname, "hls");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

let ffmpegProcess = null;

async function getYoutubeM3U8() {
  console.log("🔄 Fetching YouTube page...");
  const res = await fetch(YT_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Node.js)"
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube page: ${res.status}`);
  }

  const html = await res.text();

  const regex = /"(https:[^"]+m3u8[^"]*)"/;
  const match = html.match(regex);

  if (!match) {
    throw new Error("❌ Could not find m3u8 in YouTube page");
  }

  const m3u8Url = match[1].replace(/\\u0026/g, "&");
  console.log("✅ Extracted HLS URL:", m3u8Url);
  return m3u8Url;
}

async function startFFmpeg() {
  try {
    const m3u8Url = await getYoutubeM3U8();

    ffmpegProcess = ffmpeg(m3u8Url)
      .addOptions([
        "-c:v copy",
        "-c:a copy",
        "-f hls",
        "-hls_time 5",
        "-hls_list_size 6",
        "-hls_flags delete_segments"
      ])
      .output(path.join(OUTPUT_DIR, "index.m3u8"))
      .on("start", cmd => console.log("🎥 FFmpeg started:", cmd))
      .on("error", err => {
        console.error("⚠️ FFmpeg error:", err.message);
        retryFFmpeg();
      })
      .on("end", () => {
        console.log("⚠️ FFmpeg ended, retrying...");
        retryFFmpeg();
      })
      .run();
  } catch (err) {
    console.error("❌ Error starting FFmpeg:", err.message);
    retryFFmpeg();
  }
}

function retryFFmpeg() {
  if (ffmpegProcess) {
    ffmpegProcess.kill("SIGKILL");
    ffmpegProcess = null;
  }
  setTimeout(() => {
    console.log("🔁 Retrying stream...");
    startFFmpeg();
  }, 10000);
}

app.use("/somby", express.static(OUTPUT_DIR));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/somby/index.m3u8`);
  startFFmpeg();
});