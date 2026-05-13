import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve static files from the appropriate directory
const staticPath = process.env.NODE_ENV === 'production' ? __dirname : path.join(__dirname, 'dist');
console.log(`Serving static files from: ${staticPath}`);

// Check if index.html exists
const indexPath = path.join(staticPath, 'index.html');
if (!require('fs').existsSync(indexPath)) {
  console.error(`index.html not found at: ${indexPath}`);
}

app.use(express.static(staticPath));

// Handle SPA routing: send index.html for any route that doesn't match a static file
app.get('*', (req, res) => {
  console.log(`Serving index.html for route: ${req.url}`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`Error serving index.html: ${err}`);
      res.status(500).send('Internal Server Error');
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});