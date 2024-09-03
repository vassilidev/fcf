import puppeteer from "puppeteer";
import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";

(async () => {
    // Lancer le navigateur avec Puppeteer
    const browser = await puppeteer.launch({headless: true, ignoreHTTPSErrors: true});
    const page = await browser.newPage();

    await page.setDefaultTimeout(0);

    // Accéder à la page principale pour récupérer les IDs des délégations
    await page.goto("https://www.fcf.cat/buscador-clubs");

    // Extraire les IDs des délédigations à partir de la page
    let delegationIds = await page.evaluate(() => {
        let delegationIds = [];

        document.querySelectorAll('div.field.col-3:nth-child(2) > .box-options > div')
            .forEach((delegation) => {
                delegationIds.push(
                    parseInt(
                        delegation
                            .querySelector('span')
                            .getAttribute('target')
                    )
                );
            });

        return delegationIds;
    });

    console.log("Délégations trouvées :", delegationIds);

    // Pour stocker les liens uniques des clubs
    let uniqueClubLinks = new Set();

    // Boucle sur chaque délégation pour récupérer les clubs
    for (const delegationId of delegationIds) {
        console.log(`Récupération des clubs pour la délégation ID ${delegationId}...`);

        const params = new URLSearchParams();
        params.append('codnom', '');
        params.append('delegacio', delegationId);
        params.append('localitat', '');

        // Requête POST pour obtenir les clubs d'une délégation spécifique
        const clubsHtml = await axios
            .post('https://www.fcf.cat/get-buscador-clubs', params)
            .then(r => r.data);

        // Utilisation de Cheerio pour parser le HTML et extraire les URLs des clubs
        const $ = cheerio.load(clubsHtml);

        $('a').each((index, element) => {
            const link = $(element).attr('href');

            if (link) {
                uniqueClubLinks.add(link);
            }
        });
    }

    console.log("Nombre de clubs uniques trouvés :", uniqueClubLinks.size);

    // Fermer le navigateur
    await browser.close();

    // write file
    fs.writeFile('clubs.json', JSON.stringify([...uniqueClubLinks], null, 2), function (err) {
        if (err) return console.log(err);
        console.log('Fichier clubs.json créé avec succès.');
    });
})();
