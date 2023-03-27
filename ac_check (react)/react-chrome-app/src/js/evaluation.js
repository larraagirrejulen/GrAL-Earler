/* eslint-disable no-undef */

import { storeReport } from './reportStoringUtils.js';
import {a11yLibrary, getOpenAjax} from "./libraries/a11yAinspector.js";
const JsonLd = require('./jsonLd');



async function fetchEvaluation(bodyData, timeout = 60000) {

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch('http://localhost:8080/http://localhost:7070/getEvaluationJson', {
            body: bodyData,
            mode: 'cors',
            method: 'POST', 
            headers: {"Content-Type": "application/json"},
            signal: controller.signal
        });
        
        clearTimeout(timer);

        if (!response.ok){
            throw new Error("HTTP error! Status: " + response.status);
        } 

        const json = await response.json();

        return JSON.parse(json["body"]);

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        } else {
            throw new Error(`Error: ${error.message}`);
        }
    }
}



export async function performEvaluation(){

    const checkboxes = JSON.parse(localStorage.getItem("checkboxes"));

    const AM = checkboxes[0].checked;
    const AC = checkboxes[1].checked;
    const MV = checkboxes[2].checked;
    const A11Y = checkboxes[3].checked;
        
    if(AM || AC || MV){
        const bodyData = JSON.stringify({ "am": AM, "ac": AC, "mv":MV, "url": window.location.href, "title": window.document.title});
        
        var json = await fetchEvaluation(bodyData);

        /* if (A11Y){
        const a11y = a11y();
        merge(json, a11y);
        } */
        storeReport(JSON.stringify(json));

    }else if(A11Y){

        var jsonld = new JsonLd("a11y", window.document.location.href, window.document.title);


        jsonld = await performA11yEvaluation(jsonld);

        console.log(JSON.stringify(jsonld));

        //storeReport(JSON.stringify(jsonld));

    }else{
        alert("You need to choose at least one analizer");
    }

}



async function performA11yEvaluation(jsonld){

    var OpenAjax = await a11yLibrary()

    //var OpenAjax = getOpenAjax()

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
  
    return jsonld.getJsonLd();
  }
























function merge(jsonLd1, jsonLd2){

	if(jsonLd2["dct:date"] > jsonLd1["dct:date"]) jsonLd1["dct:date"] = jsonLd2["dct:date"]

	jsonLd1.assertors.push(jsonLd2.assertors[0]);

	jsonLd1.creator["xmlns:name"] += " & " + jsonLd2.creator["xmlns:name"];

	for (var i = 0, assertion1, assertion2; assertion1 = jsonLd1.auditSample[i], assertion2 = jsonLd2.auditSample[i]; i++){
		
		if(assertion2.result.outcome === "earl:untested"){ 

			continue; 

		} else if(/^(earl:untested|earl:inapplicable)$/.test(assertion1.result.outcome)){

			assertion1 = assertion2;

		} else {

			mergeFoundCases(assertion1, assertion2);

			if((assertion1.result.outcome === "earl:passed" && assertion2.result.outcome !== "earl:passed") 
			|| (assertion1.result.outcome === "earl:cantTell" && assertion2.result.outcome === "earl:failed")){

				assertion1.result = assertion2.result;
	
			}

		}

	}

}


function mergeFoundCases(assertion1, assertion2){
		
	assertion2.hasPart.forEach(case2 => {
	
		var case_index = assertion1.hasPart.findIndex((case1) => {
			return case1.result.outcome === case2.result.outcome;
		});

		if(case_index === -1){
			assertion1.hasPart.push(case2);
			return;
		}

		case2.assertedBy.forEach((assertor)=>{
			assertion1.hasPart[case_index].assertedBy.push(assertor);
		});

		assertion1.hasPart[case_index].result.description += "\n\n" + case2.result.description;

		case2.result.locationPointersGroup.forEach((pointer2) => {
			
			var exists_index = assertion1.hasPart[case_index].result.locationPointersGroup.findIndex((pointer1) => {
				return pointer1.description === pointer2.description;
			});

			if(exists_index === -1){
				assertion1.hasPart[case_index].result.locationPointersGroup.push(pointer2);					
			}else if(pointer2["ptr:expression"].startsWith("//html/body")){
				assertion1.hasPart[case_index].result.locationPointersGroup[exists_index]["ptr:expression"] = pointer2["ptr:expression"];
			}
			
		});

	});

}