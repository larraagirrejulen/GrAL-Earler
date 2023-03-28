async function performA11yEvaluation(){

    var jsonld = new JsonLd("a11y", window.document.location.href, window.document.title);

    // Configure evaluator factory and get evaluator
    var evaluatorFactory = OpenAjax.a11y.EvaluatorFactory.newInstance();
    const ruleset = OpenAjax.a11y.RulesetManager.getRuleset('ARIA_STRICT');
    evaluatorFactory.setParameter('ruleset', ruleset);
    evaluatorFactory.setFeature('eventProcessing', 'fae-util');
    evaluatorFactory.setFeature('groups', 7);
    const evaluator = evaluatorFactory.newEvaluator();

    // Gure luzapenak jarritako html elementuak kendu
    const extension = window.document.getElementById("react-chrome-extension");
    extension.remove();

    const evaluationResult = evaluator.evaluate(window.document, window.document.title, window.document.location.href);

    // Gure luzapenak jarritako html elementuak berriro jarri
    document.body.appendChild(extension);

    const ruleResults = evaluationResult.getRuleResultsAll().getRuleResultsArray();

    var ruleResult, outcome, description, messages, xpath, html, results;

    for(let i = 0; i < ruleResults.length; i++) {

        ruleResult = ruleResults[i];
        
        switch(ruleResult.getResultValue()){
            case 1:
                outcome = "INNAPLICABLE"
                break;
            case 2:
                outcome = "PASS"
                break;
            case 3 || 4:
                outcome = "CANNOTTELL"
                break;
            case 5:
                outcome = "FAIL"
                break;
            default:
                continue;
        }

        messages = ruleResult.getResultMessagesArray().filter(message => message !== "N/A");
        description = ruleResult.getRuleSummary() + messages.join("\n\n");
        results = ruleResult.getElementResultsArray();

        if (results.length <= 0){
            jsonld.addNewAssertion(ruleResult.getRule().getPrimarySuccessCriterion().id, outcome, description);
        }

        for(let j = 0; j < results.length; j++) {
            xpath = results[j].getDOMElement().xpath;
            html = results[j].getDOMElement().node.outerHTML;
            jsonld.addNewAssertion(ruleResult.getRule().getPrimarySuccessCriterion().id, outcome, description, xpath, html);
        }

    }

    localStorage.setItem("a11yEvaluationReport", JSON.stringify(jsonld.getJsonLd()));

}




class JsonLd{

