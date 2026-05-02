import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { useAppDispatch, useAppSelector } from '../../../store';
import { updateRoomAudioVolume } from '../../../store/slices/roomSettingsSlice';
import { updateParticipant } from '../../../store/slices/participantSlice';
import { VolumeHeader } from '../../../assets/Icons/VolumeHeader';
import { VolumeMutedSVG } from '../../../assets/Icons/VolumeMutedSVG';

const MuteAllIcon = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const roomVolume = useAppSelector(
    (state) => state.roomSettings.roomAudioVolume,
  );
  const participantIds = useAppSelector((state) => state.participants.ids);
  const savedVolume = useRef<number>(1);

  const isMuted = roomVolume === 0;

  const toggle = () => {
    const newVolume = isMuted ? savedVolume.current : 0;
    if (!isMuted) {
      savedVolume.current = roomVolume;
    }
    dispatch(updateRoomAudioVolume(newVolume));
    participantIds.forEach((id) => {
      dispatch(updateParticipant({ id, changes: { audioVolume: newVolume } }));
    });
  };

  const wrapperClasses = clsx(
    'relative footer-icon cursor-pointer min-w-10 md:min-w-11 3xl:min-w-[52px] h-10 md:h-11 3xl:h-[52px] rounded 3xl:rounded border-[3px] 3xl:border-4',
    {
      'border-[rgba(124,206,247,0.25)] dark:border-Gray-800': isMuted,
      'border-transparent': !isMuted,
    },
  );

  const innerDivClasses = clsx(
    'footer-icon-bg relative cursor-pointer shadow-IconBox border border-Gray-300 dark:border-Gray-700 rounded 3xl:rounded-2xl h-full w-full flex items-center justify-center transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white',
    {
      'bg-gray-100 dark:bg-Gray-700': isMuted,
      'bg-white dark:bg-Gray-800': !isMuted,
    },
  );

  return (
    <div className={wrapperClasses} onClick={toggle}>
      <div className={innerDivClasses}>
        <span className="tooltip">
          {isMuted ? t('footer.icons.unmute-all') : t('footer.icons.mute-all')}
        </span>
        {isMuted ? <VolumeMutedSVG /> : <VolumeHeader />}
      </div>
    </div>
  );
};

export default MuteAllIcon;
