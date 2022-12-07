import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import { execSync } from "child_process";

const app = express();

const folderName = "./users/";

let reqBody, reqBodyContent, reqBodyEmail, fname = "";
let requestValidationPassed = false;
let requestValidationFailed = false;
let command = "";

let lineCount = 0;


let response = [];
let finalResponse = [];
let lastLine = "";

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

    function setFailureStatus(linenum, cmd, description, suggestion) {

      requestValidationFailed = true;
      count = lineCount;
      response = {
        lineNumber: linenum,
        command: cmd,
        desc: description,
        suggestion: suggestion
      }
      finalResponse.push(response);

      //console.log(finalResponse);
    }

    function sendResponse() {
      res.status(200).json({
        responseList: finalResponse,
      })
    }

    const allFileContents = fs.readFileSync(fname + "/Dockerfile", 'utf-8');


    lineCount = 0;
    let count = 0;
    finalResponse = [];
    let i = 0;


    while (i >= 0) {
      if (!allFileContents.includes("FROM")) {
        break;
      }
      if (allFileContents.split(/\r?\n/)[i].split(' ')[0] === "FROM" || allFileContents.split(/\r?\n/)[i].split(' ')[0] === "ARG") {
        break;
      }
      i++;
    }


    if (allFileContents.split(/\r?\n/)[i].split(' ')[0] === "FROM" || allFileContents.split(/\r?\n/)[i].split(' ')[0] === "ARG") {
      if (!allFileContents.includes("FROM"))
        setFailureStatus(1, "There should be atleast one FROM", "FROM centos:7")
    }
    else
      setFailureStatus(1, "First line of instruction should be either FROM or ARG", "FROM centos:7 OR ARG user1")

    allFileContents.split(/\r?\n/).forEach(line => {

      let words = line.split(' ');
      lineCount++;

      if (words[0] == "#" || line.startsWith("\t") || line.startsWith("\t\\") || line.startsWith("\t&&") || line.trim() === '' || line.indexOf(' ') == 0 || words[0] === "FROM" || words[0] === "LABEL" || words[0] === "USER" || words[0] === "MAINTAINER" || words[0] === "STOPSIGNAL" || words[0] === "EXPOSE" || words[0] === "ENV" || words[0] === "ADD" || words[0] === "COPY" || words[0] === "ARG" || words[0] === "RUN" || words[0] === "CMD" || words[0] === "ENTRYPOINT" || words[0] === "ONBUILD" || words[0] === "HEALTHCHECK" || words[0] === "SHELL" || words[0] === "VOLUME" || words[0] === "WORKDIR") { }
      else {
        setFailureStatus(lineCount, "Not a valid instruction", "FROM,LABEL,USER,MAINTAINER,\nSTOPSIGNAL,EXPOSE,ENV,ADD,\nCOPY,ARG,RUN,CMD,ENTRYPOINT,\nONBUILD,HEALTHCHECK,SHELL,VOLUME");
      }

      if (words[0] === "FROM")
        words[1] ? requestValidationPassed = true : setFailureStatus(lineCount, "FROM", "FROM should have an argument", "FROM centos:7")

      if (words[0] === "LABEL")
        words[1] ? requestValidationPassed = true : setFailureStatus(lineCount, "LABEL", "LABEL should have an argument", 'LABEL version="1.0"')

      if (words[0] === "USER")
        words[1] ? requestValidationPassed = true : setFailureStatus(lineCount, "USER", "USER should have an argument", "USER patrick")

      if (words[0] === "MAINTAINER")
        words[1] ? requestValidationPassed = true : setFailureStatus(lineCount, "MAINTAINER", "MAINTAINER should have an argument", "MAINTAINER patrick")

      if (words[0] === "STOPSIGNAL")
        words[1] ? requestValidationPassed = true : setFailureStatus(lineCount, "STOPSIGNAL", "STOPSIGNAL should have an argument", "STOPSIGNAL signal")

      if (words[0] === "EXPOSE")
        words[1] ? requestValidationPassed = true : setFailureStatus(lineCount, "EXPOSE", "EXPOSE should have an argument", "EXPOSE 80/tcp")

      if (words[0] === "VOLUME") {
        if (words[1]) {
          if (line.includes("[") || line.includes("]")) {
            validateExecForm(line) ? requestValidationPassed = true : setFailureStatus(lineCount, "VOLUME", "VOLUME should have properly enclosed argument", 'VOLUME ["/var/www", "/var/log/apache2", "/etc/apache2"]')
          }
          else
            requestValidationPassed = true;
        }
        else {
          setFailureStatus(lineCount, "VOLUME", "VOLUME should have an argument", "VOLUME /myvol");
        }
      }

      if (words[0] === "ENV") {
        if (words[1] && words[2]) { requestValidationPassed = true; }
        else if (words[1]) {
          if (words[1].includes("="))
            requestValidationPassed = true;
          else {
            setFailureStatus(lineCount, "ENV", "Provide '=' in case of one argument (OR) provide two arguments", 'ENV MY_NAME="John Doe" \n (OR) ENV GOSU_VERSION 1.14');
          }
        }
        else {
          setFailureStatus(lineCount, "ENV", "ENV should have an argument", 'ENV MY_NAME="John Doe" \n (OR) ENV GOSU_VERSION 1.14');
        }


      }

      if (words[0] === "ADD")
        (words[1] && words[2]) ? requestValidationPassed = true : setFailureStatus(lineCount, "ADD", "ADD should have both source and destination", 'ADD source.file.tar.gz /temp')


      if (words[0] === "COPY")
        (words[1] && words[2]) ? requestValidationPassed = true : setFailureStatus(lineCount, "COPY", "COPY should have both source and destination", 'COPY /foo /bar')

      if (words[0] === "ARG") {
        if (words[1] && words[2]) { requestValidationPassed = true; }
        else if (words[1]) {
          if (words[1].includes("="))
            requestValidationPassed = true;
          else
            setFailureStatus(lineCount, "ARG", "1 warning-syntax doesn't contain any value", 'ARG CMD=Thinknyx');
        }
        else
          setFailureStatus(lineCount, "ARG", "ARG should have atleast one argument", 'ARG CMD=Thinknyx')
      }

      if (words[0] === "ENTRYPOINT") {
        if (words[1]) {
          if (line.includes("[") || line.includes("]")) {
            validateExecForm(line) ? requestValidationPassed = true : setFailureStatus(lineCount, "ENTRYPOINT", "ENTRYPOINT should have properly enclosed argument", 'ENTRYPOINT ["top", "-b"]')
          }
          else
            requestValidationPassed = true;
        }
        else {
          setFailureStatus(lineCount, "ENTRYPOINT", "ENTRYPOINT should have atleast one argument", 'ENTRYPOINT top -b');
        }
      }

      if (words[0] === "SHELL") {
        if (words[1]) {
          if (line.includes("[") || line.includes("]")) {
            validateExecForm(line) ? requestValidationPassed = true : setFailureStatus(lineCount, "SHELL", "SHELL should have properly enclosed argument", 'SHELL ["powershell","-command"]')
          }
          else
            requestValidationPassed = true;
        }
        else {
          setFailureStatus(lineCount, "SHELL", "SHELL should have an argument", 'SHELL ["powershell","-command"]');
        }
      }

      if (words[0] === "HEALTHCHECK")
        words[1] ? requestValidationPassed = true : setFailureStatus(lineCount, "HEALTHCHECK", "HEALTHCHECK should have atleast one argument", 'HEALTHCHECK --interval=5m --timeout=3s \
              CMD curl -f http://localhost/ || exit 1')

      if (words[0] === "RUN") {
        if (words[1]) {
          if (line.includes("[") || line.includes("]")) {
            validateExecForm(line) ? requestValidationPassed = true : setFailureStatus(lineCount, "RUN", "RUN should have properly enclosed argument", 'RUN ["/bin/bash", "-c", "echo hello"]')
          }
          else if (line.includes("install")) {
            if (line.includes("-y")) {
              requestValidationPassed = true;
            }
            else {
              validateExecForm(line) ? requestValidationPassed = true : setFailureStatus(lineCount, "RUN", "Please enter the RUN install instruction in non-interactive mode", "RUN yum -y install httpd")
            }
          }
          else
            requestValidationPassed = true;
        }
        else {
          setFailureStatus(lineCount, "RUN", "RUN should have atleast one arguments", 'RUN yum -y update');
        }
      }

      if (words[0] === "CMD") {
        if (words[1]) {
          if (line.includes("[") || line.includes("]")) {
            validateExecForm(line) ? requestValidationPassed = true : setFailureStatus(lineCount, "CMD", "CMD should have properly enclosed argument", 'CMD ["echo", "Welcome to Thinknyx"]')
          }
          else
            requestValidationPassed = true;
        }
        else {
          setFailureStatus(lineCount, "CMD", "CMD should have atleast one argument", 'CMD echo "hello"');
        }
      }

      if (words[0] === "WORKDIR")
        words[1] ? requestValidationPassed = true : setFailureStatus(lineCount, "WORKDIR", "WORKDIR should have an argument", 'WORKDIR /a')

      if (words[0] === "ONBUILD")
        (words[1] && words[2]) ? requestValidationPassed = true : setFailureStatus(lineCount, "ONBUILD", 'ONBUILD should have atleast two arguments', 'ONBUILD ADD . /app/src')

      lastLine = line;

    }

    );

    if (requestValidationFailed === true)
      sendResponse();
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
        responseList: finalResponse,
      })
    }
  });
}

//Delete one hour old folders.
deleteOlderFolders();
//Call storeData function.
storeData();

export default app;