import { Component, OnInit } from "@angular/core";
import { HeroService } from "@services/hero.service";
import { Hero } from "@models/hero.model";
import "./app.component.css";

@Component({
  selector: "app-root",
  template: `<h1>Tour of Heroes</h1>`,
})
export class AppComponent implements OnInit {
  heroes: Hero[] = [];

  constructor(private heroService: HeroService) {}

  ngOnInit(): void {
    this.heroService.getHeroes().subscribe((data) => (this.heroes = data));
  }
}
