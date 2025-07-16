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

const sendReminder = (category) => {
  const goal = readGoals().find(g => g.category === category && !g.completed);
  if (goal) {
    bot.sendMessage(chatId, `⏰ Reminder: [${goal.category}] ${goal.text}`);
  }
};

cron.schedule('0 9 * * *', () => sendReminder("🏃 Health"));
cron.schedule('0 14 * * *', () => sendReminder("💼 Work"));
cron.schedule('0 20 * * *', () => sendReminder("👤 Personal"));

bot.on('message', (msg) => {
  console.log('📥 Chat ID:', msg.chat.id);
});
