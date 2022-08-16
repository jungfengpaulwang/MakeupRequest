import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter, HostListener, Renderer2 } from '@angular/core';
import { count } from 'rxjs';
import { GadgetService } from "./gadget.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css',]
})
export class AppComponent implements OnInit {
  currentSemester: any;
  studentContract: any;

  myCourse: any = { Courses: [], CourseSections: []};
  systemMessage: string = '';
  makeupMessage: string = '';
  courseModal: any = {};
  makeupRequestList: Array<any> = [];
  currentReason: string = '';
  now: Date = new Date();

  constructor(private gadgetService: GadgetService, private renderer: Renderer2,) {
    setInterval(() => {
      this.now = new Date();
    }, 1);
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
    return new Date(StartTime)<new Date();
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

  // //  course click
  // courseChange(event: any, course:any) {
  //   let element = document.querySelector('label[for="course-'+ course.CourseID + '"]');
  //   if (!element) return;

  //   if (event.target.checked) {
  //     this.renderer.setStyle(element, "color", "#fff");
  //     this.renderer.setStyle(element, "background-color", "#dc3545");
  //     this.courseModal[course.CourseID].Selected = true;
  //     // this.renderer.setStyle(element, "border-color", "#fff");
  //   } else {
  //     this.renderer.setStyle(element, "color", "#dc3545");
  //     this.renderer.setStyle(element, "background-color", "#fff");
  //     this.courseModal[course.CourseID].Selected = false;
  //     // this.renderer.setStyle(element, "border-color", "#dc3545");
  //   }
  //   console.log(this.courseModal);
  // }

  // //  copy click
  // copy(event: any, course:any) {
  //   let element = document.querySelector('textarea[id="reason-'+ course.CourseID + '"]');
  //   this.currentReason = (element as HTMLTextAreaElement).value;
  // }

  // //  paste click
  // paste(event: any, course:any) {
  //   let element = document.querySelector('textarea[id="reason-'+ course.CourseID + '"]');
  //   (element as HTMLTextAreaElement).value = this.currentReason;
  // }
  async revoke(section: any) {
    let request = { Request: {
      SchoolYear: this.currentSemester.SchoolYear,
      Semester: this.currentSemester.Semester,
      RefCourseID: section.RefCourseID,
      RefSectionID: section.RefSectionID,}};
    let rsp = await this.studentContract.send('RevokeMakeup', request);
    this.getMakeupRequest();
  }

  //  送出申請
  async sendMakeupRequest() {
    if (this.currentReason.trim() == '') {
      alert('請填寫補課原因');
      return;
    }
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
    if (request.Request.Sections.length == 0) {
      alert('請勾選申請補課時間');
      return;
    }
    let rsp = await this.studentContract.send('SetRequest', request);
    this.sendMail(request.Request.Sections);
    this.getMakeupRequest();
  }

  //  寄信
  async sendMail(sections: any) {
    try{
      /*
        [[學年度]]
        [[學期]]
        [[學生姓名]]
        [[申請時間]]
        [[申請補課原因]]
        [[申請補課課程名稱]]
        [[申請補課時段]]
      */
      let studentName = '';
      let rsp = await this.studentContract.send('GetMyInfo');
      if (rsp && rsp.Result) studentName = rsp.Result.Name;

      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestEmailTemplate_subject'});
      let subject = rsp.Response;
      rsp = await this.studentContract.send('GetConfiguration', {ConfName: 'MakeupRequestEmailTemplate'});
      let content = rsp.Response;

      rsp = await this.studentContract.send('GetMandrillApiKey');
      let mailchimpApiKey: string = '';
      if (rsp) mailchimpApiKey = rsp.Response;

      const mailchimpClient = require('@mailchimp/mailchimp_transactional')(mailchimpApiKey);
      async function callPing() {
        const response = await mailchimpClient.users.ping();
        return response;
      }
      const pong = await callPing();
      if (pong != 'PONG!') return;

      const sendmail = async (subject: string, content: string) => {
        const response = await mailchimpClient.messages.send({ message: {
          html: content,
          text: content,
          subject: subject,
          from_email: 'paul.wang@ischool.com.tw',
          from_name: studentName,
          to: [{
            email: 'paul.wang@ischool.com.tw',
            // name: '汪嶸峰',
            type: 'to',
          }],
          important: true,

        } });
        console.log(response);
      };
      sections.forEach((section: any)=>{
        const makeupTime = section.Section.StartTime.substr(0, 16) + "~" + section.Section.EndTime.substr(11, 5);
        const courseName = this.courseModal[section.Section.RefCourseID].Course.SubjectName + ' ' + this.courseModal[section.Section.RefCourseID].Course.ClassName;
        subject = subject.replaceAll('[[學年度]]', this.currentSemester.SchoolYear).replaceAll('[[學期]]', this.currentSemester.Semester).replaceAll('[[學生姓名]]', studentName).replaceAll('[[申請時間]]', section.Section.RequestDateTime).replaceAll('[[申請補課原因]]', section.Section.Reason).replaceAll('[[申請補課課程名稱]]', courseName).replaceAll('[[申請補課時段]]', makeupTime);
        content = content.replaceAll('[[學年度]]', this.currentSemester.SchoolYear).replaceAll('[[學期]]', this.currentSemester.Semester).replaceAll('[[學生姓名]]', studentName).replaceAll('[[申請時間]]', section.Section.RequestDateTime).replaceAll('[[申請補課原因]]', section.Section.Reason).replaceAll('[[申請補課課程名稱]]', courseName).replaceAll('[[申請補課時段]]', makeupTime);
        sendmail(subject, content);

      // let

      // let content =
      });


    } catch (ex) {
      console.log("寄信失敗! \n" + (ex));
    }
  }
}
