# NoRegretz 💀

> The last line of defense between you and a terrible decision.

A Deadpool-themed Chrome extension that uses Gemini AI to generate bold, spicy Tinder messages — then challenges you to a trivia quiz to decide if they actually get sent. Pass the quiz and the message gets blocked. Fail? It sends automatically. HAHAHAHAHAHA. No Regretz.

## Demo
[Insert your 1-minute demo video link here]

## How It Works
1. Open any Tinder conversation
2. Click the Deadpool button floating in the corner
3. Gemini AI reads your conversation and generates a spicy, context-aware message — or a brilliant opening line if the chat is empty
4. Preview the message and choose your fate:
   - **Just Send It** — sends immediately, no consequences
   - **No Freakin Way** — enters the danger zone
5. Deadpool narrates the rules while a countdown begins
6. Intense quiz music kicks in as a trivia question appears
7. **Answer correctly** → message blocked. You saved yourself 🛡️
8. **Answer wrong** → message sends automatically. You played yourself 💀

## Features
- 🤖 **Gemini 2.5 Flash** — reads conversation context and generates spicy replies or witty openers for new matches
- 🎭 **Deadpool voice** — ElevenLabs cloned voice narrates the rules screen
- 🎵 **Intense quiz music** — because the stakes are real
- ✅ **Sound effects** — ding ding ding on correct, womp womp on wrong
- 🟢🔴 **Screen flash feedback** — green if you win, red if you lose
- 🎯 **Difficulty scales with spice** — spicier message = harder trivia question
- 🕹️ **Draggable Deadpool button** — put him wherever you want on screen

## Tech Stack
- Chrome Extension (Manifest V3)
- Gemini 2.5 Flash API — message generation
- ElevenLabs API — Deadpool voice cloning
- The Trivia API — quiz questions
- Vanilla JavaScript

## Installation
1. Clone the repo
```bash
   git clone https://github.com/TejiriBazunu/noregretz.git
```
2. Rename `config.example.js` to `config.js` and fill in your API keys:
```javascript
   const CONFIG = {
     TRIVIA_API_KEY: 'your_trivia_api_key',
     ELEVEN_API_KEY: 'your_elevenlabs_api_key',
     ELEVEN_VOICE_ID: 'your_voice_id',
     GEMINI_API_KEY: 'your_gemini_api_key',
   };
```
3. Go to `chrome://extensions` in Chrome
4. Enable **Developer mode** (top right toggle)
5. Click **Load unpacked** and select the cloned folder
6. Open Tinder and look for the Deadpool button 💀

## API Keys Needed
| Service | Where to get it | Free Tier |
|---|---|---|
| Gemini | [Google AI Studio](https://aistudio.google.com) | ✅ Yes |
| ElevenLabs | [elevenlabs.io](https://elevenlabs.io) | ✅ Yes |
| The Trivia API | [the-trivia-api.com](https://the-trivia-api.com) | ✅ Yes |

## Built At
Google x Hack the Valley Hackathon — April 2026

*Inspired by Stupid Ideas Hackathon (SIH)*
