
import './css/resultsTable.css';

import { useState, useEffect, useCallback } from "react";
import { getImgSrc, getFromChromeStorage, sendMessageToBackground } from './js/chromeUtils.js';
import parse from 'html-react-parser';


const outcome2Background:any = {
    "passed": {backgroundColor: "#C8FA8C"},
    "failed": {backgroundColor: "#FA8C8C"},
    "cantTell": {backgroundColor: "#F5FA8C"},
    "inapplicable": {backgroundColor: "#FFFFFF"},
    "untested": {backgroundColor: "#8CFAFA"}
}

function getHtmlElement(path:any, innerText:any){

    let element:any;

    if(path.startsWith("/")){
        element = document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }else{
        const elements = document.querySelectorAll(path);

        if (elements.length === 1){
            element = elements[0];
        }

        for (var i = 0; i < elements.length; i++) {
            if (elements[i].textContent === innerText) {
                element = elements[i];
            }
        }

    }

    return element;
}

function clearHighlights(){

    const lastPopup = document.querySelector("#highlightPopup");

    if(lastPopup){
        lastPopup.remove();
    } 

    let pointerDefaultStyles:any = sessionStorage.getItem("defaultStyles");

    if(pointerDefaultStyles){

        pointerDefaultStyles = JSON.parse(pointerDefaultStyles);

        for (const groupKey in pointerDefaultStyles) {
            for(let i = 0; i<pointerDefaultStyles[groupKey].length; i++){
                
                const pointer = pointerDefaultStyles[groupKey][i];

                if(!pointer) continue;

                const element = getHtmlElement(pointer.path, pointer.innerText);

                if(element){
                    element.removeAttribute("tabindex");
                    element.style.border = pointer.style;
                } 
                
            }
        }
        sessionStorage.removeItem("defaultStyles");
    }
}



export default function ResultsTable({conformanceLevels}:any){

    const [mantainExtended, setMantainExtended] = useState(false);
    const [reportTableContent, setReportTableContent] = useState([]);

    useEffect(() => {
        (async ()=>{ 
            setMantainExtended(await getFromChromeStorage("mantainExtended", true));
            setReportTableContent(await getFromChromeStorage("reportTableContent")); 
        })();
        sessionStorage.removeItem("defaultStyles");
    }, []);
   
    const [selectedMainCategories, setSelectedMainCategories] = useState(Array(reportTableContent.length).fill(false));
    const handleMainCategoryStateChange = (index:any) => {
        const newStates = mantainExtended ? [...selectedMainCategories] : Array(reportTableContent.length).fill(false);
        newStates[index] = !selectedMainCategories[index];
        setSelectedMainCategories(newStates);

        clearHighlights();
    };

    
    return(
      <div className = "resultsContainer">
        <Summary conformanceLevels={conformanceLevels} />
        <div className="resultsTable">
            <table>
                <thead>
                    <tr> <th>Standard</th> <OutcomeHeaders/> </tr>
                </thead>
                <tbody>
                    {reportTableContent.map((mainCategory:any, index:any) => (<>
                        <tr className="collapsible mainCategory" onClick={()=>handleMainCategoryStateChange(index)}>
                            <td>{mainCategory.categoryTitle}</td>
                            <ResultCount category={mainCategory} conformanceLevels={conformanceLevels}/>
                        </tr>
                        { selectedMainCategories[index] ? 
                            <SubCategory subCategories={mainCategory.subCategories} mantainExtended={mantainExtended} conformanceLevels={conformanceLevels} /> 
                        : null }
                    </>))}
                </tbody>
            </table>
        </div>
        
      </div>
    );
    
}


function OutcomeHeaders(){
    return(<>
        <th className="passed" title='Passed' style={{...outcome2Background["passed"]}}>P</th>
        <th className="failed" title='Failed' style={{...outcome2Background["failed"]}}>F</th>
        <th className="cantTell" title='Can&#39;t tell' style={{...outcome2Background["cantTell"]}}>CT</th>
        <th className="inapplicable" title='Not Present' style={{...outcome2Background["inapplicable"]}}>NP</th>
        <th className="untested" title='Not checked' style={{...outcome2Background["untested"]}}>NC</th>
    </>);
}

function Summary({conformanceLevels}:any){

    const [outcomesCount, setOutcomesCount] = useState([0, 0, 0, 0, 0]);
    const [reportSummary, setReportSummary] = useState(null);

    useEffect(() => { 
        (async ()=>{
            setReportSummary(await getFromChromeStorage("reportSummary"));
        })();
    },[]);

    useEffect(() => { 
        if(reportSummary){
            (async ()=>{
                let passed = 0, failed = 0, cantTell = 0, inapplicable = 0, untested = 0;
                for(const conformanceLevel of conformanceLevels){
                    passed += reportSummary["earl:passed"][conformanceLevel];
                    failed += reportSummary["earl:failed"][conformanceLevel];
                    cantTell += reportSummary["earl:cantTell"][conformanceLevel];
                    inapplicable += reportSummary["earl:inapplicable"][conformanceLevel];
                    untested += reportSummary["earl:untested"][conformanceLevel];
                }
                setOutcomesCount([passed, failed, cantTell, inapplicable, untested]);
            })();
        }
    },[conformanceLevels, reportSummary]);

    return(
        <table className="summaryTable">
            <tr> <OutcomeHeaders /> </tr>
            <tr> {outcomesCount.map((count:any) => ( <td>{count}</td> ))} </tr>
        </table>
    );
}

