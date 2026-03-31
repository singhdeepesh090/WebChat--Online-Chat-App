require("dotenv").config();
const http = require("http");
const express = require("express");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 7860;

app.use(express.static(__dirname + '/public'));
app.use(express.json()); 

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


const GEMINI_API_KEY = process.env.API_Key;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${"API_Key"}`;

app.post('/api/enhance', async (req, res) => {
    const { message, mood } = req.body;

    if (!message || !mood) {
        return res.status(400).json({ error: 'message and mood are required' });
    }

    const moodInstructions = {
        funny:        "Rewrite this chat message to be funny, witty, and humorous. Add a joke or playful twist.",
        professional: "Rewrite this chat message in a polished, professional, and formal tone.",
        romantic:     "Rewrite this chat message in a warm, romantic, and affectionate tone.",
        hype:         "Rewrite this chat message with extreme energy, excitement, and hype! Use caps and emojis.",
        cool:         "Rewrite this chat message to sound laid-back, cool, and effortlessly casual.",
        sad:          "Rewrite this chat message with a melancholic, heartfelt, and emotional tone.",
        savage:       "Rewrite this chat message to be brutally honest, bold, and savage (but not offensive).",
        wholesome:    "Rewrite this chat message to be super wholesome, kind, and heartwarming."
    };

    const instruction = moodInstructions[mood];
    if (!instruction) {
        return res.status(400).json({ error: 'Invalid mood' });
    }

    try {
        const response = await fetch(GEMINI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${instruction}. Keep it concise (1–2 sentences). Return ONLY the rewritten message — no explanation, no quotes, no preamble.\n\nOriginal: ${message}`
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 150,
                    temperature: 0.9
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('Gemini error:', data.error);
            return res.status(500).json({ error: 'AI enhancement failed' });
        }

        const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!enhanced) {
            return res.status(500).json({ error: 'Empty response from Gemini' });
        }

        res.json({ enhanced });

    } catch (err) {
        console.error('Enhance error:', err);
        res.status(500).json({ error: 'Server error during enhancement' });
    }
});


const io = require("socket.io")(server);
var users = {};

io.on("connection", (socket) => {
    socket.on("new-user-joined", (username) => {
        users[socket.id] = username;
        socket.broadcast.emit('user-connected', username);
        io.emit("user-list", users);
    });

    socket.on("disconnect", () => {
        socket.broadcast.emit('user-disconnected', users[socket.id]);
        delete users[socket.id];
        io.emit("user-list", users);
    });

    socket.on('message', (data) => {
        socket.broadcast.emit("message", {
            user: data.user,
            msg: data.msg,
            mood: data.mood || null,  
            time: new Date().toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit', hour12: true
            }).toLowerCase()
        });
    });
});

server.listen(port, () => {
    console.log("Server started at port " + port);
});
