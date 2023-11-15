import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

export default async function createBadge(distro, req_url) {
  try {
    if (distro.image_path !== 'null') {
      const mainDir = path.resolve('.');
      const iconPath = path.join(
        mainDir,
        '/public',
        '/badges',
        `${distro.identifier}.png`
      );
      const html_content = `<div id="target" style="height: min-content; width: max-content; border: 1px solid rgb(0,0,0,0.2); padding: 4px; padding-right: 6px; padding-left: 6px; display: flex; justify-content: center; align-items: center; border-radius: 3px;">
             <img style="height: 30px; width: 30px; margin-right: 3px;" src="${req_url}/icons/${distro.identifier}.png"/><div id="distro">${distro.name}</div>
             </div>`;
      // Launch Puppeteer
      const browser = await puppeteer.launch();
      // Create a new page
      const page = await browser.newPage();
      // Set the HTML content of the page
      await page.setContent(html_content);
      // Take a screenshot of the div with id "target"
      const screenshotBuffer = await page.screenshot({
        clip: await page.$eval('#target', (target) => {
          const { x, y, width, height } = target.getBoundingClientRect();
          return { x, y, width, height };
        }),
      });
      await browser.close();
      await fs.writeFile(iconPath, screenshotBuffer);
      // const path = req_url + path.join('/badges', `${distro.identifier}.png`);
      const badge_path = `${req_url}${path.join(
        '/badges',
        `${distro.identifier}.png`
      )}`;
      return badge_path;
    } else {
      return 'null';
    }
  } catch (error) {
    return 'null';
  }
}
