import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { exit } from 'process';
import path from 'path';
import fs from 'fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// -----

//cloudinary
console.error('cloudinary config...');

cloudinary.config({
  secure: true,
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

// -----

export function extractFormat(url) {
  const format = url.match(/\.([^/?#]+)(?:[?#]|$)/i);
  if (format && format[1]) {
    return format[1].toLowerCase(); // Return the format in lowercase
  } else {
    return null; // Format not found or invalid URL
  }
}

export function extractDescription(clonedTd, distro) {
  try {
    //description block
    let modified_distro = distro;
    console.error('Starting description block...');
    clonedTd.find('img, hr').remove();
    clonedTd.find('p,span,h1,h2,ul,b,a').remove();
    const text = clonedTd.html(); // Get HTML content
    const separatorIndex = text.indexOf('<br><br>');
    let description = text.substring(0, separatorIndex).trim();
    description = description
      .replace(/\n/g, '')
      .replace(/<br>/g, '')
      .replace(/  /g, '')
      .replace(/`|'/g, '"');
    if (description) {
      modified_distro['description'] = description;
    }
    return modified_distro;
    //end of description block
  } catch (error) {
    console.error(error);
    return distro;
  }
}

export function extractHomepage($_wm, distro) {
  console.error('Starting homepage block...');
  try {
    let modified_distro = distro;
    const infoTable = $_wm('table.Info');
    const homePageTh = infoTable.find('th.Info:contains("Home Page")');
    const tdNextToTh = homePageTh.next('td.Info');
    const anchorHref = tdNextToTh.find('a').attr('href');
    modified_distro['homepage'] = anchorHref;
    return modified_distro;
  } catch (error) {
    return distro;
  }
}

export async function extractIcon(html, distro, page) {
  console.error('extractIcon block');
  //image fetch block
  try {
    let modified_distro = distro;
    const imgSrc = `https://distrowatch.com/${html.find('img').attr('src')}`;
    await page.setDefaultNavigationTimeout(0);
    const response = await page.goto(imgSrc, {
      waitUntil: 'networkidle0',
      responseType: 'arraybuffer',
    });
    const imageBuffer = await response.buffer();
    const image_scanned = await imageType(imageBuffer);
    const extractedFormat = await extractFormat(imgSrc);
    const format = image_scanned.ext ? image_scanned.ext : extractedFormat;
    if (!format) {
      throw new Error(chosenImageURL + ' is not an image!');
    }
    modified_distro['distrowatch_image_path'] = imgSrc;
    await fs.writeFile(
      path.join(
        path.resolve('.'),
        'public',
        'icons',
        `${modified_distro.identifier}.${format}`
      ),
      imageBuffer
    );
    const image_path = `${path.join(
      '/icons',
      `${modified_distro.identifier}.${format}`
    )}`;
    modified_distro['image_path'] = image_path;
    return modified_distro;
  } catch (error) {
    console.error(error);
    return distro;
  }
  //end of image block
}
export async function saveIcon(html, distro, page) {
  console.error('saveIcon block');
  try {
    let modified_distro = distro;
    const imgSrc = `https://distrowatch.com/${html.find('img').attr('src')}`;
    const response = await page.goto(imgSrc, {
      waitUntil: 'networkidle0',
      responseType: 'arraybuffer',
    });
    console.log(response);
    const imageBuffer = await response.buffer();
    console.log(imageBuffer);
    const res = await uploadImage(imageBuffer, {
      resource_type: 'image',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      folder: 'icons',
      public_id: `${distro.identifier}.png`,
    });
    console.log(res);
    modified_distro['image_path'] = res.url;
    return modified_distro;
  } catch (error) {
    console.error(error);
    return distro;
  }
}
// export async function saveBadge(imageBuffer, options) {
//   const data = cloudinary.uploader
//     .upload_stream(options, (error, result) => {
//       if (error) {
//         console.error(error);
//         return null;
//       } else {
//         console.log(result);
//         return result;
//       }
//     })
//     .end(imageBuffer);
//   return data;
// }
export function saveOneDistroToDB(distro, pool) {
  console.error('saveOneDistroToDB block');

  try {
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
    pool.query(insertQuery, values, (err, rows) => {
      if (err) {
        console.error('Error executing query:', err);
      } else {
        console.error(`${distro.name} was successfully inserted ✅`);
      }
    });
  } catch (error) {
    console.error(error);
  }
}
export async function createBadgesForOneDistro(distro, browser) {
  console.error('createBadgesForOneDistro...');
  const page = await browser.newPage();
  try {
    if (!distro.image_path) {
      console.error('exception...');
      throw new Error(
        `${distro.name}: No image_path found, aborting creation of a badges.`
      );
    }
    for (const theme of ['light', 'dark']) {
      console.error('for each theme...');
      const html_content = `
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Ubuntu&display=swap" rel="stylesheet">
            <style>*{font-family: 'Ubuntu', sans-serif;}</style>
          </head>
          <div id="target" style="font-size: 70px; line-height: 70px; height: min-content; width: max-content; padding: 10px; padding-right: 20px; padding-left: 20px; display: flex; justify-content: center; align-items: center; background-color: ${
            theme == 'dark' ? '#333333' : 'white'
          }; color: ${theme == 'dark' ? 'white' : '#333333'};">
            <img style="height: 70px; width: auto; margin-right: 15px;" src="${
              distro['image_path']
            }"/>
            <div id="distro">${distro.name}</div>
          </div>
        `;
      await page.setContent(html_content);
      const screenshotBuffer = await page.screenshot({
        clip: await page.$eval('#target', (target) => {
          console.error(target);
          const { x, y, width, height } = target.getBoundingClientRect();
          return { x, y, width, height };
        }),
      });
      const res = await uploadImage(screenshotBuffer, {
        resource_type: 'image',
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        folder: `${theme}_badges`,
        public_id: `${distro.identifier}.png`,
      });
      const badge_path_name =
        theme == 'dark' ? 'dark_badge_path' : 'light_badge_path';
      distro[badge_path_name] = res.url;
      console.error(
        `Successfully created ${theme} badge for ${distro.name} ✅`
      );
    }
  } catch (error) {
    console.error(
      `An error occured while creating a badge ❌ \n Details: ${error}`
    );
  }
  await page.close();
  return distro;
}
const uploadImage = (imageBuffer, options) => {
  console.error('uploadImage');
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          console.error('uploadImage end');
          resolve(result);
        }
      }
    );

    uploadStream.end(imageBuffer);
  });
};
//pg
console.error('connecting to PG...');
export const pool = new pg.Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
console.error(pool);
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error executing query', err);
  } else {
    console.error('Connected to PostgreSQL database');
  }
});

