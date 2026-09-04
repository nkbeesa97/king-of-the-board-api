const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`King of the Board API listening on http://localhost:${PORT}`);
});
