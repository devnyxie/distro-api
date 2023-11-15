import express from 'express';
import { exportAllDistros } from '../sources/distrowatch/scraper.js';
import { pool } from '../app.js';
import { getAllDistributions } from '../utils/general.js';
import { spawn } from 'child_process';
import path from 'path';
const router = express.Router();
router.get('/', async (req, res) => {
  const currentUrl = `${req.protocol}://${req.hostname}:${req.socket.localPort}`;
  console.log(currentUrl);
  let all_distros = await getAllDistributions();
  console.log(all_distros[0]);
  // const all_distros = await storage.get('distributions');
  res.render('home', {
    distros: all_distros,
    currentUrl: currentUrl,
    helpers: {
      checkNull(variable, options) {
        if (variable) {
          return options.fn(this);
        }
        return '';
      },
    },
  });
});

router.get('/init_scrape', async (req, res) => {
  try {
    const startTime = process.hrtime();
    const data = await exportAllDistros();
    const endTime = process.hrtime(startTime);
    const elapsedTimeInSec = (endTime[0] + endTime[1] / 1e9).toFixed(2);
    res.status(200).json({
      message: `${data.length} distros were fetched successfully.`,
      length: data.length,
      time_taken: elapsedTimeInSec + 'sec',
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Internal Server Error. Details: ${error}` });
  }
});

router.get('/distros', async (req, res) => {
  try {
    const data = await getAllDistributions();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: `Internal Server Error. Details: ${error}` });
  }
});

router.get('/distro', async (req, res) => {
  try {
    let identifier = req.query.identifier;

    pool.get(
      `SELECT * FROM distributions WHERE identifier = $1 LIMIT 1;`,
      [identifier.toLowerCase()],
      function (getErr, row) {
        if (getErr) {
          res.status(500).send('An error occured');
        } else {
          if (row) {
            console.log('Row retrieved:', row);
            res.json(row);
          } else {
            res.status(404).send('Not found');
          }
        }
      }
    );
  } catch (error) {
    res.status(500).send('An error occured');
  }
});

export default router;
