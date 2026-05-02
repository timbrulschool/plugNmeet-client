import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateTheme } from '../../store/slices/roomSettingsSlice';
import { MoonIcon } from '../../assets/Icons/MoonIcon';
import { SunIcon } from '../../assets/Icons/SunIcon';

const DarkThemeSwitcher = () => {
  const theme = useAppSelector((state) => state.roomSettings.theme);
  const dispatch = useAppDispatch();

  const handleToggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    dispatch(updateTheme(newTheme));
  }, [theme, dispatch]);

  return (
    <button
      onClick={handleToggleTheme}
      className="relative shrink-0 w-7 md:w-8 h-7 md:h-8 flex items-center justify-center rounded cursor-pointer hover:bg-Gray-50 dark:hover:bg-Gray-800 transition-colors"
      aria-label={
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      }
      title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    >
      <div className="text-gray-700 dark:text-white">
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </div>
    </button>
  );
};

export default DarkThemeSwitcher;