function ResultCount({category, conformanceLevels}:any){

    let passed = 0, failed = 0, cantTell = 0, inapplicable = 0, untested = 0;

    for(const conformanceLevel of conformanceLevels){
        passed += category.passed[conformanceLevel];
        failed += category.failed[conformanceLevel];
        cantTell += category.cantTell[conformanceLevel];
        inapplicable += category.inapplicable[conformanceLevel];
        untested += category.untested[conformanceLevel];
    }

    return(<>
        <td>{passed}</td><td>{failed}</td><td>{cantTell}</td><td>{inapplicable}</td><td>{untested}</td>
    </>);
}




function SubCategory({subCategories, mantainExtended, conformanceLevels}:any){

    const [selectedSubCategories, setSelectedSubCategories] = useState(Array(subCategories.length).fill(false));

    const handleSubCategoryStateChange = (index:any) => {
        const newStates = mantainExtended ? [...selectedSubCategories] : Array(subCategories.length).fill(false);
        newStates[index] = !selectedSubCategories[index];
        setSelectedSubCategories(newStates);

        clearHighlights();
    };

    return(<> 
        {subCategories.map((subCategory:any, index:any) => (<>

            <tr className="collapsible subCategory" onClick={()=>handleSubCategoryStateChange(index)}>
                <td>{subCategory.subCategoryTitle}</td>
                <ResultCount category={subCategory} conformanceLevels={conformanceLevels} />
            </tr>
            { selectedSubCategories[index] ? 
                <Criterias criterias={subCategory.criterias} mantainExtended={mantainExtended} conformanceLevels={conformanceLevels}/> 
            : null }
        
        </>))} 
    </>);
}




function Criterias({criterias, mantainExtended, conformanceLevels}:any){

    const [selectedCriterias, setSelectedCriterias] = useState(Array(criterias.length).fill(false));

    const handleCriteriaStateChange = (index:any) => {
        const newStates = mantainExtended ? [...selectedCriterias] : Array(criterias.length).fill(false);
        newStates[index] = !selectedCriterias[index];
        setSelectedCriterias(newStates);

        clearHighlights();
    };

    

    return(<> 
        {criterias.map((criteria:any, index:any) => (<>

            { conformanceLevels.includes(criteria.conformanceLevel) ? <>
            
                <tr className={"collapsible criteria"} style={{...outcome2Background[criteria.outcome]}} onClick={() => {handleCriteriaStateChange(index)}}>
                    <td colSpan={2}>
                        {criteria.hasOwnProperty("hasPart") ? <>
                            
                            <img src={ selectedCriterias[index] ? getImgSrc("extendedArrow") : getImgSrc("contractedArrow") } alt="Show information" height="20px"/>
                            {criteria.criteria}
                            
                        </> : <> {criteria.criteria} </> }
                    </td>
                    <td colSpan={4}>{criteria.outcome}</td>
                </tr>
                {criteria.hasOwnProperty("hasPart") && selectedCriterias[index] ? 
                    <CriteriaResults criteriaResults={criteria.hasPart} mantainExtended={mantainExtended} />
                : null }
        
            </> : null }

        </>))} 
    </>);
}



function CriteriaResults({criteriaResults}:any){  

    const [selectedCriteriaResults, setSelectedCriteriaResults] = useState(Array(criteriaResults.length).fill(false));

    function handleCriteriaResultStateChange (index:any){
        const newStates = Array(criteriaResults.length).fill(false);
        newStates[index] = !selectedCriteriaResults[index];
        setSelectedCriteriaResults(newStates);

        clearHighlights();

        if(!selectedCriteriaResults[index] && criteriaResults[index].groupedPointers){

            const defaultStyles = Object.fromEntries(
                Object.entries(criteriaResults[index].groupedPointers).map(([groupKey, pointers]:any) => [
                    groupKey, []
                ])
            );

            for (const groupKey in criteriaResults[index].groupedPointers) {
                for(const pointer of criteriaResults[index].groupedPointers[groupKey]){

                    const element = getHtmlElement(pointer.path, pointer.innerText);

                    if(element){
                        element.setAttribute("tabindex", "0");
                        defaultStyles[groupKey].push({"style": element.style.border, "path": pointer.path});
                    }else{
                        defaultStyles[groupKey].push(null);
                    }
                    
                }
            }

            sessionStorage.setItem("defaultStyles", JSON.stringify(defaultStyles));
        }

    }

    return(<>
        {criteriaResults.map((result:any, index:any) => (<>
            
            <tr className="collapsible criteriaResult" onClick={() => handleCriteriaResultStateChange(index)}>
                <td colSpan={6} style={{...outcome2Background[result.outcome]}}>
                    <img src={ selectedCriteriaResults[index] ? getImgSrc("extendedArrow") : getImgSrc("contractedArrow") } alt="Show information" height="20px"/>
                    {result.outcome}
                </td>
            </tr>

            {selectedCriteriaResults[index] && (<>
            
                {result.descriptions.map((element:any, index:any) => (<>

                    <tr><td style={{textAlign:"left", fontWeight:"bold", paddingTop:"10px"}} colSpan={6}>{parse("@" + element.assertor)}</td></tr>
                    <tr><td style={{textAlign:"left"}} colSpan={6}>{parse(element.description)}</td></tr>
                
                </>))}

                { result.hasOwnProperty("groupedPointers") ? 
                    <CriteriaResultPointers resultGroupedPointers={result.groupedPointers} />
                : null }
                
            </>)}

        </>))} 
    </>);
}


