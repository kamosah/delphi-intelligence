import { supabaseService } from './lib/supabase-test-client';

/**
 * Global setup - runs once before all E2E tests.
 *
 * Creates shared test users and their default organizations for authentication in parallel tests.
 * Each worker gets its own test user (worker-0, worker-1, worker-2).
 */
export default async function globalSetup() {
  console.log('🔧 Global setup: Creating test users and organizations...');

  const testUsers = [
    { email: 'worker-0@example.com', password: 'TestPassword123!' },
    { email: 'worker-1@example.com', password: 'TestPassword123!' },
    { email: 'worker-2@example.com', password: 'TestPassword123!' },
    { email: 'admin@example.com', password: 'TestPassword123!', role: 'admin' },
  ];

  for (const user of testUsers) {
    try {
      // Check if user already exists
      const { data: existingUsers } =
        await supabaseService.auth.admin.listUsers();
      const authUser = existingUsers?.users.find((u) => u.email === user.email);

      if (!authUser) {
        const { data: newUser, error } =
          await supabaseService.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true, // Auto-confirm for testing
          });

        if (error) {
          console.error(
            `❌ Failed to create user ${user.email}:`,
            error.message
          );
          continue;
        }

        console.log(`✅ Created test user: ${user.email}`);

        // Create default organization for the new user
        if (newUser?.user) {
          await createDefaultOrganization(newUser.user.id, user.email);
        }
      } else {
        console.log(`⏭️  User already exists: ${user.email}`);

        // Check if user has an organization, create one if not
        const hasOrg = await ensureDefaultOrganization(authUser.id, user.email);
        if (hasOrg) {
          console.log(`✅ User already has an organization`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing user ${user.email}:`, error);
    }
  }

  console.log('✅ Global setup complete');
}

/**
 * Create a default organization for a user
 */
async function createDefaultOrganization(authUserId: string, email: string) {
  try {
    // Get the public.users record by auth_user_id
    const { data: publicUser } = await supabaseService
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (!publicUser) {
      console.warn(`⚠️  No public user found for auth user ${authUserId}`);
      return;
    }

    const orgName = `${email.split('@')[0]} Organization`;
    const orgSlug = `${email.split('@')[0]}-org-${Date.now()}`;

    const { data: org, error } = await supabaseService
      .from('organizations')
      .insert({
        name: orgName,
        slug: orgSlug,
        owner_id: publicUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error(
        `❌ Failed to create organization for ${email}:`,
        error.message
      );
      return;
    }

    console.log(`✅ Created default organization for ${email}`);

    // Create organization_members record to link user to organization
    const { error: memberInsertError } = await supabaseService
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: publicUser.id,
        is_default: true,
      });

    if (memberInsertError) {
      console.error(
        `❌ Failed to create organization member for ${email}:`,
        memberInsertError.message
      );
    } else {
      console.log(`✅ Added user as organization owner`);
    }
  } catch (error) {
    console.error(`❌ Error creating organization for ${email}:`, error);
  }
}

/**
 * Ensure a user has a default organization
 * @returns true if user already has an organization, false if one was created
 */
async function ensureDefaultOrganization(
  authUserId: string,
  email: string
): Promise<boolean> {
  try {
    // Get the public.users record by auth_user_id
    const { data: publicUser } = await supabaseService
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (!publicUser) {
      console.warn(`⚠️  No public user found for auth user ${authUserId}`);
      return false;
    }

    // Check if user has any organizations
    const { data: orgs } = await supabaseService
      .from('organizations')
      .select('id')
      .eq('owner_id', publicUser.id)
      .limit(1);

    if (!orgs || orgs.length === 0) {
      console.log(`📝 Creating missing organization for ${email}`);
      await createDefaultOrganization(authUserId, email);
      return false;
    }

    // Check if user has any organization memberships
    const { data: memberRecords } = await supabaseService
      .from('organization_members')
      .select('*')
      .eq('user_id', publicUser.id)
      .eq('organization_id', orgs[0].id)
      .limit(1)
      .single();

    if (!memberRecords) {
      // Create organization_members record if missing
      const { error: memberInsertError } = await supabaseService
        .from('organization_members')
        .insert({
          organization_id: orgs[0].id,
          user_id: publicUser.id,
          is_default: true,
        });

      if (memberInsertError) {
        console.error(
          `❌ Failed to create organization member for ${email}:`,
          memberInsertError.message
        );
      } else {
        console.log(`✅ Created organization member and set as default`);
      }
    } else if (!memberRecords.is_default) {
      // Update existing member to be default
      const { error: memberError } = await supabaseService
        .from('organization_members')
        .update({ is_default: true })
        .eq('organization_id', orgs[0].id)
        .eq('user_id', publicUser.id);

      if (memberError) {
        console.error(
          `❌ Failed to set default organization for ${email}:`,
          memberError.message
        );
      } else {
        console.log(`✅ Set existing organization as default`);
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Error checking organization for ${email}:`, error);
    return false;
  }
}
