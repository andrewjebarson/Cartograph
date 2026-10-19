import { Project, SyntaxKind, type SourceFile } from "ts-morph";
import type { ResolvedEdge } from "../parser/types.ts";
import type { FrameworkAdapter, ExtractedRoute, TaxonomyItem } from "./types.ts";

export const angularAdapter: FrameworkAdapter = {
  name: "Angular",

  detect(files) {
    const hasAngularJson = files.some((f) => f.path.endsWith("angular.json"));
    if (hasAngularJson) return true;

    return files.some((f) => {
      const p = f.path.toLowerCase();
      if (
        p.endsWith(".component.ts") ||
        p.endsWith(".service.ts") ||
        p.endsWith(".module.ts") ||
        p.endsWith(".guard.ts")
      ) {
        return true;
      }
      if (f.content && f.content.includes("@angular/core")) {
        return true;
      }
      return false;
    });
  },

  analyze(files, existingEdges) {
    const fileRoles = new Map<string, string>();
    const diEdges: ResolvedEdge[] = [];
    const routes: ExtractedRoute[] = [];

    // Map declared class names to file paths: e.g. "HeroService" -> "src/app/services/hero.service.ts"
    const classToFile = new Map<string, string>();

    // 1. First pass: Identify roles and index declared class names
    for (const f of files) {
      if (!f.path.endsWith(".ts")) continue;
      const content = f.content || "";
      const pathLower = f.path.toLowerCase();

      let role = "generic";

      if (pathLower.endsWith(".component.ts") || /@Component\s*\(/m.test(content)) {
        role = "component";
      } else if (
        pathLower.endsWith(".guard.ts") ||
        pathLower.endsWith(".interceptor.ts") ||
        /\b(?:CanActivate|CanActivateChild|CanDeactivate|CanMatch|HttpInterceptor)\b/.test(content)
      ) {
        role = "guard";
      } else if (pathLower.endsWith(".directive.ts") || /@Directive\s*\(/m.test(content)) {
        role = "directive";
      } else if (pathLower.endsWith(".pipe.ts") || /@Pipe\s*\(/m.test(content)) {
        role = "pipe";
      } else if (pathLower.endsWith(".module.ts") || /@NgModule\s*\(/m.test(content)) {
        role = "module";
      } else if (pathLower.endsWith(".service.ts") || /@Injectable\s*\(/m.test(content)) {
        role = "service";
      }

      fileRoles.set(f.path, role);

      // Extract class names
      const classMatches = content.matchAll(/\bclass\s+([A-Za-z0-9_]+)\b/g);
      for (const m of classMatches) {
        classToFile.set(m[1], f.path);
      }
    }

    // 2. Second pass: Parse AST for Constructor DI and Routes using ts-morph
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: { allowJs: true, noEmit: true },
    });

    const edgeKeySet = new Set(existingEdges.map((e) => `${e.source}->${e.target}`));

    for (const f of files) {
      if (!f.path.endsWith(".ts")) continue;
      const content = f.content || "";
      if (!content.trim()) continue;

      let sf: SourceFile;
      try {
        sf = project.createSourceFile(f.path, content, { overwrite: true });
      } catch {
        continue;
      }

      // Check constructor parameter injections
      const classes = sf.getClasses();
      for (const cls of classes) {
        const constructors = cls.getConstructors();
        for (const ctor of constructors) {
          const params = ctor.getParameters();
          for (const param of params) {
            const typeNode = param.getTypeNode();
            if (!typeNode) continue;
            const typeName = typeNode.getText().trim();

            // Check if this type corresponds to a known file in the repository
            const targetFile = classToFile.get(typeName);
            if (targetFile && targetFile !== f.path) {
              const key = `${f.path}->${targetFile}`;
              if (!edgeKeySet.has(key)) {
                edgeKeySet.add(key);
                diEdges.push({
                  source: f.path,
                  target: targetFile,
                  specifier: typeName,
                  type: "static",
                });
              }
            }
          }
        }
      }

      // Extract Angular Routes
      const varDecls = sf.getVariableDeclarations();
      for (const vd of varDecls) {
        const typeNode = vd.getTypeNode();
        const typeText = typeNode?.getText().trim() || "";
        const varName = vd.getName();

        if (typeText === "Routes" || typeText.includes("Route[]") || varName.toLowerCase().includes("routes")) {
          const init = vd.getInitializer();
          const arr = init?.asKind(SyntaxKind.ArrayLiteralExpression);
          if (arr) {
            for (const elem of arr.getElements()) {
              const obj = elem.asKind(SyntaxKind.ObjectLiteralExpression);
              if (obj) {
                const pathProp = obj.getProperty("path")?.asKind(SyntaxKind.PropertyAssignment);
                const strVal = pathProp?.getInitializer()?.asKind(SyntaxKind.StringLiteral)?.getLiteralText();
                if (pathProp && strVal !== undefined) {
                  const line = pathProp.getStartLineNumber();
                  const normalizedPath = strVal.startsWith("/") ? strVal : `/${strVal}`;

                  routes.push({
                    id: `route_${f.path}_${line}_${routes.length}`,
                    method: "PAGE",
                    path: normalizedPath,
                    filePath: f.path,
                    line,
                  });
                }
              }
            }
          }
        }
      }

      // Also check call expressions like RouterModule.forRoot([ ... ])
      const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of calls) {
        const callText = call.getExpression().getText();
        if (callText.includes("RouterModule.forRoot") || callText.includes("provideRouter")) {
          const args = call.getArguments();
          if (args.length > 0) {
            const arr = args[0].asKind(SyntaxKind.ArrayLiteralExpression);
            if (arr) {
              for (const elem of arr.getElements()) {
                const obj = elem.asKind(SyntaxKind.ObjectLiteralExpression);
                if (obj) {
                  const pathProp = obj.getProperty("path")?.asKind(SyntaxKind.PropertyAssignment);
                  const strVal = pathProp?.getInitializer()?.asKind(SyntaxKind.StringLiteral)?.getLiteralText();
                  if (pathProp && strVal !== undefined) {
                    const line = pathProp.getStartLineNumber();
                    const normalizedPath = strVal.startsWith("/") ? strVal : `/${strVal}`;

                    const isDup = routes.some(
                      (r) => r.filePath === f.path && r.line === line && r.path === normalizedPath,
                    );
                    if (!isDup) {
                      routes.push({
                        id: `route_${f.path}_${line}_${routes.length}`,
                        method: "PAGE",
                        path: normalizedPath,
                        filePath: f.path,
                        line,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 3. Count categories for taxonomy
    let componentCount = 0;
    let serviceCount = 0;
    let moduleCount = 0;
    let guardCount = 0;

    for (const [, role] of fileRoles.entries()) {
      if (role === "component") componentCount++;
      else if (role === "service") serviceCount++;
      else if (role === "module") moduleCount++;
      else if (role === "guard" || role === "directive" || role === "pipe") guardCount++;
    }

    const taxonomy: TaxonomyItem[] = [
      { id: "component", name: "Components", count: componentCount, color: "#06b6d4" },
      { id: "service", name: "Services", count: serviceCount, color: "#10b981" },
      { id: "module", name: "Modules", count: moduleCount, color: "#8b5cf6" },
      { id: "guard", name: "Guards", count: guardCount, color: "#ef4444" },
      { id: "route", name: "Routes", count: routes.length, color: "#f59e0b", isRouteCategory: true },
    ];

    return {
      framework: "Angular",
      fileRoles,
      diEdges,
      routes,
      taxonomy,
    };
  },
};