function CriteriaResultPointers({resultGroupedPointers}:any){  


    const getStructureObject = useCallback((empty = false) => {
        return Object.fromEntries(Object.entries(resultGroupedPointers).map(([groupKey, pointers]:any) => [
            groupKey, 
            empty ? [] : pointers.map(() => false)
        ]))
    }, [resultGroupedPointers]);    // The function will be redefined when resultGroupedPointers is updated

    const [selectedPointers, setSelectedPointers] = useState( getStructureObject() );
    const [hiddenElements, setHiddenElements] = useState( getStructureObject() );

    
    function handlePointerClick (groupKey:any, index:any){
        
        let newSelectedPointer =  getStructureObject();
        newSelectedPointer[groupKey][index] = !selectedPointers[groupKey][index];
        setSelectedPointers(newSelectedPointer);

        if(hiddenElements[groupKey][index]){

            if(!selectedPointers[groupKey][index]) {
                sendMessageToBackground("showHiddenElement");
            }
            return;
        } 

        for (const group in resultGroupedPointers) {
            for(let i = 0; i < resultGroupedPointers[group].length; i++){

                if(hiddenElements[group][i]) continue;

                const element = getHtmlElement(resultGroupedPointers[group][i].path, resultGroupedPointers[group][i].innerText);

                if(element){

                    const highlightAnimation = (repeat:any) => {
                        setTimeout(() => {
                            element.style.border = "3px solid white";
                            setTimeout(() => {
                                element.style.border = "3px solid #FF3633";
                                if(repeat > 0) highlightAnimation (repeat - 1);
                            }, 120);
                        }, 120);
                    }

                    if(index === i && groupKey === group && !selectedPointers[group][index]){

                        sendMessageToBackground("createElementPopup", resultGroupedPointers[group][i].path);

                        element.focus();
                        element.blur();
                        element.style.border = "3px solid #FF3633";
                        highlightAnimation(1);
                        continue;
                    }
                    element.style.border = "3px solid #005a6a";

                }
            }
        }

    }


    useEffect(() => { 

        const hidden = getStructureObject(true);

        for (const groupKey in resultGroupedPointers) {
            for(const pointer of resultGroupedPointers[groupKey]){

                const element = getHtmlElement(pointer.path, pointer.innerText);

                if(element){
                    if(element.getAttribute('type') === "hidden" || element.getAttribute("hidden")!==null){
                        hidden[groupKey].push(true);
                    }else{
                        hidden[groupKey].push(false);
                        element.style.border = "3px solid #005a6a";
                    }
                }else{
                    hidden[groupKey].push(false);
                }
            }
        }
        setHiddenElements(hidden);

    }, [getStructureObject, resultGroupedPointers]);    // The use effect will rerun when getStructureObject or resultGroupedPointers is updated
      


    return(<>
        
        {Object.entries(resultGroupedPointers).map(([groupKey, pointers]:any) => (<>

            <tr><td colSpan={6} style={{textAlign:"left"}}>

                <span style={{fontWeight: "bold", paddingTop:"10px"}}>{"[ " + groupKey + " ]"}</span>
                {pointers.map((pointer:any, index:any) => (
                    <pre
                        className="codigo_analisis"
                        style={!hiddenElements[groupKey][index] ? 
                            (selectedPointers[groupKey][index] ? { border: "3px solid #FF3633" } : { border: "1px solid #005a6a" }) 
                            : { color:"black" }}
                        onClick={() => handlePointerClick(groupKey, index)}
                    >
                        {index + 1}. {selectedPointers[groupKey][index] ? parse(pointer.html) : parse(pointer.html.substring(0, 30) + " ... ")} {hiddenElements[groupKey][index] && "(HIDDEN)"}
                    </pre> 
                ))}
                
            </td></tr>

        </>))}

    </>);
}



