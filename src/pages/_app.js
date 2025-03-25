// src/pages/_app.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import '@/styles/globals.css';
import { ReturnProvider } from '@/lib/context/ReturnContext';
import { AdminProvider } from '@/lib/context/AdminContext';
import { ThemeProvider } from '@/lib/context/ThemeContext';
import { LocaleProvider } from '@/lib/i18n';

function ProgressTracker({ Component, pageProps }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Extract tenant ID from query params or use default
  const tenantId = router.query.tenantId || 'default';
  
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
    return <Component {...pageProps} tenantId={tenantId} />;
  }

  return (
    <>
      <Head>
        <title>Return Portal</title>
        <meta name="description" content="Easily process returns and exchanges" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Component {...pageProps} currentStep={step} tenantId={tenantId} />
    </>
  );
}

export default function App(props) {
  const router = useRouter();
  
  // Extract tenant ID from query params or use default
  const tenantId = router.query.tenantId || 'default';
  
  // Determine if this is an admin route
  const isAdminRoute = router.pathname.startsWith('/admin');

  // Set up providers based on the route type
  const withProviders = (children) => {
    // Always wrap with theme and locale providers
    return (
      <ThemeProvider tenantId={tenantId}>
        <LocaleProvider tenantId={tenantId}>
          {children}
        </LocaleProvider>
      </ThemeProvider>
    );
  };

  // Wrap with appropriate providers based on route
  if (isAdminRoute) {
    return withProviders(
      <AdminProvider>
        <ProgressTracker {...props} />
      </AdminProvider>
    );
  }

  return withProviders(
    <ReturnProvider>
      <ProgressTracker {...props} />
    </ReturnProvider>
  );
}