const express = require("express");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ytdl = require("ytdl-core");

const app = express();
const PORT = 3000;

const YT_URL = "https://www.youtube.com/live/3Xh3HK1gNe4?si=028nFLBuFZn2ICVn";

const OUTPUT_DIR = path.join(__dirname, "hls");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

let ffmpegProcess = null;

async function startFFmpeg() {
  try {
    console.log("🔄 Checking YouTube stream...");

    if (!(await ytdl.validateURL(YT_URL))) {
      throw new Error("❌ Invalid YouTube URL");
    }

    const ytStream = ytdl(YT_URL, { quality: "highest" });

    ffmpegProcess = ffmpeg(ytStream)
      .addOptions([
        "-c:v copy",                // don’t re-encode video
        "-c:a copy",                // don’t re-encode audio
        "-f hls",                   // HLS format
        "-hls_time 5",              // 5-second segments
        "-hls_list_size 6",         // keep last 6 segments
        "-hls_flags delete_segments"
      ])
      .output(path.join(OUTPUT_DIR, "index.m3u8"))
      .on("start", cmd => {
        console.log("✅ FFmpeg started:", cmd);
      })
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

// Retry with delay
function retryFFmpeg() {
  if (ffmpegProcess) {
    ffmpegProcess.kill("SIGKILL");
    ffmpegProcess = null;
  }
  setTimeout(() => {
    console.log("🔁 Retrying stream...");
    startFFmpeg();
  }, 10000); // wait 10s before retry
}

// Serve HLS over Express
app.use("/somby", express.static(OUTPUT_DIR));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/somby/index.m3u8`);
  startFFmpeg();
});