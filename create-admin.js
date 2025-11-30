const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createAdmin() {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@bigdeck.app',
      password: 'AdminPassword123!',
      email_confirm: true,
    });

    if (error) {
      console.error('Error creating user:', error);
      return;
    }

    console.log('✅ Admin account created successfully!');
    console.log('Email: admin@bigdeck.app');
    console.log('Password: AdminPassword123!');
    console.log('User ID:', data.user.id);
  } catch (err) {
    console.error('Failed:', err.message);
  }
}

createAdmin();
