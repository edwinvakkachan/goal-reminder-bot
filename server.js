require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const basicAuth = require('express-basic-auth');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// ✅ Ensure admin credentials are set
if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
  console.error("❌ ADMIN_USER or ADMIN_PASS is missing from environment variables");
  process.exit(1);
}

// ✅ Setup data paths
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
const goalsPath = path.join(dataDir, 'goals.json');
const historyPath = path.join(dataDir, 'history.json');

// ✅ Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(basicAuth({
  users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
  challenge: true
}));

// ✅ Helper functions
function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ✅ API Routes

// Get all goals (optional category filter)
app.get('/api/goals', (req, res) => {
  const category = req.query.category;
  let goals = loadJSON(goalsPath);
  if (category) goals = goals.filter(g => g.category === category);
  res.json(goals);
});

// Add a new goal
app.post('/api/goals', (req, res) => {
  const { text, category, recurring } = req.body;
  if (!text || !category) return res.status(400).json({ error: 'Text and category are required' });
  const goals = loadJSON(goalsPath);
  goals.push({ id: uuidv4(), text, category, completed: false, recurring: !!recurring });
  saveJSON(goalsPath, goals);
  res.status(201).json({ message: 'Goal added' });
});

// Delete a goal
app.delete('/api/goals/:id', (req, res) => {
  let goals = loadJSON(goalsPath);
  const updated = goals.filter(g => g.id !== req.params.id);
  if (updated.length === goals.length) return res.status(404).json({ error: 'Not found' });
  saveJSON(goalsPath, updated);
  res.json({ message: 'Deleted' });
});

// Mark a goal as complete and move to history
app.patch('/api/goals/:id/complete', (req, res) => {
  let goals = loadJSON(goalsPath);
  const history = loadJSON(historyPath);
  const index = goals.findIndex(g => g.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const goal = goals.splice(index, 1)[0];
  goal.completed = true;
  goal.completedAt = new Date().toISOString();

  saveJSON(goalsPath, goals);
  history.push(goal);
  saveJSON(historyPath, history);
  res.json({ message: 'Marked completed and moved to history' });
});

// ✅ Start the server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
