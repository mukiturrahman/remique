"use client";

import { useEffect, useRef, useState } from "react";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<HTMLCanvasElement[]>([]);
  const [isBoomeranging, setIsBoomeranging] = useState(false);

  // Capture phase
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let capturedFrames: HTMLCanvasElement[] = [];
    let isCapturing = true;
    let lastTime = -1;

    const captureFrame = () => {
      if (!isCapturing) return;

      if (video.videoWidth > 0 && video.videoHeight > 0 && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const MAX_WIDTH = 960;
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
        const w = Math.floor(video.videoWidth * scale);
        const h = Math.floor(video.videoHeight * scale);

        const offscreen = document.createElement("canvas");
        offscreen.width = w;
        offscreen.height = h;
        // alpha: false for memory/perf optimization since video is opaque
        const ctx = offscreen.getContext("2d", { alpha: false });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          capturedFrames.push(offscreen);
        }
      }

      if ("requestVideoFrameCallback" in video) {
        (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        requestAnimationFrame(captureFrame);
      }
    };

    if ("requestVideoFrameCallback" in video) {
      (video as any).requestVideoFrameCallback(captureFrame);
    } else {
      requestAnimationFrame(captureFrame);
    }

    const onEnded = () => {
      isCapturing = false;
      setFrames(capturedFrames);
      setIsBoomeranging(true);
    };

    video.addEventListener("ended", onEnded);

    return () => {
      isCapturing = false;
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  // Boomerang render phase
  useEffect(() => {
    if (!isBoomeranging || frames.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Set canvas internal dimensions to match captured frames
    canvas.width = frames[0].width;
    canvas.height = frames[0].height;

    let frameIndex = frames.length - 1; // start by going backward
    let direction = -1;
    let lastRenderTime = performance.now();
    let rafId: number;
    const interval = 1000 / 30; // 30 FPS target

    const loop = (time: number) => {
      const dt = time - lastRenderTime;

      if (dt >= interval) {
        lastRenderTime = time - (dt % interval);

        ctx.drawImage(frames[frameIndex], 0, 0);

        frameIndex += direction;
        
        if (frameIndex <= 0) {
          frameIndex = 0;
          direction = 1;
        } else if (frameIndex >= frames.length - 1) {
          frameIndex = frames.length - 1;
          direction = -1;
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafId);
  }, [isBoomeranging, frames]);

  return (
    <>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className={`pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-300 ${
          isBoomeranging ? "opacity-0" : "opacity-100"
        }`}
      >
        <source src="/heroBg.mp4" type="video/mp4" />
      </video>
      <canvas
        ref={canvasRef}
        className={`pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-300 ${
          isBoomeranging ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
