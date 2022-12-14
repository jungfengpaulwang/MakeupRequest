import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter, HostListener, Renderer2, ViewChild, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgbModalConfig, NgbActiveModal, NgbModal, NgbModalRef, NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { GadgetService } from "./gadget.service";

@Pipe({ name: 'safeHtml'})
export class SafeHtmlPipe implements PipeTransform  {
  constructor(private sanitized: DomSanitizer) {}
  transform(value: string) {
    return this.sanitized.bypassSecurityTrustHtml(value);
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css',],
  providers: [NgbModalConfig, NgbModal, NgbActiveModal, NgbCollapse],
})
export class AppComponent implements OnInit {
  modalRef: NgbModalRef | undefined;
  @ViewChild('alertModal') alertModal: NgbModalRef | undefined;
  @ViewChild('revokeModal') revokeModal: NgbModalRef | undefined;

  currentSemester: any;
  backupSemester: any;
  studentContract: any;

  myCourse: any = { Courses: [], CourseSections: []};
  systemMessage: string = '';
  makeupMessage: string = '';
  courseModal: any = {};
  makeupRequestList: Array<any> = [];
  currentReason: string = '';
  alertModalMessage: string = '';
  now: Date = new Date();
  public isCollapsed = false;

  constructor(private gadgetService: GadgetService, private modalService: NgbModal, private config: NgbModalConfig, ) {
    // config.backdrop = 'static';
    // config.keyboard = false;
    // config.size = 'lg';

    setInterval(() => {
      this.now = new Date();
    }, 1);
  }

  async openModal(content: any) {
    this.backupSemester = {SchoolYear: this.currentSemester.SchoolYear, Semester: this.currentSemester.Semester};
    await this.getSchoolYear();
    await this.getMyCourse();
    await this.getMakeupRequest();
    Object.keys(this.courseModal).forEach((CourseID: string) => {
      Object.keys(this.courseModal[CourseID]).forEach((SectionID: string) => {
        if (this.courseModal[CourseID][SectionID].Selected) {
          this.courseModal[CourseID][SectionID].Selected = false;
        }
      });
    });
    this.currentReason = '';
    this.modalRef = this.modalService.open(content, {
      backdrop: 'static',
      keyboard: false,
      size: 'lg',
    });
  }

  closeModal() {
    this.currentSemester = {SchoolYear: this.backupSemester.SchoolYear, Semester: this.backupSemester.Semester};
    this.getMakeupRequest();
    this.modalRef?.close();
  }

  async ngOnInit() {
    try {
      this.studentContract = await this.gadgetService.getContract('emba.student.makeup_request');
    } catch (ex) {
      console.log("?????????emba.student???Contract ????????????! \n" + JSON.stringify(ex));
    }

    await this.getSchoolYear();
    this.getSystemMessage();
    this.getMakeupMessage();
    this.getMakeupRequest();
  }

  yearChange(event: any): void {
    let value = event.target.value;
    this.currentSemester.SchoolYear = value;
    this.getMakeupRequest();
  }

  increaseValue(element: any): void {
    var value = parseInt((element as HTMLInputElement).value, 10);
    value = isNaN(value) ? 0 : value;
    value++;
    (element as HTMLInputElement).value = value + '';
    this.currentSemester.SchoolYear = value;
    this.getMakeupRequest();
  }

  decreaseValue(element: any): void {
    var value = parseInt((element as HTMLInputElement).value, 10);
    value = isNaN(value) ? 0 : value;
    value < 1 ? value = 1 : '';
    value--;
    (element as HTMLInputElement).value = value + '';
    this.currentSemester.SchoolYear = value;
    this.getMakeupRequest();
  }

  changeCurrentSemester(semester: any): void {
    this.currentSemester.Semester = semester;
    this.getMakeupRequest();
  }

