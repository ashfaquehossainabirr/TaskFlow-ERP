export const canManageTasks = (role) => role === 'admin' || role === 'manager';
