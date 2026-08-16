"use client";

import React, { useState, useEffect } from "react";
import { StaffContact, TaskItem, VoiceParsingResponse } from "@/types";
import { subscribeToStaff, subscribeToTasks, addStaffMember } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { StaffDirectoryModal } from "@/components/StaffDirectoryModal";
import { VoiceRecorderModal } from "@/components/VoiceRecorderModal";
import { TaskVerificationPipeline } from "@/components/TaskVerificationPipeline";
import { ManualTaskModal } from "@/components/ManualTaskModal";
import { TaskDashboard } from "@/components/TaskDashboard";
import { Mic, Sparkles, Plus, Users, ArrowRight, ShieldCheck, MessageSquare } from "lucide-react";

export default function Home() {
  const [staffList, setStaffList] = useState<StaffContact[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isManualTaskModalOpen, setIsManualTaskModalOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);

  // Editing state
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [voiceParsingResult, setVoiceParsingResult] = useState<VoiceParsingResponse | null>(null);

  // Realtime Firebase Subscriptions
  useEffect(() => {
    const unsubStaff = subscribeToStaff((data) => {
      setStaffList(data);
      setLoading(false);

      // If completely empty on first launch, we can offer to pre-seed Mudassir
      if (data.length === 0) {
        // Optional default seed if desired
      }
    });

    const unsubTasks = subscribeToTasks((data) => {
      setTasks(data);
    });

    return () => {
      unsubStaff();
      unsubTasks();
    };
  }, []);

  // Quick Seed helper if user hasn't added any staff yet
  const handleQuickSeedMudassir = async () => {
    try {
      await addStaffMember({
        name: "Mudassir",
        phone: "9876543210",
        department: "Engineering",
        avatarColor: "bg-indigo-600",
        active: true,
      });
      alert("Mudassir added to staff directory! Now open Voice Recorder to assign tasks.");
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleTranscriptionComplete = (result: VoiceParsingResponse) => {
    setVoiceParsingResult(result);
    setIsPipelineModalOpen(true);
  };

  const handleOpenEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setIsManualTaskModalOpen(true);
  };

  const handleCloseManualModal = () => {
    setEditingTask(null);
    setIsManualTaskModalOpen(false);
  };

  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col">
      {/* Top Navigation */}
      <Navbar
        onOpenVoiceRecorder={() => setIsVoiceModalOpen(true)}
        onOpenStaffModal={() => setIsStaffModalOpen(true)}
        onOpenManualTaskModal={() => {
          setEditingTask(null);
          setIsManualTaskModalOpen(true);
        }}
        staffCount={staffList.length}
        totalTasks={tasks.length}
        pendingTasks={pendingCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Voice Quick Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
            <Mic className="w-48 h-48" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[12px] font-medium text-indigo-100 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Gemini 2.0 Multimodal Voice + Evolution WhatsApp</span>
            </div>

            <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight">
              Assign daily tasks with a single voice note.
            </h2>

            <p className="text-[13px] sm:text-[14px] text-indigo-100/90 leading-relaxed">
              Speak naturally like <em>"Today task for Mudassir is to deploy the backend and test client payment gateway"</em>. Gemini matches your registered staff contacts, extracts tasks, and sends instant WhatsApp assignments.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="px-4 py-2.5 bg-white text-[#4F46E5] hover:bg-indigo-50 font-bold text-[13px] rounded-xl shadow-md transition-all flex items-center space-x-2 active:scale-95"
              >
                <Mic className="w-4 h-4 text-[#4F46E5]" />
                <span>Start Voice Recording</span>
              </button>

              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-[13px] rounded-xl border border-white/20 transition-colors flex items-center space-x-1.5"
              >
                <Users className="w-4 h-4" />
                <span>Manage Staff Contacts ({staffList.length})</span>
              </button>

              {staffList.length === 0 && (
                <button
                  onClick={handleQuickSeedMudassir}
                  className="px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-[12px] rounded-xl transition-colors shadow-xs"
                >
                  ⚡ Quick Add "Mudassir"
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Component */}
        <TaskDashboard
          tasks={tasks}
          staffList={staffList}
          onEditTask={handleOpenEditTask}
          onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          onOpenManualTaskModal={() => {
            setEditingTask(null);
            setIsManualTaskModalOpen(true);
          }}
          onOpenStaffModal={() => setIsStaffModalOpen(true)}
        />
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden z-40">
        <button
          onClick={() => setIsVoiceModalOpen(true)}
          className="w-14 h-14 rounded-full bg-[#4F46E5] text-white shadow-2xl flex items-center justify-center hover:bg-[#4338CA] active:scale-95 transition-all animate-pulse-ring"
          title="Voice Assign"
        >
          <Mic className="w-6 h-6" />
        </button>
      </div>

      {/* Modals */}
      <StaffDirectoryModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
      />

      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        staffList={staffList}
        onTranscriptionComplete={handleTranscriptionComplete}
      />

      <TaskVerificationPipeline
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
        parsingResult={voiceParsingResult}
        staffList={staffList}
        onTasksFinalized={() => {
          setIsPipelineModalOpen(false);
          setVoiceParsingResult(null);
        }}
      />

      <ManualTaskModal
        isOpen={isManualTaskModalOpen}
        onClose={handleCloseManualModal}
        staffList={staffList}
        editingTask={editingTask}
        onSaved={() => handleCloseManualModal()}
      />
    </div>
  );
}
