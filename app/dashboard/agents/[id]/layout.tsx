export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
