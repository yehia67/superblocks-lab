// Copyright 2018 Superblocks AB
//
// This file is part of Superblocks Studio.
//
// Superblocks Studio is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// Superblocks Studio is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Superblocks Studio.  If not, see <http://www.gnu.org/licenses/>.


import Mocha from '../../mocha.js';
import { CustomReporter } from "../testing/reporter";

//
// Libraries available from within test context
const ABI = require('../../ethereumjs-abi-0.6.5.min.js');
const Tx = require('../../ethereumjs-tx-1.3.3.min.js');
const TestLibrary = require("./library").default;
const utilityLibrary = new TestLibrary();


/*====================
  TestRunner

  Controls tests: initialize, start, run, ...
=====================*/
export default class TestRunner {

    constructor() {
        this._status = "";
        this.testData={};
        this.successCount=0;
        this.failureCount=0;
        this.totalTestCount=0;
        this.reporterStatus="";
    }

    _createAliases(contractsData) {
        var contracts="";
        for(var key in contractsData) {
            const contractName = key.toString();
            console.log("[TestRunner] exposing contract alias: " + contractName);
            contracts+="const " + contractName + '=contractsData["' + contractName + '"];';
        }
        return contracts;
    }

    _run(testName, testCode, contractsData, accountAddress, accountKey, web3, callback) {
        if(!accountAddress || accountAddress === null) {
            console.error("[TestRunner] Unable to run: undefined account address");
            return;
        }

        if(!accountKey || accountKey === null) {
            console.error("[TestRunner] Unable to run: undefined account key");
            return;
        }

        if(!web3 || web3 === null) {
            console.error("[TestRunner] Unable to run: undefined web3 object");
            return;
        }

        console.log("[TestRunner] setting up test runner ...");
        const thisReference = this;
        const contracts = thisReference._createAliases(contractsData);

        thisReference._status="";

        //
        // Setup Mocha
        if(mocha && mocha.suite) {
            // TODO: Consider create or none instead ?
            //var suiteInstance = mocha.suite.create(mochaInstance.suite, 'Test Suite');
            mocha.suite = mocha.suite.clone();
            mocha.setup("bdd");
            mocha.reporter(CustomReporter);

            describe("Test name: " + testName, function() {
                try {
                    // TODO: FIXME: consider a better alternative for dynamically adding tests
                    // Note: alternatively, could use mocha.suite.addTest(new Test ... ), given the possibility to access the inner library
                    // See also: Runner
                    // Reference:
                    //   const statement="describe(\"Hello World\", function(){var contractInstance;beforeEach(function(){console.warn(\"testing...\");});it(\"testing tests\",function(){console.log(true); }); });";
                    eval(contracts + testCode);
                } catch(e) {
                    thisReference._status="Invalid test file: " + testName + ". " + e;
                    console.error("[TestRunner] error: ", thisReference._status);
                    return;
                }
            });

            // Invoke Mocha
            mocha.checkLeaks();
            //mocha.allowUncaught();
            mocha.fullTrace();
            const runner = mocha.run(function() {
                if(callback) {
                    callback();
                }
                console.log("[TestRunner] test run completed!");
            });
        } else {
            console.error("[TestRunner] unable to access test library: ", mocha);
        }
    }

