import path from 'path';
import fs from 'fs';
import { pool } from '../app.js';
import puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';

export function createDirs() {
  const iconsPath = path.join(path.resolve('.'), 'public', 'icons');
  const lightBadgesPath = path.join(
    path.resolve('.'),
    'public',
    'light_badges'
  );
  const darkBadgesPath = path.join(path.resolve('.'), 'public', 'dark_badges');

  const pathsToCreate = [iconsPath, lightBadgesPath, darkBadgesPath];
  pathsToCreate.forEach((pathToCheck) => {
    fs.access(pathToCheck, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // Directory doesn't exist, create it
          fs.mkdir(pathToCheck, { recursive: true }, (error) => {
            if (error) {
              console.error('Error creating directory:', error);
              return;
            }
            console.log('Directory created:', pathToCheck);
          });
        } else {
          // Other error occurred
          console.error('Error accessing directory:', err);
        }
      } else {
        console.log('Directory already exists:', pathToCheck);
      }
    });
  });
}

export function convertToSnakeCase(inputString) {
  return inputString.replace(/[\/\s]+/g, '_').toLowerCase();
}

export function extractFormat(url) {
  const format = url.match(/\.([^/?#]+)(?:[?#]|$)/i);
  if (format && format[1]) {
    return format[1].toLowerCase(); // Return the format in lowercase
  } else {
    return null; // Format not found or invalid URL
  }
}

export async function launchPuppeteerBrowser() {
  const browser = await puppeteer.launch({
    headless: 'new',
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  return browser;
}

export async function loadPage(url) {
  const browser = await launchPuppeteerBrowser();
  let html = undefined;
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    html = await page.content();
  } catch (error) {
    await browser.close();
    console.error('Error occurred:', error);
  } finally {
    await browser.close();
    return html;
  }
}

export function saveDistrosToDB(distros) {
  for (let i = 0; i < distros.length; i++) {
    try {
      let distro = distros[i];
      distro['id'] = uuidv4();
      if (distro['distrowatch_image_path']) {
        delete distro.distrowatch_image_path;
      }
      const columns = Object.keys(distro).filter((key) => distro[key]); // Filtering out properties with no data
      const values = columns.map((col) => distro[col]);

      const insertQuery = `
      INSERT INTO distributions (${columns.join(', ')})
      VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')})
      ON CONFLICT (identifier) DO UPDATE
      SET ${columns.map((col, index) => `${col} = $${index + 1}`).join(', ')}
      RETURNING *;`;

      pool.run(insertQuery, values, (err, rows) => {
        if (err) {
          console.error('Error executing query:', err);
        } else {
          console.log(`${distro.name} was successfully inserted ✅`);
        }
      });
    } catch (error) {
      console.log('An error occured while trying to push distro in PG.');
    }
  }
}

export const getAllDistributions = async () => {
  return new Promise((resolve, reject) => {
    pool.all(`SELECT * FROM distributions;`, function (getErr, rows) {
      if (getErr) {
        reject(getErr);
      } else {
        if (rows) {
          resolve(rows);
        } else {
          resolve(null);
        }
      }
    });
  });
};
