export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function getStartParam(): string | undefined {
  return getTelegramWebApp()?.initDataUnsafe?.start_param;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          start_param?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          enable: () => void;
          disable: () => void;
          showProgress: () => void;
          hideProgress: () => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        themeParams: Record<string, string>;
        colorScheme: 'light' | 'dark';
      };
    };
  }
}
