import { useEffect } from 'react';

import { useAppSelector } from '../../store';

const THEME_STORAGE_KEY = 'plugnmeet_theme';

const useThemeSettings = () => {
  const theme = useAppSelector((state) => state.roomSettings.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.querySelector('body')?.classList.add('dark');
    } else {
      document.querySelector('body')?.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);
};

export default useThemeSettings;
