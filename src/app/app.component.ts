import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter, HostListener, Renderer2, ViewChild } from '@angular/core';
import { NgbModalConfig, NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { GadgetService } from "./gadget.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css',],
  providers: [NgbModalConfig, NgbModal, NgbActiveModal],
})
export class AppComponent implements OnInit {
  modalRef: NgbModalRef | undefined;
  @ViewChild('alertModal') alertModal: NgbModalRef | undefined;
  @ViewChild('revokeModal') revokeModal: NgbModalRef | undefined;

  currentSemester: any;
  studentContract: any;

  myCourse: any = { Courses: [], CourseSections: []};
  systemMessage: string = '';
  makeupMessage: string = '';
  courseModal: any = {};
  makeupRequestList: Array<any> = [];
  currentReason: string = '';
  alertModalMessage: string = '';
  now: Date = new Date();

  constructor(private gadgetService: GadgetService, private modalService: NgbModal, private config: NgbModalConfig, ) {
    // config.backdrop = 'static';
    // config.keyboard = false;
    // config.size = 'lg';

    setInterval(() => {
      this.now = new Date();
    }, 1);
  }

  openModal(content: any) {
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
    this.modalRef?.close();
  }

  async ngOnInit() {
    try {
      this.studentContract = await this.gadgetService.getContract('emba.student.makeup_request');
    } catch (ex) {
      console.log("取得「emba.student」Contract 發生錯誤! \n" + JSON.stringify(ex));
    }

    await this.getSchoolYear();
    this.getSystemMessage();
    this.getMakeupMessage();
    this.getMyCourse();
    this.getMakeupRequest();
  }

  //  當前學年度學期
  async getSchoolYear() {
    try {
      this.currentSemester = await this.studentContract.send('GetCurrentSemester');
    } catch (ex) {
      console.log("取得「目前學年度學期」發生錯誤! \n" + (ex));
    }
  }

  //  系統說明文字
  async getSystemMessage() {
    try {
      const rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupSystemExplain'});
      this.systemMessage = rsp.Response;
    } catch (ex) {
      console.log("取得「台大EMBA補課申請系統說明文字」發生錯誤! \n" + (ex));
    }
  }

  //  補課說明文字
  async getMakeupMessage() {
    try {
      const rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestExplain'});
      this.makeupMessage = rsp.Response;
    } catch (ex) {
      console.log("取得「台大EMBA補課說明文字」發生錯誤! \n" + (ex));
    }
  }

  //  學生修課
  async getMyCourse() {
    this.courseModal = {};
    try {
      let request = { Request: {}};
      request.Request = {SchoolYear: this.currentSemester.SchoolYear, Semester: this.currentSemester.Semester};
      let rsp = await this.studentContract.send('GetCurrentCourse', request);
      this.myCourse.Courses = [].concat(rsp.Result.Course);
      this.myCourse.Courses.forEach((course: any) => {
        this.courseModal[course.CourseID] = {};
        this.courseModal[course.CourseID].Selected = false;
        this.courseModal[course.CourseID].Course = course;
      });
      rsp = await this.studentContract.send('GetCourseSection', request);
      this.myCourse.CourseSections = [].concat(rsp.Response);
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
      console.log("取得「學生修課」發生錯誤! \n" + (ex));
    }
  }

  CompareNow(StartTime: string): boolean {
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(StartTime)<today;
  }

  //  申請補課資訊
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

  //  撤銷申請
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

  //  寄撤銷申請信
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
      //  連接 Mailchimp
      const mailchimpClient = require('@mailchimp/mailchimp_transactional')(mailchimpApiKey);
      async function callPing() {
        const response = await mailchimpClient.users.ping();
        return response;
      }
      const pong = await callPing();
      if (pong != 'PONG!') return;

