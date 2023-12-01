import { pool } from '../app.js';
import puppeteer from 'puppeteer';

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
  return new Promise((resolve, reject) => {
    const promises = [];

    for (let i = 0; i < distros.length; i++) {
      const distro = distros[i];
      if (distro['distrowatch_image_path']) {
        delete distro.distrowatch_image_path;
      }

      const columns = Object.keys(distro).filter((key) => distro[key]);
      const values = columns.map((col) => distro[col]);

      const insertQuery = `
        INSERT INTO distributions (${columns.join(', ')})
        VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')})
        ON CONFLICT (identifier) DO UPDATE
        SET ${columns.map((col, index) => `${col} = $${index + 1}`).join(', ')}
        RETURNING *;`;

      const promise = new Promise((resolveQuery, rejectQuery) => {
        pool.query(insertQuery, values, (err, rows) => {
          if (err) {
            console.error('Error executing query:', err);
            rejectQuery(err);
          } else {
            console.log(`${distro.name} was successfully inserted ✅`);
            resolveQuery(rows);
          }
        });
      });

      promises.push(promise);
    }

    Promise.all(promises)
      .then(() => resolve())
      .catch((error) => reject(error));
  });
}

export const getAllDistributions = async () => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT *
      FROM distributions
     ;
      `,
      function (getErr, rows) {
        if (getErr) {
          reject(getErr);
        } else {
          if (rows) {
            resolve(rows.rows);
          } else {
            resolve(null);
          }
        }
      }
    );
  });
};
