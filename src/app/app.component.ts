import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { Class, Student, Absence, Period, Leave } from "./help-class";
import { AppService } from "./app.service";
// import * as rx from 'rxjs/Rx';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css',]
})
export class AppComponent {
  title = 'MakeupRequest';

  constructor(private appService: AppService) {


  }

  ngOnInit() {

  }
}
