import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { getCampaigns } from '@/lib/api';
import { CampaignList } from './components/campaign-list';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

export default async function SponsorDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login');
  }

  // Verify user has 'sponsor' role
  const roleData = await getUserRole(session.user.id);
  if (roleData.role !== 'sponsor') {
    redirect('/');
  }

  // Fetch campaigns on the server (moved from CampaignList useEffect)
  let campaigns = [];
  let error: string | undefined;

  try {
    if (roleData.sponsorId) {
      campaigns = await getCampaigns(roleData.sponsorId);
    }
  } catch (err) {
    console.error('Failed to load campaigns:', err);
    error = 'Failed to load campaigns';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Campaigns</h1>
        {/* TODO: Add CreateCampaignButton here */}
      </div>

      <CampaignList campaigns={campaigns} error={error} />
    </div>
  );
}
