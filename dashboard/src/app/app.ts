import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SidebarComponent } from "./components/sidebar/sidebar";
import { LoginComponent } from "./pages/login/login";
import { AuthService } from "./services/auth.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, LoginComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class AppComponent {
  title = 'dashboard'
  auth = inject(AuthService)
}
