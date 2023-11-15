import express from 'express';
import dotenv from 'dotenv';
import router from './routes/routes.js';
import bodyParser from 'body-parser';
import NodeCache from 'node-cache';
import cors from 'cors';
import compression from 'compression';
import { fetch, setGlobalDispatcher, Agent } from 'undici';
// init caching
// export const storage = new NodeCache({
//   stdTTL: 86400,
//   checkperiod: 43200,
//   deleteOnExpire: true,
// });
// env
dotenv.config();
// init express app
const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('assets'));
//gzip
app.use(compression());
//port
const port = process.env.PORT || 3001;

// backend
app.use('/', router);
// app.get('*', (req, res) => {
//   res.sendFile('index.html', { root: '../client/dist' });
// });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
