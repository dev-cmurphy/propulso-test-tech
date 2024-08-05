import express from 'express';
import cors from 'cors';
import { analyze_csv } from './data_analysis';

const app = express();
const port = 3000;
const corsOptions = {
    origin: 'http://localhost:8081',
    optionsSuccessStatus: 200
};
  
app.use(cors(corsOptions));

app.get('/graphs', (req, res) => {
    console.log("Received request for metrics...");
    analyze_csv().then((results) => {
        console.log("Sending metrics...");
        res.json(results);
    })
    .catch((error) => {
      res.status(500).json({ error: `Failed to analyze CSV: ${error}` });
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
