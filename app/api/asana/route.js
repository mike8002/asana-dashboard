import { getServerSession } from 'next-auth';
import { fetchAllData } from '../../../lib/asana';

export const revalidate = 172800;

let cachedData = null;
let cachedAt = 0;
const CACHE_MS = 172800 * 1000;

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const now = Date.now();
    if (cachedData && (now - cachedAt) < CACHE_MS) {
      return Response.json(cachedData, {
        headers: { 'Cache-Control': 'public, s-maxage=172800, stale-while-revalidate=86400' },
      });
    }

    const data = await fetchAllData();
    cachedData = data;
    cachedAt = now;

    return Response.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=172800, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('Failed to fetch Asana data:', error);
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