    #jsonld; #evaluator_data;
    #assertors = {
        "mv": { "name": "MAUVE", "url": "https://mauve.isti.cnr.it/singleValidation.jsp"},
        "am": { "name": "AccessMonitor", "url": "https://accessmonitor.acessibilidade.gov.pt"},
        "ac": { "name": "AChecker", "url": "https://achecker.achecks.ca/checker/index.php"},
        "a11y": { "name": "A11Y", "url": "https://github.com/ainspector/a11y-evaluation-library"}
    };
    #outcomes = {
        "PASS": { outcome: "earl:passed", description: "No violations found" },
        "FAIL": { outcome: "earl:failed", description: "Found a violation ..." },
        "CANNOTTELL": { outcome: "earl:cantTell", description: "Found possible applicable issue, but not sure..." },
        "INNAPLICABLE": { outcome: "earl:inapplicable", description: "SC is not applicable" }
    }
    #context = {
        "@vocab": "http://www.w3.org/TR/WCAG-EM/#",
        "wcag2": "http://www.w3.org/TR/WCAG21/#",
        "earl": "http://www.w3.org/ns/earl#",
        "dct": "http://purl.org/dc/terms/",
        "wai": "http://www.w3.org/WAI/",
        "sch": "http://schema.org/",
        "xmlns": "http://xmlns.com/foaf/0.1/",
        "ptr": "http://www.w3.org/2009/pointers#",
        
        "evaluationScope": { 
            "@id": "step1",
            "@type": "EvaluationScope"
        },
        "siteScope": "step1a",
        "conformanceTarget": { "@id": "step1b", "@type": "@id" },
        "accessibilitySupportBaseline": "step1c",
        "additionalEvalRequirement": "step1d",
        "structuredSample": {
            "@id": "step3a",
            "@type": "Sample"
        },
        "auditSample": "step4",

        "siteName": "sch:name",
        "website": "wcag2:dfn-set-of-web-pages",
        "webpage": "wcag2:dfn-web-page-s",

        "Assertion": "earl:Assertion",
        "test":
        {
            "@id": "earl:test",
            "@type": "@id"
        },
        "assertedBy":
        {
            "@id": "earl:assertedBy",
            "@type": "@id"
        },
        "subject":
        {
            "@id": "earl:subject",
            "@type": "@id"
        },
        "result": "earl:result",
        "mode":
        {
            "@id": "earl:mode",
            "@type": "@id"
        },
        "outcome":
        {
            "@id": "earl:outcome",
            "@type": "@id"
        },

        "locationPointersGroup": "ptr:PointersGroup",
        "elementPointersGroup": "ptr:PointersGroup",
        "namespace" : { 
            "@id": "ptr:namespace", 
            "@type": "ptr:NamespaceMapping"
        },

        "title": "dct:title",
        "description": "dct:description",
        "hasPart": "dct:hasPart",
        "creator":
        {
            "@id": "dct:creator",
            "@type": "earl:Assertor"
        },

        "id": "@id",
        "type": "@type"
    };
    #successCriterias = { 
        "1.1.1": {
            "id": "non-text-content",
            "conformanceLevel": "A"
        },
        "1.2.1": {
            "id": "audio-only-and-video-only-prerecorded",
            "conformanceLevel": "A"
        },
        "1.2.2": {
            "id": "captions-prerecorded",
            "conformanceLevel": "A"
        },
        "1.2.3": {
            "id": "audio-description-or-media-alternative-prerecorded",
            "conformanceLevel": "A"
        },
        "1.2.4": {
            "id": "captions-live",
            "conformanceLevel": "AA"
        },
        "1.2.5": {
            "id": "audio-description-prerecorded",
            "conformanceLevel": "AA"
        },
        "1.2.6": {
            "id": "sign-language-prerecorded",
            "conformanceLevel": "AAA"
        },
        "1.2.7": {
            "id": "extended-audio-description-prerecorded",
            "conformanceLevel": "AAA"
        },
        "1.2.8": {
            "id": "media-alternative-prerecorded",
            "conformanceLevel": "AAA"
        },
        "1.2.9": {
            "id": "audio-only-live",
            "conformanceLevel": "AAA"
        },
        "1.3.1": {
            "id": "info-and-relationships",
            "conformanceLevel": "A"
        },
        "1.3.2": {
            "id": "meaningful-sequence",
            "conformanceLevel": "A"
        },
        "1.3.3": {
            "id": "sensory-characteristics",
            "conformanceLevel": "A"
        },
        "1.3.4": {
            "id": "orientation",
            "conformanceLevel": "AA"
        },
        "1.3.5": {
            "id": "identify-input-purpose",
            "conformanceLevel": "AA"
        },
        "1.3.6": {
            "id": "identify-purpose",
            "conformanceLevel": "AAA"
        },
        "1.4.1": {
            "id": "use-of-color",
            "conformanceLevel": "A"
        },
        "1.4.2": {
            "id": "audio-control",
            "conformanceLevel": "A"
        },
        "1.4.3": {
            "id": "contrast-minimum",
            "conformanceLevel": "AA"
        },
        "1.4.4": {
            "id": "resize-text",
            "conformanceLevel": "AA"
        },
        "1.4.5": {
            "id": "images-of-text",
            "conformanceLevel": "AA"
        },
        "1.4.6": {
            "id": "contrast-enhanced",
            "conformanceLevel": "AAA"
        },
        "1.4.7": {
            "id": "low-or-no-background-audio",
            "conformanceLevel": "AAA"
        },
        "1.4.8": {
            "id": "visual-presentation",
            "conformanceLevel": "AAA"
        },
        "1.4.9": {
            "id": "images-of-text-no-exception",
            "conformanceLevel": "AAA"
        },
        "1.4.10": { "id": "reflow", "conformanceLevel": "AA" },
        "1.4.11": {
            "id": "non-text-contrast",
            "conformanceLevel": "AA"
        },
        "1.4.12": {
            "id": "text-spacing",
            "conformanceLevel": "AA"
        },
        "1.4.13": {
            "id": "content-on-hover-or-focus",
            "conformanceLevel": "AA"
        },
        "2.1.1": { "id": "keyboard", "conformanceLevel": "A" },
        "2.1.2": {
            "id": "no-keyboard-trap",
            "conformanceLevel": "A"
        },
        "2.1.3": {
            "id": "keyboard-no-exception",
            "conformanceLevel": "AAA"
        },
        "2.1.4": {
            "id": "character-key-shortcuts",
            "conformanceLevel": "A"
        },
        "2.2.1": {
            "id": "timing-adjustable",
            "conformanceLevel": "A"
        },
        "2.2.2": {
            "id": "pause-stop-hide",
            "conformanceLevel": "A"
        },
        "2.2.3": {
            "id": "no-timing",
            "conformanceLevel": "AAA"
        },
        "2.2.4": {
            "id": "interruptions",
            "conformanceLevel": "AAA"
        },
        "2.2.5": {
            "id": "re-authenticating",
            "conformanceLevel": "AAA"
        },
        "2.2.6": {
            "id": "timeouts",
            "conformanceLevel": "AAA"
        },
        "2.3.1": {
            "id": "three-flashes-or-below-threshold",
            "conformanceLevel": "A"
        },
        "2.3.2": {
            "id": "three-flashes",
            "conformanceLevel": "AAA"
        },
        "2.3.3": {
            "id": "animation-from-interactions",
            "conformanceLevel": "AAA"
        },
        "2.4.1": {
            "id": "bypass-blocks",
            "conformanceLevel": "A"
        },
        "2.4.2": {
            "id": "page-titled",
            "conformanceLevel": "A"
        },
        "2.4.3": {
            "id": "focus-order",
            "conformanceLevel": "A"
        },
        "2.4.4": {
            "id": "link-purpose-in-context",
            "conformanceLevel": "A"
        },
        "2.4.5": {
            "id": "multiple-ways",
            "conformanceLevel": "AA"
        },
        "2.4.6": {
            "id": "headings-and-labels",
            "conformanceLevel": "AA"
        },
        "2.4.7": {
            "id": "focus-visible",
            "conformanceLevel": "AA"
        },
        "2.4.8": {
            "id": "location",
            "conformanceLevel": "AAA"
        },
        "2.4.9": {
            "id": "link-purpose-link-only",
            "conformanceLevel": "AAA"
        },
        "2.4.10": {
            "id": "section-headings",
            "conformanceLevel": "AAA"
        },
        "2.5.1": {
            "id": "pointer-gestures",
            "conformanceLevel": "A"
        },
        "2.5.2": {
            "id": "pointer-cancellation",
            "conformanceLevel": "A"
        },
        "2.5.3": {
            "id": "label-in-name",
            "conformanceLevel": "A"
        },
        "2.5.4": {
            "id": "motion-actuation",
            "conformanceLevel": "A"
        },
        "2.5.5": {
            "id": "target-size",
            "conformanceLevel": "AAA"
        },
        "2.5.6": {
            "id": "concurrent-input-mechanisms",
            "conformanceLevel": "AAA"
        },
        "3.1.1": {
            "id": "language-of-page",
            "conformanceLevel": "A"
        },
        "3.1.2": {
            "id": "language-of-parts",
            "conformanceLevel": "AA"
        },
        "3.1.3": {
            "id": "unusual-words",
            "conformanceLevel": "AAA"
        },
        "3.1.4": {
            "id": "abbreviations",
            "conformanceLevel": "AAA"
        },
        "3.1.5": {
            "id": "reading-level",
            "conformanceLevel": "AAA"
        },
        "3.1.6": {
            "id": "pronunciation",
            "conformanceLevel": "AAA"
        },
        "3.2.1": { "id": "on-focus", "conformanceLevel": "A" },
        "3.2.2": { "id": "on-input", "conformanceLevel": "A" },
        "3.2.3": {
            "id": "consistent-navigation",
            "conformanceLevel": "AA"
        },
        "3.2.4": {
            "id": "consistent-identification",
            "conformanceLevel": "AA"
        },
        "3.2.5": {
            "id": "change-on-request",
            "conformanceLevel": "AAA"
        },
        "3.3.1": {
            "id": "error-identification",
            "conformanceLevel": "A"
        },
        "3.3.2": {
            "id": "labels-or-instructions",
            "conformanceLevel": "A"
        },
        "3.3.3": {
            "id": "error-suggestion",
            "conformanceLevel": "AA"
        },
        "3.3.4": {
            "id": "error-prevention-legal-financial-data",
            "conformanceLevel": "AA"
        },
        "3.3.5": { "id": "help", "conformanceLevel": "AAA" },
        "3.3.6": {
            "id": "error-prevention-all",
            "conformanceLevel": "AAA"
        },
        "4.1.1": { "id": "parsing", "conformanceLevel": "A" },
        "4.1.2": {
            "id": "name-role-value",
            "conformanceLevel": "A"
        },
        "4.1.3": {
            "id": "status-messages",
            "conformanceLevel": "AA"
        }
    };

    constructor(evaluator, pageUrl, pageTitle){

        const siteName = (new URL(pageUrl)).hostname.replace('www.','');

        const date = new Date();
        const currentDate = date.toLocaleString();

        this.#evaluator_data = this.#assertors[evaluator];

        this.#jsonld = {

            "@context": this.#context,

            "type": "Evaluation",
            "@language": "en",
            "title": "Accessibility Evaluation Report for " + siteName + " website",
            "commissioner": "https://github.com/larraagirrejulen/GrAL/tree/main/ac_check%20(react)",
            "dct:date": currentDate,
            "dct:summary": "Undefined",

            "assertors": [{
                "id": "_:" + this.#evaluator_data.name,
                "type": "earl:Assertor",
                "xmlns:name": this.#evaluator_data.name,
                "description": this.#evaluator_data.url
            }],

            "creator": {
                "id": "_:assertors",
                "xmlns:name": this.#evaluator_data.name
            },
    
            "evaluationScope":
            {
                "website":
                {
                    "id": "_:website",
                    "type": [
                        "earl:TestSubject",
                        "sch:WebSite"
                    ],
                    "siteName": siteName,
                    "siteScope": "Single page: " + pageUrl
                },
                "conformanceTarget": "wai:WCAG2AAA-Conformance",
                "accessibilitySupportBaseline": "Google Chrome latest version",
                "additionalEvalRequirement": "The report will include XPath expressions or line & column locations as pointers to the cases found for each result"
            },
    
            "structuredSample":
            {
                "webpage": [
                {
                    "id": "_:webpage",
                    "type": ["earl:TestSubject", "sch:WebPage"],
                    "description": pageUrl,
                    "source": "_:website",
                    "title": pageTitle,
                    "tested": true
                }]
            },
    
            "auditSample": []
        };

        for (const key in this.#successCriterias){
            this.#jsonld.auditSample.push(
                {
                    "type": "Assertion",
                    "test": "wcag2:" + this.#successCriterias[key].id,
                    "conformanceLevel": this.#successCriterias[key].conformanceLevel,
                    "subject": "_:website",
                    "result":
                    {
                        "outcome": "earl:untested",
                        "description": ""
                    },
                    "hasPart": []
                }
            );
        };
    }

    addNewAssertion(criteriaNumber, outcome, criteriaDescription, path = null, html = null){

        const criteriaId = this.#successCriterias[criteriaNumber].id

        const siteAssertion = this.#jsonld.auditSample.filter(siteAssert => siteAssert.test === "wcag2:" + criteriaId)[0]

        const resultOutcome = this.#outcomes[outcome].outcome

        var pageAssertion = siteAssertion.hasPart.filter(pageAssert => pageAssert.result.outcome == resultOutcome)


        if(pageAssertion.length > 0){
            pageAssertion = pageAssertion[0];

            if(path != null && !pageAssertion.result.locationPointersGroup.filter(pointer => pointer.expression == path).length > 0){
                pageAssertion.result.locationPointersGroup.push({
                    "id": "_:pointer",
                    "type": [
                        "ptr:groupPointer",
                        "ptr:XPathPointer"
                    ],
                    "ptr:expression": path, 
                    "description": html.substring(0, html.indexOf(">")+1) + " ...",
                    "namespace" : "http://www.w3.org/1999/xhtml"
                });
            }

            return;
        }



        const currentGeneralOutcome = siteAssertion.result.outcome
        switch (currentGeneralOutcome) {
            case "earl:untested":
                siteAssertion.result.outcome = resultOutcome
                siteAssertion.result.description = this.#outcomes[outcome].description
                siteAssertion.assertedBy = "_:" + this.#evaluator_data.name
                siteAssertion.mode = "earl:automatic"
                break;    
            case "earl:passed":
                siteAssertion.result.outcome = resultOutcome
                siteAssertion.result.description = this.#outcomes[outcome].description
                break;
            case "earl:cantTell":
                if(resultOutcome !== "earl:passed"){
                    siteAssertion.result.outcome = resultOutcome
                    siteAssertion.result.description = this.#outcomes[outcome].description
                }
                break;
            default:
        }


        const assertion = {
            "type": "Assertion",
            "testcase": "wcag2:" + criteriaId,
            "assertedBy": ["_:" + this.#evaluator_data.name],
            "subject": "_:webpage",
            "mode": "earl:automatic",
            "result":
            {
                "outcome": resultOutcome,
                "description": "*************@" + this.#evaluator_data.name + "************* \n\n" + criteriaDescription,
                "locationPointersGroup": []
            }
        }

        if(path != null){
            assertion.result.locationPointersGroup.push({
                "id": "_:pointer",
                "type": [
                    "ptr:groupPointer",
                    "ptr:XPathPointer"
                ],
                "ptr:expression": path, 
                "description": html.substring(0, html.indexOf(">")+1) + " ...",
                "namespace" : "http://www.w3.org/1999/xhtml"
            });
        }

        siteAssertion.hasPart.push(assertion);
    }

    getJsonLd(){

        if(this.#jsonld.auditSample.filter(assertion => assertion.result.outcome == "earl:failed").length > 0){
            this.#jsonld["dct:summary"] = "Some errors where found..."
        } else{
            this.#jsonld["dct:summary"] = "No errors where found!!!"
        }
        return this.#jsonld;
    }


}




performA11yEvaluation()