    _safeRun(testName, testCode, contractsData, accountAddress, accountKey, web3, callback) {
        if(!accountAddress || accountAddress === null) {
            console.error("[TestRunner] Unable to run: undefined account address");
            return;
        }

        if(!accountKey || accountKey === null) {
            console.error("[TestRunner] Unable to run: undefined account key");
            return;
        }

        if(!web3 || web3 === null) {
            console.error("[TestRunner] Unable to run: undefined web3 object");
            return;
        }

        console.log("[TestRunner] setting up test runner ...");
        const thisReference = this;
        const contracts = thisReference._createAliases(contractsData);

        thisReference._status="";

        //
        // Setup Mocha
        if(mocha && mocha.suite) {
            //TODO: FIXME: security / external source
            const content = `
                <script type="text/javascript" src="https://unpkg.com/mocha@5.2.0/mocha.js"></script>
                <script type="text/javascript" src="https://unpkg.com/web3@0.20.5/dist/web3.min.js"></script>
                <script type="text/javascript">
                    /*====================
                      Test data

                      Keep track of tests
                    ====================*/
                    var testData={};
                    function registerTestSuite(key, suite) {
                        if(key === null) {
                            console.error("Unable to register test suite with null key.");
                            return;
                        }

                        if(testData && suite) {
                            if(testData[key] === undefined) {
                                testData[key] = suite;
                            } else {
                                console.warn("Skipping registration for test suite entry. Key already exists: " + key);
                                return;
                            }
                        } else {
                            console.error("Unexpected failure: unable to access test suite data. testData: ", testData, " suite: ", suite);
                            return;
                        }
                    }

                    /*====================
                      Latest test data

                      Keep track of statistics
                    ====================*/
                    var successCount;
                    var failureCount;
                    var totalTestCount;
                    var reporterStatus;

                    //
                    // Initial state is reset
                    dataReset();

                    //
                    // Cleanup data
                    function dataReset() {
                        testData={};
                        successCount=0;
                        failureCount=0;
                        totalTestCount=0;
                        reporterStatus="";
                    }

                    function dataIncrementSuccess() {
                        successCount++;
                        console.log("[TestRunner] increased success counter: " + successCount);
                    }

                    function dataIncrementFailure() {
                        failureCount++;
                        console.log("[TestRunner] increased failure counter: " + failureCount);
                    }

                    function dataAddTotalTestCount(count) {
                        totalTestCount += count;
                    }

                    function readReportOutput() {
                        return testData;
                    }

                    function readReportSuccesses() {
                        return successCount;
                    }

                    function readReportFailures() {
                        return failureCount;
                    }

                    function readTotalTestCount() {
                        return totalTestCount;
                    }

                    function readReporterStatus() {
                        return reporterStatus;
                    }

                    function resetReportData() {
                        dataReset();
                    }

                    function CustomReporter(runner) {
                        runner.on("suite", function(suite){
                            if(suite) {
                                const parentReference = suite.parent;
                                if(parentReference && parentReference.title) {
                                    const splitTitle = parentReference.title.split(": ");

                                    //
                                    // Extract title
                                    if(splitTitle[0] === "Test name") {
                                        const key = splitTitle[1];

                                        //
                                        // Register test suite
                                        const suiteTests = suite.tests;
                                        if(suiteTests) {
                                            const suiteLength = suiteTests.length;
                                            if(key && suiteLength > 0) {
                                                dataAddTotalTestCount(suiteLength);
                                                //console.log("[TestRunner] suite \"" + suite.title + "\" total test count: " + readTotalTestCount());
                                                for(var i=0; i<suiteLength; i++) {
                                                    registerTestSuite(key, suite);
                                                }
                                            }
                                        }
                                    } else {
                                        console.error("Unexpected error. Parent reference title is not a valid test group: " + parentReference.title);
                                    }
                                }
                            }
                        });

                        runner.on("pass", function(test){
                            if(test) {
                                dataIncrementSuccess();
                            }
                        });

                        runner.on("fail", function(test, error){
                            if(test) {
                                if(error) {
                                    console.error(error);
                                    dataIncrementFailure();

                                    var stack = null;
                                    const errorStack = error.stack;
                                    if(errorStack) {
                                        stack = errorStack.split("\\n").map(
                                            function(line){
                                                return line.trim();
                                            }
                                            );
                                    }

                                    var generatedError = null;
                                    if(stack !== null && stack[1]) {
                                        generatedError = stack[1].split("<anonymous>:")[1];
                                    }

                                    if(generatedError !== null && generatedError !== undefined){
                                        var reason = "unknown";
                                        if(stack[0]) {
                                            reason = stack[0].split("Error: ")[1];
                                        }

                                        const line=generatedError.split(":")[0];
                                        const column=generatedError.split(":")[1].split(")")[0];
                                        const errorOutput="Failure in line " + line + " column " + column + ". Reason: " + reason;

                                        console.error(errorOutput);
                                        reporterStatus = errorOutput;
                                    } else {
                                        reporterStatus = error.toString();
                                    }
                                } else {
                                    console.error("Unexpected error data on failure. Test: ", test, " Error: ", error);
                                }
                            }
                        });

                        runner.on("start", function(){
                            dataReset();
                        });

                        runner.on("end", function(){
                            console.log("[TestRunner] ended test run with status: ", successCount, failureCount, testData);
                            return successCount, failureCount, testData
                        });
                    }

                    function run(testName, contracts, testCode, contractsData, accountAddress, accountKey, web3, callerSourceReference, callerOriginReference) {

                        // TODO: FIXME: provide access to web3 object
                        //var web3=new Web3(web3);

                        // TODO: Consider create or none instead ?
                        //var suiteInstance = mocha.suite.create(mochaInstance.suite, 'Test Suite');
                        mocha.suite = mocha.suite.clone();
                        mocha.setup("bdd");
                        mocha.reporter(CustomReporter);

                        describe("Test name: " + testName, function() {
                            try {
                                // TODO: FIXME: consider a better alternative for dynamically adding tests
                                // Note: alternatively, could use mocha.suite.addTest(new Test ... ), given the possibility to access the inner library
                                // See also: Runner
                                // Reference:
                                //   const statement="describe(\"Hello World\", function(){var contractInstance;beforeEach(function(){console.warn(\"testing...\");});it(\"testing tests\",function(){console.log(true); }); });";
                                eval(contracts + testCode);
                            } catch(e) {
                                //TODO: FIXME: thisReference
                                //thisReference._status="Invalid test file: " + testName + ". " + e;
                                //console.error("[TestRunner] error: ", thisReference._status);
                                console.error("[TestRunner] error: Invalid test file: " + testName + ". " + e);

                                return;
                            }
                        });

                        // Invoke Mocha
                        mocha.checkLeaks();
                        //mocha.allowUncaught();
                        mocha.fullTrace();
                        const runner = mocha.run(function() {
                            // TODO: FIXME:
                            //const testData = readReportOutput();
                            const testData = {};

                            const successCount = readReportSuccesses();
                            const failureCount = readReportFailures();
                            const totalTestCount = readTotalTestCount();
                            const reporterStatus = readReporterStatus();

                            callerSourceReference.postMessage({ testData: testData, successCount: successCount, failureCount: failureCount, totalTestCount: totalTestCount, reporterStatus: reporterStatus }, callerOriginReference);

                            console.log("[TestRunner] test run completed!");
                        });
                    }

                    window.addEventListener("message", function(messageEvent) {
                        // TODO: FIXME: add check against messageEvent.origin
                        const data = messageEvent.data;

                        // TODO: FIXME: error handling
                        const testName = JSON.parse(data.testName);
                        const contracts = JSON.parse(data.contracts);
                        const testCode = JSON.parse(data.testCode);
                        const contractsData = JSON.parse(data.contractsData);
                        const accountAddress = JSON.parse(data.accountAddress);
                        const accountKey = JSON.parse(data.accountKey);
                        const web3 = JSON.parse(data.web3);

                        run(testName, contracts, testCode, contractsData, accountAddress, accountKey, web3, messageEvent.source, messageEvent.origin);
                    });

                </script>
            `;

            //
            // Setup separate environment
            // TODO: FIXME: hide the iframe
            const testDiv = document.getElementById("test");
            const iframeElement = document.getElementById("test-iframe");
            if(iframeElement !== null) {
                iframeElement.parentNode.removeChild(iframeElement);
            }
            // TODO: FIXME: testDiv error checking
            var iframe = document.createElement("iframe");
            iframe.id = "test-iframe";
            iframe.srcdoc = content;
            // TODO: FIXME: remove development-only events
            iframe.addEventListener("mouseover", function(evt) {
                iframe.contentWindow.postMessage({testName:JSON.stringify(testName), contracts:JSON.stringify(contracts), testCode: JSON.stringify(testCode),
                        contractsData: JSON.stringify(contractsData), accountAddress: JSON.stringify(accountAddress), accountKey: JSON.stringify(accountKey),
                        web3: JSON.stringify(web3)}, "*");
            });
            testDiv.appendChild(iframe);
            this.iframe = iframe;


            // TODO: FIXME: move to more appropriate place (single register)
            window.addEventListener("message", function(messageEvent) {
                // TODO: FIXME: add check against messageEvent.origin
                const data = messageEvent.data;

                // TODO: FIXME: error checking
                thisReference.testData = data.testData;
                thisReference.successCount = data.successCount;
                thisReference.failureCount = data.failureCount;
                thisReference.totalTestCount = data.totalTestCount;
                thisReference.reporterStatus = data.reporterStatus;

                // Call back caller
                if(callback) {
                    callback();
                }
            });

        } else {
            console.error("[TestRunner] unable to access test library: ", mocha);
        }
    }

