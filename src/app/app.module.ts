import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';

import { GadgetService } from "./gadget.service";
import { AppComponent, SafeHtmlPipe } from './app.component';

@NgModule({
  declarations: [
    AppComponent, SafeHtmlPipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
  ],
  providers: [GadgetService],
  bootstrap: [AppComponent]
})
export class AppModule { }
