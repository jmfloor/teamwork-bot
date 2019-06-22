//Class for the todo-item schema in Teamwork

class TaskBody {
    constructor(content, dueDate, attachment) {
        this.content = content;
        this.dueDate = dueDate;
        this.attachment = attachment || "";
    }
}

module.exports.TaskBody = TaskBody;

/* List of parameters for a task in Teamwork
{
  "todo-item": {
    "use-defaults": false,
    "completed": false,
    "content": "Recurring task",
    "creator-id": 0,
    "notify": false,
    "responsible-party-id": "1",
    "commentFollowerIds": -1,
    "changeFollowerIds": -1,
    "start-date": "",
    "due-date": "1",
    "description": "Description of task.",
    "priority": "",
    "progress": 0,
    "parentTaskId": 0,
    "tags": "",
    "everyone-must-do": false,
    "predecessors": [],
    "reminders": null,
    "columnId": 0,
    "grant-access-to": "",
    "private": false,
    "estimated-minutes": 0,
    "pendingFileAttachments": [],
    "updateFiles": true,
    "attachments": "",
    "removeOtherFiles": true,
    "attachmentsCategoryIds": "",
    "pendingFileAttachmentsCategoryIds": "",
    "repeatOptions": {
      "selecteddays": "",
      "repeatEndDate": "29/08/2019",
      "repeatsFreq": "weekly",
      "monthlyRepeatType": "monthDay"
    }
  }
}

*/