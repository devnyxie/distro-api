import * as cheerio from 'cheerio';
// import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import imageType from 'image-type';
import { Agent } from 'undici';
// const isFullUrl = (urlString) => {
//   var urlPattern = new RegExp(
//     '^(https?:\\/\\/)?' + // validate protocol
//       '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // validate domain name
//       '((\\d{1,3}\\.){3}\\d{1,3}))' + // validate OR ip (v4) address
//       '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // validate port and path
//       '(\\?[;&a-z\\d%_.~+=-]*)?' + // validate query string
//       '(\\#[-a-z\\d_]*)?$',
//     'i'
//   ); // validate fragment locator
//   return !!urlPattern.test(urlString);
// };
// const isFullUrl = (urlString) => {
//   var res = urlString.match(
//     /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
//   );
//   return res !== null;
// };
// function isFullUrl(url) {
//   const urlPattern = /^(http:\/\/|https:\/\/|\/\/)/;
//   return !!urlPattern.test(url);
// }

function isFullUrl(url) {
  const fullURLRegex = /^(?:https?:\/\/)?[\w.-]+\.\w{2,}(?:\/[^/]+)*$/;
  return !!url.match(fullURLRegex);
}

async function fetchIcons(url) {
  try {
    const response = await fetch(url, {
      dispatcher: new Agent({ connectTimeout: 10000 }),
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    const iconPaths = [
      'link[rel="icon"], link[rel="shortcut icon"]',
      'meta[name="msapplication-TileImage"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="mask-icon"]',
    ];

    const icons = [];

    iconPaths.forEach((path) => {
      const elements = $(path);

      const value = elements.attr('content') || elements.attr('href');
      if (value) {
        icons.push({ url: value });
      }
    });
    return icons;
  } catch (error) {
    console.error('Error fetching icons:', error);
    return [];
  }
}

export default async function fetchIcon(distro, req_url) {
  try {
    const mainDir = path.resolve('.');
    const url = distro.url;
    const links = await fetchIcons(url);
    if (links) {
      if (links.length > 0) {
        console.log(links[0].url);
        const url_to_fetch = isFullUrl(links[0].url)
          ? links[0].url
          : url + links[0].url;
        console.log(url_to_fetch);
        const response = await fetch(url_to_fetch, {
          dispatcher: new Agent({ connectTimeout: 10000 }),
        });
        if (response.ok) {
          console.log(distro.name + ': ok response');
          let imageBuffer = Buffer.from(await response.arrayBuffer());
          console.log('Buffer created');
          const format = await imageType(imageBuffer);
          console.log('detecting format...');
          if (!format.ext) {
            throw new Error(distro.identifier + ': no image found.');
          }
          console.log('writing file...');
          await fs.writeFile(
            path.join(
              mainDir,
              '/public',
              '/icons',
              `${distro.identifier}.${format.ext}`
            ),
            imageBuffer
          );
          const image_path = `${req_url}${path.join(
            '/icons',
            `${distro.identifier}.${format.ext}`
          )}`;
          return {
            status: 200,
            path: image_path,
          };
        } else {
          console.log(response.status);
        }
      }
    }
    return { status: 404, path: `null` };
  } catch (error) {
    console.log(error);
    return { status: 500, path: `null` };
  }
}
