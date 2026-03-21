import VersionHistoryClient from './VersionHistoryClient';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export default function VersionHistoryPage() {
  return <VersionHistoryClient />;
}
