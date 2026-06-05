import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Shell de la aplicación — solo monta el router-outlet
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
