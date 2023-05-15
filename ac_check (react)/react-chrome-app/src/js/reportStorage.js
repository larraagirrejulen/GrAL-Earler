
import { mapReportData } from './mapReportData.js';
import { storeOnChromeStorage, getFromChromeStorage, removeFromChromeStorage } from './utils/chromeUtils.js';


/**
 * Stores a new report in the Chrome storage, maps the report data for the extension table, sets a flag in localStorage and reloads the page.
 * @async
 * @function storeNewReport
 * @param {Object} newReport - The report object to be stored in the Chrome storage.
 * @throws {Error} If there was an error storing the new report.
 */
export function storeNewReport(newReport){
    try{
        storeOnChromeStorage("report", newReport);
        mapReportData(newReport);
    } catch(error) {
        ["report", "reportSummary", "reportTableContent"].map((key) => removeFromChromeStorage(key));
        throw new Error("Error when storing or mapping the report => " + error);
    }
}


/**
 * Removes all stored report data from Chrome storage, clears the evaluated flag from localStorage and reloads the page.
 * @function removeStoredReport
 */
export function removeStoredReport(){
    
    if (!window.confirm("Are you sure you want to permanently delete current stored evaluation data?")) return;

    localStorage.removeItem("evaluated");

    ["report", "reportSummary", "reportTableContent"].map((key) => removeFromChromeStorage(key));

    window.location.reload();
}


/**
 * Reads and stores the contents of the uploaded report file, and stores it as a new report object.
 * @function uploadNewReport
 * @param {Object} uploadEvent - The upload event object, containing the file to be read.
 */
export function uploadNewReport(uploadEvent){

    if(localStorage.getItem("evaluated")) {
        if (!window.confirm("The upload will overwrite the current stored report. You want to continue?")) return;
    }

    const reader = new FileReader();

    reader.readAsText(uploadEvent.target.files[0], "UTF-8");
    
    reader.onload = async (uploadEvent) => {
        const newReport = JSON.parse(uploadEvent.target.result);
        storeNewReport(newReport);
    }

}


/**
 * Downloads the stored report data from Chrome storage, modifies it according to the active conformance levels and downloads it as a JSON file.
 * If there is no stored report data, it shows an alert message and does nothing.
 * @async
 * @function downloadStoredReport
 */
export async function downloadStoredReport(){

    const storedReport = await getFromChromeStorage("report", false);
    const activeConformanceLevels = JSON.parse(localStorage.getItem("conformanceLevels"));

    storedReport.evaluationScope.conformanceTarget = "wai:WCAG2" + activeConformanceLevels[activeConformanceLevels.length - 1] + "-Conformance";

    const untestedOutcome = {
        outcome: "earl:untested",
        description: "",
    };

    storedReport.auditSample.forEach((criteria) => {

        const conformanceLevel = criteria.conformanceLevel;

        if(!activeConformanceLevels.includes(conformanceLevel)){

            criteria.result = untestedOutcome;
            criteria.hasPart = [];
            delete criteria.assertedBy;
            delete criteria.mode;

        }else if(criteria.result.outcome === "earl:untested"){

            criteria.result.description += "\n\n----------------------------------\n\n";
            criteria.hasPart.forEach((elem) => {
                elem.result.description += "\n\n----------------------------------\n\n";
            });
        
        }
    });

    const fileName = storedReport.title + ".json";
    const fileType = "text/json";
    const blob = new Blob([JSON.stringify(storedReport)], { type: fileType })

    const a = document.createElement('a');
    a.download = fileName;
    a.href = window.URL.createObjectURL(blob)
    a.dispatchEvent(new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
    }))
    a.remove()

    if (window.confirm("Do you want to upload the report on W3C?")){
        window.open("https://www.w3.org/WAI/eval/report-tool/", '_blank');
    } 
}