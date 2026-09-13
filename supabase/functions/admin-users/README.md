# `admin-users` Edge Function

This is the protected V2.0 user-management backend used by Website Manager → Users & Access.

It supports:
- create admin/user profile with a temporary password;
- change display name, role, active status and login-list visibility;
- reset a user's temporary password and force password change on next login.

Security model:
- every request requires a valid logged-in Supabase access token;
- the caller must have `users.manage`;
- only the root Super Admin can assign `super_admin`;
- the database root-protection trigger still prevents disabling/demoting the root account;
- the service-role key stays only in the Edge Function environment and is never returned to the browser.

Deploy under the function name `admin-users` after running `supabase/V2.0_MASTER_BACKEND_UPGRADE_R4.sql` (or the identical `V2.0_MASTER_BACKEND_UPGRADE_R4.sql`). Existing admin identities use the internal login domain `admin.crecergrande.in`; the function defaults to that domain and can be overridden with `ADMIN_AUTH_DOMAIN` if needed. Supabase normally provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions; verify the project environment before deployment.
