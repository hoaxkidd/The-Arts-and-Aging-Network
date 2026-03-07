// Set passwords for seeded users using Supabase REST API
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pYXF2bnR0cGlsc3djeHp2c3lxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkwMDExNSwiZXhwIjoyMDg4NDc2MTE1fQ.RoVLo1MQw3ipxzXUxXTklPNE7JvHhi-6KbrX127jpcE';
const BASE_URL = 'https://oiaqvnttpilswcxzvsyq.supabase.co';

// Simple bcrypt hash implementation (同步版本)
const bcrypt = require('bcryptjs');

const PLAIN_PASSWORD = 'TestPass123!';

async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

async function updateUserPassword(email) {
  const hashedPassword = await hashPassword(PLAIN_PASSWORD);
  const now = new Date().toISOString();
  
  // First, get the user ID
  const getResponse = await fetch(`${BASE_URL}/rest/v1/User?email=eq.${encodeURIComponent(email)}&select=id`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  
  const users = await getResponse.json();
  
  if (!users || users.length === 0) {
    console.log(`❌ User not found: ${email}`);
    return false;
  }
  
  const userId = users[0].id;
  
  // Update the password
  const response = await fetch(`${BASE_URL}/rest/v1/User?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      password: hashedPassword,
      updatedAt: now
    })
  });
  
  if (response.ok) {
    console.log(`✅ Updated password for ${email}`);
    return true;
  } else {
    const error = await response.text();
    console.log(`❌ Failed to update ${email}: ${error}`);
    return false;
  }
}

async function main() {
  console.log('Setting password for all users...\n');
  console.log(`Password: ${PLAIN_PASSWORD}\n`);
  
  await updateUserPassword('admin@artsandaging.com');
  await updateUserPassword('staff@artsandaging.com');
  await updateUserPassword('homeadmin@test.com');
  await updateUserPassword('volunteer@test.com');
  
  console.log('\n✅ All passwords set!');
}

main();
