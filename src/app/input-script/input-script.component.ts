import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';

/*Defines the structure for the elements that needs to be displayed as a table for Issues found after Docker execution*/

interface configInfo {
  Type: String;
  ID: String;
  Title: String;
  Description: String;
}

@Component({
  selector: 'app-input-script',
  templateUrl: './input-script.component.html',
  styleUrls: ['./input-script.component.css'],
})

/*This class creates a folder in the given path and displays the issues found in the tabular format.
 onSubmitDockerFile()- Takes the input from the form and add the content in a file in the specified location.
 getIssueLists()- Retrieves the issues found from the backend and displays it in the tabular colum.
*/
export class InputScriptComponent {

  // To store the results related to issues
  issueList: any = '';
  Misconfigurations: any = '';
  MisconfSummary_result: any = '';
  result_json: any = '';

  configInfos: configInfo[] = this.Misconfigurations;

  //Flag for the buttons
  processingScriptMessage = false;
  updateButtonEnabled= false;

  //Flag for 500 error
  errorStatus:number;


  requestIssue=false;

  errorNumber=0;
  lineNumber=0;

  firstLineNotFromOrArg=false;
  noFrom=false;
  invalidFrom=false;
  invalidLabel=false;
  invalidUser=false;
  invalidMaintainer=false;
  invalidStopSignal=false;
  invalidExpose=false;
  invalidVolume=false;
  invalidEnv=false;
  invalidEnvWithoutEqual=false;
  invalidArgumentsAdd=false;
  invalidArgumentsCopy=false;
  invalidArgumentsArg=false;
  invalidExecVolume=false;
  invalidEntryPoint=false;
  invalidExecEntryPoint=false;
  invalidArgumentShell=false;
  invalidExecShell=false;
  invalidArgumentsHealthCheck=false;
  invalidArgumentsRun=false;
  invalidExecRun=false;
  noInteractiveModeRun=false;
  invalidArgumentsCmd=false;
  invalidExecCmd=false;
  invalidWorkDir=false;
  invalidOnBuild=false;

  invalidInstruction=false;

  constructor(private http: HttpClient) {}

    // Method which gets invoked when update button is invoked.
    onSubmit(event:any){
      if( event.submitter.name == "update" )
      { 
        this.updateButtonEnabled=true;
        this.configInfos=[];
        this.result_json="";
      }
       }     

    //Method which gets invoked when submit button is invoked.
  onSubmitDockerFile(form: NgForm) {
    
    //Doesn't let the user submit an empty form - If the text area is empty, it will prompt the user to enter the details.
    if (form.invalid) {
      return;
    }
    
    //Setting flag to display update button on screen.
    this.processingScriptMessage = true;
    this.updateButtonEnabled= false;
    this.requestIssue=false;

    //Header that needs to be passed to node JS to retrieve the text content.
    let httpOptions: Object = {
      headers: new HttpHeaders({
        'content-type': 'application/x-www-form-urlencoded',
      }),
      responseType: 'text',
    };


    // if(form.value.content.search('CMD') && form.value.content.search('\\[') !=-1){
    //   form.value.content=form.value.content.replace("CMD[","CMD [")
    // }
 

    // This will collect the email and content from the form and put in a JSON format.
   
    let inputJSON = {
       // pick the string(username) before the character @
      email: form.value.email.substring(0, form.value.email.lastIndexOf('@')),
      content: form.value.content
    };
    
    console.log('The input is -' + JSON.stringify(inputJSON)); 

    //This function calls storeData and then getIssueLists in the order.
    this.mainFunction(inputJSON, httpOptions);   
    
  }
  // This function reloads the page. This gets invoked when reset button is pressed.
  resetPage(){
    location.reload();
  }

