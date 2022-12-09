let finalResponse = [];
let requestValidationFailed = false;
let requestValidationPassed = false;

function setFailureStatus(linenum, cmd, description, suggestion) {

    requestValidationFailed = true;
    response = {
        lineNumber: linenum,
        command: cmd,
        desc: description,
        suggestion: suggestion
    }
    finalResponse.push(response);

    console.log(finalResponse);
}

function validateQuotes(instr) {
    let countSingle = 0;
    let countDouble = 0;

    for (let i = 0; i < instr.length; i++) {
        if (instr[i] == "\'") {
            countSingle++;
        }
        if (instr[i] == "\"") {
            countDouble++;
        }
    }
    if (countSingle % 2 == 0 && countDouble % 2 == 0)
        return true
    else return false;
}
async function callAPI(requestValue) {
    let response = await fetch("http://localhost:3000/api/validate",
        {
            method: "POST",
            body: JSON.stringify(
                { "email": "deepthi.narayan", "content": requestValue }
            ),
        });
    let data = await response.json();
    return data;
}

function validateDockerfile() {
    const request = document.getElementById("dockercontent");
    // console.log(request.value);
    let requestValue = request.value;
    let lineCount = 0;
    let i = 0;
    requestValidationFailed = false;
    requestValidationPassed = false;
    finalResponse = [];


    while (i >= 0) {
        if (!requestValue.includes("/\bFROM\b/")) {
            break;
        }
        if (requestValue.split(/\r?\n/)[i].split(' ')[0] === "FROM" || requestValue.split(/\r?\n/)[i].split(' ')[0] === "ARG") {
            break;
        }
        i++;
    }


    if (requestValue.split(/\r?\n/)[i].split(' ')[0] === "FROM" || requestValue.split(/\r?\n/)[i].split(' ')[0] === "ARG") {
        if (!requestValue.includes("FROM"))
            setFailureStatus(1, "FROM", "There should be atleast one FROM", "FROM centos:7")
    }
    else
        setFailureStatus(1, "FROM (OR) ARG", "First line of instruction should be either FROM or ARG", "FROM centos:7 OR ARG user1")

    requestValue.split(/\r?\n/).forEach(line => {
        let words = line.split(' ');
        lineCount++;

        if (words[0] == "#" || line.startsWith("\t") || line.startsWith("\t\\") || line.startsWith("\t&&") || line.trim() === '' || line.indexOf(' ') == 0 || words[0] === "FROM" || words[0] === "LABEL" || words[0] === "USER" || words[0] === "MAINTAINER" || words[0] === "STOPSIGNAL" || words[0] === "EXPOSE" || words[0] === "ENV" || words[0] === "ADD" || words[0] === "COPY" || words[0] === "ARG" || words[0] === "RUN" || words[0] === "CMD" || words[0] === "ENTRYPOINT" || words[0] === "ONBUILD" || words[0] === "HEALTHCHECK" || words[0] === "SHELL" || words[0] === "VOLUME" || words[0] === "WORKDIR") { }
        else {
            setFailureStatus(lineCount, "*", "Not a valid instruction", "FROM,LABEL,USER,MAINTAINER,\nSTOPSIGNAL,EXPOSE,ENV,ADD,\nCOPY,ARG,RUN,CMD,ENTRYPOINT,\nONBUILD,HEALTHCHECK,SHELL,VOLUME");
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
                    if (validateExecForm(line)) {
                        if (validateQuotes(line))
                            requestValidationPassed = true
                        else
                            setFailureStatus(lineCount, "VOLUME", "Make sure to open/close the quotations properly", 'VOLUME ["/var/www", "/var/log/apache2", "/etc/apache2"]')
                    }
                    else
                        setFailureStatus(lineCount, "VOLUME", "VOLUME should have properly enclosed argument", 'VOLUME ["/var/www", "/var/log/apache2", "/etc/apache2"]')
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
                    if (validateExecForm(line)) {
                        if (validateQuotes(line))
                            requestValidationPassed = true
                        else
                            setFailureStatus(lineCount, "ENTRYPOINT", "Make sure to open/close the quotations properly", 'ENTRYPOINT ["top", "-b"]')
                    }
                    else
                        setFailureStatus(lineCount, "ENTRYPOINT", "ENTRYPOINT should have properly enclosed argument", 'ENTRYPOINT ["top", "-b"]')
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
                    if (validateExecForm(line)) {
                        if (validateQuotes(line))
                            requestValidationPassed = true
                        else
                            setFailureStatus(lineCount, "SHELL", "Make sure to open/close the quotations properly", 'SHELL ["powershell","-command"]')
                    }
                    else
                        setFailureStatus(lineCount, "SHELL", "SHELL should have properly enclosed argument", 'SHELL ["powershell","-command"]')
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
                    if (validateExecForm(line)) {
                        if (validateQuotes(line))
                            requestValidationPassed = true
                        else
                            setFailureStatus(lineCount, "RUN", "Make sure to open/close the quotations properly", 'RUN ["/bin/bash", "-c", "echo hello"]')
                    }
                    else
                        setFailureStatus(lineCount, "RUN", "RUN should have properly enclosed argument", 'RUN ["/bin/bash", "-c", "echo hello"]')
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
                    if (validateExecForm(line)) {
                        if (validateQuotes(line))
                            requestValidationPassed = true
                        else
                            setFailureStatus(lineCount, "CMD", "Make sure to open/close the quotations properly", 'CMD ["echo", "Welcome to Thinknyx"]')
                    }
                    else
                        setFailureStatus(lineCount, "CMD", "CMD should have properly enclosed argument", 'CMD ["echo", "Welcome to Thinknyx"]')
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

    if (requestValidationPassed == true && requestValidationFailed == false) {
        console.log("Validation passed. Calling the API..")
        callAPI(requestValue).then(data => console.log(data))
    }

}

