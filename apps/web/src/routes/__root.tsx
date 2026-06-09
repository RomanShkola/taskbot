import { useEffect } from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { getTelegramWebApp } from '@/lib/telegram';

function RootComponent() {
  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (webApp) {
      webApp.ready();
      webApp.expand();
    }
  }, []);

  return <Outlet />;
}

export const Route = createRootRoute({
  component: RootComponent,
});