      //  Mailchimp 寄信函式
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
        //  Mailchimp 寄信結果
        console.log(response);
      };

      let semester = '';
      if (this.currentSemester.Semester == 0) semester = '夏季學期';
      if (this.currentSemester.Semester == 1) semester = '第1學期';
      if (this.currentSemester.Semester == 2) semester = '第2學期';

      //  學生姓名
      let studentName = '';
      rsp = await this.studentContract.send('GetMyInfo');
      if (rsp && rsp.Result) studentName = rsp.Result.Name;

      //  撤銷補課申請審核人員通知信樣版
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRevokeManagerEmailTemplate_subject'});
      let subject_manager = rsp.Response;
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRevokeManagerEmailTemplate'});
      let content_manager = rsp.Response;

      //  撤銷補課申請學生通知信樣版
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRevokeStudentEmailTemplate_subject'});
      let subject_student = rsp.Response;
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRevokeStudentEmailTemplate'});
      let content_student = rsp.Response;

      //  審核人員電子郵件
      rsp = await this.studentContract.send('GetMakeupCarer');
      let receivers_manager: { email: string; type: string; }[] = [];
      ([].concat(rsp.Response)).forEach((mail: string)=>{
        receivers_manager.push({
          email: mail,
          type: 'to',
        });
      });

      //  學生電子郵件
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
      //  串接申請補課資訊，包含課程名稱與上課時段
      let courseInfo: string = '<table style="border-color: black; border-style: solid; border-width: 0;"><tr style="background-color: #dee2e6;"><td>開課班次</td><td>課程名稱</td><td>申請補課時間</td></tr>';
      courseInfo += `<tr><td>${className}</td><td>${subjectName}</td><td>${makeupTime}</td></tr>`;

      //  先寄撤銷補課申請審核人員通知信
      subject_manager = subject_manager.replaceAll('[[申請補課撤銷時間]]', cancelTime).replaceAll('[[學年度]]', this.currentSemester.SchoolYear).replaceAll('[[學期]]', semester).replaceAll('[[學生姓名]]', studentName).replaceAll('[[申請時間]]', requestDateTime).replaceAll('[[申請補課原因]]', reason).replaceAll('[[申請補課內容]]', courseInfo);
      content_manager = content_manager.replaceAll('[[申請補課撤銷時間]]', cancelTime).replaceAll('[[學年度]]', this.currentSemester.SchoolYear).replaceAll('[[學期]]', semester).replaceAll('[[學生姓名]]', studentName).replaceAll('[[申請時間]]', requestDateTime).replaceAll('[[申請補課原因]]', reason).replaceAll('[[申請補課內容]]', courseInfo);
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

      //  再寄撤銷補課申請學生通知信
      subject_student = subject_student.replaceAll('[[申請補課撤銷時間]]', cancelTime).replaceAll('[[學年度]]', this.currentSemester.SchoolYear).replaceAll('[[學期]]', semester).replaceAll('[[學生姓名]]', studentName).replaceAll('[[申請時間]]', requestDateTime).replaceAll('[[申請補課原因]]', reason).replaceAll('[[申請補課內容]]', courseInfo);
      content_student = content_student.replaceAll('[[申請補課撤銷時間]]', cancelTime).replaceAll('[[學年度]]', this.currentSemester.SchoolYear).replaceAll('[[學期]]', semester).replaceAll('[[學生姓名]]', studentName).replaceAll('[[申請時間]]', requestDateTime).replaceAll('[[申請補課原因]]', reason).replaceAll('[[申請補課內容]]', courseInfo);
      sendmail(subject_student, content_student, receivers_student);

    } catch (ex) {
      console.log("寄信失敗! \n" + (ex));
    }
  }

  //  送出申請
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
      alertMessages.push('請填寫補課原因');
    }
    if (request.Request.Sections.length == 0) {
      alertMessages.push('請勾選申請補課時間');
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

  //  寄申請信
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
      //  連接 Mailchimp
      const mailchimpClient = require('@mailchimp/mailchimp_transactional')(mailchimpApiKey);
      async function callPing() {
        const response = await mailchimpClient.users.ping();
        return response;
      }
      const pong = await callPing();
      if (pong != 'PONG!') return;

      //  Mailchimp 寄信函式
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
        //  Mailchimp 寄信結果
        console.log(response);
      };

      let semester = '';
      if (this.currentSemester.Semester == 0) semester = '夏季學期';
      if (this.currentSemester.Semester == 1) semester = '第1學期';
      if (this.currentSemester.Semester == 2) semester = '第2學期';

      //  學生姓名
      let studentName = '';
      rsp = await this.studentContract.send('GetMyInfo');
      if (rsp && rsp.Result) studentName = rsp.Result.Name;

      //  補課申請審核人員通知信樣版
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestManagerEmailTemplate_subject'});
      let subject_manager = rsp.Response;
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestManagerEmailTemplate'});
      let content_manager = rsp.Response;

      //  補課申請學生通知信樣版
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestStudentEmailTemplate_subject'});
      let subject_student = rsp.Response;
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestStudentEmailTemplate'});
      let content_student = rsp.Response;

      //  審核人員電子郵件
      rsp = await this.studentContract.send('GetMakeupCarer');
      let receivers_manager: { email: string; type: string; }[] = [];
      ([].concat(rsp.Response)).forEach((mail: string)=>{
        receivers_manager.push({
          email: mail,
          type: 'to',
        });
      });

      //  學生電子郵件
      rsp = await this.studentContract.send('GetStudentEmail');
      let receivers_student: { email: string; type: string; }[] = [];
      ([].concat(rsp.Response)).forEach((mail: string)=>{
        receivers_student.push({
          email: mail,
          type: 'to',
        });
      });

      //  串接申請補課資訊，包含課程名稱與上課時段
      let courseInfo: string = '<table style="border-color: black; border-style: solid; border-width: 0;"><tr style="background-color: #dee2e6;"><td>開課班次</td><td>課程名稱</td><td>申請補課時間</td></tr>';
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

      //  先寄補課申請審核人員通知信
      subject_manager = subject_manager.replaceAll('[[學年度]]', this.currentSemester.SchoolYear).replaceAll('[[學期]]', semester).replaceAll('[[學生姓名]]', studentName).replaceAll('[[申請時間]]', requestDateTime).replaceAll('[[申請補課原因]]', reason).replaceAll('[[申請補課內容]]', courseInfo);
      content_manager = content_manager.replaceAll('[[學年度]]', this.currentSemester.SchoolYear).replaceAll('[[學期]]', semester).replaceAll('[[學生姓名]]', studentName).replaceAll('[[申請時間]]', requestDateTime).replaceAll('[[申請補課原因]]', reason).replaceAll('[[申請補課內容]]', courseInfo);
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

      //  再寄補課申請學生通知信
      subject_student = subject_student.replaceAll('[[學年度]]', this.currentSemester.SchoolYear).replaceAll('[[學期]]', semester).replaceAll('[[學生姓名]]', studentName).replaceAll('[[申請時間]]', requestDateTime).replaceAll('[[申請補課原因]]', reason).replaceAll('[[申請補課內容]]', courseInfo);
      content_student = content_student.replaceAll('[[學年度]]', this.currentSemester.SchoolYear).replaceAll('[[學期]]', semester).replaceAll('[[學生姓名]]', studentName).replaceAll('[[申請時間]]', requestDateTime).replaceAll('[[申請補課原因]]', reason).replaceAll('[[申請補課內容]]', courseInfo);
      sendmail(subject_student, content_student, receivers_student);

    } catch (ex) {
      console.log("寄信失敗! \n" + (ex));
    }
  }
}
