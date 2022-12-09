import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import { execSync } from "child_process";
const app = express();
app.use(express.static('public'));

const folderName = "users";

let reqBody, reqBodyContent, reqBodyEmail, fname = "";

// Setting headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS"
  );
  next();
});

app.use(bodyParser.json({ type: "*/*" }));

// sendFile will go here
app.get('/', function (req, res) {
  res.sendFile('/app/index.html');
});

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

/* This function(API) will:
    1. Get the username and content submitted by the user through the form.
    2. Removes the directory in case if the username already exists.
    3. Creates a directory with the name of username.
    4. Excecute shell script which will execute docker and trivy.
    5. Read the issues from the output file and make it available over the API.
*/
function storeData() {

  // Get the request which consists of username and script content.
  app.post("/api/validate", (req, res, next) => {
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

    console.log(fname);
    //Create directory same as the name of the user and create a file inside the folder by the name "Dockerfile" and copy the script content inside it.
    fs.mkdirSync(fname);
    fs.writeFileSync(fname + "/Dockerfile", reqBodyContent, function (err) {
      if (err) throw err;
      console.log(`${fname} is created!`);
    });
    console.log(`${fname} is created!`);

    const trivycmd = "trivy config -f json /app/" + fname + "/Dockerfile > /app/" + fname + "/errorlog.json";
    //Executes the external shell script. The script will build docker and excute trivy.
    execSync(
      trivycmd,
      (error, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        if (error !== null) {
          console.log(`exec error: ${error}`);
        }
      }
    );

    const errorlogfile = "/app/" + fname + "/errorlog.json";

    const errorlog = fs.readFileSync(errorlogfile);
    let errorlogparsed = JSON.parse(errorlog);
    //Respond back with success.

    const issueResponse = [errorlogparsed];
    //res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      responseList: issueResponse,
    });

  });


}

//Delete one hour old folders.
deleteOlderFolders();
//Call storeData function.
storeData();

export default app;