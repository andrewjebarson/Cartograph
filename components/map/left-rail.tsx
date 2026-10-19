"use client";

import React, { useMemo } from "react";
import type { ParsedFile } from "../../lib/parser/types.ts";
import type { ExtractedRoute } from "../../lib/adapters/types.ts";
import { deriveCategory } from "../../lib/graph/folding.ts";

interface CategoryStat {
  id: string;
  name: string;
  count: number;
  color: string;
  isRouteCategory?: boolean;
}

interface LeftRailProps {
  files: ParsedFile[];
  framework?: string | null;
  routes?: ExtractedRoute[];
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onOpenRouteTable?: () => void;
  isRouteTableOpen?: boolean;
}

export function LeftRail({
  files,
  framework,
  routes = [],
  activeCategory,
  onSelectCategory,
  onOpenRouteTable,
  isRouteTableOpen = false,
}: LeftRailProps) {
  const isAngular = useMemo(() => {
    if (framework && framework.toLowerCase().includes("angular")) return true;
    return files.some(
      (f) =>
        f.role === "component" ||
        f.role === "module" ||
        f.path.toLowerCase().endsWith(".component.ts"),
    );
  }, [framework, files]);

  const isSpringBoot = useMemo(() => {
    if (framework && framework.toLowerCase().includes("spring")) return true;
    return files.some(
      (f) =>
        f.role === "controller" ||
        f.role === "repository" ||
        f.extension === ".java",
    );
  }, [framework, files]);

  const isExpress = useMemo(() => {
    if (framework && framework.toLowerCase().includes("express")) return true;
    return files.some(
      (f) =>
        f.role === "middleware" ||
        (f.role === "controller" && f.extension !== ".java") ||
        (f.role === "route" && !f.path.includes("app-routing")),
    );
  }, [framework, files]);

  const categories: CategoryStat[] = useMemo(() => {
    if (isAngular) {
      // Dynamic taxonomy for Angular: Components, Services, Modules, Guards, Routes
      let componentCount = 0;
      let serviceCount = 0;
      let moduleCount = 0;
      let guardCount = 0;

      for (const f of files) {
        if (f.role === "component" || f.path.toLowerCase().endsWith(".component.ts")) {
          componentCount++;
        } else if (f.role === "service" || f.path.toLowerCase().endsWith(".service.ts")) {
          serviceCount++;
        } else if (f.role === "module" || f.path.toLowerCase().endsWith(".module.ts")) {
          moduleCount++;
        } else if (
          f.role === "guard" ||
          f.role === "directive" ||
          f.role === "pipe" ||
          f.path.toLowerCase().endsWith(".guard.ts") ||
          f.path.toLowerCase().endsWith(".interceptor.ts")
        ) {
          guardCount++;
        }
      }

      return [
        { id: "component", name: "Components", count: componentCount, color: "#06b6d4" },
        { id: "service", name: "Services", count: serviceCount, color: "#10b981" },
        { id: "module", name: "Modules", count: moduleCount, color: "#8b5cf6" },
        { id: "guard", name: "Guards", count: guardCount, color: "#ef4444" },
        { id: "route", name: "Routes", count: routes.length, color: "#f59e0b", isRouteCategory: true },
      ];
    }

    if (isSpringBoot) {
      // Dynamic taxonomy for Spring Boot: Controllers, Services, Repositories, Entities, Endpoints
      let controllerCount = 0;
      let serviceCount = 0;
      let repositoryCount = 0;
      let entityCount = 0;

      for (const f of files) {
        if (f.role === "controller" || f.path.toLowerCase().includes("controller")) {
          controllerCount++;
        } else if (f.role === "service" || f.path.toLowerCase().includes("service")) {
          serviceCount++;
        } else if (f.role === "repository" || f.path.toLowerCase().includes("repository")) {
          repositoryCount++;
        } else if (f.role === "entity" || f.path.toLowerCase().includes("model") || f.path.toLowerCase().includes("entity")) {
          entityCount++;
        }
      }

      return [
        { id: "controller", name: "Controllers", count: controllerCount, color: "#3b82f6" },
        { id: "service", name: "Services", count: serviceCount, color: "#10b981" },
        { id: "repository", name: "Repositories", count: repositoryCount, color: "#8b5cf6" },
        { id: "entity", name: "Entities", count: entityCount, color: "#f59e0b" },
        { id: "route", name: "Endpoints", count: routes.length, color: "#06b6d4", isRouteCategory: true },
      ];
    }

    if (isExpress) {
      // Dynamic taxonomy for Express: Controllers, Routes, Middleware, Services, Models, Configs, Utils
      let controllerCount = 0;
      let routeCount = 0;
      let middlewareCount = 0;
      let serviceCount = 0;
      let modelCount = 0;
      let configCount = 0;
      let utilCount = 0;

      for (const f of files) {
        if (f.role === "controller") controllerCount++;
        else if (f.role === "route") routeCount++;
        else if (f.role === "middleware") middlewareCount++;
        else if (f.role === "service") serviceCount++;
        else if (f.role === "model") modelCount++;
        else if (f.role === "config") configCount++;
        else if (f.role === "util") utilCount++;
      }

      const items: CategoryStat[] = [];
      if (controllerCount > 0) {
        items.push({ id: "controller", name: "Controllers", count: controllerCount, color: "#3b82f6" });
      }
      if (routeCount > 0) {
        items.push({ id: "route_files", name: "Routes", count: routeCount, color: "#f59e0b" });
      }
      if (middlewareCount > 0) {
        items.push({ id: "middleware", name: "Middleware", count: middlewareCount, color: "#ec4899" });
      }
      if (serviceCount > 0) {
        items.push({ id: "service", name: "Services", count: serviceCount, color: "#10b981" });
      }
      if (modelCount > 0) {
        items.push({ id: "model", name: "Models", count: modelCount, color: "#8b5cf6" });
      }
      if (configCount > 0) {
        items.push({ id: "config", name: "Configs", count: configCount, color: "#6366f1" });
      }
      if (utilCount > 0) {
        items.push({ id: "util", name: "Utils", count: utilCount, color: "#14b8a6" });
      }

      items.push({
        id: "route",
        name: "Route Table",
        count: routes.length,
        color: "#71717a",
        isRouteCategory: true,
      });

      return items;
    }

    // Generic fallback taxonomy
    const counts = new Map<string, number>();
    for (const f of files) {
      const cat = deriveCategory(f.path);
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }

    const items: CategoryStat[] = Array.from(counts.entries()).map(([name, count]) => ({
      id: name,
      name,
      count,
      color: "#71717a",
    }));

    items.push({
      id: "route",
      name: "Routes",
      count: routes.length,
      color: "#71717a",
      isRouteCategory: true,
    });

    return items;
  }, [isAngular, isSpringBoot, isExpress, files, routes]);

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full select-none">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {isAngular ? "Angular Roles" : isSpringBoot ? "Spring Boot Roles" : isExpress ? "Express Roles" : "Categories"}
          </h2>
          <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
            {files.length} files · {routes.length} routes
          </p>
        </div>

        {activeCategory && (
          <button
            onClick={() => onSelectCategory(null)}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            title="Reset category filter"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {categories.map((cat) => {
          const isRoute = Boolean(cat.isRouteCategory);
          const isActive = isRoute ? isRouteTableOpen : activeCategory === cat.name;

          return (
            <div
              key={cat.id}
              onClick={() => {
                if (isRoute) {
                  onOpenRouteTable?.();
                } else {
                  onSelectCategory(isActive ? null : cat.name);
                }
              }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                isActive
                  ? "bg-amber-500/15 text-amber-900 dark:text-amber-200 font-semibold ring-1 ring-amber-500"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate text-xs">{cat.name}</span>
                {isRoute && (
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-tighter">
                    [table]
                  </span>
                )}
              </div>
              <span
                className={`font-mono text-[11px] font-medium ml-2 ${
                  isActive
                    ? "text-amber-600 dark:text-amber-400 font-bold"
                    : "text-zinc-400"
                }`}
              >
                {cat.count}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
