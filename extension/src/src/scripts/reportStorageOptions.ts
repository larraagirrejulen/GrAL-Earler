
import { fetchServer, applyBlackList } from "./utils/moreUtils";
import { getFromChromeStorage, removeFromChromeStorage, storeOnChromeStorage } from "./utils/chromeUtils";
import { loadReport, includeEditedFoundCases } from "./reportLoadingOptions";
import { SetStateAction } from "react";


/**
 * Retrieves the stored reports, adapts them, and sets them on the paginatedData useState.
 * @param {Function} setPaginatedData - Function to update the paginated data state.
 */
export async function getStoredReports(setPaginatedData: { (value: SetStateAction<never[][]>): void; (arg0: any[]): void; }){

    try{

        const bodyData = JSON.stringify({domain: window.location.hostname});

        const storeResults = await fetchServer(bodyData, "storage");

        if(storeResults.success){
            setPaginatedData(transformArray(storeResults.reports));
        } else {
            window.alert("Could not get the stored reports, try again later...");
        }        

    }catch(error){
        console.log(error);
    }

};


/**
 * Loads a stored report by its ID.
 * @param {string} id - The ID of the stored report.
 */
export async function loadStoredReport(id: string){

    try{

        const bodyData = JSON.stringify({action: "getReport", id});

        const storeResults = await fetchServer(bodyData, "storage");

        if(storeResults.success){
            const reportLoaded = await getFromChromeStorage(window.location.hostname + ".reportIsLoaded");
            if(reportLoaded === "true"){
                const currentReport = await getFromChromeStorage(window.location.hostname);
                includeEditedFoundCases(storeResults.report, currentReport);
            }
            loadReport(storeResults.report);
        } else {
            window.alert("Could not get the report, try again later...");
        }        

    }catch(error){
        console.log(error);
    }
};


/**
 * Removes a stored report from the server and updates the UI.
 * @param {string} id - The ID of the report to be removed.
 * @param {function} setPaginatedData - The function to set the paginated data in the UI.
 * @param {function} setCurrentPage - The function to set the current page in the UI.
 * @returns {Promise<void>} A promise that resolves when the report is successfully removed.
 */
export async function removeStoredReport(id: string, setPaginatedData: { (value: SetStateAction<never[][]>): void; (arg0: any[]): void; }, setCurrentPage: { (value: SetStateAction<number>): void; (arg0: number): void; }){

    try{

        let bodyData = JSON.stringify({action: "remove", id});

        let storeResults = await fetchServer(bodyData, "storage");

        if(storeResults.success){
            window.alert("succesfully deleted");
        } else {
            window.alert("Could not remove the report, try again later...");
        } 

        bodyData = JSON.stringify({domain: window.location.hostname});

        storeResults = await fetchServer(bodyData, "storage");

        if(storeResults.success){
            setPaginatedData(transformArray(storeResults.reports));
            setCurrentPage(0);
        }

        const parentId = await getFromChromeStorage(window.location.hostname + ".parentId");

        if(parentId === id){
            removeFromChromeStorage(window.location.hostname + ".parentId")
        }

    }catch(error){
        console.log(error);
    }
};


/**
 * Transforms the flat array of reports into a nested array of report branches.
 * @param {Array} array - The array of reports.
 * @returns {Array} The transformed nested array of report branches.
 */
function transformArray(array: any[]) {

    const result: any[][] = [];
  
    function findDescendants(parentId: any, branchElements: any[]) {
        const descendants = array.filter((item) => item.parentId === parentId);
    
        descendants.forEach((descendant) => {
            branchElements.push(descendant);
            findDescendants(descendant.id, branchElements);
        });
    }
  
    const rootElements = array.filter((item) => item.parentId === null);
    rootElements.forEach((rootElement) => {

        const branchElements = []

        branchElements.push(rootElement);

        findDescendants(rootElement.id, branchElements);

        result.push(branchElements);

    });
  
    return result;
};


/**
 * Stores a new report and updates the animateBtn and parentId state.
 * @param {Function} setAnimateBtn - Function to update the animateBtn state.
 * @param {string} authenticationState - The authentication state.
 */
export async function storeNewReport(setAnimateBtn: { (value: SetStateAction<string>): void; (arg0: string): void; }, authenticationState: any){

    try{
        setAnimateBtn("store");

        const report = await getFromChromeStorage(window.location.hostname);

        const enableBlacklist = await getFromChromeStorage('enableBlacklist', true);
        
        if(enableBlacklist){
            await applyBlackList(report);
        }

        const parentId = await getFromChromeStorage(window.location.hostname + ".parentId") ?? null;

        const bodyData = JSON.stringify({action: "storeNewReport", domain: window.location.hostname, report, uploadedBy: authenticationState, parentId});

        const storeResults = await fetchServer(bodyData, "storage");

        if(storeResults.success){
          window.alert("Report successfully stored!");
          storeOnChromeStorage(window.location.hostname + ".parentId", storeResults.newParentId);
        } else {
          window.alert("Could not store the report, try again later...");
        }

    }catch(error){
        console.log(error);
    }finally{
        setAnimateBtn("none");
    }

};