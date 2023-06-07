
const sqlite3 = require('sqlite3').verbose();
const fs = require("fs");


class ReportController{

    #db;

    constructor(){

        this.#db = new sqlite3.Database('database.db');

        /*this.#db.run(`
            DROP TABLE reports;
        `);*/

        this.#db.run(`
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT NOT NULL,
                version INTEGER NOT NULL,
                uploadedBy TEXT NOT NULL,
                report TEXT NOT NULL,
                parentId INTEGER,
                FOREIGN KEY (parentId) REFERENCES reports(id)
            );
        `);

    }

    // Request handler
    async handleReportRequest(request) { 

        let response;

        if(request.domain){
            console.log("\n  Getting domain reports...");
            response = await this.#getEvaluationReports(request.domain); 
        } else if(request.action === "getReport"){
            console.log("\n  Getting report...");
            response = await this.#getReport(request.id);
        } else if(request.action === "remove"){
            console.log("\n  Removing report...");
            response = await this.#removeReport(request.id);
        } else {
            console.log("\n  Storing new report...");
            response = await this.#insertNewEvaluationReport(request.report, request.uploadedBy, request.parentId); 
        }

        console.log("\n  Response: " + JSON.stringify(response));
        return JSON.stringify(response);

    }
    
    // Function to check if a user exists
    #insertNewEvaluationReport(report, uploadedBy, parentId) {

        const domain = report.evaluationScope.website.siteName;

        fs.writeFile('./filteredReport.json', JSON.stringify(report, null, 2), err => {
            if (err) console.log('Error writing file', err)
        });

        return new Promise((resolve, reject) => { 
            this.#db.serialize(() => {
                if(parentId !== null){
                    this.#db.run(`
                        INSERT INTO reports (domain, version, uploadedBy, report, parentId)
                        VALUES (?, (SELECT COALESCE(version , 0) + 1 FROM reports WHERE id = ?), ?, ?, ?)
                    `, [domain, parentId, uploadedBy, JSON.stringify(report), parentId], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({"success": true, "newParentId": this.lastID});
                        }
                    });
                }else{
                    this.#db.run(`
                        INSERT INTO reports (domain, version, uploadedBy, report, parentId)
                        VALUES (?, 1, ?, ?, NULL)
                    `, [domain, uploadedBy, JSON.stringify(report)], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({"success": true, "newParentId": this.lastID});
                        }
                    });
                }
                
            });
        });
    }

    #getEvaluationReports(domain) {

        return new Promise((resolve, reject) => { 

            this.#db.all(`
                SELECT id, version, uploadedBy, parentId
                FROM reports
                WHERE domain = (?)
            `, [domain + "/"], function(err, rows) {
                if (err) {
                    reject(err);
                } else {
                    resolve({"success": true, reports: rows});
                }
            });
                
        });
    }

    #getReport(id) {

        return new Promise((resolve, reject) => { 

            this.#db.all(`
                SELECT report
                FROM reports
                WHERE id = (?)
            `, [id], function(err, rows) {
                if (err) {
                    reject(err);
                } else {
                    resolve({"success": true, report: JSON.parse(rows[0].report)});
                }
            });
                
        });
    }

    async #removeReport(id) {

        const parentId = await new Promise((resolve, reject) => { 

            this.#db.all(`
                SELECT parentId
                FROM reports
                WHERE id = ?
            `, [id], function(err, rows) {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows[0].parentId);
                }
            });

        });

        return new Promise((resolve, reject) => { 

            this.#db.run(`
                DELETE FROM reports
                WHERE id = ?
            `, [id], function(err) {
                if (err) {
                    reject(err);
                }
            });

            this.#db.run(`
                UPDATE reports
                SET parentId = ?
                WHERE parentId = ?
            `, [parentId, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({"success": true});
                }
            });
              
        });
    }
      
}

module.exports = ReportController;