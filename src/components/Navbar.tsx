"use client";

import React from "react";
import { Mic, Users, PlusCircle, Sparkles, CheckCircle2, ListTodo, Send } from "lucide-react";

interface NavbarProps {
  onOpenVoiceRecorder: () => void;
  onOpenStaffModal: () => void;
  onOpenManualTaskModal: () => void;
  staffCount: number;
  totalTasks: number;
  pendingTasks: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenVoiceRecorder,
  onOpenStaffModal,
  onOpenManualTaskModal,
  staffCount,
  totalTasks,
  pendingTasks,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-[18px] sm:text-[20px] font-bold text-[#111827] tracking-tight">
                  TaskFlow AI
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF2FF] text-[#4F46E5] border border-indigo-100">
                  Gemini + WhatsApp
                </span>
              </div>
              <p className="text-[12px] text-[#6B7280] hidden sm:block">
                Multimodal voice task assignment & instant WhatsApp dispatch
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onOpenStaffModal}
              className="inline-flex items-center px-3 py-2 text-[13px] font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors focus:outline-hidden"
              title="Manage staff contacts"
            >
              <Users className="w-4 h-4 mr-1.5 text-[#6B7280]" />
              <span className="hidden sm:inline">Staff Directory</span>
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[#F3F4F6] text-[#4F46E5] text-[11px] font-bold">
                {staffCount}
              </span>
            </button>

            <button
              onClick={onOpenManualTaskModal}
              className="hidden md:inline-flex items-center px-3 py-2 text-[13px] font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors focus:outline-hidden"
            >
              <PlusCircle className="w-4 h-4 mr-1.5 text-[#6B7280]" />
              <span>Add Task</span>
            </button>

            {/* Voice Task Button with subtle glowing effect */}
            <button
              onClick={onOpenVoiceRecorder}
              className="inline-flex items-center px-4 py-2 text-[13px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg shadow-sm shadow-indigo-200 transition-all transform active:scale-95 focus:outline-hidden"
            >
              <Mic className="w-4 h-4 mr-1.5 animate-pulse" />
              <span>Voice Assign</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
