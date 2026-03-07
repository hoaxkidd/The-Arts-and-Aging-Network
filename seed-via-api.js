// Quick seed script using Supabase REST API
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pYXF2bnR0cGlsc3djeHp2c3lxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkwMDExNSwiZXhwIjoyMDg4NDc2MTE1fQ.RoVLo1MQw3ipxzXUxXTklPNE7JvHhi-6KbrX127jpcE';
const BASE_URL = 'https://oiaqvnttpilswcxzvsyq.supabase.co';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function createUser(email, name, role) {
  const id = generateId();
  const now = new Date().toISOString();
  const response = await fetch(`${BASE_URL}/rest/v1/User`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      id,
      email,
      name,
      role,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    })
  });
  
  if (response.ok) {
    console.log(`✅ Created ${role}: ${email}`);
    return true;
  } else {
    const error = await response.text();
    console.log(`❌ Failed to create ${email}: ${error}`);
    return false;
  }
}

async function seed() {
  console.log('Creating test users...\n');
  
  await createUser('admin@artsandaging.com', 'Admin User', 'ADMIN');
  await createUser('staff@artsandaging.com', 'Staff Member', 'STAFF');
  await createUser('homeadmin@test.com', 'Home Admin', 'HOME_ADMIN');
  await createUser('volunteer@test.com', 'Volunteer Test', 'VOLUNTEER');
  
  console.log('\n✅ Seed completed!');
}

seed();
