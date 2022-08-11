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
  makeupRequestList: Array<any> = [];
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
    //.getMakeupRequest();
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
        this.courseModal[course.CourseID].Course = course;
      });
      rsp = await this.studentContract.send('default.GetCourseSection', request);
      this.myCourse.CourseSections = [].concat(rsp.Result.CourseSection);
      this.myCourse.CourseSections.forEach((section: any) => {
        if (this.courseModal[section.RefCourseID] !== undefined) {
          if (this.courseModal[section.RefCourseID][section.SectionID] === undefined) {
            this.courseModal[section.RefCourseID][section.SectionID] = {};
            this.courseModal[section.RefCourseID][section.SectionID].Selected = false;
            this.courseModal[section.RefCourseID][section.SectionID].Section = section;
          }
        }
      });
      // console.log(this.myCourse.CourseSections);
      // console.log(this.myCourse.Courses);
    } catch (ex) {
      console.log("取得「學生修課」發生錯誤! \n" + (ex));
    }
  }

  //  申請補課資訊
 async getMakeupRequest(){
  this.makeupRequestList = [];
  let request = { Request: {}};
  request.Request = {SchoolYear: this.currentSemester.SchoolYear, Semester: this.currentSemester.Semester};
  let rsp = await this.studentContract.send('makeup_request.GetRequest', request);
  if (rsp && rsp.Response) {
    ([].concat(rsp.Response)).forEach((response: any)=>{
      ([].concat([].concat(response.Response.Courses.Course))).forEach((course: any)=>{
        ([].concat([].concat(course.Sections.Section))).forEach((sec: any)=>{
          let section: any = {};
          section.RequestDateTime = response.RequestDateTime;
          section.Reason = response.Reason;
          section.Cancel = response.Cancel;
          section.RefCourseID = course.CourseID;
          section.SchoolYear = course.SchoolYear;
          section.Semester = course.Semester;
          section.SubjectName = course.SubjectName;
          section.ClassName = course.ClassName;
          section.CourseType = course.CourseType;
          section.TeacherName = course.TeacherName;
          section.SectionID = sec.SectionID;
          section.StartTime = sec.StartTime;
          section.EndTime = sec.EndTime;
          section.Place = sec.Place;
          section.Status = -1;
          section.MakeupInfo = {};
          if (section.Result) {
            section.Status = section.Result.Status;
            if (section.Result.MakeupInfo) {
              section.MakeupInfo = {
                ClassName: section.MakeupInfo.ClassName,
                SubjectName: section.MakeupInfo.SubjectName,
                TeacherName: section.MakeupInfo.TeacherName,
                StartTime: section.MakeupInfo.StartTime,
                EndTime: section.MakeupInfo.EndTime,
                Place: section.MakeupInfo.Place,
              };
            }
          }

          this.makeupRequestList.push(section);
        });
      });
    });
  }
  console.log(this.makeupRequestList);
  /*
    <Result>
        <MakeupInfo>
            <ClassName>02<ClassName>
            <SubjectName>02<SubjectName>
            <TeacherName></TeacherName>
            <StartTime>2022/9/1 09:00:00</StartTime>
            <EndTime>2022/9/1 11:00:00</EndTime>
            <Place>冠德講堂</Place>
        </MakeupInfo>
        <Status>1</Status>
    </Result>
  */
 }

  //  section click
  sectionChange(event: any, course:any, section: any) {
    if (event.target.checked) {
      this.courseModal[section.RefCourseID][section.SectionID].Selected = true;
    } else {
      this.courseModal[section.RefCourseID][section.SectionID].Selected = false;
    }
    // console.log(this.courseModal);
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
            }
          });
        }
      });
    });
    console.log(request);
    let rsp = await this.studentContract.send('makeup_request.SetRequest', request);
    console.log(rsp);
    // this.getMakeupRequest();
  }
}
