import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <TopNav />
      <main className="px-4 lg:px-8 py-6 max-w-[1440px] mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
