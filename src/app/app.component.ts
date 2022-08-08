import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter, HostListener, Renderer2 } from '@angular/core';
import { GadgetService } from "./gadget.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css',]
})
export class AppComponent implements OnInit {
  currentSemester: any;
  publicContract: any;
  studentContract: any;

  configuration: any;
  myInfo: any;
  myCourse: any = { Courses: [], CourseSections: []};
  systemMessage: string = '';
  makeupMessage: string = '';
  courseModal: any = {};
  currentReason: string = '';

  constructor(private gadgetService: GadgetService, private renderer: Renderer2,) {

  }

  async ngOnInit() {
    try {
      this.publicContract = await this.gadgetService.getContract('emba.public');
    } catch (ex) {
      console.log("取得「emba.public」Contract 發生錯誤! \n" + JSON.stringify(ex));
    }
    try {
      this.studentContract = await this.gadgetService.getContract('emba.student');
    } catch (ex) {
      console.log("取得「emba.student」Contract 發生錯誤! \n" + JSON.stringify(ex));
    }

    await this.getSchoolYear();
    this.getSystemMessage();
    this.getMakeupMessage();
    this.getMyInfo();
    this.getMyCourse();
  }

  //  當前學年度學期
  async getSchoolYear() {
    try {
      this.currentSemester = await this.publicContract.send('GetCurrentSemester');
    } catch (ex) {
      console.log("取得「目前學年度學期」發生錯誤! \n" + (ex));
    }
  }

  //  系統說明文字
  async getSystemMessage() {
    try {
      this.configuration = await this.publicContract.send('GetConfiguration', {name: '台大EMBA補課申請系統說明文字'});
      this.systemMessage = this.configuration.Configurations.Configuration['@text'];
      // console.log(this.configuration.Configurations.Configuration['@text']);
    } catch (ex) {
      console.log("取得「台大EMBA補課申請系統說明文字」發生錯誤! \n" + (ex));
    }
  }

  //  補課說明文字
  async getMakeupMessage() {
    try {
      this.configuration = await this.publicContract.send('GetConfiguration', {name: '台大EMBA補課說明文字'});
      this.makeupMessage = this.configuration.Configurations.Configuration['@text'];
      // console.log(this.configuration.Configurations.Configuration['@text']);
    } catch (ex) {
      console.log("取得「台大EMBA補課說明文字」發生錯誤! \n" + (ex));
    }
  }

  //  學生資訊
  async getMyInfo() {
    try {
      const rsp = await this.studentContract.send('default.GetMyInfo');
      this.myInfo = rsp.Result;
      // console.log(this.myInfo);
    } catch (ex) {
      console.log("取得「學生資訊」發生錯誤! \n" + (ex));
    }
  }

  //  學生修課
  async getMyCourse() {
    this.courseModal = {};
    try {
      let request = { Request: {}};
      request.Request = {SchoolYear: this.currentSemester.SchoolYear, Semester: this.currentSemester.Semester};
      let rsp = await this.studentContract.send('default.GetCurrentCourse', request);
      this.myCourse.Courses = [].concat(rsp.Result.Course);
      this.myCourse.Courses.forEach((course: any) => {
        this.courseModal[course.CourseID] = {};
        this.courseModal[course.CourseID].Selected = false;
      });
      rsp = await this.studentContract.send('default.GetCourseSection', request);
      this.myCourse.CourseSections = [].concat(rsp.Result.CourseSection);
      this.myCourse.CourseSections.forEach((section: any) => {
        if (this.courseModal[section.RefCourseID] !== undefined) {
          if (this.courseModal[section.RefCourseID][section.SectionID] === undefined) {
            this.courseModal[section.RefCourseID][section.SectionID] = {};
          }
          this.courseModal[section.RefCourseID][section.SectionID].Selected = false;
        }
      });
      // console.log(this.myCourse.CourseSections);
    } catch (ex) {
      console.log("取得「學生修課」發生錯誤! \n" + (ex));
    }
  }

  //  section click
  sectionChange(event: any, course:any, section: any) {
    if (event.target.checked) {
      this.courseModal[section.RefCourseID][section.SectionID].Selected = true;
    } else {
      this.courseModal[section.RefCourseID][section.SectionID].Selected = false;
    }
    console.log(this.courseModal);
  }

  //  course click
  courseChange(event: any, course:any) {
    let element = document.querySelector('label[for="course-'+ course.CourseID + '"]');
    if (!element) return;

    if (event.target.checked) {
      this.renderer.setStyle(element, "color", "#fff");
      this.renderer.setStyle(element, "background-color", "#dc3545");
      this.courseModal[course.CourseID].Selected = true;
      // this.renderer.setStyle(element, "border-color", "#fff");
    } else {
      this.renderer.setStyle(element, "color", "#dc3545");
      this.renderer.setStyle(element, "background-color", "#fff");
      this.courseModal[course.CourseID].Selected = false;
      // this.renderer.setStyle(element, "border-color", "#dc3545");
    }
    console.log(this.courseModal);
  }

  //  copy click
  copy(event: any, course:any) {
    let element = document.querySelector('textarea[id="reason-'+ course.CourseID + '"]');
    this.currentReason = (element as HTMLTextAreaElement).value;
  }

  //  paste click
  paste(event: any, course:any) {
    let element = document.querySelector('textarea[id="reason-'+ course.CourseID + '"]');
    (element as HTMLTextAreaElement).value = this.currentReason;
  }

  //  送出申請
  async sendMakeupRequest() {
    console.log('You send one makeup request.');
  }
}