  numberOnly(event: any): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode >= 48 && charCode <= 57) {
      return true;
    }
    return false;
  }

  //  ?????????????????????
  async getSchoolYear() {
    try {
      this.currentSemester = await this.studentContract.send('GetCurrentSemester');
    } catch (ex) {
      console.log("?????????????????????????????????????????????! \n" + (ex));
    }
  }

  //  ??????????????????
  async getSystemMessage() {
    try {
      const rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupSystemExplain'});
      this.systemMessage = rsp.Response;
    } catch (ex) {
      console.log("???????????????EMBA?????????????????????????????????????????????! \n" + (ex));
    }
  }

  //  ??????????????????
  async getMakeupMessage() {
    try {
      const rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestExplain'});
      this.makeupMessage = rsp.Response;
    } catch (ex) {
      console.log("???????????????EMBA?????????????????????????????????! \n" + (ex));
    }
  }

  //  ????????????
  async getMyCourse() {
    this.courseModal = {};
    try {
      let request = { Request: {}};
      request.Request = {SchoolYear: this.currentSemester.SchoolYear, Semester: this.currentSemester.Semester};
      let rsp = await this.studentContract.send('GetCurrentCourse', request);
      if (rsp && rsp.Result && rsp.Result.Course) {
        this.myCourse.Courses = [].concat(rsp.Result.Course);
      }
      this.myCourse.Courses.forEach((course: any) => {
        this.courseModal[course.CourseID] = {};
        this.courseModal[course.CourseID].Selected = false;
        this.courseModal[course.CourseID].Course = course;
      });

      rsp = await this.studentContract.send('GetCourseSection', request);
      if (rsp && rsp.Response) {
        this.myCourse.CourseSections = [].concat(rsp.Response);
      }
      this.myCourse.CourseSections.forEach((section: any) => {
        section.RequestDateTime = section.StartTime.substr(0, 16) + "~" + section.EndTime.substr(11, 5);
        if (this.courseModal[section.RefCourseID] !== undefined) {
          if (this.courseModal[section.RefCourseID][section.SectionID] === undefined) {
            this.courseModal[section.RefCourseID][section.SectionID] = {};
            this.courseModal[section.RefCourseID][section.SectionID].Selected = false;
            this.courseModal[section.RefCourseID][section.SectionID].Section = section;
          }
        }
      });
    } catch (ex) {
      console.log("????????????????????????????????????! \n" + (ex));
    }
  }

  CompareNow(StartTime: string): boolean {
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(StartTime)<today;
  }

  //  ??????????????????
 async getMakeupRequest(){
  this.makeupRequestList = [];
  let request = { Request: {}};
  request.Request = {SchoolYear: this.currentSemester.SchoolYear, Semester: this.currentSemester.Semester};
  let rsp = await this.studentContract.send('GetRequest', request);
  if (rsp && rsp.Response) {
    ([].concat(rsp.Response)).forEach((r: any)=>{
      this.makeupRequestList.push({
        RefCourseID: r.RefCourseID,
        RefSectionID: r.RefSectionID,
        RequestDateTime: r.RequestDateTime,
        ClassName: r.ClassName,
        SubjectName: r.SubjectName,
        SectionTime: r.StartTime.substr(0, 16) + "~" + r.EndTime.substr(11, 5),
        Reason: r.Reason,
        FailReason: r.FailReason,
        Status: r.Status,
        nClassName: r.nClassName,
        nSubjectName: r.nSubjectName,
        nSectionTime: r.nStartTime.substr(0, 16) + "~" + r.nEndTime.substr(11, 5),
        nPlace: r.nPlace,
        Cancel: r.Cancel,
      });
    });
  }
 }

 getMakeupCount(course: any): number {
    let count: number = 4;

    this.myCourse.CourseSections.forEach((section: any) => {
      if (section.RefCourseID == course.CourseID) {
        if (section.isMakeup) {
          count -= 1;
        }
      }
    });

    return count;
 }

  //  section click
  sectionChange(event: any, course:any, section: any) {
    if (event.target.checked) {
      this.courseModal[section.RefCourseID][section.SectionID].Selected = true;
    } else {
      this.courseModal[section.RefCourseID][section.SectionID].Selected = false;
    }
  }

  //  ????????????
  async revoke(section: any) {
    const m = new Date();
    const dateString = m.getFullYear() +"/"+ (m.getMonth()+1) +"/"+ m.getDate() + " " + m.getHours() + ":" + m.getMinutes() + ":" + m.getSeconds();
    section.CancelDateTime = dateString;
    this.modalService.open(this.revokeModal, {
      backdrop: 'static',
      keyboard: false,
      size: 'sm',
      centered: true
    }).result.then(async () => {
      let request = { Request: {
        CancelDateTime: section.CancelDateTime,
        SchoolYear: this.currentSemester.SchoolYear,
        Semester: this.currentSemester.Semester,
        RefCourseID: section.RefCourseID,
        RefSectionID: section.RefSectionID,}};
      let rsp = await this.studentContract.send('RevokeMakeup', request);
      this.sendRevokeMail(section);
      this.getMakeupRequest();
      this.getMyCourse();
    }, () => {
      ;
    });;
  }

  //  ??????????????????
  async sendRevokeMail(section: any) {
    try{
      //  Mailchimp ApiKey
      let rsp = await this.studentContract.send('GetMandrillApiKey');
      let mailchimpApiKey: string = '';
      let sender: string = '';
      if (rsp) {
        mailchimpApiKey = rsp.Response.apikey;
        sender = rsp.Response.account;
      }
      //  ?????? Mailchimp
      const mailchimpClient = require('@mailchimp/mailchimp_transactional')(mailchimpApiKey);
      async function callPing() {
        const response = await mailchimpClient.users.ping();
        return response;
      }
      const pong = await callPing();
      if (pong != 'PONG!') return;

      //  Mailchimp ????????????
      const sendmail = async (subject: string, content: string, receivers: Array<any>) => {
        const response = await mailchimpClient.messages.send({ message: {
          html: content,
          text: content,
          subject: subject,
          from_email: sender,
          from_name: '',
          to: receivers,
          important: true,

        } });
        //  Mailchimp ????????????
        console.log(response);
      };

      let semester = '';
      if (this.currentSemester.Semester == 0) semester = '????????????';
      if (this.currentSemester.Semester == 1) semester = '???1??????';
      if (this.currentSemester.Semester == 2) semester = '???2??????';

      //  ????????????
      let studentName = '';
      let studentClassName = '';
      let studentNumber = '';
      rsp = await this.studentContract.send('GetMyInfo');
      if (rsp && rsp.Result) {
        studentName = rsp.Result.Name;
        studentClassName = rsp.Result.ClassName;
        studentNumber = rsp.Result.StudentNumber;
      }

      //  ?????????????????????????????????????????????
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRevokeManagerEmailTemplate_subject'});
      let subject_manager = rsp.Response;
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRevokeManagerEmailTemplate'});
      let content_manager = rsp.Response;

      //  ???????????????????????????????????????
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRevokeStudentEmailTemplate_subject'});
      let subject_student = rsp.Response;
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRevokeStudentEmailTemplate'});
      let content_student = rsp.Response;

      //  ????????????????????????
      rsp = await this.studentContract.send('GetMakeupCarer');
      let receivers_manager: { email: string; type: string; }[] = [];
      ([].concat(rsp.Response)).forEach((mail: string)=>{
        receivers_manager.push({
          email: mail,
          type: 'to',
        });
      });

      //  ??????????????????
      rsp = await this.studentContract.send('GetStudentEmail');
      let receivers_student: { email: string; type: string; }[] = [];
      ([].concat(rsp.Response)).forEach((mail: string)=>{
        receivers_student.push({
          email: mail,
          type: 'to',
        });
      });
      const requestDateTime = section.RequestDateTime;
      const reason = section.Reason;
      const className = section.ClassName;
      const subjectName = section.SubjectName;
      const cancelTime = section.CancelDateTime;
      const makeupTime = section.SectionTime;
      //  ????????????????????????????????????????????????????????????
      let courseInfo: string = '<table style="border-color: black; border-style: solid; border-width: 0;"><tr style="background-color: #dee2e6;"><td>????????????</td><td>????????????</td><td>??????????????????</td></tr>';
      courseInfo += `<tr><td>${className}</td><td>${subjectName}</td><td>${makeupTime}</td></tr>`;

      //  ?????????????????????????????????????????????
      subject_manager = subject_manager.replaceAll('[[????????????????????????]]', cancelTime).replaceAll('[[?????????]]', this.currentSemester.SchoolYear).replaceAll('[[??????]]', semester).replaceAll('[[????????????]]', studentClassName).replaceAll('[[??????]]', studentNumber).replaceAll('[[????????????]]', studentName).replaceAll('[[????????????]]', requestDateTime).replaceAll('[[??????????????????]]', reason).replaceAll('[[??????????????????]]', courseInfo);
      content_manager = content_manager.replaceAll('[[????????????????????????]]', cancelTime).replaceAll('[[?????????]]', this.currentSemester.SchoolYear).replaceAll('[[??????]]', semester).replaceAll('[[????????????]]', studentClassName).replaceAll('[[??????]]', studentNumber).replaceAll('[[????????????]]', studentName).replaceAll('[[????????????]]', requestDateTime).replaceAll('[[??????????????????]]', reason).replaceAll('[[??????????????????]]', courseInfo);
      sendmail(subject_manager, content_manager, receivers_manager);

      /*
      rsp = await this.studentContract.send('SendMail', {
        Request: {
          Receiver: receivers_manager,
          Subject: subject_manager,
          HtmlContent: content_manager,
        }
      });
      */

      //  ???????????????????????????????????????
      subject_student = subject_student.replaceAll('[[????????????????????????]]', cancelTime).replaceAll('[[?????????]]', this.currentSemester.SchoolYear).replaceAll('[[??????]]', semester).replaceAll('[[????????????]]', studentClassName).replaceAll('[[??????]]', studentNumber).replaceAll('[[????????????]]', studentName).replaceAll('[[????????????]]', requestDateTime).replaceAll('[[??????????????????]]', reason).replaceAll('[[??????????????????]]', courseInfo);
      content_student = content_student.replaceAll('[[????????????????????????]]', cancelTime).replaceAll('[[?????????]]', this.currentSemester.SchoolYear).replaceAll('[[??????]]', semester).replaceAll('[[????????????]]', studentClassName).replaceAll('[[??????]]', studentNumber).replaceAll('[[????????????]]', studentName).replaceAll('[[????????????]]', requestDateTime).replaceAll('[[??????????????????]]', reason).replaceAll('[[??????????????????]]', courseInfo);
      sendmail(subject_student, content_student, receivers_student);

    } catch (ex) {
      console.log("????????????! \n" + (ex));
    }
  }

  //  ????????????
  async sendMakeupRequest() {
    let m = new Date();
    let dateString = m.getFullYear() +"/"+ (m.getMonth()+1) +"/"+ m.getDate() + " " + m.getHours() + ":" + m.getMinutes() + ":" + m.getSeconds();
    let request: any = { Request: {Sections: []}};
    Object.keys(this.courseModal).forEach((CourseID: string) => {
      Object.keys(this.courseModal[CourseID]).forEach((SectionID: string) => {
        if (this.courseModal[CourseID][SectionID].Selected) {
          const section = this.courseModal[CourseID][SectionID].Section;
          request.Request.Sections.push({ Section:
            {
              RequestDateTime: dateString,
              SchoolYear: this.currentSemester.SchoolYear,
              Semester: this.currentSemester.Semester,
              Reason: this.currentReason,
              RefCourseID: section.RefCourseID,
              RefSectionID: section.SectionID,
              StartTime: section.StartTime,
              EndTime: section.EndTime,
            }
          });
        }
      });
    });
    let alertMessages = [];
    if (this.currentReason.trim() == '') {
      alertMessages.push('?????????????????????');
    }
    if (request.Request.Sections.length == 0) {
      alertMessages.push('???????????????????????????');
    }
    if (alertMessages.length > 0) {
      this.alertModalMessage = alertMessages.join('\n');
      this.modalService.open(this.alertModal, {
        backdrop: true,
        keyboard: true,
        size: 'sm',
        centered: true
      });
      return;
    }
    let rsp = await this.studentContract.send('SetRequest', request);
    this.sendRequestMail(request.Request.Sections);
    this.getMakeupRequest();
    this.getMyCourse();
    this.modalRef?.close();
  }

  //  ????????????
  async sendRequestMail(sections: any) {
    try{
      //  Mailchimp ApiKey
      let rsp = await this.studentContract.send('GetMandrillApiKey');
      let mailchimpApiKey: string = '';
      let sender: string = '';
      if (rsp) {
        mailchimpApiKey = rsp.Response.apikey;
        sender = rsp.Response.account;
      }
      //  ?????? Mailchimp
      const mailchimpClient = require('@mailchimp/mailchimp_transactional')(mailchimpApiKey);
      async function callPing() {
        const response = await mailchimpClient.users.ping();
        return response;
      }
      const pong = await callPing();
      if (pong != 'PONG!') return;

      //  Mailchimp ????????????
      const sendmail = async (subject: string, content: string, receivers: Array<any>) => {
        const response = await mailchimpClient.messages.send({ message: {
          html: content,
          text: content,
          subject: subject,
          from_email: sender,
          from_name: '',
          to: receivers,
          important: true,

        } });
        //  Mailchimp ????????????
        console.log(response);
      };

      let semester = '';
      if (this.currentSemester.Semester == 0) semester = '????????????';
      if (this.currentSemester.Semester == 1) semester = '???1??????';
      if (this.currentSemester.Semester == 2) semester = '???2??????';

      //  ????????????
      let studentName = '';
      let studentClassName = '';
      let studentNumber = '';
      rsp = await this.studentContract.send('GetMyInfo');
      if (rsp && rsp.Result) {
        studentName = rsp.Result.Name;
        studentClassName = rsp.Result.ClassName;
        studentNumber = rsp.Result.StudentNumber;
      }

      //  ???????????????????????????????????????
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestManagerEmailTemplate_subject'});
      let subject_manager = rsp.Response;
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestManagerEmailTemplate'});
      let content_manager = rsp.Response;

      //  ?????????????????????????????????
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestStudentEmailTemplate_subject'});
      let subject_student = rsp.Response;
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestStudentEmailTemplate'});
      let content_student = rsp.Response;

      //  ????????????????????????
      rsp = await this.studentContract.send('GetMakeupCarer');
      let receivers_manager: { email: string; type: string; }[] = [];
      ([].concat(rsp.Response)).forEach((mail: string)=>{
        receivers_manager.push({
          email: mail,
          type: 'to',
        });
      });

      //  ??????????????????
      rsp = await this.studentContract.send('GetStudentEmail');
      let receivers_student: { email: string; type: string; }[] = [];
      ([].concat(rsp.Response)).forEach((mail: string)=>{
        receivers_student.push({
          email: mail,
          type: 'to',
        });
      });

      //  ????????????????????????????????????????????????????????????
      let courseInfo: string = '<table style="border-color: black; border-style: solid; border-width: 0;"><tr style="background-color: #dee2e6;"><td>????????????</td><td>????????????</td><td>??????????????????</td></tr>';
      let index = 0;
      let reason = '';
      let requestDateTime = '';
      sections.forEach((section: any)=>{
        reason = section.Section.Reason;
        requestDateTime = section.Section.RequestDateTime;
        const className = this.courseModal[section.Section.RefCourseID].Course.ClassName;
        const subjectName = this.courseModal[section.Section.RefCourseID].Course.SubjectName;
        const makeupTime = section.Section.StartTime.substr(0, 16) + "~" + section.Section.EndTime.substr(11, 5);

        if (index % 2 == 0) {
          courseInfo += `<tr><td>${className}</td><td>${subjectName}</td><td>${makeupTime}</td></tr>`;
        } else {
          courseInfo += `<tr style="background-color: #dee2e6;"><td>${className}</td><td>${subjectName}</td><td>${makeupTime}</td></tr>`;
        }

        index += 1;
      });

      //  ???????????????????????????????????????
      subject_manager = subject_manager.replaceAll('[[?????????]]', this.currentSemester.SchoolYear).replaceAll('[[??????]]', semester).replaceAll('[[????????????]]', studentClassName).replaceAll('[[??????]]', studentNumber).replaceAll('[[????????????]]', studentName).replaceAll('[[????????????]]', requestDateTime).replaceAll('[[??????????????????]]', reason).replaceAll('[[??????????????????]]', courseInfo);
      content_manager = content_manager.replaceAll('[[?????????]]', this.currentSemester.SchoolYear).replaceAll('[[??????]]', semester).replaceAll('[[????????????]]', studentClassName).replaceAll('[[??????]]', studentNumber).replaceAll('[[????????????]]', studentName).replaceAll('[[????????????]]', requestDateTime).replaceAll('[[??????????????????]]', reason).replaceAll('[[??????????????????]]', courseInfo);
      sendmail(subject_manager, content_manager, receivers_manager);

      /*
      rsp = await this.studentContract.send('SendMail', {
        Request: {
          Receiver: receivers_manager,
          Subject: subject_manager,
          HtmlContent: content_manager,
        }
      });
      */

      //  ?????????????????????????????????
      subject_student = subject_student.replaceAll('[[?????????]]', this.currentSemester.SchoolYear).replaceAll('[[??????]]', semester).replaceAll('[[????????????]]', studentClassName).replaceAll('[[??????]]', studentNumber).replaceAll('[[????????????]]', studentName).replaceAll('[[????????????]]', requestDateTime).replaceAll('[[??????????????????]]', reason).replaceAll('[[??????????????????]]', courseInfo);
      content_student = content_student.replaceAll('[[?????????]]', this.currentSemester.SchoolYear).replaceAll('[[??????]]', semester).replaceAll('[[????????????]]', studentClassName).replaceAll('[[??????]]', studentNumber).replaceAll('[[????????????]]', studentName).replaceAll('[[????????????]]', requestDateTime).replaceAll('[[??????????????????]]', reason).replaceAll('[[??????????????????]]', courseInfo);
      sendmail(subject_student, content_student, receivers_student);

    } catch (ex) {
      console.log("????????????! \n" + (ex));
    }
  }
}
