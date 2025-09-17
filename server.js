const path = require('path');
const express = require('express');
const morgan = require('morgan');

require('dotenv').config();

const askHandler = require('./api/ask');
const signupHandler = require('./api/signup');
const generatePlanHandler = require('./api/generate-plan');
const googleBriefingHandler = require('./api/google-briefing');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function wrapServerless(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

app.all('/api/signup', wrapServerless(signupHandler));
app.all('/api/ask', wrapServerless(askHandler));
app.all('/api/generate-plan', wrapServerless(generatePlanHandler));
app.all('/api/google-briefing', wrapServerless(googleBriefingHandler));

app.get('/healthz', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

const publicDir = __dirname;
app.use(express.static(publicDir, { extensions: ['html'] }));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ ok: false, error: 'Unexpected server error' });
});

app.listen(PORT, () => {
  console.log(`QuantumDrive server running on http://localhost:${PORT}`);
});
