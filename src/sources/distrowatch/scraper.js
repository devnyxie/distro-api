import * as cheerio from 'cheerio';
import {
  convertToSnakeCase,
  getAllDistributions,
  loadPage,
  saveDistrosToDB,
} from '../../utils/general.js';
import path from 'path';
import { spawn } from 'child_process';

async function runDistroWorker() {
  let stdoutData;
  return await new Promise((resolve, reject) => {
    const proc = spawn(
      'node',
      [
        path.resolve(
          path.resolve('.'),
          'src',
          'sources',
          'distrowatch',
          'distroWorker.js'
        ),
        '--tagprocess',
      ],
      { shell: false, detached: true }
    );
    proc.stdout.on('data', (data) => {
      stdoutData = data;
      console.log(stdoutData);
    });
    proc.stderr.on('data', (data) => {
      console.error(`${data}`);
    });
    proc.on('close', async (code) => {});
    proc.on('exit', function () {
      proc.kill();
      resolve();
    });
  });
}

export const exportAllDistros = async () => {
  const html = await loadPage(
    'https://distrowatch.com/search.php?ostype=Linux&category=All&origin=All&basedon=All&notbasedon=None&desktop=All&architecture=All&package=All&rolling=All&isosize=All&netinstall=All&language=All&defaultinit=All&status=All'
  );
  const $ = cheerio.load(html);
  const links = [];
  const table = $('table.News').first();
  const startElement = table
    .find('b:contains("The following distributions match your criteria")')
    .first();
  const elements = startElement.nextAll();

  elements.each(async (index, element) => {
    if ($(element).is('b')) {
      const name = $(element).find('a').text().trim();
      const identifier = convertToSnakeCase($(element).find('a').text().trim());
      const src = $(element).find('a').attr('href');
      const distrowatch_page = `https://distrowatch.com/table.php?distribution=${src}`;

      if (name) {
        links.push({
          name: name,
          distrowatch_page: distrowatch_page,
          identifier: identifier,
        });
      }
    }
  });
  saveDistrosToDB(links);
  await runDistroWorker();
  const data = await getAllDistributions();
  return data;
};
