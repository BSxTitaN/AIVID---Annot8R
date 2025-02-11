// app/(dashboard)/components/project-grid.tsx
import { getCurrentUser } from '@/lib/apis/auth';
import { getAllProjects } from '@/lib/apis/projects';
import { ClientProjectGrid } from '../components/project-grid';

export default async function Dashboard() {
  const user = await getCurrentUser();
  
  if (!user?.username) {
    return null;
  }

  try {
    const response = await getAllProjects(user.username);
    return <ClientProjectGrid initialProjects={response.projects} />;
  } catch (error) {
    return <ClientProjectGrid error={error instanceof Error ? error.message : 'Failed to load projects'} />;
  }
}