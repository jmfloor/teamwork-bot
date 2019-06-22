// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    DateTimePrompt,
    AttachmentPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');

const { UserProfile } = require('../userProfile');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

const DESCRIPTION_PROMPT = 'DESCRIPTION_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const ATTACHMENT_PROMPT = 'ATTACHMENT_PROMPT';

const tw = require('teamwork-api');

//TODO - link API reference to .env file
const TeamworkAPI = tw('twp_N9UMfsC5KwmJ0fd2ZZI1Xey6ZqK0', 'jmf1');
const taskListID = '1276805';

const body =    {
                "todo-item": {
                  "content": "", 
                  "due-date": "",
                  "pendingFileAttachments": ""
                }
            };

class UserProfileDialog extends ComponentDialog {
    constructor(userState, logger) {
        super('userProfileDialog');

        this.userProfile = userState.createProperty(USER_PROFILE);

        this.logger = logger;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new TextPrompt(DESCRIPTION_PROMPT));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.taskDescriptionStep.bind(this),
            this.dateStep.bind(this),
            this.dateConfirmStep.bind(this),
            this.attachmentStep.bind(this),
            this.confirmTaskStep.bind(this),
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async taskDescriptionStep(step) {
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        return await step.prompt(DESCRIPTION_PROMPT, 'Please enter the task description.');
    }

    async dateStep(step) {
        step.values.taskDescription = step.result;
        return await step.prompt(DATETIME_PROMPT, `When is the task due?`)
    }

    async dateConfirmStep(step) {
        //Display date to user and save date value
        await step.context.sendActivity(`The due date is: ${ step.result[0].value.replace(/-/g,'') }`);
        step.values.date = step.result[0].value.replace(/-/g,'');
        
        return await step.prompt(CONFIRM_PROMPT, 'Do you want add an attachment?', ['yes', 'no']);
    }
    async attachmentStep(step) {
        if (step.result) {
            //User said yes, ask for attachment 
            return await step.prompt(ATTACHMENT_PROMPT, `Please send the attachment:`);
        } else {
            // user said no:
            return await step.next(-1);
        }
    }

    async confirmTaskStep(step) {
        if (step.result) {
            await step.context.sendActivity(JSON.stringify(step.result));
            step.values.attachment = step.result
        }
        
        return await step.prompt(CONFIRM_PROMPT, 'Do you want to upload this task?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result) {
            
          const attachment = step.values.attachment[0];
          const url = attachment.contentUrl;
          const localFileName = path.join(__dirname, attachment.name);

          await step.context.sendActivity(`file path  is ${ url } `);
          await step.context.sendActivity(`file path  is ${ localFileName } `);
          await step.context.sendActivity(`the attachment is ${ attachment } `);

          try {
            // arraybuffer is necessary for images
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            await step.context.sendActivity(`axios return ${ JSON.stringify(response[0]) } `);
            // If user uploads JSON file, this prevents it from being written as "{"type":"Buffer","data":[123,13,10,32,32,34,108..."
            if (response.headers['content-type'] === 'application/json') {
                response.data = JSON.parse(response.data, (key, value) => {
                    return value && value.type === 'Buffer' ? Buffer.from(value.data) : value;
                });
            }
            fs.writeFile(localFileName, response.data, (fsError) => {
                if (fsError) {
                    throw fsError;
                }
            });
        } catch (error) {
            console.error(error);
            return undefined;
        }
           
        const stats = fs.statSync(localFileName);
        const fileSizeInBytes = stats.size;
        await step.context.sendActivity(`filesize for ${attachment.name} is: ${ fileSizeInBytes } `);
        
        const fileLink = await TeamworkAPI.files.fileLink(attachment.name,fileSizeInBytes)
       
        await step.context.sendActivity(`fileLink return ${ JSON.stringify(fileLink)} `);
          
        const fileRef =  TeamworkAPI.files.uploadNew(localFileName, fileSizeInBytes, fileLink);
           //TeamworkAPI.files.upload(localFileName);
           await step.context.sendActivity(`file Reference is ${ JSON.stringify(fileRef) } `);
           
            body["todo-item"].content = step.values.taskDescription;
            body["todo-item"]["due-date"] = step.values.date;
            body["todo-item"].pendingFileAttachments = [fileLink];
         
            //body["todo-item"].content = "New task";
            await TeamworkAPI.tasks.create(taskListID, body );

            await step.context.sendActivity("Task has been uploaded");
        } else {
            await step.context.sendActivity('Okay. The task has not been uploaded');
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is the end.
        return await step.endDialog();
    }

    async agePromptValidator(promptContext) {
        // This condition is our validation rule. You can also change the value at this point.
        return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 150;
    }
}

module.exports.UserProfileDialog = UserProfileDialog;
