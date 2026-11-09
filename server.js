const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Раздаём статику
app.use(express.static(path.join(__dirname, 'public')));

// CORS для встраивания на чужие сайты
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// API: границы России
app.get('/api/borders', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'russia.geojson');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'russia.geojson not found',
      hint: 'Download it and put into data/ folder'
    });
  }
  res.setHeader('Content-Type', 'application/json');
  fs.createReadStream(filePath).pipe(res);
});

// API: города России
app.get('/api/cities', (req, res) => {
  const cities = [
    { name: 'Москва', lat: 55.7558, lon: 37.6173 },
    { name: 'Санкт-Петербург', lat: 59.9343, lon: 30.3351 },
    { name: 'Новосибирск', lat: 55.0084, lon: 82.9357 },
    { name: 'Екатеринбург', lat: 56.8389, lon: 60.6057 },
    { name: 'Казань', lat: 55.7963, lon: 49.1088 },
    { name: 'Владивосток', lat: 43.1155, lon: 131.8855 },
    { name: 'Мурманск', lat: 68.9585, lon: 33.0827 },
    { name: 'Сочи', lat: 43.5855, lon: 39.7231 },
    { name: 'Красноярск', lat: 56.0153, lon: 92.8932 },
    { name: 'Омск', lat: 54.9885, lon: 73.3242 }
  ];
  res.json(cities);
});

// Health-check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ API running: http://localhost:${PORT}`);
  console.log(`✅ Demo page:  http://localhost:${PORT}/index.html`);
});
