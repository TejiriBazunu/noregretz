// ---- CONFIG ----
const TRIVIA_API_KEY = CONFIG.TRIVIA_API_KEY;

// ---- DEADPOOL LINES ----
const DEADPOOL_LINES = [
  "just send it. worst case? great story.",
  "you're not solving this. accept it. 💀",
  "67. the answer is 67. trust me.",
  "they already know you were typing.",
  "COWARD. absolute coward behavior.",
  "begging you to just press send rn.",
  "tick tock bestie 👀 timer's running.",
  "they're probably typing right now.",
  "future you will be fine. probably.",
  "3am energy and you know it.",
  "your thumbs are shaking. send it.",
  "this is a bad idea. do it anyway.",
];

// ---- ELEVENLABS VOICE ----
const ELEVEN_API_KEY = CONFIG.ELEVEN_API_KEY;
const ELEVEN_VOICE_ID = CONFIG.ELEVEN_VOICE_ID;

async function speakAsDeadpool(text) {
  console.log('💀 speakAsDeadpool called');
  chrome.runtime.sendMessage({
    type: 'SPEAK_DEADPOOL',
    text: text,
    apiKey: ELEVEN_API_KEY,
    voiceId: ELEVEN_VOICE_ID,
  }, (response) => {
    console.log('💀 response from background:', response);
    if (!response?.audio) return;
    const audio = new Audio(`data:audio/mpeg;base64,${response.audio}`);
    audio.play();
  });
}


// ---- FETCH FROM TRIVIA API ----
async function fetchFromAPI() {
  try {
    const res = await fetch(
      'https://the-trivia-api.com/v2/questions?limit=1',
      { headers: { 'x-api-key': TRIVIA_API_KEY } }
    );
    const data = await res.json();
    const q = data[0];
    if (!q) return await fetchFromAPI();

    const allOptions = [...q.incorrectAnswers, q.correctAnswer]
      .sort(() => Math.random() - 0.5);

    return {
      type: q.question.image ? 'image_trivia' : 'text_trivia',
      question: q.question.text,
      image: q.question.image || null,
      options: allOptions,
      answer: q.correctAnswer,
      timer: 9999,
    };
  } catch (err) {
    console.error('Trivia API error:', err);
    return await fetchFromAPI();
  }
}

async function fetchFromAPIWithDifficulty(difficulty) {
  try {
    const res = await fetch(
      `https://the-trivia-api.com/v2/questions?limit=1&difficulties=${difficulty}`,
      { headers: { 'x-api-key': TRIVIA_API_KEY } }
    );
    const data = await res.json();
    const q = data[0];
    if (!q) return await fetchFromAPI();

    const allOptions = [...q.incorrectAnswers, q.correctAnswer]
      .sort(() => Math.random() - 0.5);

    const timer = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 30 : 45;

    return {
      type: q.question.image ? 'image_trivia' : 'text_trivia',
      question: q.question.text,
      image: q.question.image || null,
      options: allOptions,
      answer: q.correctAnswer,
      timer,
      difficulty,
    };
  } catch (err) {
    return await fetchFromAPI();
  }
}

// ---- PICK RANDOM QUIZ ----
async function getRandomQuiz() {
  return await fetchFromAPI();
}


// ---- STATE ----
let overlayActive = false;
let pendingElement = null;
let timerInterval = null;
let roastInterval = null;
let timeLeft = 30;
let currentQuiz = null;
let pendingMessage = '';
let quizMusic = null;