//browser
const browser = await puppeteer.launch({
  headless: 'false',
  ignoreDefaultArgs: ['--disable-extensions'],
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

//get all distros
const distros = await new Promise((resolve, reject) => {
  pool.query(`SELECT * FROM distributions;`, function (getErr, data) {
    if (getErr) {
      reject(getErr);
    } else {
      if (data) {
        resolve(data.rows);
      } else {
        resolve(null);
      }
    }
  });
});

try {
  for (let i = 0; i < distros.length; i++) {
    let distro = distros[i];
    try {
      //page
      const page = await browser.newPage();

      console.error(`starting job for : ${distro.distrowatch_page}`);
      await page.setDefaultNavigationTimeout(0);
      await page.goto(distro.distrowatch_page, {
        waitUntil: 'domcontentloaded',
      });
      const html_of_distro_page = await page.content();
      const $_wm = cheerio.load(html_of_distro_page);
      const tdWithTitle = $_wm('td.TablesTitle');
      if (tdWithTitle.length > 0) {
        const clonedTd = tdWithTitle.clone();
        // distro = await extractIcon(clonedTd, distro, page);
        distro = await saveIcon(clonedTd, distro, page);
        distro = extractHomepage($_wm, distro);
        distro = extractDescription(clonedTd, distro);
        distro = await createBadgesForOneDistro(distro, browser);
        saveOneDistroToDB(distro, pool);
        console.error(
          `Successfully got distrowatch data for ${distro.name} ✅️`
        );
      }
      await page.close();
      console.error(JSON.stringify(distro));
    } catch (error) {
      console.error(error);
    }
  }
} catch (error) {
  console.error(error);
} finally {
  await browser.close();
  pool.end();
  exit();
}
