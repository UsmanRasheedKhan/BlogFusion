"use client";
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      Swal.fire({
        title: 'Payment Successful!',
        text: 'Your subscription has been activated.',
        icon: 'success',
        confirmButtonColor: '#3B82F6',
      }).then(() => {
        router.push('/');
      });
    }
  }, [sessionId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Processing your subscription...
        </h1>
        <p className="text-gray-600">Please wait while we confirm your payment.</p>
      </div>
    </div>
  );
}