require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const goalsPath = path.join(__dirname, 'data', 'goals.json');
const historyPath = path.join(__dirname, 'data', 'history.json');

if (!token || !chatId) {
  console.error("❌ BOT_TOKEN or CHAT_ID missing");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("🤖 Telegram bot running");

const readGoals = () => {
  try {
    return JSON.parse(fs.readFileSync(goalsPath, 'utf8'));
  } catch {
    return [];
  }
};

const writeGoals = (goals) => {
  fs.writeFileSync(goalsPath, JSON.stringify(goals, null, 2));
};

const quotes = [
  "Believe you can and you're halfway there.",
  "Start where you are. Use what you have. Do what you can.",
  "Don't watch the clock; do what it does. Keep going.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Your limitation—it's only your imagination."
];

// Manual commands
bot.onText(/\/goals/, (msg) => {
  const goals = readGoals().filter(g => !g.completed);
  const text = goals.length
    ? goals.map(g => `- [${g.category}] ${g.text}`).join('\n')
    : "🎉 No pending goals!";
  bot.sendMessage(chatId, `🎯 *Your Goals:*\n${text}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/addgoal (.+)\|(.+)/, (msg, match) => {
  const [ , text, category ] = match;
  const goals = readGoals();
  goals.push({ id: uuidv4(), text: text.trim(), category: category.trim(), completed: false, recurring: false });
  writeGoals(goals);
  bot.sendMessage(chatId, `✅ Added: [${category.trim()}] ${text.trim()}`);
});

// Category-specific fixed daily reminders
const sendReminder = (category) => {
  const goal = readGoals().find(g => g.category === category && !g.completed);
  if (goal) {
    bot.sendMessage(chatId, `⏰ Reminder: [${goal.category}] ${goal.text}`);
  }
};

cron.schedule('0 9 * * *', () => sendReminder("🏃 Health"));
cron.schedule('0 14 * * *', () => sendReminder("💼 Work"));
cron.schedule('0 20 * * *', () => sendReminder("👤 Personal"));

// 🔁 New: Hourly full pending goals reminder with quote
cron.schedule('0 * * * *', () => {
  const goals = readGoals().filter(g => !g.completed);
  if (goals.length === 0) return;

  const text = goals.map(g => `- [${g.category}] ${g.text}`).join('\n');
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  bot.sendMessage(chatId, `🕐 *Hourly Reminder*\n${text}\n\n💡 _"${quote}"_`, { parse_mode: 'Markdown' });
});

// Show chat ID on any incoming message
bot.on('message', (msg) => {
  console.log('📥 Chat ID:', msg.chat.id);
});
