import type { ResolvedEdge } from "../parser/types.ts";
import type { FrameworkAdapter, ExtractedRoute, TaxonomyItem, AdapterResult } from "./types.ts";

export const expressAdapter: FrameworkAdapter = {
  name: "Express",

  detect(files) {
    // 1. Check package.json for "express"
    const packageJson = files.find((f) => f.path.endsWith("package.json"));
    if (packageJson && packageJson.content) {
      if (/"express"\s*:/i.test(packageJson.content)) {
        return true;
      }
    }

    // 2. Check source files for require("express") or from "express"
    return files.some((f) => {
      const p = f.path.toLowerCase();
      if (
        p.endsWith(".js") ||
        p.endsWith(".ts") ||
        p.endsWith(".cjs") ||
        p.endsWith(".mjs")
      ) {
        if (!f.content) return false;
        if (
          /\brequire\s*\(\s*['"]express['"]\s*\)/.test(f.content) ||
          /\bfrom\s+['"]express['"]/.test(f.content)
        ) {
          return true;
        }
      }
      return false;
    });
  },

  analyze(files): AdapterResult {
    const fileRoles = new Map<string, string>();
    const diEdges: ResolvedEdge[] = [];
    const routes: ExtractedRoute[] = []; // Express routes are NOT statically extracted (assembled at runtime)

    let controllerCount = 0;
    let routeCount = 0;
    let middlewareCount = 0;
    let serviceCount = 0;
    let modelCount = 0;
    let configCount = 0;
    let utilCount = 0;
    let repositoryCount = 0;
    let validatorCount = 0;
    let serverCount = 0;

    for (const f of files) {
      const parts = f.path.split("/").map((p) => p.toLowerCase());
      const dirParts = parts.slice(0, -1);
      const filename = parts[parts.length - 1] || "";

      let role = "generic";

      // 1. Check directory conventions (supporting both singular and plural)
      if (dirParts.some((p) => p === "controllers" || p === "controller")) {
        role = "controller";
      } else if (
        dirParts.some(
          (p) =>
            p === "routes" ||
            p === "route" ||
            p === "routers" ||
            p === "router",
        )
      ) {
        role = "route";
      } else if (
        dirParts.some((p) => p === "middlewares" || p === "middleware")
      ) {
        role = "middleware";
      } else if (dirParts.some((p) => p === "services" || p === "service")) {
        role = "service";
      } else if (dirParts.some((p) => p === "models" || p === "model")) {
        role = "model";
      } else if (
        dirParts.some(
          (p) =>
            p === "configs" ||
            p === "config" ||
            p === "configurations" ||
            p === "configuration",
        )
      ) {
        role = "config";
      } else if (
        dirParts.some(
          (p) =>
            p === "utils" ||
            p === "util" ||
            p === "helpers" ||
            p === "helper",
        )
      ) {
        role = "util";
      } else if (
        dirParts.some((p) => p === "repositories" || p === "repository")
      ) {
        role = "repository";
      } else if (
        dirParts.some((p) => p === "validators" || p === "validator")
      ) {
        role = "validator";
      }
      // 2. Fallback to filename conventions if directory was generic
      else if (
        filename.includes(".controller.") ||
        filename.endsWith("-controller.js") ||
        filename.endsWith("-controller.ts")
      ) {
        role = "controller";
      } else if (
        filename.includes(".route.") ||
        filename.includes(".routes.") ||
        filename.includes(".router.")
      ) {
        role = "route";
      } else if (
        filename.includes(".middleware.") ||
        filename.endsWith("-middleware.js") ||
        filename.endsWith("-middleware.ts")
      ) {
        role = "middleware";
      } else if (
        filename.includes(".service.") ||
        filename.endsWith("-service.js") ||
        filename.endsWith("-service.ts")
      ) {
        role = "service";
      } else if (
        filename.includes(".model.") ||
        filename.endsWith("-model.js") ||
        filename.endsWith("-model.ts")
      ) {
        role = "model";
      } else if (filename.includes(".config.")) {
        role = "config";
      } else if (
        filename.includes(".util.") ||
        filename.includes(".helper.")
      ) {
        role = "util";
      } else if (
        filename.startsWith("server.") ||
        filename.startsWith("app.") ||
        (filename.startsWith("index.") && dirParts.length <= 1)
      ) {
        role = "server";
      }

      fileRoles.set(f.path, role);

      // Role counters
      if (role === "controller") controllerCount++;
      else if (role === "route") routeCount++;
      else if (role === "middleware") middlewareCount++;
      else if (role === "service") serviceCount++;
      else if (role === "model") modelCount++;
      else if (role === "config") configCount++;
      else if (role === "util") utilCount++;
      else if (role === "repository") repositoryCount++;
      else if (role === "validator") validatorCount++;
      else if (role === "server") serverCount++;
    }

    // Dynamic Taxonomy
    const taxonomy: TaxonomyItem[] = [];

    if (controllerCount > 0) {
      taxonomy.push({
        id: "controller",
        name: "Controllers",
        count: controllerCount,
        color: "#3b82f6",
      });
    }
    if (routeCount > 0) {
      taxonomy.push({
        id: "route_files",
        name: "Routes",
        count: routeCount,
        color: "#f59e0b",
      });
    }
    if (middlewareCount > 0) {
      taxonomy.push({
        id: "middleware",
        name: "Middleware",
        count: middlewareCount,
        color: "#ec4899",
      });
    }
    if (serviceCount > 0) {
      taxonomy.push({
        id: "service",
        name: "Services",
        count: serviceCount,
        color: "#10b981",
      });
    }
    if (modelCount > 0) {
      taxonomy.push({
        id: "model",
        name: "Models",
        count: modelCount,
        color: "#8b5cf6",
      });
    }
    if (configCount > 0) {
      taxonomy.push({
        id: "config",
        name: "Configs",
        count: configCount,
        color: "#6366f1",
      });
    }
    if (utilCount > 0) {
      taxonomy.push({
        id: "util",
        name: "Utils",
        count: utilCount,
        color: "#14b8a6",
      });
    }
    if (repositoryCount > 0) {
      taxonomy.push({
        id: "repository",
        name: "Repositories",
        count: repositoryCount,
        color: "#06b6d4",
      });
    }
    if (validatorCount > 0) {
      taxonomy.push({
        id: "validator",
        name: "Validators",
        count: validatorCount,
        color: "#f97316",
      });
    }
    if (serverCount > 0) {
      taxonomy.push({
        id: "server",
        name: "Server",
        count: serverCount,
        color: "#eab308",
      });
    }

    // Route Table: exact or absent rule says Express routes are assembled at runtime,
    // so empty route table is returned.
    taxonomy.push({
      id: "route",
      name: "Routes",
      count: 0,
      color: "#71717a",
      isRouteCategory: true,
    });

    return {
      framework: "Express",
      fileRoles,
      diEdges,
      routes,
      taxonomy,
    };
  },
};
