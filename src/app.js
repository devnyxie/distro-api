import express from 'express';
import dotenv from 'dotenv';
import router from './routes/routes.js';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import compression from 'compression';
import Handlebars from 'handlebars';
import { engine } from 'express-handlebars';
import { Agent } from 'undici';
import undici from 'undici';
import { createDirs, getAllDistributions } from './utils/general.js';
import pg from 'pg';
import sqlite3 from 'sqlite3';
// env
dotenv.config();

const dispatcher = new Agent({ connectTimeout: 90000 });
undici.setGlobalDispatcher(dispatcher);

//PG
// export const pool = new pg.Pool({
//   user: process.env.PG_USER,
//   host: process.env.PG_HOST,
//   database: process.env.PG_DATABASE,
//   password: process.env.PG_PASSWORD,
//   port: process.env.PG_PORT,
// });
// pool.query('SELECT NOW()', (err, res) => {
//   if (err) {
//     console.error('Error executing query', err);
//   } else {
//     console.log('Connected to PostgreSQL database:', res.rows[0].now);
//   }
// });

//SQLite3
export const pool = new sqlite3.Database('database.db', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the SQLite database, configuring the DB...');
    const initialQuery = `
      CREATE TABLE IF NOT EXISTS distributions (
        id TEXT PRIMARY KEY,
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
    pool.run(initialQuery, function (runErr) {
      if (runErr) {
        console.error(runErr.message);
      } else {
        console.log('Configured the DB successfully ✅');
      }
    });
  }
});
// Function to create the database

// Call the function to create the database
// pool.serialize(() => {
//   pool.run('CREATE TABLE lorem (info TEXT)');

//   const stmt = pool.prepare('INSERT INTO lorem VALUES (?)');
//   for (let i = 0; i < 10; i++) {
//     stmt.run('Ipsum ' + i);
//   }
//   stmt.finalize();

//   pool.each('SELECT rowid AS id, info FROM lorem', (err, row) => {
//     console.log(row.id + ': ' + row.info);
//   });
// });

// init express app
const app = express();
//views setup
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(path.resolve('.'), 'src', 'views'));
//
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('assets'));
//gzip
app.use(compression());
//port
//create directories for images & badges (empty dirs are not pushed to Git)
createDirs();

app.use('/', router);

process.on('SIGINT', () => {
  pool.close((err) => {
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
