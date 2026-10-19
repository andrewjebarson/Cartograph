"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { seedDemoProjects } from "@/lib/db/seed";

export async function seedSampleData(): Promise<void> {
  seedDemoProjects();
  revalidatePath("/");
}

export async function clearAllData(): Promise<void> {
  const db = getDb();
  db.exec("DELETE FROM projects;");
  revalidatePath("/");
}