// ---- INJECT GENERATE BUTTON ----
function injectGenerateButton() {
  if (document.getElementById('nr-generate-btn')) return;

  // Just check if we're on a messages page
  const messageInput = document.querySelector('[placeholder="Type a message..."]') ||
    document.querySelector('[class*="messageInput"]') ||
    document.querySelector('[class*="composer"]') ||
    document.querySelector('textarea');

  if (!messageInput) return;

  const btn = document.createElement('button');
  btn.id = 'nr-generate-btn';
  btn.innerHTML = `<img src="${chrome.runtime.getURL('images/deadpool.png')}" style="width:40px;height:40px;object-fit:contain;"/>`;
  btn.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: #0f0c29;
    border: 2px solid #ff4458;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    cursor: pointer;
    z-index: 99999;
    box-shadow: 0 4px 20px rgba(255,68,88,0.4);
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  `;

  btn.onmouseenter = () => btn.style.transform = 'scale(1.05)';
  btn.onmouseleave = () => btn.style.transform = 'scale(1)';

  // Make draggable
// Make draggable
let isDragging = false;
let isFloating = false;
let dragStartX, dragStartY, btnStartX, btnStartY;

btn.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  const rect = btn.getBoundingClientRect();
  btnStartX = rect.left;
  btnStartY = rect.top;
  isDragging = false;

  const onMouseMove = (e) => {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDragging = true;
      isFloating = true;
      btn.style.cursor = 'grabbing';
      btn.style.transition = 'none';
      btn.style.left = (btnStartX + dx) + 'px';
      btn.style.top = (btnStartY + dy) + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
    }
  };

  const onMouseUp = () => {
    btn.style.cursor = 'pointer';
    btn.style.transition = 'opacity 0.2s';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  e.preventDefault();
});


// Only trigger click if not dragging
btn.addEventListener('click', async (e) => {
  if (isDragging) {
    isDragging = false;
    return;
  }
  // Only trigger API if not floating OR if floating and clicked to lock
  btn.style.animation = 'nr-spin 0.8s linear infinite';
  btn.disabled = true;  

  const messageEls = Array.from(
    document.querySelectorAll('[class*="message"]')
  ).filter(el => {
    const text = el.innerText.trim();
    // Filter out UI noise — only keep short-ish actual messages
    return text.length > 0 && text.length < 500 && !el.querySelector('button') && !el.querySelector('input');
  });

const messages = messageEls.map(el => el.innerText.trim()).slice(-10).join('\n');

  try {
    const result = await generateSpicyMessage(messages || '');
    showGeneratedMessage(result);
  } catch (err) {
    console.error('Gemini error:', err);
    btn.style.animation = '';
    btn.disabled = false;
  }
});

  document.body.appendChild(btn);
}

// ---- SHOW GENERATED MESSAGE PREVIEW ----
function showGeneratedMessage(result) {
  const btn = document.getElementById('nr-generate-btn');
  if (btn) { btn.style.animation = ''; btn.disabled = false; }

  // Remove existing preview
  document.getElementById('nr-preview')?.remove();

  const spiceColor = result.spice <= 3 ? '#22c55e' : result.spice <= 7 ? '#f59e0b' : '#ef4444';
  const spiceLabel = result.spice <= 3 ? '🟢 Easy' : result.spice <= 7 ? '🟡 Medium' : '🔴 Hard';

  const preview = document.createElement('div');
  preview.id = 'nr-preview';
  const btnRect = document.getElementById('nr-generate-btn').getBoundingClientRect();
  const previewLeft = btnRect.right + 10;
  const previewTop = btnRect.top - 60;

  preview.style.cssText = `
      position: fixed;
      top: ${Math.max(10, previewTop)}px;
      left: ${Math.min(previewLeft, window.innerWidth - 340)}px;
      background: #0f0c29;
      border: 2px solid ${spiceColor};
      border-radius: 16px;
      padding: 16px 20px;
      width: 320px;
      z-index: 99999;
      font-family: 'Syne', sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    `;

  preview.innerHTML = `
    <div style="font-size:13px;color:#fff;font-weight:600;margin-bottom:10px;line-height:1.4;">"${result.message}"</div>
    <div style="display:flex;gap:8px;">
      <button id="nr-send-ai-btn" style="flex:1;background:${spiceColor};border:none;border-radius:8px;color:#fff;font-weight:700;padding:8px;cursor:pointer;font-family:'Syne',sans-serif;font-size:12px;">
        Just Send It 
      </button>
      <button id="nr-cancel-ai-btn" style="flex:1;background:transparent;border:1px solid #333;border-radius:8px;color:#666;font-weight:700;padding:8px;cursor:pointer;font-family:'Syne',sans-serif;font-size:12px;">
        No freakin Way
      </button>
    </div>
  `;
  document.body.appendChild(preview);

  // Send It — just sends immediately
  document.getElementById('nr-send-ai-btn').addEventListener('click', () => {
    preview.remove();
    pendingMessage = result.message;
    pendingElement = document.querySelector('[contenteditable="true"]') ||
      document.querySelector('textarea');
    actuallySend();
  });

  // Nah — launches quiz, fail = sends, pass = blocked
  document.getElementById('nr-cancel-ai-btn').addEventListener('click', () => {
    preview.remove();
    const difficulty = result.spice <= 3 ? 'easy' : result.spice <= 7 ? 'medium' : 'hard';
    pendingMessage = result.message;
    showTransitionScreen(difficulty, result.message);
  });
}

// ---- TRANSITION SCREEN ----
function showTransitionScreen(difficulty, message) {
  const screen = document.createElement('div');
  screen.id = 'nr-transition';
  screen.style.cssText = `
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    z-index: 999999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
  `;

  screen.innerHTML = `
    <img src="${chrome.runtime.getURL('images/deadpool.png')}" 
      id="nr-trans-dp"
      style="width:120px;height:120px;object-fit:contain;margin-bottom:24px;animation:nr-bounce 0.8s infinite;"/>
    <div id="nr-trans-text" style="
      max-width:600px;
      text-align:center;
      font-size:22px;
      font-weight:700;
      color:#fff;
      line-height:1.6;
      min-height:200px;
      padding: 0 40px;
    "></div>
    <button id="nr-trans-btn" style="
      margin-top:32px;
      background:#ff4458;
      border:none;
      border-radius:30px;
      color:#fff;
      font-family:'Syne',sans-serif;
      font-size:18px;
      font-weight:800;
      padding:16px 48px;
      cursor:pointer;
      opacity:0;
      transition:opacity 0.5s;
      box-shadow:0 4px 20px rgba(255,68,88,0.5);
      letter-spacing:0.5px;
    ">I'm Ready 💀</button>
  `;

  document.body.appendChild(screen);
  
  speakAsDeadpool(`Let's play a GAMEE... I got TOP tier rizzzz... won't you agree? You think it's too riskkyy, huuuh? Smart. So here's the deal — beat my quiz and I'll kill the message. Fail?...and it SENDS. AUTOMATICALLY...but hey, no regrets babyy.`);

  const fullText = `Let's play a game! I got top tier rizz won't you agree? You think it's too risky huh? So here's the deal — beat my quiz and I'll kill the message. Fail? and it...sends. AUTOMATICALLY...but hey man NOREGRETZ 💀`;

  const textEl = screen.querySelector('#nr-trans-text');
  const btn = screen.querySelector('#nr-trans-btn');
  let i = 0;

  const typeInterval = setInterval(() => {
    if (i < fullText.length) {
      textEl.textContent += fullText[i];
      i++;
    } else {
  clearInterval(typeInterval);
  
  // Fade out text
  btn.style.display = 'none';

  // Pause 2 seconds showing the full text, then fade out
  setTimeout(() => {
    textEl.style.transition = 'opacity 0.5s';
    textEl.style.opacity = '0';

    setTimeout(() => {
    textEl.innerHTML = `<div id="nr-countdown" style="font-size:120px;font-weight:900;color:#fff;line-height:1;">3</div>`;
    textEl.style.opacity = '1';

    let count = 3;
    const countdown = setInterval(() => {
      count--;
      if (count > 0) {
        document.getElementById('nr-countdown').textContent = count;
     } else {
      clearInterval(countdown);
      // Pre-fetch quiz while transition screen still visible
      fetchFromAPIWithDifficulty(difficulty).then(quiz => {
        currentQuiz = quiz;
        timeLeft = quiz.timer;
        pendingElement = document.querySelector('[contenteditable="true"]') ||
          document.querySelector('textarea');

        const overlay = document.createElement('div');
        overlay.id = 'noregretz-overlay';
        overlay.innerHTML = buildOverlayHTML(quiz);
        overlay.style.opacity = '0';
        document.body.appendChild(overlay);

        // Fade transition out and quiz in simultaneously
        screen.style.transition = 'opacity 0.4s ease';
        screen.style.opacity = '0';
        overlay.style.transition = 'opacity 0.4s ease';
        overlay.style.opacity = '1';
        overlayActive = true;

        setTimeout(() => {
          screen.remove();
          quizMusic = new Audio(chrome.runtime.getURL('audio/quiz-audio.mp3'));
          quizMusic.loop = true;
          quizMusic.volume = 0.4;
          quizMusic.play();
          startTimer(overlay);
          startDeadpool(overlay);
          attachQuizListeners(overlay);
        }, 400);
      });
    }
    }, 1000);
  }, 500);
  }, 2000);
}
  }, 85);
}

