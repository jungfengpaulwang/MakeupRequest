import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter, HostListener } from '@angular/core';
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

  constructor(private gadgetService: GadgetService) {

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
    try {
      let request = { Request: {}};
      request.Request = {SchoolYear: this.currentSemester.SchoolYear, Semester: this.currentSemester.Semester};
      let rsp = await this.studentContract.send('default.GetCurrentCourse', request);
      this.myCourse.Courses = [].concat(rsp.Result.Course);
      rsp = await this.studentContract.send('default.GetCourseSection', request);
      this.myCourse.CourseSections = [].concat(rsp.Result.CourseSection);
      console.log(this.myCourse);
    } catch (ex) {
      console.log("取得「學生修課」發生錯誤! \n" + (ex));
    }
  }

  //  送出申請
  async sendMakeupRequest() {
    console.log('You send one makeup request.');
  }
}