  // This function first calls storedata. Waits until the response is retreived and then invoke getIssueLists function.
  async mainFunction(inputJSON:any, httpOptions:any) {
   await this.storeData(inputJSON, httpOptions); 
   this.getIssueLists();
  }

  
  //Calls the  API storeData. Takes username and content with http header as input. Retrieves response which contains the form content.
  async storeData(inputJSON:any, httpOptions:any){
    this.http
    .post('http://52.25.144.245:3000/api/storeData', inputJSON, httpOptions)
    .subscribe((resData) => {
      //Result from the API is displayed for the developer
      console.log(resData);
    }, error => {
      // You can access status:
      console.log(error.status);
});
  }
 
  /* Calls the API issueList.Stores the respective data for the elmenents in the table. */
  getIssueLists() {
   
    this.configInfos=[];
    this.updateButtonEnabled=false;

 
    this.http
      .get('http://52.25.144.245:3000/api/issueList')
      .subscribe((issueData) => {
           // Stores issues which will be displayed as table.
        this.issueList = issueData;
        console.log(this.issueList);

        let result = JSON.stringify(this.issueList);

        this.result_json = JSON.parse(result);

        this.lineNumber= this.result_json['lineNumber'];

        let responseList = this.result_json['responseList'];

        // Check if there is any issue in the response.
        if (this.result_json['responseList'][0] && this.result_json['responseList'][0]['Results'] && this.result_json['responseList'][0]['Results'][0]['Misconfigurations']) {
         
          this.MisconfSummary_result =
            this.result_json['responseList'][0]['Results'][0];

          this.Misconfigurations = JSON.parse(
            JSON.stringify(this.MisconfSummary_result['Misconfigurations'])
          );

          this.configInfos = this.Misconfigurations;
          console.log(this.configInfos);
        }
    

        else if(responseList>0){
          this.requestIssue=true;
          this.Misconfigurations=1;


          if(responseList===1) this.firstLineNotFromOrArg=true;
          if(responseList===2) this.noFrom=true;
          if(responseList===3) this.invalidFrom=true;
          if(responseList===4) this.invalidLabel=true;
          if(responseList===5) this.invalidUser=true;
          if(responseList===6) this.invalidMaintainer=true;
          if(responseList===7) this.invalidStopSignal=true;
          if(responseList===8) this.invalidExpose=true;
          if(responseList===9) this.invalidVolume=true;
          if(responseList===10) this.invalidEnv=true;
          if(responseList===11) this.invalidEnvWithoutEqual=true;
          if(responseList===12) this.invalidArgumentsAdd=true;
          if(responseList===13) this.invalidArgumentsCopy=true;
          if(responseList===14) this.invalidArgumentsArg=true;
          if(responseList===15) this.invalidInstruction=true;
          if(responseList===16) this.invalidExecVolume=true;
          if(responseList===17) this.invalidEntryPoint=true;
          if(responseList===18) this.invalidExecEntryPoint=true;
          if(responseList===19) this.invalidArgumentShell=true;
          if(responseList===20) this.invalidExecShell=true;
          if(responseList===21) this.invalidArgumentsHealthCheck=true;
          if(responseList===22) this.invalidArgumentsRun=true;
          if(responseList===23) this.invalidExecRun=true;
          if(responseList===24) this.noInteractiveModeRun=true;
          if(responseList===25) this.invalidArgumentsCmd=true;
          if(responseList===26) this.invalidExecCmd=true;
          if(responseList===27) this.invalidWorkDir=true;
          if(responseList===28) this.invalidOnBuild=true;
        }

        
        else if(this.result_json['responseList']==="The Dockerfile is having issues, kindly check and rectify Dockerfile Instructions and associated Arguments."){
          this.requestIssue=true;
          this.Misconfigurations=1;
        }
        // If there is no issue in the response, reset the variables.[This will help when update button is pressed.]
        else{
          this.MisconfSummary_result=this.Misconfigurations="";
           this.configInfos=[];
           console.log(this.configInfos);
        }
      }, error => {
        //Any error will be logged.
        console.log(error.status);
        this.errorStatus=error.status;
  });
  }


}
