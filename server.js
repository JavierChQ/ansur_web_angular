const express = require('express');
const path = require('path');

const app = express();

const distPath = path.join(__dirname, 'dist/proyecto-instituto/browser');
const indexPath = path.join(distPath, 'index.html');

app.use(express.static(distPath));

app.use((req, res) => {
  res.sendFile(indexPath);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});