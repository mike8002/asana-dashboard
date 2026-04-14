import { getServerSession } from 'next-auth';
import { getDashboardData } from '../lib/asana';
import Dashboard from '../components/Dashboard';

export const revalidate = 300; // Refresh data every 5 minutes

export default async function Home() {
  const session = await getServerSession();
  
  let data = null;
  let error = null;

  try {
    data = await getDashboardData();
  } catch (e) {
    error = e.message;
  }

  return (
    <Dashboard
      data={data}
      error={error}
      userName={session?.user?.name || 'Team'}
      userImage={session?.user?.image}
    />
  );
}
