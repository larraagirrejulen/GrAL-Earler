
const { jsonLd } = require('./jsonLd');

const scraper = {

    mvUrl: 'https://mauve.isti.cnr.it/singleValidation.jsp',
    amUrl: 'https://accessmonitor.acessibilidade.gov.pt/results/',
    acUrl: 'https://achecker.achecks.ca/checker/index.php',
    json: null,

    async scrape(page, evaluator, evaluationUrl){

        this.json = new jsonLd(evaluator, evaluationUrl);

        // Call to specified scraper
        var result;
        switch(evaluator){
            case 'MV':
                result = this.mvScraper(page, evaluationUrl);
                break;
            case 'AM':
                result = this.amScraper(page, evaluationUrl);
                break;
            case 'AC':
                result = this.acScraper(page, evaluationUrl);
                break;
            default:
                result = "SCRAPER ERROR: Wrong evaluator!";
        }

        // Return result
        return result;
    },


    async mvScraper(page, evaluationUrl){

        // Navigate to url
        await page.goto(this.mvUrl);

        // Wait for input element to load
        await page.waitForSelector('#uri');

        // Load the url we want to evaluate and submit
        await page.focus('#uri');
        await page.keyboard.type(evaluationUrl);
        await page.click('#validate');

        // Wait for results to be loaded
        await page.waitForSelector('#evaluationSummary');

        // Set default download directory:
        const path = require('path');
        const client = await page.target().createCDPSession(); 
        await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: path.resolve('./evaluations'), });

        // Start evaluation download and wait for 3 secs
        await page.click('#evaluationSummary a[title="download earl report"]');
        await page.waitForTimeout(3000);

        // Return data
        return "nice";
    },


    async amScraper(page, evaluationUrl){

        // Navigate to url and wait to be loaded
        const url = this.amUrl + evaluationUrl.replaceAll("/",'%2f');
        await page.goto(url);
        await page.waitForSelector('.evaluation-table');

        // Get interested data
        await page.evaluate(async () => {
            
            const techniquesFound = Array.from(document.querySelectorAll('.evaluation-table tbody tr'));

            for (var i = 0, technique; technique = techniquesFound[i]; i++){

                const cols = Array.from(technique.querySelectorAll('td'));
                const complianceLevel = cols[2].textContent.replaceAll(' ','');

                if (complianceLevel != 'A' || complianceLevel !='AA') continue; // Ignore level AAA
                 
                var status;
                const statusText = cols[0].querySelector('svg title').textContent;

                switch(statusText){
                    case "monitor_icons_praticas_status_incorrect":
                        status = "FAIL";
                        break;
                    case "monitor_icons_praticas_status_review":
                        status = "CANNOTTELL";
                        break;
                    case "monitor_icons_praticas_status_correct":
                        status = "PASS";
                        break;
                    default:
                        continue;
                }

                const criteriaIds = Array.from(criteriaInfo.querySelectorAll('li')).map(li => li.textContent.substring(20,27));
                const techniqueInfo = cols[1].querySelector('.collapsible-content');
                const techniqueGuideText = techniqueInfo.querySelector("p").text;

                const casesReference = cols[3].querySelector("a");

                if (casesReference != null){

                    var casesLink = reference.getAttribute('href');

                    casesLink = 'https://accessmonitor.acessibilidade.gov.pt' + casesLink

                    await page.goto(casesLink);
                    await page.waitForSelector('#list_tab');

                    const foundCases = Array.from(document.querySelectorAll("#list_tab ol li"));

                    for (var j = 0, ca; ca = foundCases[j]; j++){

                        caseElements = Array.from(ca.querySelectorAll("table tr"));
                        /*caseCode = caseElements[1].querySelector("td code").textContent;
                        caseCode = caseCode.replaceAll('\n','');
                        caseCode = caseCode.replaceAll('\t','');*/
                        caseLocation = caseElements[3].querySelector("td span").textContent

                        for (var k = 0, criteriaId; criteriaId = criteriaIds[k]; k++){
                            criteriaId = criteriaId.replaceAll(' ','');
                            this.json.addNewElement(status, criteriaId, techniqueGuideText, caseLocation);
                        }
                    }

                } else {

                    for (var k = 0, criteriaId; criteriaId = criteriaIds[k]; k++){
                        criteriaId = criteriaId.replaceAll(' ','');
                        this.json.addNewElement(status, criteriaId, techniqueGuideText);
                    }
                }
            }
        });
  
        // Return data
        return this.json.getJson();
    },


    async acScraper(page, evaluationUrl){

        // Navigate to url
        await page.goto(this.acUrl);

        // Wait for input element to load
        await page.waitForSelector('#checkuri');

        // Load the url we want to evaluate and submit
        await page.focus('#checkuri');
        await page.keyboard.type(evaluationUrl);
        await page.click('#validate_uri');

        // Wait for results to be loaded
        await page.waitForSelector('fieldset[class="group_form"]', {timeout: 60000});

        // Get evaluation data
        const data = await page.evaluate(() => {
            const table = document.querySelector('fieldset[class="group_form"]');
            return table.innerHTML;
        });

        // Return data
        return data;
    }
}

module.exports = scraper;