import NotificationCoveragePanel from "@/features/notifications/NotificationCoveragePanel";
import NotificationEnginePanel from "@/features/notifications/NotificationEnginePanel";

const NotificationsPage = () => (
  <div className="space-y-6">
    <NotificationEnginePanel />
    <NotificationCoveragePanel />
  </div>
);

export default NotificationsPage;
