import { Component, inject, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SidebarComponent } from "./components/sidebar/sidebar";
import { AdminSessionState } from "./services/admin-session.interceptor";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class AppComponent {
  title = 'dashboard'
  session = inject(AdminSessionState)
}