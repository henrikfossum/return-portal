// src/pages/_app.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import '@/styles/globals.css';
import { ReturnProvider } from '@/lib/context/ReturnContext';
import { AdminProvider } from '@/lib/context/AdminContext';

function ProgressTracker({ Component, pageProps }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Update current step based on route
  useEffect(() => {
    const path = router.pathname;
    if (path === '/') {
      setStep(1);
    } else if (path === '/order-details') {
      setStep(2);
    } else if (path.includes('/return-reason')) {
      setStep(3);
    } else if (path.includes('/return-options')) {
      setStep(4);
    } else if (path === '/return-review') {
      setStep(5);
    } else if (path === '/success') {
      setStep(6);
    }
  }, [router.pathname]);

  // Don't show progress for admin routes
  if (router.pathname.startsWith('/admin')) {
    return <Component {...pageProps} />;
  }

  return (
    <>
      <Head>
        <title>Return Portal</title>
        <meta name="description" content="Easily process returns and exchanges" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Component {...pageProps} currentStep={step} />
    </>
  );
}

export default function App(props) {
  const router = useRouter();
  
  // Determine if this is an admin route
  const isAdminRoute = router.pathname.startsWith('/admin');

  // Wrap with appropriate providers based on route
  if (isAdminRoute) {
    return (
      <AdminProvider>
        <ProgressTracker {...props} />
      </AdminProvider>
    );
  }

  return (
    <ReturnProvider>
      <ProgressTracker {...props} />
    </ReturnProvider>
  );
}