// ---- SHOW OVERLAY WITH DIFFICULTY ----
async function showOverlayWithDifficulty(difficulty, message) {
  overlayActive = true;
  currentQuiz = await fetchFromAPIWithDifficulty(difficulty);
  timeLeft = currentQuiz.timer;
  pendingElement = document.querySelector('[contenteditable="true"]') ||
    document.querySelector('textarea');

  const overlay = document.createElement('div');
  overlay.id = 'noregretz-overlay';
  overlay.innerHTML = buildOverlayHTML(currentQuiz);
  document.body.appendChild(overlay);

  quizMusic = new Audio(chrome.runtime.getURL('audio/quiz-audio.mp3'));
  quizMusic.loop = true;
  quizMusic.volume = 0.4;
  quizMusic.play();

  startTimer(overlay);
  startDeadpool(overlay);
  attachQuizListeners(overlay);
}


function buildQuestionHTML(quiz) {
  if (quiz.type === 'image_trivia') {
    return `
      <div class="nr-question-box">
        ${quiz.image ? `<img src="${quiz.image}" class="nr-famous-img" alt=""/>` : ''}
        <div class="nr-trivia-question">${quiz.question}</div>
      </div>
    `;
  }
  // text_trivia falls through to here
  return `
    <div class="nr-question-box">
      <div class="nr-trivia-question">${quiz.question}</div>
    </div>
  `;
}

