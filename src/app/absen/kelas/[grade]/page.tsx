import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    grade: string;
  }>;
}

export default async function GradeRedirectPage({ params }: PageProps) {
  const { grade } = await params;
  redirect(`/absen?grade=${grade}`);
}
