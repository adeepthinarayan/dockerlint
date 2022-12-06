import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import { execSync } from "child_process";

const app = express();

const folderName = "./users/";

let reqBody, reqBodyContent, reqBodyEmail, fname = "";
let requestValidationPassed = false;
let requestValidationFailed = false;
let errorResponse = "";
let lineCount = 0;
let count = 0;

let firstLineNotFromOrArg = false;
let noFrom = false;
let invalidFrom = false;
let invalidLabel = false;
let invalidUser = false;
let invalidMaintainer = false;
let invalidStopSignal = false;
let invalidExpose = false;
let invalidVolume = false;
let invalidEnv = false;
let invalidEnvWithoutEqual = false;
let invalidArgumentsAdd = false;
let invalidArgumentsCopy = false;
let invalidArgumentsArg = false;

let invalidInstruction = false;

// Setting headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept"
  );

  res.setHeader("Content-type", "text/plain");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS"
  );
  next();
});

app.use(bodyParser.json({ type: "*/*" }));

//Function to delete folders/files(Dockerfile and errolog.json) after 1 hour of its creation.
function deleteOlderFolders() {

  var uploadsDir = folderName;

  fs.readdir(uploadsDir, function (err, files) {
    files.forEach(function (file, index) {
      var path = uploadsDir + file;
      fs.stat(path, function (err, stat) {
        var endTime, now;
        if (err) {
          return console.error(err);
        }
        now = new Date().getTime();
        endTime = new Date(stat.ctime).getTime() + 3600000;
        if (now > endTime) {
          fs.rmSync(path, { recursive: true, force: true }, (err) => {
            if (err) {
              throw err;
            }
            console.log(`older files were deleted!`);
          });
        }
      });
    });
  });

}

function validateExecForm(instr) {
  let firstWord = instr.split(" ");
  if (
    firstWord[1].startsWith("[") &&
    firstWord[firstWord.length - 1].endsWith("]")
  )
    return true;
  else return false;
}



