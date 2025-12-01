import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  try {
    // Allow CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        } 
      })
    }

    // Create Supabase client with service role key (has admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Admin users to create
    const adminUsers = [
      {
        email: 'david@admin.com',
        password: 'david',
        email_confirm: true,
      },
      {
        email: 'jonathan@admin.com',
        password: 'elozvgckc6',
        email_confirm: true,
      }
    ]

    const results: Array<{
      email: string
      status: string
      user_id?: string
      error?: string
      role_added?: boolean
    }> = []

    for (const adminUser of adminUsers) {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
      const userExists = existingUser.users.some(u => u.email === adminUser.email)

      let userId: string

      if (userExists) {
        const user = existingUser.users.find(u => u.email === adminUser.email)
        userId = user!.id
        results.push({
          email: adminUser.email,
          status: 'already_exists',
          user_id: userId
        })
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: adminUser.email,
          password: adminUser.password,
          email_confirm: adminUser.email_confirm,
        })

        if (createError) {
          results.push({
            email: adminUser.email,
            status: 'error',
            error: createError.message
          })
          continue
        }

        userId = newUser.user.id
        results.push({
          email: adminUser.email,
          status: 'created',
          user_id: userId
        })
      }

      // Add admin role (will ignore if already exists due to UNIQUE constraint)
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' })
        .select()

      if (roleError && !roleError.message.includes('duplicate key')) {
        results.push({
          email: adminUser.email,
          status: 'role_error',
          error: roleError.message
        })
      } else if (!roleError) {
        // Update the result to show role was added
        const resultIndex = results.findIndex(r => r.email === adminUser.email)
        if (resultIndex !== -1) {
          results[resultIndex].role_added = true
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin users setup completed',
        results
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500,
      },
    )
  }
})
