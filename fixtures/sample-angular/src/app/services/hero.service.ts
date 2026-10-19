import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { Hero } from "@models/hero.model";

@Injectable({
  providedIn: "root",
})
export class HeroService {
  getHeroes(): Observable<Hero[]> {
    return of([{ id: 1, name: "Windstorm", role: "Mage" }]);
  }
}
