const socket = io();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const chats       = document.querySelector(".chats");
const user_list   = document.querySelector(".user-list");
const users_count = document.querySelector(".users-count");
const msg_send    = document.querySelector("#user-send");
const user_msg    = document.querySelector("#user-msg");
const sendLabel   = document.getElementById("send-label");
const sendSpinner = document.getElementById("send-spinner");

// Mood UI
const moodPills          = document.querySelectorAll(".mood-pill");
const moodOverlay        = document.getElementById("mood-preview-overlay");
const previewOriginalEl  = document.getElementById("preview-original-text");
const previewEnhancedEl  = document.getElementById("preview-enhanced-text");
const moodPreviewEmoji   = document.getElementById("mood-preview-emoji");
const moodPreviewTitle   = document.getElementById("mood-preview-title");
const btnSendEnhanced    = document.getElementById("btn-send-enhanced");
const btnSendOriginal    = document.getElementById("btn-send-original");
const btnCancelPreview   = document.getElementById("btn-cancel-preview");

// ── State ─────────────────────────────────────────────────────────────────────
let username;
let activeMood = null;

const moodMeta = {
    funny:        { emoji: "😂", label: "Funny" },
    professional: { emoji: "💼", label: "Professional" },
    romantic:     { emoji: "💕", label: "Romantic" },
    hype:         { emoji: "🔥", label: "Hype" },
    cool:         { emoji: "😎", label: "Cool" },
    sad:          { emoji: "😢", label: "Sad" },
    savage:       { emoji: "🗡️", label: "Savage" },
    wholesome:    { emoji: "🌸", label: "Wholesome" }
};

// ── Username prompt ───────────────────────────────────────────────────────────
do {
    username = prompt("Enter Your Name:");
} while (!username);

socket.emit("new-user-joined", username);

// ── Socket events ─────────────────────────────────────────────────────────────
socket.on('user-connected', (name) => userJoinLeft(name, 'joined'));
socket.on('user-disconnected', (user) => userJoinLeft(user, 'left'));

socket.on('user-list', (users) => {
    user_list.innerHTML = "";
    const arr = Object.values(users);
    arr.forEach(name => {
        const p = document.createElement('p');
        p.innerText = name;
        user_list.appendChild(p);
    });
    users_count.innerHTML = arr.length;
});

socket.on('message', (data) => {
    appendMessage(data, 'incoming');
});

// ── Join / Left notification ──────────────────────────────────────────────────
function userJoinLeft(name, status) {
    const div = document.createElement("div");
    div.classList.add('user-join');
    div.innerHTML = `<p><b>${name}</b> ${status} the chat</p>`;
    chats.appendChild(div);
    chats.scrollTop = chats.scrollHeight;
}

// ── Mood pill toggle ──────────────────────────────────────────────────────────
moodPills.forEach(pill => {
    pill.addEventListener('click', () => {
        const mood = pill.dataset.mood;
        if (activeMood === mood) {
            // Deselect
            activeMood = null;
            pill.classList.remove('active');
            updateSendButton(false);
        } else {
            // Select new mood
            moodPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeMood = mood;
            updateSendButton(true);
        }
    });
});

function updateSendButton(hasMood) {
    if (hasMood) {
        sendLabel.textContent = "✨ ENHANCE";
        msg_send.classList.add('mood-active');
    } else {
        sendLabel.textContent = "SEND";
        msg_send.classList.remove('mood-active');
    }
}

// ── Send / Enhance ────────────────────────────────────────────────────────────
async function handleSend() {
    const text = user_msg.value.trim();
    if (!text) return;

    if (activeMood) {
        // Show loading state
        sendLabel.style.display = 'none';
        sendSpinner.style.display = 'inline-block';
        msg_send.disabled = true;

        try {
            const enhanced = await enhanceMessage(text, activeMood);
            // Show preview modal
            showPreview(text, enhanced, activeMood);
        } catch (err) {
            console.error('Enhancement failed:', err);
            // Fallback: just send original
            sendMessage(text, activeMood);
        } finally {
            sendLabel.style.display = 'inline';
            sendSpinner.style.display = 'none';
            msg_send.disabled = false;
        }
    } else {
        sendMessage(text, null);
    }
}

async function enhanceMessage(message, mood) {
    const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mood })
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.enhanced;
}

function sendMessage(text, mood) {
    const data = {
        user: username,
        msg:  text,
        mood: mood,
        time: new Date().toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', hour12: true
        }).toLowerCase()
    };
    appendMessage(data, 'outgoing');
    socket.emit('message', data);
    user_msg.value = '';
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function showPreview(original, enhanced, mood) {
    const meta = moodMeta[mood];
    moodPreviewEmoji.textContent = meta.emoji;
    moodPreviewTitle.textContent = `${meta.label} Mode — AI Enhanced`;
    previewOriginalEl.textContent = original;
    previewEnhancedEl.textContent = enhanced;
    moodOverlay.style.display = 'flex';

    // Wire up buttons (clone to clear old listeners)
    const newSendEnh = btnSendEnhanced.cloneNode(true);
    const newSendOri = btnSendOriginal.cloneNode(true);
    const newCancel  = btnCancelPreview.cloneNode(true);
    btnSendEnhanced.replaceWith(newSendEnh);
    btnSendOriginal.replaceWith(newSendOri);
    btnCancelPreview.replaceWith(newCancel);

    newSendEnh.addEventListener('click', () => {
        sendMessage(enhanced, mood);
        closePreview();
    });
    newSendOri.addEventListener('click', () => {
        sendMessage(original, null);
        closePreview();
    });
    newCancel.addEventListener('click', closePreview);
}

function closePreview() {
    moodOverlay.style.display = 'none';
    user_msg.value = '';
}

// Close preview on overlay background click
moodOverlay.addEventListener('click', (e) => {
    if (e.target === moodOverlay) closePreview();
});

// ── Append message to chat ────────────────────────────────────────────────────
function appendMessage(data, status) {
    const div = document.createElement('div');
    div.classList.add('message', status);

    const moodBadge = data.mood
        ? `<span class="mood-badge">${moodMeta[data.mood]?.emoji || ''} ${moodMeta[data.mood]?.label || ''} ✨</span>`
        : '';

    div.innerHTML = `
        <h5 id="user_name">${data.user}</h5>
        ${moodBadge}
        <p>${data.msg}</p>
        <h5 class="timestamp" id="unique">${data.time}</h5>
    `;

    chats.appendChild(div);
    chats.scrollTop = chats.scrollHeight;
}

// ── Keyboard shortcut ─────────────────────────────────────────────────────────
user_msg.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleSend();
    }
});

msg_send.addEventListener('click', handleSend);
