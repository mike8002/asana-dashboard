import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    revalidatePath('/');
    revalidatePath('/api/asana');
    return Response.json({ success: true, refreshedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Refresh failed:', error);
    return Response.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
