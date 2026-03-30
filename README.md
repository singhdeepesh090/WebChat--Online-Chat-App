# WebChat — Real-time Chat App with Mood Feature

## Setup

1. Install dependencies:
   npm install

2. Create your `.env` file (copy from `.env.example`):
   cp .env.example .env

3. Open `.env` and paste your Gemini API key:
   GEMINI_API_KEY=your_key_here

4. Add your icons (chat.png, message.png, qrcode.png) into /public/icons/

5. Start the server:
   npm start
   or for development:
   npm run dev

6. Open http://localhost:7860

## Mood Feature
- Select a mood pill above the chat input (Funny, Pro, Romantic, Hype, Cool, Sad, Savage, Wholesome)
- Type your message and click ✨ ENHANCE
- Preview original vs AI-enhanced message
- Choose to send either version!
