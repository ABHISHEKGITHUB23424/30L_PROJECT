const express = require('express');
const cors = require('cors');
const { generateData } = require('./simulation');
const { processData } = require('./engine');

const app = express();
app.use(cors());

const PORT = 3001;

// Internal state
let currentData = generateData(48); // Generate initial 48 hours

// Endpoints

// 1. Raw Data for Visualization
app.get('/api/data', (req, res) => {
    // Regenerate data occasionally to simulate live updates or just return static for demo
    // For demo: just return the static 48h set
    res.json(currentData);
});

// 2. Insights & Readiness
app.get('/api/insight', (req, res) => {
    const insights = processData(currentData);
    res.json(insights);
});

// 3. Reset/Regenerate (Useful for Demo)
app.post('/api/regenerate', (req, res) => {
    currentData = generateData(48);
    res.json({ message: "New user data generated" });
});

app.listen(PORT, () => {
    console.log(`IPM Backend running on http://localhost:${PORT}`);
});
