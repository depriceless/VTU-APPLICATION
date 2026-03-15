import UnderConstruction from '@/components/UnderConstruction/page';
export default function MobileAppPage() {
  return (
    <UnderConstruction
      pageTitle="Download Mobile App"
      pageDescription="Our mobile app is coming soon! You'll be able to access all ConnectPay services on the go."
      backLink="/dashboard"
      backLinkText="Back to Dashboard"
      alternativeLink="/dashboard/buy-data"
      alternativeLinkText="Buy Data"
    />
  );
}