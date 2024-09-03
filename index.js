import puppeteer from "puppeteer";
import * as fs from "fs";

(async () => {
    // Lancer le navigateur avec Puppeteer
    const browser = await puppeteer.launch({headless: true, ignoreHTTPSErrors: true});
    const page = await browser.newPage();

    if (!fs.existsSync("clubs.json")) {
        console.error("Le fichier clubs.json n'existe pas. Veuillez exécuter getClubLinks.js avant.");
        process.exit(1);
    }

    // Charger les URLs des clubs
    const clubLinks = JSON.parse(fs.readFileSync("clubs.json"));

    const clubLinksSize = clubLinks.length;

    let clubData = [];

    for (let i = 0; i < clubLinksSize; i++) {
        console.log(`Vérification du club ${i + 1}/${clubLinksSize}...`);

        const clubLink = clubLinks[i];

        await page.goto(clubLink);

        if (page.url().includes("404")) {
            console.error(`Le lien du club ${clubLink} est invalide.`);

            continue;
        }

        clubData.push(...await page.evaluate(() => {
            let currentClubData = [];

            const clubName = document.querySelector('table.m-10')
                .innerText
                .replace(/[\t\n]/g, '')
                .trim();

            const actualClubData = document.querySelectorAll('td:has(span.apexbold)');
            const clubNbTeam = document.querySelectorAll('table.fcftable.w-100.mb-15 tr').length;

            let clubEmail = '';
            let clubPhone = '';
            let clubProvince = '';

            actualClubData.forEach((data) => {
                if (data.innerText.includes('Correu Electrònic:')) {
                    clubEmail = data.innerText.replace('Correu Electrònic:', '').trim();
                }

                if (data.innerText.includes('Telèfons:')) {
                    clubPhone = data.innerText.replace('Telèfons:', '').trim();
                }

                if (data.innerText.includes('Provincia:')) {
                    clubProvince = data.innerText.replace('Provincia:', '').trim();
                }
            });

            let clubPeoples = document.querySelectorAll('div.col-md-4 table.fcftable.w-100.mb-20 tbody td')

            let latestRole = '';

            for (let j = 0; j < clubPeoples.length; j++) {
                if (clubPeoples[j].classList.contains('subth')) {
                    latestRole = clubPeoples[j].innerText.trim();

                    continue;
                }

                currentClubData.push({
                    clubName: clubName,
                    clubEmail: clubEmail,
                    clubPhone: clubPhone,
                    clubNomPrenom: clubPeoples[j].innerText.trim(),
                    clubRole: latestRole,
                    clubProvince: clubProvince,
                    clubNbTeam: clubNbTeam,
                });
            }

            return currentClubData;
        }));

        console.log(`Club ${i + 1}/${clubLinksSize} vérifié.`);
    }

    fs.writeFileSync("clubsData.json", JSON.stringify(clubData, null, 2));

    console.log("Données des clubs récupérées avec succès.");

    await browser.close();
})();