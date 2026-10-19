# Phase 8 — Framework adapters (Angular & Spring Boot)

**Goal.** The application recognises whether it is looking at an **Angular** or
**Spring Boot** codebase, assigns idiomatic architectural roles to files, and
extracts exact API routes.

## Build

- **Angular Adapter:**
  - Roles identified via decorators and conventions: Components (`*.component.ts` / `@Component`), Services (`*.service.ts` / `@Injectable`), Modules (`*.module.ts` / `@NgModule`), Directives (`@Directive`), Pipes (`@Pipe`), and Guards/Interceptors.
  - Dependency Injection (DI) edges: Resolves constructor parameter injection types (`constructor(private service: UserService)`) into explicit service dependency edges.
  - Routes: Extracted from Angular `Routes` array definitions (`path: '...', component: ...`).
- **Spring Boot Adapter:**
  - Roles identified via Spring annotations:
    - `@RestController` / `@Controller` -> Controllers
    - `@Service` -> Services
    - `@Repository` / `JpaRepository` -> Repositories
    - `@Entity` / `@Table` -> Entities / Models
    - `@Configuration` -> Configuration
  - Dependency Injection: Resolves `@Autowired` fields, `@RequiredArgsConstructor` (Lombok), and constructor parameters.
  - Routes: Extracts exact HTTP methods and paths by combining class-level `@RequestMapping` with method-level annotations (`@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`).
- **Dynamic Rail Taxonomy:** The left rail adapts to the framework:
  - For Angular: Components, Services, Modules, Guards, Routes.
  - For Spring Boot: Controllers, Services, Repositories, Entities, Endpoints.
- **Route Table:** Displays extracted routes with method, full URL pattern, and source file.

## Constraints

- **Exact or Absent.** Emit a route only when both HTTP method and full URL
  path can be recovered with 100% syntactic precision. Never approximate.
- **Framework Knowledge Lives in Adapters.** No Angular or Spring keywords in
  the core parser.
- **Fallback Support.** Repositories matching neither adapter render with
  generic roles and an empty route table.

## Acceptance check

1. Parse an Angular project: The left rail shows Components, Services, Modules,
   and Guards with correct counts.
2. Confirm Angular DI edges: Services injected in component constructors appear
   as connected edges in the dependency map.
3. Parse a Spring Boot project: The left rail shows Controllers, Services,
   Repositories, Entities, and the route table lists all `@GetMapping` / `@PostMapping` endpoints.
4. Open three routes from the Spring Boot route table: The HTTP method, full path,
   and controller line match the code exactly.
5. Parse an unsupported project: Generic roles apply, no crashes, empty route table.
