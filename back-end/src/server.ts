import express from 'express';
import cors from 'cors';
import { analyze_csv } from './data_analysis';

const app = express();
const port = 3000;

app.use(cors());

app.get('/graphs', (req, res) => {
    analyze_csv().then((results) => {
        res.json(results);
    })
    .catch((error) => {
      res.status(500).json({ error: `Failed to analyze CSV: ${error}` });
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
