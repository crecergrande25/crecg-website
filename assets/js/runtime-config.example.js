// Crecer Grande V2.0 browser-safe runtime configuration.
// Copy the existing V1.9.3 Project URL and PUBLISHABLE browser key here.
// Never put a Supabase secret key, service_role key, database password or admin password in this file.
window.CG_CONFIG = {
  supabaseUrl: "",
  supabasePublishableKey: "",
  // Existing admin Auth identities use the internal login domain below.
  adminAuthDomain: "admin.crecergrande.in",
  // Optional. Leave blank when the included Edge Function is deployed as the standard name "admin-users".
  // Set only if your protected function is exposed at a custom URL.
  adminUsersFunctionUrl: ""
};
