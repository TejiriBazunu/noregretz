chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PLAY_AUDIO') {
    const audio = new Audio(`data:audio/mpeg;base64,${message.audio}`);
    audio.play();
  }
});