import { getServerSession } from 'next-auth';
import { fetchAllData } from '../lib/asana';
import Dashboard from '../components/Dashboard';

export const revalidate = 172800;

export default async function Home() {
  const session = await getServerSession();

  let data = null;
  let error = null;

  try {
    data = await fetchAllData();
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
