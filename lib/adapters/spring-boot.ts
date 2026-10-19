import type { ResolvedEdge } from "../parser/types.ts";
import type { FrameworkAdapter, ExtractedRoute, TaxonomyItem } from "./types.ts";

function combinePaths(base: string, sub: string): string {
  let b = base.trim();
  let s = sub.trim();

  // Strip wrapping quotes
  if ((b.startsWith('"') && b.endsWith('"')) || (b.startsWith("'") && b.endsWith("'"))) {
    b = b.slice(1, -1);
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }

  b = b.trim();
  s = s.trim();

  if (b && !b.startsWith("/")) b = "/" + b;
  if (b.endsWith("/")) b = b.slice(0, -1);

  if (s && !s.startsWith("/")) s = "/" + s;
  if (s === "/") s = "";

  const combined = (b + s).replace(/\/+/g, "/");
  return combined === "" ? "/" : combined;
}

export const springBootAdapter: FrameworkAdapter = {
  name: "Spring Boot",

  detect(files) {
    const hasBuildFile = files.some((f) => {
      const p = f.path.toLowerCase();
      return p.endsWith("pom.xml") || p.endsWith("build.gradle") || p.endsWith("build.gradle.kts");
    });

    return files.some((f) => {
      if (!f.path.endsWith(".java")) return false;
      const content = f.content || "";
      if (
        content.includes("org.springframework") ||
        content.includes("@SpringBootApplication") ||
        content.includes("@RestController") ||
        content.includes("@Controller") ||
        content.includes("@Service")
      ) {
        return true;
      }
      return hasBuildFile;
    });
  },

  analyze(files, existingEdges) {
    const fileRoles = new Map<string, string>();
    const diEdges: ResolvedEdge[] = [];
    const routes: ExtractedRoute[] = [];

    // Map declared class names to file path: e.g. "UserService" -> "src/main/java/.../UserService.java"
    const classToFile = new Map<string, string>();

    // 1. Identify roles and index declared class names
    for (const f of files) {
      if (!f.path.endsWith(".java")) continue;
      const content = f.content || "";

      let role = "generic";

      if (/@(?:RestController|Controller)\b/.test(content)) {
        role = "controller";
      } else if (/@Service\b/.test(content)) {
        role = "service";
      } else if (/@Repository\b/.test(content) || /\b(?:JpaRepository|CrudRepository|PagingAndSortingRepository)\b/.test(content)) {
        role = "repository";
      } else if (/@(?:Entity|Table|Document)\b/.test(content)) {
        role = "entity";
      } else if (/@Configuration\b/.test(content)) {
        role = "configuration";
      }

      fileRoles.set(f.path, role);

      // Extract declared classes/interfaces
      const declMatches = content.matchAll(/\b(?:class|interface|enum|record)\s+([A-Za-z0-9_]+)\b/g);
      for (const m of declMatches) {
        classToFile.set(m[1], f.path);
      }
    }

    const edgeKeySet = new Set(existingEdges.map((e) => `${e.source}->${e.target}`));

    // 2. Extract Dependency Injection edges & Routes
    for (const f of files) {
      if (!f.path.endsWith(".java")) continue;
      const content = f.content || "";
      const lines = content.split("\n");

      // Extract class name
      const classMatch = content.match(/\b(?:class|record)\s+([A-Za-z0-9_]+)\b/);
      const currentClassName = classMatch ? classMatch[1] : null;

      // Extract class-level @RequestMapping path
      let classBasePath = "";
      const classReqMatch = content.match(/@RequestMapping\s*\(\s*(?:(?:value|path)\s*=\s*)?["']([^"']*)["']/);
      if (classReqMatch) {
        classBasePath = classReqMatch[1];
      }

      // Find where class/record declaration starts
      let classStartLine = 0;
      for (let i = 0; i < lines.length; i++) {
        if (/\b(?:class|record)\s+[A-Za-z0-9_]+/.test(lines[i])) {
          classStartLine = i + 1;
          break;
        }
      }

      // Check for Lombok @RequiredArgsConstructor
      const hasRequiredArgsConstructor = /@RequiredArgsConstructor\b/.test(content);

      // Analyze lines for routes, constructors, and @Autowired
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNum = i + 1;

        // --- Route annotations (only inside class body on methods) ---
        // @GetMapping, @PostMapping, @PutMapping, @DeleteMapping, @PatchMapping, @RequestMapping
        if (classStartLine > 0 && lineNum > classStartLine) {
          const routeMatch = line.match(
            /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\s*(?:\(\s*(?:(?:value|path)\s*=\s*)?["']?([^"')]*)["']?[^)]*\))?/,
          );

          if (routeMatch) {
            const annotation = routeMatch[1];
            let subPath = routeMatch[2] ? routeMatch[2].trim() : "";

          // Clean subPath if it had syntax like `value = "/foo"` or `path = "/foo"`
          const valMatch = subPath.match(/(?:value|path)\s*=\s*["']([^"']+)["']/);
          if (valMatch) {
            subPath = valMatch[1];
          }

          let method = "GET";
          if (annotation === "GetMapping") method = "GET";
          else if (annotation === "PostMapping") method = "POST";
          else if (annotation === "PutMapping") method = "PUT";
          else if (annotation === "DeleteMapping") method = "DELETE";
          else if (annotation === "PatchMapping") method = "PATCH";
          else if (annotation === "RequestMapping") {
            const m = line.match(/method\s*=\s*(?:RequestMethod\.)?([A-Z]+)/);
            method = m ? m[1] : "GET";
          }

          const fullPath = combinePaths(classBasePath, subPath);

          routes.push({
            id: `route_${f.path}_${lineNum}_${routes.length}`,
            method,
            path: fullPath,
            filePath: f.path,
            line: lineNum,
          });
        }
      }

        // --- Dependency Injection: @Autowired field ---
        if (line.includes("@Autowired")) {
          // Check following line or same line for field declaration
          const fieldLine = line.replace("@Autowired", "").trim() || (lines[i + 1] ? lines[i + 1].trim() : "");
          const fieldMatch = fieldLine.match(/(?:private|protected|public)?\s*(?:final\s+)?([A-Za-z0-9_]+)(?:<[^>]+>)?\s+([A-Za-z0-9_]+)\s*;/);
          if (fieldMatch) {
            const typeName = fieldMatch[1];
            const target = classToFile.get(typeName);
            if (target && target !== f.path) {
              const key = `${f.path}->${target}`;
              if (!edgeKeySet.has(key)) {
                edgeKeySet.add(key);
                diEdges.push({
                  source: f.path,
                  target,
                  specifier: typeName,
                  type: "static",
                });
              }
            }
          }
        }

        // --- Dependency Injection: Lombok @RequiredArgsConstructor ---
        if (hasRequiredArgsConstructor) {
          const finalFieldMatch = line.match(/(?:private|protected|public)\s+final\s+([A-Za-z0-9_]+)(?:<[^>]+>)?\s+([A-Za-z0-9_]+)\s*;/);
          if (finalFieldMatch) {
            const typeName = finalFieldMatch[1];
            const target = classToFile.get(typeName);
            if (target && target !== f.path) {
              const key = `${f.path}->${target}`;
              if (!edgeKeySet.has(key)) {
                edgeKeySet.add(key);
                diEdges.push({
                  source: f.path,
                  target,
                  specifier: typeName,
                  type: "static",
                });
              }
            }
          }
        }

        // --- Dependency Injection: Constructor injection ---
        if (currentClassName && line.includes(currentClassName) && line.includes("(") && !line.includes("new ")) {
          const ctorMatch = line.match(new RegExp(`(?:public|protected|private)?\\s*${currentClassName}\\s*\\(([^)]*)\\)`));
          if (ctorMatch) {
            const paramsStr = ctorMatch[1];
            const params = paramsStr.split(",");
            for (const param of params) {
              const trimmed = param.trim();
              const pParts = trimmed.split(/\s+/);
              if (pParts.length >= 2) {
                // e.g. "@Qualifier("...") UserService userService" or "UserService userService"
                const typeName = pParts[pParts.length - 2].replace(/<.*>/, "");
                const target = classToFile.get(typeName);
                if (target && target !== f.path) {
                  const key = `${f.path}->${target}`;
                  if (!edgeKeySet.has(key)) {
                    edgeKeySet.add(key);
                    diEdges.push({
                      source: f.path,
                      target,
                      specifier: typeName,
                      type: "static",
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    // 3. Dynamic Rail Taxonomy for Spring Boot
    let controllerCount = 0;
    let serviceCount = 0;
    let repositoryCount = 0;
    let entityCount = 0;

    for (const [, role] of fileRoles.entries()) {
      if (role === "controller") controllerCount++;
      else if (role === "service") serviceCount++;
      else if (role === "repository") repositoryCount++;
      else if (role === "entity") entityCount++;
    }

    const taxonomy: TaxonomyItem[] = [
      { id: "controller", name: "Controllers", count: controllerCount, color: "#3b82f6" },
      { id: "service", name: "Services", count: serviceCount, color: "#10b981" },
      { id: "repository", name: "Repositories", count: repositoryCount, color: "#8b5cf6" },
      { id: "entity", name: "Entities", count: entityCount, color: "#f59e0b" },
      { id: "route", name: "Endpoints", count: routes.length, color: "#06b6d4", isRouteCategory: true },
    ];

    return {
      framework: "Spring Boot",
      fileRoles,
      diEdges,
      routes,
      taxonomy,
    };
  },
};
