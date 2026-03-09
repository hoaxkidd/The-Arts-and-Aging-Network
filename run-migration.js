/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');

// Supabase connection - using the service role key (from Supabase Dashboard → Settings → API)
const supabaseUrl = 'https://oiaqvnttpilswcxzvsyq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pYXF2bnR0cGlsc3djeHZzeXEiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzOTM2MTYwMCwiZXhwIjoxOTU1MTE3NjAwfQ.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'prisma', 'supabase-migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing SQL migration...');
    
    // Execute the SQL - Supabase allows running raw SQL via postgrest
    await supabase.rpc('exec_sql', { 
      query: sql 
    });
    
    // Alternative: use the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (response.ok) {
      console.log('Migration completed successfully!');
      const result = await response.json();
      console.log(result);
    } else {
      console.log('Error:', response.status, await response.text());
    }
    
  } catch (error) {
    console.error('Migration error:', error.message);
    
    // Try alternative: split and execute statements individually
    console.log('\nTrying alternative approach...');
  }
}

runMigration();