// ---- BUILD OVERLAY HTML ----
function buildOverlayHTML(quiz) {
  return `
    <div style="width:100%;height:100vh;display:flex;flex-direction:column;">
      
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;gap:20px;position:relative;">
  <div style="position:absolute;top:16px;right:24px;display:flex;align-items:center;justify-content:center;">
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r="24" fill="none" stroke="#333" stroke-width="4"/>
      <circle id="nr-timer-circle" cx="28" cy="28" r="24" fill="none" stroke="#22c55e" stroke-width="4"
        stroke-dasharray="${2 * Math.PI * 24}" stroke-dashoffset="0"
        stroke-linecap="round" transform="rotate(-90 28 28)"/>
    </svg>
    <div id="nr-timer-text" style="position:absolute;font-size:16px;font-weight:800;color:#22c55e;font-family:'Space Mono',monospace;">${currentQuiz.timer}</div>
  </div>
        <div class="nr-deadpool-row">
          <img src="${chrome.runtime.getURL('images/deadpool.png')}" class="nr-deadpool-img" alt="deadpool"/>
          <div class="nr-speech-bubble" id="nr-speech">
            <div class="nr-bubble-dot-1"></div>
            <div class="nr-bubble-dot-2"></div>
            <div class="nr-bubble-dot-3"></div>
            ${DEADPOOL_LINES[Math.floor(Math.random() * DEADPOOL_LINES.length)]}
          </div>
        </div>
        <div id="nr-quiz-area" style="width:100%;max-width:900px;">
          ${buildQuestionHTML(quiz)}
        </div>
      </div>

      <div class="nr-options-grid" id="nr-options">
        ${quiz.options.map((opt, i) => `
          <button class="nr-option-btn" data-answer="${opt}">
            <span class="nr-option-letter">${['A','B','C','D'][i]}</span>
            ${opt}
          </button>
        `).join('')}
      </div>

    </div>
  `;
}


// ---- TIMER ----
function startTimer(overlay) {
  const circle = overlay.querySelector('#nr-timer-circle');
  const text = overlay.querySelector('#nr-timer-text');
  const total = currentQuiz.timer;
  const circumference = 2 * Math.PI * 24;

  timerInterval = setInterval(() => {
    timeLeft--;
    const color = timeLeft <= 5
      ? '#ef4444'
      : timeLeft <= 10
      ? '#f59e0b'
      : '#22c55e';
    const offset = circumference * (1 - timeLeft / total);

    if (circle) {
      circle.style.strokeDashoffset = offset;
      circle.style.stroke = color;
    }
    if (text) {
      text.textContent = timeLeft;
      text.style.color = color;
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      actuallySend();
    }
  }, 1000);
}

