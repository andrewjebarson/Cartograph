/**
 * Held-Out Ground Truth Role Dataset (Phase 11)
 *
 * Convention assigns roles it can be certain of via AST decorators, naming, or routing.
 * In normal operation, these files never reach the model for role classification,
 * making them a valid held-out set with real ground truth.
 *
 * Constraint: Holds only files whose conventional role is one the classifier is
 * actually allowed to return (component, service, controller, repository, entity, module, guard, route).
 * Total items: >= 30 files.
 */

export const ALLOWED_ROLES = [
  "controller",
  "service",
  "component",
  "repository",
  "entity",
  "module",
  "guard",
  "route",
] as const;

export type AllowedRole = typeof ALLOWED_ROLES[number];

export interface RoleDatasetItem {
  id: string;
  path: string;
  framework: "Angular" | "Spring Boot" | "Express" | "TypeScript";
  groundTruthRole: AllowedRole;
  snippet: string;
}

export const ROLE_DATASET: RoleDatasetItem[] = [
  // ---------------------------------------------------------------------------
  // CONTROLLERS (6 items)
  // ---------------------------------------------------------------------------
  {
    id: "ctrl-1",
    path: "src/main/java/com/example/demo/controller/UserController.java",
    framework: "Spring Boot",
    groundTruthRole: "controller",
    snippet: `@RestController\n@RequestMapping("/api/users")\npublic class UserController {\n  @Autowired private UserService userService;\n  @GetMapping public List<User> getAll() { return userService.findAll(); }\n}`,
  },
  {
    id: "ctrl-2",
    path: "src/main/java/com/example/demo/controller/OrderController.java",
    framework: "Spring Boot",
    groundTruthRole: "controller",
    snippet: `@RestController\n@RequestMapping("/api/orders")\npublic class OrderController {\n  @Autowired private OrderService orderService;\n  @PostMapping public Order create(@RequestBody OrderReq req) { return orderService.placeOrder(req); }\n}`,
  },
  {
    id: "ctrl-3",
    path: "src/main/java/com/example/demo/controller/ProductController.java",
    framework: "Spring Boot",
    groundTruthRole: "controller",
    snippet: `@Controller\n@RequestMapping("/products")\npublic class ProductController {\n  @GetMapping("/{id}") public String viewProduct(@PathVariable String id, Model model) { return "product"; }\n}`,
  },
  {
    id: "ctrl-4",
    path: "routes/user.controller.js",
    framework: "Express",
    groundTruthRole: "controller",
    snippet: `const express = require('express');\nconst router = express.Router();\nrouter.get('/profile', (req, res) => res.json({ user: req.user }));\nmodule.exports = router;`,
  },
  {
    id: "ctrl-5",
    path: "controllers/auth.controller.ts",
    framework: "Express",
    groundTruthRole: "controller",
    snippet: `export async function loginHandler(req: Request, res: Response) {\n  const token = await authService.login(req.body);\n  return res.status(200).json({ token });\n}`,
  },
  {
    id: "ctrl-6",
    path: "src/main/java/com/example/demo/controller/AuthController.java",
    framework: "Spring Boot",
    groundTruthRole: "controller",
    snippet: `@RestController\n@RequestMapping("/auth")\npublic class AuthController {\n  @PostMapping("/login") public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) { return ResponseEntity.ok().build(); }\n}`,
  },

  // ---------------------------------------------------------------------------
  // SERVICES (6 items)
  // ---------------------------------------------------------------------------
  {
    id: "srv-1",
    path: "src/app/services/hero.service.ts",
    framework: "Angular",
    groundTruthRole: "service",
    snippet: `@Injectable({ providedIn: 'root' })\nexport class HeroService {\n  constructor(private http: HttpClient) {}\n  getHeroes(): Observable<Hero[]> { return this.http.get<Hero[]>('/api/heroes'); }\n}`,
  },
  {
    id: "srv-2",
    path: "src/main/java/com/example/demo/service/UserService.java",
    framework: "Spring Boot",
    groundTruthRole: "service",
    snippet: `@Service\npublic class UserService {\n  @Autowired private UserRepository userRepo;\n  public List<User> findAll() { return userRepo.findAll(); }\n}`,
  },
  {
    id: "srv-3",
    path: "src/main/java/com/example/demo/service/OrderService.java",
    framework: "Spring Boot",
    groundTruthRole: "service",
    snippet: `@Service\npublic class OrderService {\n  @Transactional public Order placeOrder(OrderReq req) { return orderRepo.save(new Order(req)); }\n}`,
  },
  {
    id: "srv-4",
    path: "src/app/services/auth.service.ts",
    framework: "Angular",
    groundTruthRole: "service",
    snippet: `@Injectable({ providedIn: 'root' })\nexport class AuthService {\n  private currentUserSubject = new BehaviorSubject<User | null>(null);\n  login(credentials: any) { return this.http.post('/auth', credentials); }\n}`,
  },
  {
    id: "srv-5",
    path: "src/main/java/com/example/demo/service/PaymentService.java",
    framework: "Spring Boot",
    groundTruthRole: "service",
    snippet: `@Service\npublic class PaymentService {\n  public PaymentResult processPayment(PaymentIntent intent) { return gateway.charge(intent); }\n}`,
  },
  {
    id: "srv-6",
    path: "services/notification.service.ts",
    framework: "TypeScript",
    groundTruthRole: "service",
    snippet: `export class NotificationService {\n  async sendEmail(to: string, msg: string): Promise<boolean> { return emailClient.send({ to, msg }); }\n}`,
  },

  // ---------------------------------------------------------------------------
  // COMPONENTS (6 items)
  // ---------------------------------------------------------------------------
  {
    id: "cmp-1",
    path: "src/app/app.component.ts",
    framework: "Angular",
    groundTruthRole: "component",
    snippet: `@Component({\n  selector: 'app-root',\n  template: '<h1>{{title}}</h1><router-outlet></router-outlet>',\n  styleUrls: ['./app.component.css']\n})\nexport class AppComponent { title = 'Tour of Heroes'; }`,
  },
  {
    id: "cmp-2",
    path: "src/app/hero-detail.component.ts",
    framework: "Angular",
    groundTruthRole: "component",
    snippet: `@Component({\n  selector: 'app-hero-detail',\n  template: '<div *ngIf="hero"><h2>{{hero.name}}</h2></div>'\n})\nexport class HeroDetailComponent {\n  @Input() hero?: Hero;\n}`,
  },
  {
    id: "cmp-3",
    path: "src/app/heroes.component.ts",
    framework: "Angular",
    groundTruthRole: "component",
    snippet: `@Component({\n  selector: 'app-heroes',\n  template: '<ul class="heroes"><li *ngFor="let h of heroes">{{h.name}}</li></ul>'\n})\nexport class HeroesComponent implements OnInit { heroes: Hero[] = []; }`,
  },
  {
    id: "cmp-4",
    path: "src/app/navbar.component.ts",
    framework: "Angular",
    groundTruthRole: "component",
    snippet: `@Component({\n  selector: 'app-navbar',\n  template: '<nav><a routerLink="/heroes">Heroes</a></nav>'\n})\nexport class NavbarComponent {}`,
  },
  {
    id: "cmp-5",
    path: "src/app/dashboard.component.ts",
    framework: "Angular",
    groundTruthRole: "component",
    snippet: `@Component({\n  selector: 'app-dashboard',\n  template: '<div class="grid"><a *ngFor="let h of topHeroes">{{h.name}}</a></div>'\n})\nexport class DashboardComponent { topHeroes: Hero[] = []; }`,
  },
  {
    id: "cmp-6",
    path: "src/app/footer.component.ts",
    framework: "Angular",
    groundTruthRole: "component",
    snippet: `@Component({\n  selector: 'app-footer',\n  template: '<footer>&copy; 2026 Cartograph</footer>'\n})\nexport class FooterComponent {}`,
  },

  // ---------------------------------------------------------------------------
  // REPOSITORIES (4 items)
  // ---------------------------------------------------------------------------
  {
    id: "repo-1",
    path: "src/main/java/com/example/demo/repository/UserRepository.java",
    framework: "Spring Boot",
    groundTruthRole: "repository",
    snippet: `@Repository\npublic interface UserRepository extends JpaRepository<User, Long> {\n  Optional<User> findByEmail(String email);\n}`,
  },
  {
    id: "repo-2",
    path: "src/main/java/com/example/demo/repository/OrderRepository.java",
    framework: "Spring Boot",
    groundTruthRole: "repository",
    snippet: `@Repository\npublic interface OrderRepository extends CrudRepository<Order, String> {\n  List<Order> findByUserId(Long userId);\n}`,
  },
  {
    id: "repo-3",
    path: "src/main/java/com/example/demo/repository/ProductRepository.java",
    framework: "Spring Boot",
    groundTruthRole: "repository",
    snippet: `@Repository\npublic interface ProductRepository extends JpaRepository<Product, Long> {\n  List<Product> findByCategory(String category);\n}`,
  },
  {
    id: "repo-4",
    path: "src/main/java/com/example/demo/repository/CustomerRepository.java",
    framework: "Spring Boot",
    groundTruthRole: "repository",
    snippet: `public interface CustomerRepository extends JpaRepository<Customer, UUID> {\n  @Query("SELECT c FROM Customer c WHERE c.active = true")\n  List<Customer> findActiveCustomers();\n}`,
  },

  // ---------------------------------------------------------------------------
  // ENTITIES (4 items)
  // ---------------------------------------------------------------------------
  {
    id: "ent-1",
    path: "src/main/java/com/example/demo/model/User.java",
    framework: "Spring Boot",
    groundTruthRole: "entity",
    snippet: `@Entity\n@Table(name = "users")\npublic class User {\n  @Id @GeneratedValue private Long id;\n  private String name;\n  private String email;\n}`,
  },
  {
    id: "ent-2",
    path: "src/main/java/com/example/demo/model/Order.java",
    framework: "Spring Boot",
    groundTruthRole: "entity",
    snippet: `@Entity\n@Table(name = "orders")\npublic class Order {\n  @Id private String orderId;\n  private Double totalAmount;\n  @ManyToOne private User user;\n}`,
  },
  {
    id: "ent-3",
    path: "src/main/java/com/example/demo/model/Product.java",
    framework: "Spring Boot",
    groundTruthRole: "entity",
    snippet: `@Entity\npublic class Product {\n  @Id private Long id;\n  private String sku;\n  private BigDecimal price;\n}`,
  },
  {
    id: "ent-4",
    path: "models/user.model.js",
    framework: "Express",
    groundTruthRole: "entity",
    snippet: `const mongoose = require('mongoose');\nconst UserSchema = new mongoose.Schema({ username: String, email: String });\nmodule.exports = mongoose.model('User', UserSchema);`,
  },

  // ---------------------------------------------------------------------------
  // MODULES (3 items)
  // ---------------------------------------------------------------------------
  {
    id: "mod-1",
    path: "src/app/app.module.ts",
    framework: "Angular",
    groundTruthRole: "module",
    snippet: `@NgModule({\n  declarations: [AppComponent],\n  imports: [BrowserModule, AppRoutingModule, HttpClientModule],\n  bootstrap: [AppComponent]\n})\nexport class AppModule {}`,
  },
  {
    id: "mod-2",
    path: "src/app/heroes/heroes.module.ts",
    framework: "Angular",
    groundTruthRole: "module",
    snippet: `@NgModule({\n  declarations: [HeroesComponent, HeroDetailComponent],\n  imports: [CommonModule, FormsModule, HeroesRoutingModule]\n})\nexport class HeroesModule {}`,
  },
  {
    id: "mod-3",
    path: "src/app/shared/shared.module.ts",
    framework: "Angular",
    groundTruthRole: "module",
    snippet: `@NgModule({\n  declarations: [NavbarComponent, FooterComponent],\n  exports: [NavbarComponent, FooterComponent, CommonModule]\n})\nexport class SharedModule {}`,
  },

  // ---------------------------------------------------------------------------
  // GUARDS (3 items)
  // ---------------------------------------------------------------------------
  {
    id: "grd-1",
    path: "src/app/auth.guard.ts",
    framework: "Angular",
    groundTruthRole: "guard",
    snippet: `@Injectable({ providedIn: 'root' })\nexport class AuthGuard implements CanActivate {\n  canActivate(): boolean { return this.authService.isAuthenticated(); }\n}`,
  },
  {
    id: "grd-2",
    path: "src/app/admin.guard.ts",
    framework: "Angular",
    groundTruthRole: "guard",
    snippet: `@Injectable({ providedIn: 'root' })\nexport class AdminGuard implements CanActivate {\n  canActivate(): boolean { return this.currentUser.role === 'admin'; }\n}`,
  },
  {
    id: "grd-3",
    path: "middleware/auth.guard.ts",
    framework: "Express",
    groundTruthRole: "guard",
    snippet: `export function requireAuth(req: Request, res: Response, next: NextFunction) {\n  if (!req.headers.authorization) return res.status(401).send("Unauthorized");\n  return next();\n}`,
  },

  // ---------------------------------------------------------------------------
  // ROUTES (3 items)
  // ---------------------------------------------------------------------------
  {
    id: "rt-1",
    path: "src/app/app-routing.module.ts",
    framework: "Angular",
    groundTruthRole: "route",
    snippet: `const routes: Routes = [\n  { path: 'heroes', component: HeroesComponent },\n  { path: 'heroes/:id', component: HeroDetailComponent }\n];\n@NgModule({ imports: [RouterModule.forRoot(routes)] })\nexport class AppRoutingModule {}`,
  },
  {
    id: "rt-2",
    path: "routes/api.routes.ts",
    framework: "Express",
    groundTruthRole: "route",
    snippet: `const router = Router();\nrouter.use('/users', userRoutes);\nrouter.use('/orders', orderRoutes);\nexport default router;`,
  },
  {
    id: "rt-3",
    path: "src/app/heroes/heroes-routing.module.ts",
    framework: "Angular",
    groundTruthRole: "route",
    snippet: `const routes: Routes = [{ path: '', component: HeroesComponent }];\n@NgModule({ imports: [RouterModule.forChild(routes)] })\nexport class HeroesRoutingModule {}`,
  },
];
