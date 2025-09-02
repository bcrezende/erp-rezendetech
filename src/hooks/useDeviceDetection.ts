import { useState, useEffect } from 'react';

interface DeviceDetection {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPWA: boolean;
  hasTouch: boolean;
  screenWidth: number;
  orientation: 'portrait' | 'landscape';
}

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export const useDeviceDetection = (): DeviceDetection => {
  const [device, setDevice] = useState<DeviceDetection>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isPWA: false,
    hasTouch: false,
    screenWidth: 0,
    orientation: 'portrait',
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      const orientation = width > height ? 'landscape' : 'portrait';

      // Lógica de detecção refinada
      const isMobile = width < MOBILE_BREAKPOINT || (hasTouch && width < TABLET_BREAKPOINT);
      const isTablet = !isMobile && width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT && hasTouch;
      const isDesktop = width >= TABLET_BREAKPOINT && !hasTouch;

      setDevice({
        isMobile,
        isTablet,
        isDesktop,
        isPWA,
        hasTouch,
        screenWidth: width,
        orientation,
      });

      // Log para debug (remover em produção)
      console.log('📱 Device Detection:', {
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        isPWA,
        hasTouch,
        orientation,
        userAgent: navigator.userAgent.substring(0, 50) + '...'
      });
    };

    // Executa na montagem
    checkDevice();

    // Event listeners
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    // Media query listener para PWA
    const pwaMediaQuery = window.matchMedia('(display-mode: standalone)');
    pwaMediaQuery.addEventListener('change', checkDevice);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
      pwaMediaQuery.removeEventListener('change', checkDevice);
    };
  }, []);

  return device;
};