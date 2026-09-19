import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const adminSource = await readFile(new URL('../src/components/luxe-bites-admin.tsx', import.meta.url), 'utf8')
const managerRouteSource = await readFile(new URL('../src/app/api/manager/route.ts', import.meta.url), 'utf8')
const orderRouteSource = await readFile(new URL('../src/app/api/orders/route.ts', import.meta.url), 'utf8')
const migrationSource = await readFile(
  new URL('../supabase/migrations/20260920004500_server_only_sensitive_rpcs.sql', import.meta.url),
  'utf8',
)

test('manager browser code no longer stores or sends Supabase session tokens directly', () => {
  assert.doesNotMatch(adminSource, /localStorage/)
  assert.doesNotMatch(adminSource, /rest\/v1\/rpc/)
  assert.doesNotMatch(adminSource, /SUPABASE_(?:KEY|URL)/)
  assert.match(adminSource, /\/api\/manager/)
  assert.match(adminSource, /credentials:\s*'same-origin'/)
})

test('manager route keeps the custom session in a secure HttpOnly cookie', () => {
  assert.match(managerRouteSource, /__Host-luxe_manager_session/)
  assert.match(managerRouteSource, /httpOnly:\s*true/)
  assert.match(managerRouteSource, /secure:\s*true/)
  assert.match(managerRouteSource, /sameSite:\s*'strict'/)
  assert.match(managerRouteSource, /SUPABASE_SECRET_KEY/)
  assert.match(managerRouteSource, /isSameOriginRequest/)
  assert.match(managerRouteSource, /createMemoryRateLimiter/)
})

test('order storage uses only the server-side Supabase secret', () => {
  assert.match(orderRouteSource, /SUPABASE_SECRET_KEY/)
  assert.doesNotMatch(orderRouteSource, /SUPABASE_PUBLISHABLE_KEY/)
  assert.match(orderRouteSource, /Bearer \$\{SUPABASE_SECRET_KEY\}/)
})

test('sensitive RPC migration removes browser roles and keeps service-role execution', () => {
  for (const name of [
    'activate_luxe_bites_manager',
    'get_luxe_bites_dashboard',
    'login_luxe_bites_manager',
    'logout_luxe_bites_manager',
    'submit_luxe_bites_order',
    'update_luxe_bites_order_management',
    'update_luxe_bites_product',
    'update_luxe_bites_settings',
  ]) {
    assert.match(migrationSource, new RegExp(`revoke execute on function public\\.${name}`, 'i'))
  }
  assert.match(migrationSource, /from public, anon, authenticated/i)
  assert.match(migrationSource, /to service_role/i)
})
