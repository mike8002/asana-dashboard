import { getServerSession } from 'next-auth';
import { getDashboardData } from '../../../lib/asana';

export async function GET() {
  // Check user is logged in
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const data = await getDashboardData();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to fetch Asana data:', error);
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
