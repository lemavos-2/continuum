import { useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { TimeTrackingList } from "@/components/TimeTrackingList";

export default function TimeTracking() {
  const location = useLocation();
  const isProjectsPage = location.pathname.startsWith('/projects');

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-semibold text-white">
            {isProjectsPage ? 'Projects' : 'Activities'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isProjectsPage
              ? 'Track your project activities'
              : 'Track your activities'
            }
          </p>
        </div>

        <TimeTrackingList filterType={isProjectsPage ? 'PROJECT' : 'ACTIVITY'} />
      </div>
    </AppLayout>
  );
}
