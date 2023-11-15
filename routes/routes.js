import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import fetchIcon from '../utils/fetchImage.js';
import fetchWiki from '../utils/fetchWiki.js';
import { calculateTimeTaken } from '../utils/general.js';
import createBadge from '../utils/createBadge.js';

const router = express.Router();

router.get('/scan', async (req, res) => {
  try {
    const fullUrl = req.protocol + '://' + req.get('host');
    // time for total time taken
    const startTime = Date.now();
    //retrieve all distros from wiki
    let distros = await fetchWiki();

    //  --- fetch favicons block --- requires only distros array
    const fetchIconPromises = distros.map(async (distro, index) => {
      const response = await fetchIcon(distro, fullUrl); //here
      distros[index]['image_path'] = response.path;
      return;
    });
    await Promise.all(fetchIconPromises);
    // --

    // --
    // time for total time taken
    const endTime = Date.now();
    const timeTakenMS = endTime - startTime;
    // BADGES
    for (let index = 0; index < distros.length; index++) {
      const location = await createBadge(distros[index], fullUrl);
      distros[index]['badge_location'] = location;
    }

    res.status(200).json({
      time_taken: calculateTimeTaken(timeTakenMS),
      length: distros.length,
      distros: distros,
    });
    //  ---
  } catch (error) {
    res.status(500).json({ error: `Internal Server Error. Details: ${error}` });
  }
});

router.get('/favicon', async (req, res) => {
  const fullUrl = req.protocol + '://' + req.get('host');
  const distros = [
    {
      name: 'EasyPeasy',
      identifier: 'easypeasy',
      url: 'http://www.geteasypeasy.com',
    },
    {
      name: 'EasyPeasy',
      identifier: 'easypeasy',
      url: 'http://www.geteasypeasy.com',
    },
  ];
  // return
  const fetchIconPromises = distros.map(async (distro, index) => {
    const response = await fetchIcon(distro, fullUrl);
    distros[index]['image_path'] = response.path;
    return;
  });
  await Promise.all(fetchIconPromises);
  res.send(distros);
});

export default router;
