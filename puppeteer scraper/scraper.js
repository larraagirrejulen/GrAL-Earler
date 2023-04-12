
const JsonLd = require('./jsonLd');


class Scraper {

    #puppeteer_page;
    #evaluator;
    #evaluationUrl;
    #jsonld;



    constructor(page, evaluator, evaluationUrl, evaluatedPageTitle){

        if (!['am', 'ac', 'mv'].includes(evaluator)) {
            throw new Error(evaluator.toUpperCase() + " is not a valid evaluator !!!");
        }

        this.#puppeteer_page = page;
        this.#evaluator = evaluator;
        this.#evaluationUrl = evaluationUrl;
        this.#jsonld = new JsonLd(evaluator, evaluationUrl, evaluatedPageTitle);
    }


    

    async initiateScrapingProcess(){

        const evaluators = {
            'am': async () => this.amScraper('https://accessmonitor.acessibilidade.gov.pt/results/', this.#puppeteer_page),
            'ac': async () => this.acScraper('https://achecker.achecks.ca/checker/index.php', this.#puppeteer_page),
            'mv': async () => this.mvScraper('https://mauve.isti.cnr.it/singleValidation.jsp', this.#puppeteer_page)
        };

        console.log("\nInitiating " + this.#evaluator.toUpperCase() + " scraping process ...");

        try{
            await evaluators[this.#evaluator]();
            console.log(`\n${this.#evaluator.toUpperCase()} scraping successfully finished !!!`);
            
        } catch(error) { throw new Error("\nThe next error was found on " + this.#evaluator.toUpperCase()  + " scraping process: " + error) }

        return this.#jsonld.getJsonLd();
    }





    async amScraper(evaluatorUrl, page){

        await page.goto(evaluatorUrl + this.#evaluationUrl.replaceAll("/",'%2f'));
        await page.waitForSelector('.evaluation-table');

        const results = await page.evaluate(() => {

            const results = [];

            const status2Outcome = {
                "monitor_icons_praticas_status_incorrect": "earl:failed",
                "monitor_icons_praticas_status_review": "earl:cantTell",
                "monitor_icons_praticas_status_correct": "earl:passed"
            };

            const foundTechniques = Array.from(document.querySelectorAll('.evaluation-table tbody tr'));

            for (const technique of foundTechniques){

                const cols = Array.from(technique.querySelectorAll('td'));

                const outcome = status2Outcome[cols[0].querySelector('svg title').textContent];

                if (!outcome) continue;

                const techniqueInfo = cols[1].querySelector('.collapsible-content');
                const criteriaNumbers = Array.from(techniqueInfo.querySelectorAll('li')).map(li => li.textContent.substring(18,24).replaceAll(' ',''));
                let description = techniqueInfo.querySelector("p").textContent.replace(/\u00A0/g, " ");
                description += "\n\n" + techniqueInfo.querySelector("div > span > strong > a").textContent.replace(/\u00A0/g, " ").substring(4).replace(":", "").replace(" ", "");

                let casesLink = null;
          
                if(cols[3].querySelector("a") != undefined){
                    const link = cols[3].querySelector("a").href;
                    if(link.startsWith("/results")){
                        casesLink = 'https://accessmonitor.acessibilidade.gov.pt' + link;
                    }else if(link.startsWith("https://accessmonitor.acessibilidade.gov.pt/")){
                        casesLink = link;
                    }
                } 

                results.push({
                    "outcome": outcome,
                    "criteriaNumbers": criteriaNumbers,
                    "description": (outcome === "earl:failed" ? 'An ERROR was found: \n\n' : outcome === "earl:cantTell" ? 'A POSSIBLE ISSUE was found: \n\n' : 'PASSED: \n\n') + description,
                    "casesLink": casesLink
                });
            }
            return results;  
        });

        for (const result of results){
            for (const criteria of result.criteriaNumbers){

                if (result.casesLink === null){
                    this.#jsonld.addNewAssertion(criteria, result.outcome, result.description);
                    continue;
                }

                await page.goto(result.casesLink);
                await page.waitForSelector('#list_tab');

                const [casesLocations, casesHtmls] = await page.evaluate(async () => {
                    
                    const casesLocations = [];
                    const casesHtmls = [];
                    const foundCases = Array.from(document.querySelectorAll('ol > li'));

                    for (const foundCase of foundCases){
                        const caseElements = Array.from(foundCase.querySelectorAll('table > tr'));
                        const caseCode = caseElements[1].querySelector("td code").textContent.replaceAll('\n','').replaceAll('\t','');
                        casesHtmls.push(caseCode);
                        casesLocations.push(caseElements[3].querySelector('td span').textContent);
                    }
                    return [casesLocations, casesHtmls];  
                });

                for (let k = 0, path; path = casesLocations[k]; k++){
                    const correctPath = "//" + path.replace(/ \> /g, "/").replace(/:nth-child\(/g, "[").replaceAll(")", "]")
                    this.#jsonld.addNewAssertion(criteria, result.outcome, result.description, correctPath, casesHtmls[k]);
                }

            }
        }

    }





    async acScraper(evaluatorUrl, page){

        // Navigate to url
        await page.goto(evaluatorUrl);

        // Wait for input element to load
        await page.waitForSelector('#checkuri');

        // Configure to include AAA level, type the url to evaluate and submit
        await page.click('h2[align="left"] a');
        await page.click("#radio_gid_9");
        await page.focus('#checkuri');
        await page.keyboard.type(this.#evaluationUrl);
        await page.click('#validate_uri');

        // Wait for results to be loaded
        await page.waitForSelector('fieldset[class="group_form"]', {timeout: 120000});

        // Get evaluation data
        const results = await page.evaluate(() => {

            var results = [];

            function pushResults(id){

                const cases = document.querySelector(id);
                const criterias = Array.from(cases.querySelectorAll("h4"));
                const checks = Array.from(cases.querySelectorAll(".gd_one_check"));

                for (let i = 0, criteria; criteria = criterias[i]; i++){
                
                    const problem = checks[i].querySelector("span a").textContent;

                    let solution;
                    if(id === "#AC_errors"){
                        solution = checks[i].querySelector("div").textContent.substring(9).trim();
                    }
                    
                    const foundCases = Array.from(checks[i].querySelectorAll("table tbody tr td"));
    
                    for (const foundCase of foundCases){

                        results.push({
                            "criteriaNumber": criteria.textContent.match(/(\d\.\d\.\d)/)[0],
                            "outcome": id === "#AC_errors" ? "earl:failed": "earl:cantTell",
                            "description": id === "#AC_errors" ? 'An ERROR was found: \n\n' + problem + '\n\n' + solution : 'A POSSIBLE ISSUE was found: \n\n' + problem,
                            "targetPath": foundCase.querySelector("em").textContent,
                            "targetHtml": foundCase.querySelector("pre code").textContent
                        });
                    }
                }
            }

            ["#AC_errors", "#AC_likely_problems", "#AC_potential_problems"].map((id) => pushResults(id));

            return results;

        });

        for (const result of results){
            this.#jsonld.addNewAssertion(result.criteriaNumber, result.outcome, result.description, result.targetPath, result.targetHtml);
        }
    }





    async mvScraper(evaluatorUrl, page){

        // Navigate to url
        await page.goto(evaluatorUrl);

        // Wait for input element to load
        await page.waitForSelector('#uri');

        // Load the url we want to evaluate and submit
        await page.focus('#uri');
        await page.keyboard.type(this.#evaluationUrl);
        await page.select('#Level_of_Conformance', 'AAA');
        await page.click('#validate');

        // Wait for results to be loaded
        await page.waitForSelector('#livepreview_link');
        await page.waitForTimeout(1000);    // Ez dakit bestela nola egin daitekeen
        await page.click('#livepreview_link');

        // Wait for the loader to disappear
        await page.waitForFunction(() => {
            const loader = document.querySelector('#loader');
            return loader && loader.classList.contains('display_none');
        });

        // Get evaluation data
        const results = await page.evaluate(() => {
            
            var results = [];

            function pushResults(outcomeType){

                const foundCases = Array.from(document.querySelectorAll('#container_' + outcomeType + '_list > div'));                

                for (const foundCase of foundCases){
    
                    const description = foundCase.querySelector("span[class='error_summary']").textContent;
    
                    let occurrences = foundCase.querySelector(".accordion_content");
    
                    occurrences = Array.from(occurrences.querySelectorAll("div > span[class='single_error_info']"));
    
                    for (const occurrence of occurrences){
        
                        let location = occurrence.querySelector("button");
    
                        try{
                            location = location.getAttribute("data-x");
                        }catch(error){
                            continue;
                        }
        
                        results.push({
                            "criterias": foundCase.querySelector("div > span").textContent.match(/(\d\.\d\.\d)/g),
                            "outcome": outcomeType === "error" ? "earl:failed" : "earl:cantTell",
                            "description": (outcomeType === "error" ? 'An ERROR was found: \n\n' : 'A POSSIBLE ISSUE was found: \n\n') + description,
                            "location": location,
                            "target_html": occurrence.textContent.substring(11)
                        });
                    }
    
                }
            }   

            ["error", "warning"].map((outcomeType) => pushResults(outcomeType));

            const criteriaTable = Array.from(document.querySelectorAll('#table_sc_occ > tbody > tr'));

            for(const criteriaTableRow of criteriaTable){
                
                const outcomes = Array.from(criteriaTableRow.children);

                if (outcomes[1].textContent.match(/\d+/)[0] === "0" && 
                    outcomes[2].textContent.match(/\d+/)[0] === "0"  && 
                    outcomes[3].textContent.match(/\d+/)[0] !== "0" ){

                    results.push({
                        "criterias": outcomes[0].querySelector("p").textContent,
                        "outcome": "earl:passed",
                        "description": "PASSED"
                    })
                }
            }

            return results;
        });

        for (const result of results){

            if(result.outcome === "earl:passed"){
                this.#jsonld.addNewAssertion(result.criterias, result.outcome, result.description);
            }else{
                for (const criteria of result.criterias){
                    this.#jsonld.addNewAssertion(criteria, result.outcome, result.description, result.location, result.target_html);
                }
            }
  
        }

    }
}

module.exports = Scraper;