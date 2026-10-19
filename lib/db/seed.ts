import { getDb, storeAnalysisData } from "./index";
import { SAMPLE_GRAPH_DATA } from "../sample-graph-data";

export function seedDemoProjects(): void {
  const db = getDb();

  const count = db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
  if (count && count.count > 0) return;

  const now = new Date().toISOString();

  // Insert sample Fullstack Ecommerce project
  db.prepare(`
    INSERT INTO projects (id, repo_owner, repo_name, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    "proj_ecommerce_demo",
    "example-org",
    "ecommerce-fullstack",
    now,
  );

  db.prepare(`
    INSERT INTO analyses (
      id, project_id, status, stage, stage_message,
      commit_sha, framework, file_count, edge_count, route_count,
      coverage_rate, unresolved_count, created_at, updated_at
    )
    VALUES (?, ?, 'parsing', 'store', 'Storing graph data...', '49c38f9', 'Fullstack (Angular + Spring Boot)', 0, 0, 0, 100, 0, ?, ?)
  `).run(
    "ana_ecommerce_demo",
    "proj_ecommerce_demo",
    now,
    now,
  );

  const roles = new Map<string, string>();
  for (const f of SAMPLE_GRAPH_DATA.files) {
    const p = f.path.toLowerCase();
    if (p.includes("/controller/")) roles.set(f.path, "controller");
    else if (p.includes("/service/")) roles.set(f.path, "service");
    else if (p.includes("/repository/")) roles.set(f.path, "repository");
    else if (p.includes("/model/")) roles.set(f.path, "entity");
    else if (p.endsWith(".component.ts")) roles.set(f.path, "component");
    else if (p.endsWith(".guard.ts")) roles.set(f.path, "guard");
    else if (p.endsWith(".module.ts")) roles.set(f.path, "module");
  }

  const sampleRoutes = [
    { id: "demo_r_1", method: "GET", path: "/api/products", filePath: "src/main/java/com/example/ecommerce/controller/ProductController.java", line: 24 },
    { id: "demo_r_2", method: "GET", path: "/api/products/{id}", filePath: "src/main/java/com/example/ecommerce/controller/ProductController.java", line: 31 },
    { id: "demo_r_3", method: "POST", path: "/api/products", filePath: "src/main/java/com/example/ecommerce/controller/ProductController.java", line: 42 },
    { id: "demo_r_4", method: "GET", path: "/api/orders", filePath: "src/main/java/com/example/ecommerce/controller/OrderController.java", line: 20 },
    { id: "demo_r_5", method: "POST", path: "/api/orders", filePath: "src/main/java/com/example/ecommerce/controller/OrderController.java", line: 28 },
    { id: "demo_r_6", method: "DELETE", path: "/api/orders/{id}", filePath: "src/main/java/com/example/ecommerce/controller/OrderController.java", line: 45 },
    { id: "demo_r_7", method: "POST", path: "/api/auth/login", filePath: "src/main/java/com/example/ecommerce/controller/AuthController.java", line: 22 },
    { id: "demo_r_8", method: "PAGE", path: "/products", filePath: "frontend/src/app/pages/products.component.ts", line: 10 },
    { id: "demo_r_9", method: "PAGE", path: "/checkout", filePath: "frontend/src/app/pages/checkout.component.ts", line: 12 },
  ];

  // Store full sample graph data (179 files, edges, circular cycle, routes, and roles)
  storeAnalysisData(
    "ana_ecommerce_demo",
    SAMPLE_GRAPH_DATA,
    "49c38f9",
    "Fullstack (Angular + Spring Boot)",
    sampleRoutes,
    roles,
  );
}
