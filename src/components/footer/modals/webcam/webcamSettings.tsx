import React from 'react';
import { useTranslation } from 'react-i18next';
import { isSupported } from '@twilio/video-processors';

import { useAppDispatch, useAppSelector } from '../../../../store';
import {
  updateVirtualBackground,
  updateMirrorCamera,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { BackgroundConfig } from '../../../../helpers/libs/TrackProcessor';
import WebcamPreview from './webcamPreview';
import BackgroundItems from './backgroundItems';

interface WebcamSettingsProps {
  deviceId: string;
}

const WebcamSettings = ({ deviceId }: WebcamSettingsProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const mirrorCamera = useAppSelector(
    (state) => state.bottomIconsActivity.mirrorCamera,
  );

  const onSelectBg = (bg: BackgroundConfig) => {
    dispatch(updateVirtualBackground(bg));
  };

  return (
    <div className="">
      <div className="w-full overflow-hidden rounded-lg relative bg-black h-64 3xl:h-80">
        <WebcamPreview deviceId={deviceId} />
      </div>
      <div className="flex items-center justify-between px-1 md:px-3 pt-4 pb-1">
        <span className="text-xs md:text-sm text-Gray-700 dark:text-dark-text">
          {t('footer.modal.mirror-camera')}
        </span>
        <button
          onClick={() => dispatch(updateMirrorCamera(!mirrorCamera))}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${mirrorCamera ? 'bg-Blue' : 'bg-Gray-300 dark:bg-Gray-600'}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200 ${mirrorCamera ? 'translate-x-4' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
      {isSupported && (
        <>
          <div className="title text-xs md:text-sm leading-none text-Gray-700 dark:text-dark-text px-1 md:px-3 uppercase pt-4 pb-5">
            {t('footer.modal.chose-virtual-bg')}
          </div>
          <BackgroundItems onSelect={onSelectBg} />
        </>
      )}
    </div>
  );
};

export default WebcamSettings;
