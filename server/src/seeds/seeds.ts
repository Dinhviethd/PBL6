import dotenv from 'dotenv';
import { AppDataSource } from '@/configs/database.config';
import { runSeeds } from '@/seeds';

dotenv.config();

const bootstrap = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await runSeeds();
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

void bootstrap().catch(error => {
  console.error('Failed to run seeds');
  console.error(error);
  process.exit(1);
});
