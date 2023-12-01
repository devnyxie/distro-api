import express from 'express';
import dotenv from 'dotenv';
import router from './routes/routes.js';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { engine } from 'express-handlebars';
import pg from 'pg';
// env
dotenv.config();

//PG
export const pool = new pg.Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
const initialQuery = `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE IF NOT EXISTS distributions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        identifier TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        distrowatch_page TEXT,
        image_path TEXT,
        homepage TEXT,
        light_badge_path TEXT,
        dark_badge_path TEXT,
        CONSTRAINT unique_identifier UNIQUE (identifier)
      );
    `;
pool.query(initialQuery, function (runErr) {
  if (runErr) {
    console.error(runErr);
  } else {
    console.log('Connected & configured the Database successfully ✅');
  }
});

// init express app
const app = express();
//views setup
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(path.resolve('.'), 'src', 'views'));
//
app.use(express.json());
app.use(bodyParser.json());
app.use(
  cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
app.use(express.static('public'));
app.use('/', router);

process.on('SIGINT', () => {
  pool.end((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('\nClosed the database connection.');
    process.exit(0);
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running...`);
});
