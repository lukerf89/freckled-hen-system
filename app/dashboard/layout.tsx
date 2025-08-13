'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Dashboard', href: '/dashboard' }];
    
    if (segments.includes('kpi')) {
      breadcrumbs.push({ name: 'KPI Dashboard', href: '/dashboard/kpi' });
    }
    
    return breadcrumbs;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                Freckled Hen Dashboard
              </Link>
              {pathname !== '/dashboard' && (
                <nav className="ml-4 flex items-center space-x-2 text-sm">
                  {getBreadcrumbs().map((breadcrumb, index) => (
                    <div key={breadcrumb.href} className="flex items-center">
                      {index > 0 && <span className="text-gray-600 mx-2">/</span>}
                      <Link 
                        href={breadcrumb.href}
                        className={`${
                          pathname === breadcrumb.href 
                            ? 'text-blue-600 font-medium' 
                            : 'text-gray-700 hover:text-gray-900'
                        }`}
                      >
                        {breadcrumb.name}
                      </Link>
                    </div>
                  ))}
                </nav>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}