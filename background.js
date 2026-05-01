chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SPEAK_DEADPOOL') {
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${message.voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': message.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
        stability: 0.0,
        similarity_boost: 1.0,
        style: 0.35,
        speed: 1.0,
        use_speaker_boost: true,
        },
      }),
    })
    .then(res => res.arrayBuffer())
    .then(async buffer => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Create offscreen document if it doesn't exist
      const existing = await chrome.offscreen.hasDocument();
      if (!existing) {
        await chrome.offscreen.createDocument({
          url: 'offscreen.html',
          reasons: ['AUDIO_PLAYBACK'],
          justification: 'Playing Deadpool voice',
        });
      }

      chrome.runtime.sendMessage({ type: 'PLAY_AUDIO', audio: base64 });
      sendResponse({ ok: true });
    })
    .catch(err => {
      console.error('ElevenLabs error:', err);
      sendResponse({ error: err.message });
    });
    return true;
  }
});