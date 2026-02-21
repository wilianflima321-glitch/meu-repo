'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

type RoleSummary = { role: string | null; count: number };

type RolesPayload = {
  success?: boolean;
  roles?: RoleSummary[];
  adminRoles?: RoleSummary[];
};

function normalizeRole(value: string | null) {
  return value?.trim() || 'unassigned';
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [adminRoles, setAdminRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminJsonFetch<RolesPayload>('/api/admin/roles');
      setRoles(Array.isArray(data?.roles) ? data.roles : []);
      setAdminRoles(Array.isArray(data?.adminRoles) ? data.adminRoles : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load role distribution');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const summary = useMemo(
    () => ({
      totalUsers: roles.reduce((sum, role) => sum + role.count, 0),
      totalAdmins: adminRoles.reduce((sum, role) => sum + role.count, 0),
      roleKinds: roles.length,
      adminRoleKinds: adminRoles.length,
    }),
    [roles, adminRoles],
  );

  return (
    <AdminPageShell
      title='Roles and Permissions'
      description='Monitor role distribution across users and administrative access groups.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchRoles}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total users' value={summary.totalUsers} tone='sky' />
          <AdminStatCard label='Total admins' value={summary.totalAdmins} tone='emerald' />
          <AdminStatCard label='User role kinds' value={summary.roleKinds} tone='neutral' />
          <AdminStatCard label='Admin role kinds' value={summary.adminRoleKinds} tone='amber' />
        </AdminStatGrid>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <AdminSection title='User roles' className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full table-auto text-sm'>
              <thead>
                <tr className='bg-zinc-800/70'>
                  <th className='p-3 text-left'>Role</th>
                  <th className='p-3 text-left'>Users</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminTableStateRow colSpan={2} message='Loading user roles...' />
                ) : roles.length === 0 ? (
                  <AdminTableStateRow colSpan={2} message='No user role records found.' />
                ) : (
                  roles.map((role) => (
                    <tr key={`role-${role.role ?? 'unassigned'}`} className='border-t border-zinc-800/70'>
                      <td className='p-3 text-zinc-100'>{normalizeRole(role.role)}</td>
                      <td className='p-3'>{role.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <AdminSection title='Administrative roles' className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full table-auto text-sm'>
              <thead>
                <tr className='bg-zinc-800/70'>
                  <th className='p-3 text-left'>Admin role</th>
                  <th className='p-3 text-left'>Users</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminTableStateRow colSpan={2} message='Loading admin roles...' />
                ) : adminRoles.length === 0 ? (
                  <AdminTableStateRow colSpan={2} message='No administrative role records found.' />
                ) : (
                  adminRoles.map((role) => (
                    <tr key={`admin-role-${role.role ?? 'unassigned'}`} className='border-t border-zinc-800/70'>
                      <td className='p-3 text-zinc-100'>{normalizeRole(role.role)}</td>
                      <td className='p-3'>{role.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </AdminPageShell>
  );
}