// ---- DEADPOOL ROTATOR ----
function startDeadpool(overlay) {
  roastInterval = setInterval(() => {
    const bubble = overlay.querySelector('#nr-speech');
    if (bubble) {
      bubble.innerHTML = `
        <div class="nr-bubble-dot-1"></div>
        <div class="nr-bubble-dot-2"></div>
        <div class="nr-bubble-dot-3"></div>
        ${DEADPOOL_LINES[Math.floor(Math.random() * DEADPOOL_LINES.length)]}
      `;
    }
  }, 3000);
}

// ---- ATTACH QUIZ LISTENERS ----
function attachQuizListeners(overlay) {
  overlay.querySelectorAll('.nr-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.nr-option-btn')
        .forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      setTimeout(() => checkAnswer(btn.dataset.answer, overlay), 300);
    });
  });
}


// ---- CHECK ANSWER ----
function checkAnswer(answer, overlay) {
  // Stop quiz music immediately
  if (quizMusic) {
    quizMusic.pause();
    quizMusic.currentTime = 0;
    quizMusic = null;
  }

  if (answer?.toLowerCase().trim() === currentQuiz.answer?.toLowerCase().trim()) {
    const correctSound = new Audio(chrome.runtime.getURL('audio/correct-answer.mp3'));
    correctSound.play();

    overlay.style.transition = 'box-shadow 0.1s';
    let flashes = 0;
    const flashGreen = setInterval(() => {
      overlay.style.boxShadow = flashes % 2 === 0 
        ? 'inset 0 0 0 6px #22c55e' 
        : 'inset 0 0 0 6px transparent';
      flashes++;
      if (flashes >= 10) {
        clearInterval(flashGreen);
        overlay.style.boxShadow = '';
        cleanup();
        removeOverlay();
        showBlockedToast();
      }
    }, 250);
  } else {
    const wrongSound = new Audio(chrome.runtime.getURL('audio/wrong-answer.mp3'));
    wrongSound.play();

    let flashes = 0;
    const flashRed = setInterval(() => {
      overlay.style.boxShadow = flashes % 2 === 0 
        ? 'inset 0 0 0 6px #ef4444' 
        : 'inset 0 0 0 6px transparent';
      flashes++;
      if (flashes >= 10) {
        clearInterval(flashRed);
        overlay.style.boxShadow = '';
        const quizArea = overlay.querySelector('#nr-quiz-area');
        if (quizArea) {
          quizArea.classList.add('nr-shake');
          setTimeout(() => {
            quizArea.classList.remove('nr-shake');
            // Save refs before cleanup clears them
            const el = pendingElement;
            const msg = pendingMessage;
            cleanup();
            pendingElement = el;
            pendingMessage = msg;
            actuallySend();
          }, 600);
        }
      }
    }, 250);
  }
}
// ---- ACTUALLY SEND ----
function actuallySend() {
  if (!pendingElement || !pendingMessage) return;

  pendingElement.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('delete', false, null);
  document.execCommand('insertText', false, pendingMessage);

  setTimeout(() => {
    const sendBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim() === 'Send');

    if (sendBtn) {
      sendBtn.focus();
      sendBtn.click();
      setTimeout(() => sendBtn.click(), 100);
    } else {
      ['keydown', 'keypress', 'keyup'].forEach(eventType => {
        pendingElement.dispatchEvent(new KeyboardEvent(eventType, {
          key: 'Enter', code: 'Enter', keyCode: 13,
          bubbles: true, cancelable: true,
        }));
      });
    }
    pendingMessage = '';
    removeOverlay();
  }, 300);
}

// ---- BLOCKED TOAST ----
function showBlockedToast() {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: #22c55e;
    color: #fff;
    padding: 12px 28px;
    border-radius: 30px;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 20px rgba(34,197,94,0.4);
    letter-spacing: 0.3px;
  `;
  toast.textContent = '🛡️ Message blocked. Good call.';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---- CLEANUP ----
function cleanup() {
  clearInterval(timerInterval);
  clearInterval(roastInterval);
  overlayActive = false;
  pendingElement = null;
  if (quizMusic) {
    quizMusic.pause();
    quizMusic.currentTime = 0;
    quizMusic = null;
  }
}
function removeOverlay() {
  document.getElementById('noregretz-overlay')?.remove();
}

// ---- INIT ----
injectGenerateButton();
console.log('💀 NoRegretz loaded — think before you send');

const observer = new MutationObserver(() => {
  injectGenerateButton();
});
observer.observe(document.body, { childList: true, subtree: true });