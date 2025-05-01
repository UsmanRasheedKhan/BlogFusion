"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function Loader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default function RouteLoader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return loading ? <Loader /> : null;
}
