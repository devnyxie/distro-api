import express from 'express';
import { exportAllDistros } from '../distrowatch/scraper.js';
import { pool } from '../app.js';
import { getAllDistributions } from '../utils/general.js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
router.get('/', async (req, res) => {
  const currentUrl = `${req.protocol}://${req.hostname}:${req.socket.localPort}`;
  console.log(currentUrl);
  let all_distros = await getAllDistributions();
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
router.get('/distributions', async (req, res) => {
  try {
    const data = await getAllDistributions();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: `Internal Server Error. Details: ${error}` });
  }
});
router.get('/distribution', async (req, res) => {
  try {
    let identifier = req.query.identifier;
    pool.query(
      `SELECT * FROM distributions WHERE identifier = $1 LIMIT 1;`,
      [identifier.toLowerCase()],
      function (getErr, data) {
        if (getErr) {
          res.status(500).send('An error occured');
        } else {
          if (data) {
            res.json(data.rows[0]);
          } else {
            res.status(404).send('Not found');
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).send('An error occured');
  }
});

if (process.env.ENVIRONMENT === 'development') {
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
  router.get('/generate_readme', async (req, res) => {
    try {
      const distros = await getAllDistributions();
      let markdownContent = `
  # Distro-API: Your Go-To Linux Distributions API
  Distro-API is the ultimate Express.js-powered API, offering essential details and simple icons&badges for each of the 906 Linux distributions. When Distrowatch lacked an API, I stepped in to fill the gap.
  Dive into the world of Linux with Distro-API, simplifying access to distribution information for all Linux enthusiasts.\n All credits go to [Distrowatch](https://distrowatch.com/).

  ## Endpoints and Examples
  - All distributions:
  \n
  Endpoint: */distributions*
  \n
  Response example:
  \`\`\`
  [
    {
      "id": "ab8664ab-f4d8-4ee4-9b79-8b5f8169a42a",
      "identifier": "mx_linux",
      "name": "MX Linux",
        ...
    },
    {
      "id": "1b7bd668-2671-4c76-82ba-11ebe223bc49",
      "identifier": "endeavouros",
      "name": "EndeavourOS",
        ...
    },
  ]
  \`\`\`
  - Single distribution:
  \n
  Endpoint: */distribution?identifier=mx_linux*
  \n
  Response example:
  \`\`\`
  {
    "id": "ab8664ab-f4d8-4ee4-9b79-8b5f8169a42a",
    "identifier": "mx_linux",
    "name": "MX Linux",
    "description": "MX Linux, a desktop-oriented Linux distribution based on Debian\"s \"Stable\" branch, is a cooperative venture between the antiX and former MEPIS Linux communities. Using Xfce as the default desktop (with separate KDE Plasma and Fluxbox editions also available), it is a mid-weight operating system designed to combine an elegant and efficient desktop with simple configuration, high stability, solid performance and medium-sized footprint.",
    "distrowatch_page": "https://distrowatch.com/table.php?distribution=mx",
    "image_path": "http://res.cloudinary.com/dp3i1dce4/image/upload/v1701445859/icons/mx_linux.png.png",
    "homepage": "https://mxlinux.org/",
    "light_badge_path": "http://res.cloudinary.com/dp3i1dce4/image/upload/v1701456735/light_badges/mx_linux.png.png",
    "dark_badge_path": "http://res.cloudinary.com/dp3i1dce4/image/upload/v1701445860/dark_badges/mx_linux.png.png"
  }
  \`\`\`
  \n
  \n
  <br/>\n \n`;
      let tableStart = `| Distribution | Icon | Light Badge | Dark Badge |\n| ---- | :---: | :---: | :---: |\n`;

      distros.forEach((obj) => {
        tableStart += `| ${obj.name} | <img height="30px" width="max-content" src="${obj.image_path}"/> | <img height="30px" width="max-content" src="${obj.light_badge_path}"/> | <img height="30px" width="max-content" src="${obj.dark_badge_path}"/> |\n`;
      });
      markdownContent = markdownContent + tableStart;
      fs.writeFileSync('README.md', markdownContent, 'utf-8');
      res.end('Readme generated successfully.');
    } catch (error) {
      console.log(error);
      res.status(500).send('An error occured');
    }
  });
}

export default router;
