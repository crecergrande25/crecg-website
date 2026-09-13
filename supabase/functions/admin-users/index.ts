// Crecer Grande Website V2.0 - protected admin user management Edge Function.
// Deploy as function name: admin-users
// Server-only secret: SUPABASE_SERVICE_ROLE_KEY. Never place that key in public website files.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_AUTH_DOMAIN = Deno.env.get("ADMIN_AUTH_DOMAIN") ?? "admin.crecergrande.in";

const allowedOrigins = new Set([
  "https://crecergrande.in",
  "https://www.crecergrande.in",
]);

function cors(origin: string | null) {
  const allow = origin && allowedOrigins.has(origin) ? origin : "https://crecergrande.in";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

const cleanSlug = (v: unknown) => String(v ?? "").trim().toLowerCase();
const cleanText = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "POST required" }, 405, origin);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ error: "Server configuration is incomplete." }, 500, origin);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401, origin);

  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userResult = await caller.auth.getUser();
  const callerUser = userResult.data.user;
  if (!callerUser) return json({ error: "Invalid or expired session." }, 401, origin);

  const perm = await caller.rpc("has_permission", { p_permission: "users.manage" });
  if (perm.error || perm.data !== true) return json({ error: "Permission denied." }, 403, origin);

  const callerProfile = await service.from("user_profiles")
    .select("user_id,is_root,is_active")
    .eq("user_id", callerUser.id)
    .maybeSingle();
  if (!callerProfile.data?.is_active) return json({ error: "Active administrator profile required." }, 403, origin);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400, origin); }
  const action = cleanText(body.action, 50);

  try {
    if (action === "create") {
      const displayName = cleanText(body.display_name, 150);
      const loginSlug = cleanSlug(body.login_slug);
      const roleKey = cleanText(body.role_key, 80) || "administrator";
      const password = String(body.temporary_password ?? "");
      const showOnLogin = body.show_on_login !== false;

      if (!displayName) return json({ error: "Display name is required." }, 400, origin);
      if (!/^[a-z0-9._-]+$/.test(loginSlug)) return json({ error: "Login alias may contain only lowercase letters, numbers, dot, underscore and hyphen." }, 400, origin);
      if (password.length < 10) return json({ error: "Temporary password must be at least 10 characters." }, 400, origin);
      if (roleKey === "super_admin" && !callerProfile.data.is_root) return json({ error: "Only the root Super Admin can assign the Super Admin role." }, 403, origin);

      const role = await service.from("app_roles").select("role_key").eq("role_key", roleKey).maybeSingle();
      if (!role.data) return json({ error: "Invalid role." }, 400, origin);

      const email = `${loginSlug}@${ADMIN_AUTH_DOMAIN}`;
      const created = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });
      if (created.error || !created.data.user) return json({ error: created.error?.message || "Could not create authentication user." }, 400, origin);

      const profileInsert = await caller.rpc("admin_set_user_profile", {
        p_user_id: created.data.user.id,
        p_display_name: displayName,
        p_login_slug: loginSlug,
        p_role_key: roleKey,
        p_is_active: true,
        p_show_on_login: showOnLogin,
        p_must_change_password: true,
        p_insert_if_missing: true,
      });
      if (profileInsert.error) {
        await service.auth.admin.deleteUser(created.data.user.id);
        return json({ error: profileInsert.error.message }, 400, origin);
      }
      await caller.rpc("log_admin_event", {
        p_action: "CREATE_USER",
        p_module: "users",
        p_record_id: created.data.user.id,
        p_record_label: displayName,
        p_metadata: { login_slug: loginSlug, role_key: roleKey },
      });
      return json({ ok: true, user_id: created.data.user.id, login_slug: loginSlug }, 200, origin);
    }

    if (action === "update") {
      const targetId = cleanText(body.user_id, 80);
      if (!targetId) return json({ error: "User ID is required." }, 400, origin);
      const target = await service.from("user_profiles").select("display_name,is_root").eq("user_id", targetId).maybeSingle();
      if (!target.data) return json({ error: "User profile not found." }, 404, origin);

      const roleKey = body.role_key == null ? null : cleanText(body.role_key, 80);
      if (roleKey === "super_admin" && !callerProfile.data.is_root) return json({ error: "Only the root Super Admin can assign the Super Admin role." }, 403, origin);

      const change = await caller.rpc("admin_set_user_profile", {
        p_user_id: targetId,
        p_display_name: body.display_name == null ? null : cleanText(body.display_name, 150),
        p_login_slug: null,
        p_role_key: roleKey,
        p_is_active: body.is_active == null ? null : Boolean(body.is_active),
        p_show_on_login: body.show_on_login == null ? null : Boolean(body.show_on_login),
        p_must_change_password: null,
        p_insert_if_missing: false,
      });
      if (change.error) return json({ error: change.error.message }, 400, origin);
      return json({ ok: true }, 200, origin);
    }

    if (action === "reset_password") {
      const targetId = cleanText(body.user_id, 80);
      const password = String(body.temporary_password ?? "");
      if (!targetId) return json({ error: "User ID is required." }, 400, origin);
      if (password.length < 10) return json({ error: "Temporary password must be at least 10 characters." }, 400, origin);
      const target = await service.from("user_profiles").select("display_name").eq("user_id", targetId).maybeSingle();
      if (!target.data) return json({ error: "User profile not found." }, 404, origin);

      const reset = await service.auth.admin.updateUserById(targetId, { password });
      if (reset.error) return json({ error: reset.error.message }, 400, origin);
      const flag = await caller.rpc("admin_set_user_profile", {
        p_user_id: targetId,
        p_display_name: null,
        p_login_slug: null,
        p_role_key: null,
        p_is_active: null,
        p_show_on_login: null,
        p_must_change_password: true,
        p_insert_if_missing: false,
      });
      if (flag.error) return json({ error: flag.error.message }, 400, origin);
      await caller.rpc("log_admin_event", {
        p_action: "RESET_PASSWORD",
        p_module: "users",
        p_record_id: targetId,
        p_record_label: target.data.display_name,
        p_metadata: {},
      });
      return json({ ok: true }, 200, origin);
    }

    return json({ error: "Unsupported action." }, 400, origin);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected server error." }, 500, origin);
  }
});