/* This function(API) will:
    1. Get the username and content submitted by the user through the form.
    2. Removes the directory in case if the username already exists.
    3. Creates a directory with the name of username.
    4. Excecute shell script which will execute trivy.
    5. Read the issues from the output file and make it available over the API.
*/
function storeData() {

  // Get the request which consists of username and script content.
  app.post("/api/storeData", (req, res, next) => {
    console.log(req.body);
    reqBody = JSON.parse(JSON.stringify(req.body));

    reqBodyContent = reqBody.content;
    reqBodyEmail = reqBody.email;
    let userName = reqBodyEmail;
    fname = folderName + "/" + userName;


    //  Removes the folder if already exists.
    fs.rmSync(fname, { recursive: true, force: true }, (err) => {
      if (err) {
        throw err;
      }
      console.log(`${fname} is deleted!`);
    });

    //Create directory same as the name of the user and create a file inside the folder by the name "Dockerfile" and copy the script content inside it.
    fs.mkdirSync(fname);
    fs.writeFileSync(fname + "/Dockerfile", reqBodyContent, function (err) {
      if (err) throw err;
      console.log(`${fname} is created!`);
    });

    function setFailureStatus() {
      requestValidationFailed = true;
      count = lineCount;
      res.status(200).json({
        responseList: errorResponse,
        lineNumber: count
      })
    }

    const allFileContents = fs.readFileSync(fname + "/Dockerfile", 'utf-8');
    lineCount = 0;
    count = 0;
    if (allFileContents.includes("FROM")) {

      if (allFileContents.split(' ')[0] === "FROM" || allFileContents.split(' ')[0] === "ARG") {

        allFileContents.split(/\r?\n/).forEach(line => {

          let words = line.split(' ');
          lineCount++;

          if (words[0] === "FROM" || words[0] === "LABEL" || words[0] === "USER" || words[0] === "MAINTAINER" || words[0] === "STOPSIGNAL" || words[0] === "EXPOSE" || words[0] === "ENV" || words[0] === "ADD" || words[0] === "COPY" || words[0] === "ARG" || words[0] === "RUN" || words[0] === "CMD" || words[0] === "ENTRYPOINT" || words[0] === "ONBUILD" || words[0] === "HEALTHCHECK" || words[0] === "SHELL" || words[0] === "VOLUME" || words[0] === "WORKDIR") {


            if (words[0] === "FROM")
              words[1] ? requestValidationPassed = true : (errorResponse = 3, setFailureStatus())

            else if (words[0] === "LABEL")
              words[1] ? requestValidationPassed = true : (errorResponse = 4, setFailureStatus())

            else if (words[0] === "USER")
              words[1] ? requestValidationPassed = true : (errorResponse = 5, setFailureStatus())

            else if (words[0] === "MAINTAINER")
              words[1] ? requestValidationPassed = true : (errorResponse = 6, setFailureStatus())

            else if (words[0] === "STOPSIGNAL")
              words[1] ? requestValidationPassed = true : (errorResponse = 7, setFailureStatus())

            else if (words[0] === "EXPOSE")
              words[1] ? requestValidationPassed = true : (errorResponse = 8, setFailureStatus())

            else if (words[0] === "VOLUME") {
              if (words[1]) {
                if (line.includes("[") || line.includes("]")) {
                  validateExecForm(line) ? requestValidationPassed = true : (errorResponse = 16, setFailureStatus())
                }
                else
                  requestValidationPassed = true;
              }
              else {
                errorResponse = 9;
                setFailureStatus();
              }
            }

            else if (words[0] === "ENV") {
              if (words[1]) {
                if (words[1].includes("="))
                  requestValidationPassed = true;
                else {
                  errorResponse = 11;
                  setFailureStatus();
                }
              }
              else {
                errorResponse = 10;
                setFailureStatus();
              }
            }

            else if (words[0] === "ADD")
              (words[1] && words[2]) ? requestValidationPassed = true : (errorResponse = 12, setFailureStatus())


            else if (words[0] === "COPY")
              (words[1] && words[2]) ? requestValidationPassed = true : (errorResponse = 13, setFailureStatus())

            else if (words[0] === "ARG")
              words[1] ? requestValidationPassed = true : (errorResponse = 14, setFailureStatus())

            else if (words[0] === "ENTRYPOINT") {
              if (words[1] && words[2]) {
                if (line.includes("[") || line.includes("]")) {
                  validateExecForm(line) ? requestValidationPassed = true : (errorResponse = 18, setFailureStatus())
                }
                else
                  requestValidationPassed = true;
              }
              else {
                errorResponse = 17;
                setFailureStatus();
              }
            }

            else if (words[0] === "SHELL") {
              if (words[1]) {
                if (line.includes("[") || line.includes("]")) {
                  validateExecForm(line) ? requestValidationPassed = true : (errorResponse = 20, setFailureStatus())
                }
                else
                  requestValidationPassed = true;
              }
              else {
                errorResponse = 19;
                setFailureStatus();
              }
            }

            else if (words[0] === "HEALTHCHECK")
              words[1] ? requestValidationPassed = true : (errorResponse = 21, setFailureStatus())

            else if (words[0] === "RUN") {
              if (words[1]) {
                if (line.includes("[") || line.includes("]")) {
                  validateExecForm(line) ? requestValidationPassed = true : (errorResponse = 23, setFailureStatus())
                }
                else if (line.includes("install")) {
                  if (line.includes("-y")) {
                    requestValidationPassed = true;
                  }
                  else {
                    validateExecForm(line) ? requestValidationPassed = true : (errorResponse = 24, setFailureStatus())
                  }
                }
                else
                  requestValidationPassed = true;
              }
              else {
                errorResponse = 22;
                setFailureStatus();
              }
            }

            else if (words[0] === "CMD") {
              if (words[1] && words[2]) {
                if (line.includes("[") || line.includes("]")) {
                  validateExecForm(line) ? requestValidationPassed = true : (errorResponse = 26, setFailureStatus())
                }
                else
                  requestValidationPassed = true;
              }
              else {
                errorResponse = 25;
                setFailureStatus();
              }
            }

            else if (words[0] === "WORKDIR")
              words[1] ? requestValidationPassed = true : (errorResponse = 27, setFailureStatus())

            else if (words[0] === "ONBUILD")
              (words[1] && words[2]) ? requestValidationPassed = true : (errorResponse = 28, setFailureStatus())

            else {
              requestValidationFailed = true;
              res.status(200).json({
                responseList: "The Dockerfile is having issues, kindly check and rectify Dockerfile Instructions and associated Arguments."
              })

              return false;
            }
          }

          else {
            errorResponse = 15;
            setFailureStatus();
          }

        });
      }

    }
    else {
      requestValidationFailed = true;
      errorResponse = 2;
      res.status(200).json({
        responseList: errorResponse,
        lineNumber: count
      })
    }
    //Respond back with success.

    if (requestValidationPassed == true && requestValidationFailed == false) {
      requestValidationPassed = false;
      res.status(201).json({
        reqBodyContent,
      });

    }


    //Executes the external shell script. The script will build docker and excute trivy.
    if (requestValidationFailed == false) {
      execSync(
        "sh ./backend/dockerFileExecution.sh " + userName,
        (error, stdout, stderr) => {
          console.log(stdout);
          console.log(stderr);
          if (error !== null) {
            console.log(`exec error: ${error}`);
          }
        }
      )
    };
  });

  // Api which fetches the issues from errorlog.json file.
  app.get("/api/issueList", (req, res, next) => {
    if (requestValidationFailed == false) {
      let errorlog = fs.readFileSync(fname + "/errorlog.json");
      let errorlogparsed = JSON.parse(errorlog);
      console.log(errorlogparsed);
      const issueResponse = [errorlogparsed];
      res.status(200).json({
        responseList: issueResponse,
      });
    }

    else {
      requestValidationFailed = false;
      res.status(200).json({
        responseList: errorResponse,
        lineNumber: count
      })
    }
  });
}

//Delete one hour old folders.
deleteOlderFolders();
//Call storeData function.
storeData();

export default app;