"use client";

import React from "react";

interface ProgressBarProps {
  progress: number;
  statusMessage: string;
}

export default function ProgressBar({ progress, statusMessage }: ProgressBarProps) {
  return (
    <div className="w-full bg-white rounded-2xl px-4 py-4.5 text-black shadow-[0_0_20px_rgba(59,130,246,0.3)] border-2 border-blue-500">
      <div className="flex flex-col gap-1.5">

        {/* Top Header Section */}
        <div className="flex justify-between items-center">
          <div className="space-y-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-none">
              AI Progress
            </p>
            <h2 className="text-base font-bold tracking-tight text-black mt-0.5 leading-tight">
              Searching supervisor matches
            </h2>
          </div>

          <span className="bg-slate-100 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-300">
            {progress}%
          </span>
        </div>

        {/* Progress Track: Red Outline with Green Progress */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-red-600">
          <div
            className="bg-green-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Bottom Status Message */}
        <div className="flex justify-between items-center text-[14px] text-slate-600 leading-none">
          <p className="truncate max-w-[65%] font-medium">{statusMessage}</p>
          <p className="text-slate-400 shrink-0">ETA: Calculating...</p>
        </div>
      </div>
    </div>
  );
}