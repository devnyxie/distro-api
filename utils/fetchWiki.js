import * as cheerio from 'cheerio';

const cleanUpText = (input) => {
  // Use regular expression to remove references
  const cleanedText = input.replace(/\[\d+\]/g, '');
  return cleanedText.trim();
};

function convertToSnakeCase(inputString) {
  // Replace spaces and forward slashes with underscores and convert to lowercase
  return inputString.replace(/[\/\s]+/g, '_').toLowerCase();
}

export default async function fetchWiki() {
  const response = await fetch(
    `https://en.wikipedia.org/wiki/List_of_Linux_distributions`,
    { cache: 'force-cache' }
  );
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  const links = [];
  $('table').each((tableIndex, tableElement) => {
    $(tableElement)
      .find('tr')
      .each((rowIndex, rowElement) => {
        const firstTd = $(rowElement).find('td:first-child');
        const secondTd = $(rowElement).find('td:nth-child(2)'); // Select the second td
        const linkText = firstTd.find('a').text();
        const wikiLink = `https://en.wikipedia.org${firstTd
          .find('a')
          .attr('href')}`;
        const linkDescription = cleanUpText(secondTd.text());
        //image

        //

        if (linkText && linkDescription) {
          links.push({
            identifier: convertToSnakeCase(linkText),
            name: linkText,
            wiki_url: wikiLink,
            description: linkDescription,
          });
        }
      });
  });

  async function asyncForEach(array, callback) {
    for (const element of array) {
      await callback(element);
    }
  }

  await asyncForEach(links, async (item, index) => {
    try {
      const response_wiki = await fetch(item.wiki_url, {
        cache: 'force-cache',
      });
      const html_wiki = await response_wiki.text();
      const $_wiki = cheerio.load(html_wiki);
      const infoboxTable = $_wiki('table.infobox.vevent');
      // let firstWordFromDistro = item.name.split(' ')[0];
      // const externalAnchor = infoboxTable
      //   .find(`a.external[href*="${firstWordFromDistro.toLowerCase()}"]`)
      //   .first();
      // const url = externalAnchor.attr('href');
      // test
      let url;
      const thWithText = infoboxTable
        .find('th')
        .filter((_, el) => $(el).text().trim() === 'Official website');
      if (thWithText.length > 0) {
        const correspondingTd = thWithText.closest('tr').find('td');
        const anchorNotInSup = correspondingTd.find('a').not('sup a');
        const href = anchorNotInSup.attr('href');
        url = href;
        // console.log('Official website:', href);
      } else {
        // console.log('Official website not found');
      }
      // test end
      const distroObject = links.find(
        (d) => d.name.toLowerCase() === item.name.toLowerCase()
      );
      if (distroObject && url) {
        distroObject.url = url;
      }
    } catch (error) {
      console.log(`URL task failed, distro ${index}`);
    }
  });
  return links;
}
