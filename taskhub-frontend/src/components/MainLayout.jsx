import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  return (
    <div className="flex bg-slate-50 min-h-screen font-sans tracking-tight text-slate-800">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen overflow-y-auto p-8 md:p-10 lg:p-12">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
