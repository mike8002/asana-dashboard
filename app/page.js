import { getServerSession } from 'next-auth';
import { fetchAllData } from '../lib/asana';
import { CLIENTS, getClient, DEFAULT_CLIENT } from '../lib/clients';
import Dashboard from '../components/Dashboard';

export const revalidate = 172800;

export default async function Home({ searchParams }) {
  const session = await getServerSession();

  // Get client from URL param (?client=emirates) or default
  const clientId = searchParams?.client || DEFAULT_CLIENT;
  const client = getClient(clientId);

  let data = null;
  let error = null;

  try {
    data = await fetchAllData(client.projectGids);
  } catch (e) {
    error = e.message;
  }

  return (
    <Dashboard
      data={data}
      error={error}
      userName={session?.user?.name || 'Team'}
      userImage={session?.user?.image}
      clients={CLIENTS}
      activeClient={client}
    />
  );
}
