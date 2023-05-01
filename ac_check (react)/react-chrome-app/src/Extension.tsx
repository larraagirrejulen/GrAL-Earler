
import './css/extension.css';
import './css/evaluatorSelectionSection.css';
import './css/evaluationSection.css';
import './css/resultSection.css';

import { useEffect, useState } from "react";
import { getImgSrc, sendMessageToBackground, getFromChromeStorage } from './js/chromeUtils.js';
import { removeStoredReport, downloadStoredReport, uploadNewReport } from './js/reportStoringUtils.js';
import { performEvaluation } from './js/evaluation.js';
import { BeatLoader } from 'react-spinners';  // Loading animation
import ResultsTable from './ResultsTable';



export default function Extension() {

  const [shiftWebpage, setShiftWebpage] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect( ()=>{
    removeStoredReport();
    (async () => {
      setShiftWebpage(await getFromChromeStorage("shiftWebpage", true));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if(shiftWebpage){
        hidden ? document.body.classList.remove('extension-active') : document.body.classList.add('extension-active');
      }
    })();
  }, [hidden, shiftWebpage]);

  return (<>
    
    {hidden ? <img className="hidden_extension_logo" alt="extension logo when hidden" src={getImgSrc("icon128")} onClick={()=>setHidden(!hidden)} /> : ""}
    
    <div className= {`react_chrome_extension ${hidden && 'hidden'}`}>
      <img className="options_icon" src={getImgSrc("settingsGear")} alt="open configuration options window" onClick={()=>sendMessageToBackground("openOptionsPage")} />
      <span className="close_icon" onClick={()=>setHidden(!hidden)}>&times;</span>
      <div className="img_container">
        <img alt="extension logo" src={getImgSrc("icon128")} onClick={() => {
          window.open("https://github.com/larraagirrejulen/GrAL", '_blank');
          window.open("https://github.com/Itusil/TFG", '_blank')
        }} />
      </div>

      <EvaluatorSelectionSection /> <EvaluationSection /> <ResultSection />
    </div>

  </>);
}




function EvaluatorSelectionSection () {
  const [isOpen, setIsOpen] = useState(localStorage.getItem("evaluated") !== "true");

  const [checkboxes, setCheckboxes] = useState([
    { checked: false, label: "AccessMonitor", href: "https://accessmonitor.acessibilidade.gov.pt/"},
    { checked: false, label: "AChecker", href: "https://achecker.achecks.ca/checker/index.php"},
    { checked: false, label: "Mauve", href: "https://mauve.isti.cnr.it/singleValidation.jsp"},
    { checked: false, label: "A11y library", href: "https://github.com/ainspector/a11y-evaluation-library"},
    { checked: false, label: "Pa11y", href: "https://github.com/pa11y/pa11y"}
  ]);

  const handleCheckboxChange = (index:any) => {
    const newCheckboxes = [...checkboxes];
    newCheckboxes[index].checked = !newCheckboxes[index].checked;
    setCheckboxes(newCheckboxes);
    localStorage.setItem("checkboxes", JSON.stringify(newCheckboxes));
  };

  useEffect(() => { 
    const storedCheckboxes = localStorage.getItem("checkboxes");
    if(storedCheckboxes !== null){
      setCheckboxes(JSON.parse(storedCheckboxes));
    }else{
      localStorage.setItem("checkboxes", JSON.stringify(checkboxes));
    }     
  }, [checkboxes]);

  return ( <div className="evaluator_selection_section">

      <div className="header" onClick={() => setIsOpen((prev:any) => !prev) }>
        <img src = { isOpen ? getImgSrc("extendedArrow") : getImgSrc("contractedArrow") } alt="dropdown_arrow" />
        <span>Select evaluators</span>
      </div>

      <div className="body" style={isOpen ? {display: "block"} : {display: "none"}}>
        {checkboxes.map((checkbox:any, index:any) => (
          <div className="checkbox-wrapper">
            <div className="checkbox">
              <input type="checkbox" checked={checkbox.checked} onChange={()=>handleCheckboxChange(index)} className={checkbox.checked && "checked" } />
              <span onClick={() => { window.open(checkbox.href, '_blank'); }}>{checkbox.label}</span>
            </div><br/>
            <span>{checkbox.checked ? "Selected" : "Unchecked"}</span>
          </div>
        ))}
      </div>
    
  </div> );
}




function EvaluationSection () {

  const [isOpen, setIsOpen] = useState(localStorage.getItem("evaluated") !== "true");
  const [isLoading, setIsLoading] = useState(false);

  return ( <div className="evaluation_section">

      <div className="header" onClick={() => setIsOpen((prev:any) => !prev) }>
        <img src = { isOpen ? getImgSrc("extendedArrow") : getImgSrc("contractedArrow") } alt="dropdown_arrow" />
        <span>Evaluation options</span>
      </div>

      <div className="body" style={isOpen ? {display: "block"} : {display: "none"}}>
        <button id="btn_get_data" className="button primary" onClick={()=>{performEvaluation(setIsLoading)}} disabled={isLoading}>
          {isLoading ? <BeatLoader size={8} color="#ffffff" /> : "Evaluate current page"}
        </button><br/>
        <label id="btn_clear_data" className="button secondary" onClick={removeStoredReport}>Clear stored data</label><br/>
        <label id="btn_download" className="button primary" onClick={downloadStoredReport}>Download report</label><br/>
        <label id="btn_upload" className="button secondary"><input type="file" accept=".json" onChange={(event) => uploadNewReport(event)} />Upload Report</label>
      </div>
    
  </div> );
}




function ResultSection() {
  
  const [conformanceLevels, setConformanceLevels] = useState(['A', 'AA']);
  function handleLevelClick (level:any) {
    const levels = level === 'A' ? ['A'] : (level === 'AA' ? ['A', 'AA'] : ['A', 'AA', 'AAA']);
    setConformanceLevels(levels);
    localStorage.setItem("conformanceLevels", JSON.stringify(levels));
  };

  useEffect(() => {
    const storedConformanceLevels = localStorage.getItem("conformanceLevels");
    if(storedConformanceLevels !== null){
      setConformanceLevels(JSON.parse(storedConformanceLevels));
    }else{
      localStorage.setItem("conformanceLevels", JSON.stringify(conformanceLevels));
    }
  }, [conformanceLevels]);

  return ( 
    <div className="result_section">

      <div className="header"><span>Evaluation Results</span></div>

      <div className="body">
        {localStorage.getItem("evaluated") === "true" ? <>

          <div className='conformanceLevelSelector'>
            <p>Select conformace level:</p>
            <div className="level-container">
              {["A", "AA", "AAA"].map((level:any) => (
                <div className={`conformanceLevels ${conformanceLevels.includes(level) ? 'selected' : ''}`} onClick={() => handleLevelClick(level)}>{level}</div>
              ))}
            </div>
          </div>

          <ResultsTable conformanceLevels={conformanceLevels}/>
        
        </> : 
          <div style={{textAlign: "center", padding:"15px 0"}}>No data stored</div>
        }
      </div>

    </div> 
  );

}

