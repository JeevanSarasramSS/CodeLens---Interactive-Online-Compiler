const express = require('express');
const cors = require('cors');
const compileRoute = require('./routes/compile');
const analyzeRoute = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/compile', compileRoute);
app.use('/api/analyze', analyzeRoute);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`✨ Compiler server running on http://localhost:${PORT}`);
});