    safeReadReportOutput() {
        return this.testData;
    }

    safeReadReportSuccesses() {
        return this.successCount;
    }

    safeReadReportFailures() {
        return this.failureCount;
    }

    safeReadTotalTestCount() {
        return this.totalTestCount;
    }

    safeReadReporterStatus() {
        return this.reporterStatus;
    }

    readStatus() {
        return this._status;
    }

    runAll(testFiles, contractsData, accountAddress, accountKey, web3, callback) {
        for(var testName in testFiles) {
            const testCode = testFiles[testName];
            this._run(testName, testCode, contractsData, accountAddress, accountKey, web3, callback);
        }
    };

    safeRunAll(testFiles, contractsData, accountAddress, accountKey, web3, callback) {
        for(var testName in testFiles) {
            const testCode = testFiles[testName];
            this._safeRun(testName, testCode, contractsData, accountAddress, accountKey, web3, callback);
        }
    };

    runSingle(file, title, testFiles, contractsData, accountAddress, accountKey, web3, callback) {
        if(!file || file === null) {
            console.error("[TestRunner] Unable to target empty file when running single tests");
            return;
        }

        if(!title || title === null) {
            console.error("[TestRunner] Unable to target empty title when running single tests");
            return;
        }

        // TODO: Consider multiple occurrences;
        //       Consider case (in)sensitive;
        //       Consider single and double quotes.
        for(var testName in testFiles) {
            if(testName === file) {
                const testCode = testFiles[testName];
                const regex = new RegExp("it*.\'" + title + "\'*.,{1}");
                const replaceWith = 'it.only("' + title + '",';
                const singleTestCode = testCode.replace(regex, replaceWith);

                this._run(testName, singleTestCode, contractsData, accountAddress, accountKey, web3, callback);

                return;
            }
        }
    };
}
