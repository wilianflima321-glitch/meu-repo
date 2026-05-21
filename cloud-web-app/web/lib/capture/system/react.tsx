'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react';
import { CaptureSystem } from './runtime';
import {
  type CapturedMedia,
  type CaptureConfig,
  type PhotoModeSettings,
  type ScreenshotOptions,
  type VideoRecordingOptions,
} from './types';

interface CaptureContextValue {
  captureSystem: CaptureSystem;
}

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function CaptureProvider({ 
  children,
  config,
}: { 
  children: ReactNode;
  config?: Partial<CaptureConfig>;
}) {
  const value = useMemo(() => ({
    captureSystem: new CaptureSystem(config),
  }), [config]);
  
  useEffect(() => {
    return () => {
      value.captureSystem.dispose();
    };
  }, [value]);
  
  return (
    <CaptureContext.Provider value={value}>
      {children}
    </CaptureContext.Provider>
  );
}

export function useCaptureSystem() {
  const context = useContext(CaptureContext);
  if (!context) {
    return CaptureSystem.getInstance();
  }
  return context.captureSystem;
}

export function useScreenshot() {
  const capture = useCaptureSystem();
  
  const takeScreenshot = useCallback(async (options?: ScreenshotOptions) => {
    return capture.captureScreenshot(options);
  }, [capture]);
  
  return takeScreenshot;
}

export function useVideoRecording() {
  const capture = useCaptureSystem();
  const [isRecording, setIsRecording] = useState(capture.isRecording());
  const [duration, setDuration] = useState(0);
  
  useEffect(() => {
    const onStart = () => setIsRecording(true);
    const onStop = () => setIsRecording(false);
    
    capture.on('recordingStart', onStart);
    capture.on('recordingComplete', onStop);
    capture.on('recordingError', onStop);
    
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(capture.getRecordingDuration());
      }, 100);
    }
    
    return () => {
      capture.off('recordingStart', onStart);
      capture.off('recordingComplete', onStop);
      capture.off('recordingError', onStop);
      if (interval) clearInterval(interval);
    };
  }, [capture, isRecording]);
  
  const start = useCallback((options?: VideoRecordingOptions) => {
    return capture.startRecording(options);
  }, [capture]);
  
  const stop = useCallback(() => {
    return capture.stopRecording();
  }, [capture]);
  
  const pause = useCallback(() => {
    return capture.pauseRecording();
  }, [capture]);
  
  const resume = useCallback(() => {
    return capture.resumeRecording();
  }, [capture]);
  
  return { isRecording, duration, start, stop, pause, resume };
}

export function usePhotoMode() {
  const capture = useCaptureSystem();
  const [isActive, setIsActive] = useState(capture.isPhotoModeActive());
  const [settings, setSettings] = useState(capture.getPhotoModeSettings());
  
  useEffect(() => {
    const onEnter = () => {
      setIsActive(true);
      setSettings(capture.getPhotoModeSettings());
    };
    const onExit = () => {
      setIsActive(false);
      setSettings(capture.getPhotoModeSettings());
    };
    const onChange = () => {
      setSettings(capture.getPhotoModeSettings());
    };
    
    capture.on('photoModeEnter', onEnter);
    capture.on('photoModeExit', onExit);
    capture.on('photoModeChange', onChange);
    
    return () => {
      capture.off('photoModeEnter', onEnter);
      capture.off('photoModeExit', onExit);
      capture.off('photoModeChange', onChange);
    };
  }, [capture]);
  
  const enter = useCallback(() => capture.enterPhotoMode(), [capture]);
  const exit = useCallback(() => capture.exitPhotoMode(), [capture]);
  const setSetting = useCallback(<K extends keyof PhotoModeSettings>(key: K, value: PhotoModeSettings[K]) => {
    capture.setPhotoModeSetting(key, value);
  }, [capture]);
  
  return { isActive, settings, enter, exit, setSetting };
}

export function useCaptureGallery() {
  const capture = useCaptureSystem();
  const [gallery, setGallery] = useState<CapturedMedia[]>(capture.getGallery());
  
  useEffect(() => {
    const update = () => setGallery(capture.getGallery());
    
    capture.on('galleryUpdate', update);
    capture.on('mediaDelete', update);
    capture.on('galleryClear', update);
    
    return () => {
      capture.off('galleryUpdate', update);
      capture.off('mediaDelete', update);
      capture.off('galleryClear', update);
    };
  }, [capture]);
  
  const deleteMedia = useCallback((id: string) => capture.deleteMedia(id), [capture]);
  const downloadMedia = useCallback((id: string) => capture.downloadMedia(id), [capture]);
  const shareMedia = useCallback((id: string) => capture.shareMedia(id), [capture]);
  const copyToClipboard = useCallback((id: string) => capture.copyToClipboard(id), [capture]);
  const clearAll = useCallback(() => capture.clearGallery(), [capture]);
  
  return { gallery, deleteMedia, downloadMedia, shareMedia, copyToClipboard, clearAll };
}

export function useCanvasCapture(canvasRef: RefObject<HTMLCanvasElement>) {
  const capture = useCaptureSystem();
  
  useEffect(() => {
    if (canvasRef.current) {
      capture.setCanvas(canvasRef.current);
    }
  }, [capture, canvasRef]);
}
