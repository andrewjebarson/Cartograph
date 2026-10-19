import type { ParseResult } from "./parser/types.ts";

/**
 * Realistic Spring Boot & Angular full-stack repository parse result
 * (~180 files, nested packages, real edges and dependencies)
 * Scaffolding for Phase 4 canvas development.
 */
function generateSampleRepo(): ParseResult {
  const files: ParseResult["files"] = [];
  const edges: ParseResult["edges"] = [];
  const externalImports: ParseResult["externalImports"] = [];

  // Helper to create file
  function addFile(
    relPath: string,
    ext: string,
    lines: number,
    bytes: number,
    pkg?: string,
  ) {
    files.push({
      path: relPath,
      extension: ext,
      lineCount: lines,
      byteSize: bytes,
      contentHash: "hash_" + relPath.replace(/[^a-zA-Z0-9]/g, "_"),
      fanIn: 0,
      fanOut: 0,
      packageOrNamespace: pkg,
    });
  }

  // 1. Backend: Spring Boot packages (com.example.ecommerce)
  // Models (18 files)
  const models = [
    "User", "Role", "Permission", "Product", "Category", "Inventory",
    "Order", "OrderItem", "OrderStatus", "Payment", "PaymentMethod", "Invoice",
    "Cart", "CartItem", "ShippingAddress", "Review", "Coupon", "AuditLog"
  ];
  for (const m of models) {
    addFile(`src/main/java/com/example/ecommerce/model/${m}.java`, ".java", 45, 1200, "com.example.ecommerce.model");
  }

  // Repositories (16 files)
  const repos = [
    "UserRepository", "RoleRepository", "ProductRepository", "CategoryRepository",
    "InventoryRepository", "OrderRepository", "OrderItemRepository", "PaymentRepository",
    "InvoiceRepository", "CartRepository", "CartItemRepository", "ShippingAddressRepository",
    "ReviewRepository", "CouponRepository", "AuditLogRepository", "PermissionRepository"
  ];
  for (const r of repos) {
    addFile(`src/main/java/com/example/ecommerce/repository/${r}.java`, ".java", 30, 850, "com.example.ecommerce.repository");
  }

  // DTOs (16 files)
  const dtos = [
    "UserDto", "CreateUserRequest", "ProductDto", "ProductSearchCriteria",
    "OrderDto", "CreateOrderRequest", "OrderItemDto", "PaymentDto",
    "PaymentRequest", "InvoiceDto", "CartDto", "AddToCartRequest",
    "ReviewDto", "CouponDto", "AddressDto", "AuthResponse"
  ];
  for (const d of dtos) {
    addFile(`src/main/java/com/example/ecommerce/dto/${d}.java`, ".java", 35, 950, "com.example.ecommerce.dto");
  }

  // Services (14 files)
  const services = [
    "UserService", "AuthService", "ProductService", "CategoryService",
    "InventoryService", "OrderService", "PaymentService", "InvoiceService",
    "CartService", "ShippingService", "ReviewService", "CouponService",
    "NotificationService", "AuditService"
  ];
  for (const s of services) {
    addFile(`src/main/java/com/example/ecommerce/service/${s}.java`, ".java", 110, 3200, "com.example.ecommerce.service");
  }

  // Controllers (12 files)
  const controllers = [
    "AuthController", "UserController", "ProductController", "CategoryController",
    "OrderController", "PaymentController", "CartController", "ReviewController",
    "CouponController", "ShippingController", "AdminController", "HealthController"
  ];
  for (const c of controllers) {
    addFile(`src/main/java/com/example/ecommerce/controller/${c}.java`, ".java", 85, 2400, "com.example.ecommerce.controller");
  }

  // Security (8 files)
  const security = [
    "SecurityConfig", "JwtTokenProvider", "JwtAuthFilter", "UserPrincipal",
    "CustomUserDetailsService", "SecurityUtils", "AccessDeniedHandlerImpl", "JwtAuthEntryPoint"
  ];
  for (const sec of security) {
    addFile(`src/main/java/com/example/ecommerce/security/${sec}.java`, ".java", 70, 2100, "com.example.ecommerce.security");
  }

  // Config (6 files)
  const config = [
    "DatabaseConfig", "WebMvcConfig", "SwaggerConfig", "RedisConfig",
    "AsyncConfig", "AuditingConfig"
  ];
  for (const cfg of config) {
    addFile(`src/main/java/com/example/ecommerce/config/${cfg}.java`, ".java", 40, 1100, "com.example.ecommerce.config");
  }

  // Exceptions (6 files)
  const exceptions = [
    "ResourceNotFoundException", "BadRequestException", "UnauthorizedException",
    "PaymentProcessingException", "GlobalExceptionHandler", "ErrorDetails"
  ];
  for (const ex of exceptions) {
    addFile(`src/main/java/com/example/ecommerce/exception/${ex}.java`, ".java", 35, 900, "com.example.ecommerce.exception");
  }

  // 2. Frontend: Angular client (frontend/src/app)
  // Client Models (10 files)
  const clientModels = [
    "user.model", "auth.model", "product.model", "order.model",
    "cart.model", "payment.model", "review.model", "coupon.model",
    "address.model", "api-response.model"
  ];
  for (const cm of clientModels) {
    addFile(`frontend/src/app/core/models/${cm}.ts`, ".ts", 30, 800);
  }

  // Client Services (12 files)
  const clientServices = [
    "auth.service", "user.service", "product.service", "order.service",
    "cart.service", "payment.service", "review.service", "coupon.service",
    "notification.service", "storage.service", "api.service", "theme.service"
  ];
  for (const cs of clientServices) {
    addFile(`frontend/src/app/core/services/${cs}.ts`, ".ts", 75, 2100);
  }

  // Client Guards & Interceptors (6 files)
  const guards = [
    "auth.guard", "admin.guard", "jwt.interceptor",
    "error.interceptor", "logging.interceptor", "caching.interceptor"
  ];
  for (const g of guards) {
    addFile(`frontend/src/app/core/guards/${g}.ts`, ".ts", 40, 1100);
  }

  // Feature: Auth (6 files)
  const authComp = ["login", "register", "forgot-password"];
  for (const ac of authComp) {
    addFile(`frontend/src/app/features/auth/${ac}/${ac}.component.ts`, ".ts", 60, 1600);
    addFile(`frontend/src/app/features/auth/${ac}/${ac}.component.css`, ".css", 25, 600);
  }

  // Feature: Products (8 files)
  const prodComp = ["product-list", "product-detail", "product-card", "product-filter"];
  for (const pc of prodComp) {
    addFile(`frontend/src/app/features/products/${pc}/${pc}.component.ts`, ".ts", 75, 2000);
    addFile(`frontend/src/app/features/products/${pc}/${pc}.component.css`, ".css", 30, 750);
  }

  // Feature: Cart & Checkout (8 files)
  const cartComp = ["cart-view", "cart-item", "checkout", "order-summary"];
  for (const cc of cartComp) {
    addFile(`frontend/src/app/features/checkout/${cc}/${cc}.component.ts`, ".ts", 80, 2200);
    addFile(`frontend/src/app/features/checkout/${cc}/${cc}.component.css`, ".css", 35, 800);
  }

  // Shared Components (10 files)
  const shared = ["navbar", "footer", "sidebar", "button", "modal"];
  for (const sh of shared) {
    addFile(`frontend/src/app/shared/components/${sh}/${sh}.component.ts`, ".ts", 50, 1300);
    addFile(`frontend/src/app/shared/components/${sh}/${sh}.component.css`, ".css", 20, 500);
  }

  // Root app (4 files)
  addFile("frontend/src/app/app.component.ts", ".ts", 40, 1100);
  addFile("frontend/src/app/app.component.css", ".css", 20, 450);
  addFile("frontend/src/app/app.routes.ts", ".ts", 55, 1400);
  addFile("frontend/src/main.ts", ".ts", 25, 600);

  // Root application Java (1 file)
  addFile("src/main/java/com/example/ecommerce/EcommerceApplication.java", ".java", 20, 500, "com.example.ecommerce");

  // Helper for adding edge
  function addEdge(source: string, target: string, specifier: string, type: "static" | "reexport" = "static") {
    edges.push({ source, target, specifier, type });
  }

  // Connect Repositories -> Models
  for (let i = 0; i < repos.length; i++) {
    const rPath = `src/main/java/com/example/ecommerce/repository/${repos[i]}.java`;
    const mPath = `src/main/java/com/example/ecommerce/model/${models[i % models.length]}.java`;
    addEdge(rPath, mPath, models[i % models.length]);
  }

  // Connect Services -> Repositories, Models, DTOs
  for (let i = 0; i < services.length; i++) {
    const sPath = `src/main/java/com/example/ecommerce/service/${services[i]}.java`;
    const rPath = `src/main/java/com/example/ecommerce/repository/${repos[i % repos.length]}.java`;
    const mPath = `src/main/java/com/example/ecommerce/model/${models[i % models.length]}.java`;
    const dPath = `src/main/java/com/example/ecommerce/dto/${dtos[i % dtos.length]}.java`;

    addEdge(sPath, rPath, repos[i % repos.length]);
    addEdge(sPath, mPath, models[i % models.length]);
    addEdge(sPath, dPath, dtos[i % dtos.length]);

    // Cross-service dependencies
    if (i > 0) {
      const prevService = `src/main/java/com/example/ecommerce/service/${services[i - 1]}.java`;
      addEdge(sPath, prevService, services[i - 1]);
    }
  }

  // Connect Controllers -> Services, DTOs
  for (let i = 0; i < controllers.length; i++) {
    const cPath = `src/main/java/com/example/ecommerce/controller/${controllers[i]}.java`;
    const sPath = `src/main/java/com/example/ecommerce/service/${services[i % services.length]}.java`;
    const dPath = `src/main/java/com/example/ecommerce/dto/${dtos[i % dtos.length]}.java`;

    addEdge(cPath, sPath, services[i % services.length]);
    addEdge(cPath, dPath, dtos[i % dtos.length]);
  }

  // Connect Security -> Services, Models
  addEdge(
    "src/main/java/com/example/ecommerce/security/CustomUserDetailsService.java",
    "src/main/java/com/example/ecommerce/repository/UserRepository.java",
    "UserRepository"
  );
  addEdge(
    "src/main/java/com/example/ecommerce/security/CustomUserDetailsService.java",
    "src/main/java/com/example/ecommerce/model/User.java",
    "User"
  );
  addEdge(
    "src/main/java/com/example/ecommerce/security/JwtAuthFilter.java",
    "src/main/java/com/example/ecommerce/security/JwtTokenProvider.java",
    "JwtTokenProvider"
  );
  addEdge(
    "src/main/java/com/example/ecommerce/security/SecurityConfig.java",
    "src/main/java/com/example/ecommerce/security/JwtAuthFilter.java",
    "JwtAuthFilter"
  );

  // Connect Frontend Services -> Client Models
  for (let i = 0; i < clientServices.length; i++) {
    const csPath = `frontend/src/app/core/services/${clientServices[i]}.ts`;
    const cmPath = `frontend/src/app/core/models/${clientModels[i % clientModels.length]}.ts`;
    addEdge(csPath, cmPath, clientModels[i % clientModels.length]);
  }

  // Connect Frontend Components -> Services, Models, Styles
  for (const ac of authComp) {
    const comp = `frontend/src/app/features/auth/${ac}/${ac}.component.ts`;
    addEdge(comp, `frontend/src/app/features/auth/${ac}/${ac}.component.css`, `./${ac}.component.css`);
    addEdge(comp, "frontend/src/app/core/services/auth.service.ts", "auth.service");
    addEdge(comp, "frontend/src/app/core/models/auth.model.ts", "auth.model");
  }

  for (const pc of prodComp) {
    const comp = `frontend/src/app/features/products/${pc}/${pc}.component.ts`;
    addEdge(comp, `frontend/src/app/features/products/${pc}/${pc}.component.css`, `./${pc}.component.css`);
    addEdge(comp, "frontend/src/app/core/services/product.service.ts", "product.service");
    addEdge(comp, "frontend/src/app/core/models/product.model.ts", "product.model");
  }

  for (const cc of cartComp) {
    const comp = `frontend/src/app/features/checkout/${cc}/${cc}.component.ts`;
    addEdge(comp, `frontend/src/app/features/checkout/${cc}/${cc}.component.css`, `./${cc}.component.css`);
    addEdge(comp, "frontend/src/app/core/services/cart.service.ts", "cart.service");
    addEdge(comp, "frontend/src/app/core/models/cart.model.ts", "cart.model");
  }

  // App routes
  addEdge("frontend/src/app/app.routes.ts", "frontend/src/app/features/products/product-list/product-list.component.ts", "product-list");
  addEdge("frontend/src/app/app.routes.ts", "frontend/src/app/features/auth/login/login.component.ts", "login");
  addEdge("frontend/src/app/app.routes.ts", "frontend/src/app/features/checkout/cart-view/cart-view.component.ts", "cart-view");
  addEdge("frontend/src/app/app.component.ts", "frontend/src/app/shared/components/navbar/navbar.component.ts", "navbar");
  addEdge("frontend/src/app/app.component.ts", "frontend/src/app/shared/components/footer/footer.component.ts", "footer");
  addEdge("frontend/src/app/app.component.ts", "frontend/src/app/app.component.css", "./app.component.css");

  // Compute fanIn and fanOut
  const fanInMap = new Map<string, number>();
  const fanOutMap = new Map<string, number>();

  for (const e of edges) {
    fanOutMap.set(e.source, (fanOutMap.get(e.source) || 0) + 1);
    fanInMap.set(e.target, (fanInMap.get(e.target) || 0) + 1);
  }

  for (const f of files) {
    f.fanIn = fanInMap.get(f.path) || 0;
    f.fanOut = fanOutMap.get(f.path) || 0;
  }

  const totalLines = files.reduce((s, f) => s + f.lineCount, 0);
  const totalBytes = files.reduce((s, f) => s + f.byteSize, 0);

  return {
    rootPath: "repo/ecommerce-fullstack",
    files,
    edges,
    externalImports,
    unresolvedImports: [],
    skippedFiles: [],
    coverage: {
      totalFiles: files.length,
      totalLines,
      totalBytes,
      totalImports: edges.length,
      internalEdges: edges.length,
      externalImports: 0,
      unresolvedImports: 0,
      resolutionRate: 100,
    },
  };
}

export const SAMPLE_GRAPH_DATA: ParseResult = generateSampleRepo();
