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
      try {
        // Try standard prisma seed first
        execSync('npx prisma db seed', { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('✅ Database seeded successfully!');
      } catch (seedError) {
        console.log('⚠️  Standard seed failed, trying compiled version...');
        try {
          // Fallback to compiled seed for production
          execSync('node prisma/seed.js', { 
            stdio: 'inherit',
            cwd: process.cwd()
          });
          console.log('✅ Database seeded successfully with compiled version!');
        } catch (compiledSeedError) {
          console.log('⚠️  Both seed methods failed. Database migrations deployed but seed skipped.');
          console.log('Migrations are complete, seed can be run manually later.');
        }
      }
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