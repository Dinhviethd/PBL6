import { seedRbac } from '@/seeds/rbac.seed';

export const runSeeds = async (): Promise<void> => {
  console.log('Running database seeds...');
  await seedRbac();
  console.log('All seeds completed!');
};
