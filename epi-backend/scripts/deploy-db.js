#!/usr/bin/env node

/**
 * Script para deployment das migrations e seed em produção
 * Uso: node scripts/deploy-db.js
 */

const { execSync } = require('child_process');

async function deployDatabase() {
  console.log('🚀 Starting database deployment...');
  
  try {
    // 1. Deploy migrations
    console.log('📦 Deploying migrations...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ Migrations deployed successfully!');
    
    // 2. Check if we should run seed
    const shouldSeed = process.env.RUN_SEED === 'true' || process.argv.includes('--seed');
    
    if (shouldSeed) {
      console.log('🌱 Running database seed...');
      execSync('npx prisma db seed', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Database seeded successfully!');
    } else {
      console.log('⏭️  Skipping seed (use --seed flag or RUN_SEED=true to enable)');
    }
    
    console.log('🎉 Database deployment completed!');
    
  } catch (error) {
    console.error('❌ Database deployment failed:');
    console.error(error.message);
    process.exit(1);
  }
}

deployDatabase();