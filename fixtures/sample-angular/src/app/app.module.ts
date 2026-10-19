import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";
import { HeroService } from "@services/hero.service";

@NgModule({
  declarations: [AppComponent],
  providers: [HeroService],
})
export class AppModule {}
