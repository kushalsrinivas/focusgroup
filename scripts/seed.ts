#!/usr/bin/env tsx

import { seedDatabase } from "../src/server/db/seed";

async function main() {
  console.log("🌱 Starting database seed...");
  
  try {
    await seedDatabase();
    console.log("✅ Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

void main(); 