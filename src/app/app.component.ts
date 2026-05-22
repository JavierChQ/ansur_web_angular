import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {

  ngOnInit() {
    //----------- chatbot's code --------------//
   //----------- chatbot's code --------------//
   (function (d, m) {
    var kommunicateSettings = {
      appId: "a4cb42af391b482acad17c36fcbc7ce6", // Asegúrate de que esta sea la appId correcta
      popupWidget: true,
      automaticChatOpenOnNavigation: true,
    };
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.src = "https://widget.kommunicate.io/v2/kommunicate.app";
    var h = document.getElementsByTagName("head")[0];
    h.appendChild(s);
    (window as any).kommunicate = m;  // Cambiado a (window as any)
    m._globals = kommunicateSettings;
  })(document, (window as any).kommunicate || {});
  //----------- chatbot's code end --------------//
}
}
