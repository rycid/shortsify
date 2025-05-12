# Shortsify

> Convert boring landscape videos to vertical, mobile-ready videos with zero effort.

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)

## What is this thing?

Ever recorded some awesome horizontal video but then realized you need a vertical format for Instagram Reels, TikTok, YouTube Shorts, or whatever your fav brainrot scroller app is? Thought so.

It takes landscape videos and automatically edits them for mobile-friendly vertical platforms. No more cropping out important parts or dealing with those empty black bars of nothingness.

## Features

- Convert landscape videos to 9:16 vertical format (more formats coming soon)
- Background blurring effect for a professional look
- Super simple UI. Literally just three buttons needed
- Progress tracking so you know when it'll be done
- No watermarks, no annoying logos, just your video
- Free and open source
- SOON: Batch processing for multiple videos at once
- SOON: Multiple conversion formats
- SOON: Multithreading support for faster processing
- SOON: Audio normalization for consistent sound levels
- SOON: Simple text overlay feature for adding captions or titles
- SOON: Customizable CTA overlay for things like "Like and Subscribe"
- SOON: Cancellation option so you can stop long-running processes

## How it works

Shortsify uses FFmpeg under the hood to do some cool stuff:

1. Centers your original video
2. Creates a blurred BG from your video content
3. Keeps the original video/audio quality (up to 1080p for now)
4. Outputs a 1080x1920 video ready for uploading (customizable in the future)

## Installation

1. Download the latest release from the [releases page](https://github.com/rycid/shortsify/releases)
2. Run the installer
3. Follow the prompts (you can choose where to install it)
4. That's it.

## Usage

1. Open Shortsify
2. Click "Select Video"
3. Pick a video file
4. Click "Process Video" and wait
5. The edited video will be saved and ready for upload

## Building from source

So you want to build it yourself?:

```bash
# Clone the repo
git clone https://github.com/rycid/shortsify.git

# Move into the directory
cd shortsify

# Install dependencies
npm install

# Run in dev mode
npm run dev

# Build for production
npm run build
```

## Requirements

- Some disk space
- A computer that isn't on its last legs

## Known Issues

- No batch processing yet (on the todo list)
- No cancellation option (also on the todo list)

## License

ISC License 

---

Made with... the slightest frustration at vertical video platforms.
