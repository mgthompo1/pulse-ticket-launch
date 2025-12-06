import { FeaturePageTemplate } from "@/components/FeaturePageTemplate";
import { Smartphone, QrCode, Wifi, WifiOff, Users, BarChart3 } from "lucide-react";

const FeatureCheckin = () => {
  const benefits = [
    {
      title: "Free Mobile Check-in App",
      description: "Download our free app on iOS or Android. Turn any phone or tablet into a professional check-in station.",
      icon: <Smartphone className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Fast QR Code Scanning",
      description: "Scan ticket QR codes in under a second. Process hundreds of attendees quickly without creating queues.",
      icon: <QrCode className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Offline Mode",
      description: "No internet? No problem. The app works offline and syncs when connection is restored. Perfect for outdoor venues.",
      icon: <WifiOff className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Real-time Sync",
      description: "When online, all devices sync instantly. See live check-in numbers across multiple entry points in real-time.",
      icon: <Wifi className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Attendee Search",
      description: "Lost ticket? No worries. Search by name or email to manually check in attendees. See their ticket details and purchase history.",
      icon: <Users className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Live Analytics",
      description: "Track check-in rates, peak arrival times, and door performance. Make data-driven decisions for your next event.",
      icon: <BarChart3 className="h-5 w-5 text-[#ff4d00]" />,
    },
  ];

  const useCases = [
    {
      title: "Multi-Entry Venues",
      description: "Coordinate multiple entry points with real-time sync. Whether you have 2 doors or 20, everyone has the same live data.",
    },
    {
      title: "Outdoor Festivals",
      description: "When WiFi is unreliable, offline mode keeps check-in running smoothly. Sync up when you get a signal.",
    },
    {
      title: "VIP & Tiered Access",
      description: "Instantly see ticket types at scan. Grant appropriate access levels and identify VIP guests as they arrive.",
    },
    {
      title: "Schools & Community Events",
      description: "Volunteers can download the app on their own phones. No expensive hardware required for professional check-in.",
    },
  ];

  return (
    <FeaturePageTemplate
      featureName="Check-in App"
      headline="Free Mobile Check-in App"
      subheadline="Professional event check-in on any smartphone. Fast scanning, offline mode, and real-time sync."
      introText="Your event's first impression starts at the door. TicketFlo's free mobile check-in app turns any smartphone or tablet into a professional check-in station. Scan QR codes in under a second, work offline when internet is spotty, and sync across unlimited devices in real-time. Search attendees by name, see ticket details instantly, and track live check-in analytics. Best of all, it's completely free with your TicketFlo account."
      benefits={benefits}
      useCases={useCases}
      ctaText="Get the Free Check-in App"
      metaTitle="Free Event Check-in App | TicketFlo Mobile Scanner"
      metaDescription="TicketFlo's free check-in app turns any smartphone into a ticket scanner. QR code scanning, offline mode, real-time sync, and live analytics. Download free."
      keywords="event check-in app, mobile ticket scanner, qr code check-in, event entry app, free check-in app, ticket scanning app, event door management nz"
    />
  );
};

export default FeatureCheckin;
