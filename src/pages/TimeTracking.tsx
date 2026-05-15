import { useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { TimeTrackingList } from "@/components/TimeTrackingList";

export default function TimeTracking() {
  const location = useLocation();
  const isProjectsPage = location.pathname.startsWith('/projects');

  return (
    <AppLayout>
      <div className="px-6 lg:px-12 py-10 max-w-6xl mx-auto">
        <header className="flex items-end justify-between border-b border-white/10 pb-6 mb-8">
          <div>
            <p className="label-caps mb-2">Tracking</p>
            <h1 className="font-serif text-5xl tracking-tight">
              {isProjectsPage ? 'Projects' : 'Activities'}
            </h1>
            <p className="mt-2 text-sm text-white/50">
              {isProjectsPage
                ? 'Track your project activities'
                : 'Track your activities'
              }
            </p>
          </div>
        </header>

        <TimeTrackingList filterType={isProjectsPage ? 'PROJECT' : 'ACTIVITY'} />
      </div>
    </AppLayout>
  );
}
