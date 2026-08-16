"use client";

import React, { useState } from "react";
import { VoiceParsingResponse, StaffContact, ParsedStaffTask, TaskPriority } from "@/types";
import { createBatchTasks } from "@/lib/firebase";
import { formatStaffWhatsAppMessage, sendWhatsAppMessage, openWhatsAppDirectLink } from "@/lib/whatsapp";
import confetti from "canvas-confetti";
import {
  Sparkles,
  CheckCircle2,
  Send,
  Plus,
  Trash2,
  Phone,
  Calendar,
  AlertCircle,
  Clock,
  Edit3,
  X,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  ExternalLink
} from "lucide-react";

interface TaskVerificationPipelineProps {
  isOpen: boolean;
  onClose: () => void;
  parsingResult: VoiceParsingResponse | null;
  staffList: StaffContact[];
  onTasksFinalized: () => void;
}

export const TaskVerificationPipeline: React.FC<TaskVerificationPipelineProps> = ({
  isOpen,
  onClose,
  parsingResult,
  staffList,
  onTasksFinalized,
}) => {
  const [assignments, setAssignments] = useState<ParsedStaffTask[]>(
    parsingResult?.assignments || []
  );
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<Record<string, { status: "pending" | "sending" | "success" | "failed"; error?: string }>>({});
  const [dispatchComplete, setDispatchComplete] = useState(false);

  // Sync state if parsingResult changes
  React.useEffect(() => {
    if (parsingResult) {
      setAssignments(parsingResult.assignments);
      setDispatchStatus({});
      setDispatchComplete(false);
    }
  }, [parsingResult]);

  if (!isOpen || !parsingResult) return null;

  // Handlers to edit tasks
  const handleTaskTitleChange = (staffIndex: number, taskIndex: number, newTitle: string) => {
    const updated = [...assignments];
    updated[staffIndex].tasks[taskIndex].title = newTitle;
    setAssignments(updated);
  };

  const handleTaskDescriptionChange = (staffIndex: number, taskIndex: number, newDesc: string) => {
    const updated = [...assignments];
    updated[staffIndex].tasks[taskIndex].description = newDesc;
    setAssignments(updated);
  };

  const handleTaskPriorityChange = (staffIndex: number, taskIndex: number, newPriority: TaskPriority) => {
    const updated = [...assignments];
    updated[staffIndex].tasks[taskIndex].priority = newPriority;
    setAssignments(updated);
  };

  const handleTaskDueDateChange = (staffIndex: number, taskIndex: number, newDueDate: string) => {
    const updated = [...assignments];
    updated[staffIndex].tasks[taskIndex].dueDate = newDueDate;
    setAssignments(updated);
  };

  const handleAddTask = (staffIndex: number) => {
    const updated = [...assignments];
    updated[staffIndex].tasks.push({
      title: "New task",
      description: "",
      priority: "medium",
      dueDate: "Today",
    });
    setAssignments(updated);
  };

  const handleDeleteTask = (staffIndex: number, taskIndex: number) => {
    const updated = [...assignments];
    updated[staffIndex].tasks.splice(taskIndex, 1);
    if (updated[staffIndex].tasks.length === 0) {
      updated.splice(staffIndex, 1);
    }
    setAssignments(updated);
  };

  const handleReassignStaff = (staffIndex: number, targetStaffId: string) => {
    const targetStaff = staffList.find((s) => s.id === targetStaffId);
    if (!targetStaff) return;

    const updated = [...assignments];
    updated[staffIndex].staffId = targetStaff.id;
    updated[staffIndex].staffName = targetStaff.name;
    updated[staffIndex].staffPhone = targetStaff.phone;
    setAssignments(updated);
  };

  // Final Action: Save tasks to Firebase and Dispatch WhatsApp messages!
  const handleConfirmAndDispatch = async (sendWhatsApp: boolean = true) => {
    if (assignments.length === 0) {
      alert("No tasks to assign.");
      return;
    }

    setIsDispatching(true);
    const newStatus: Record<string, { status: "pending" | "sending" | "success" | "failed"; error?: string }> = {};
    assignments.forEach((a) => {
      newStatus[a.staffId] = { status: "pending" };
    });
    setDispatchStatus(newStatus);

    try {
      // 1. Prepare Firebase Task items
      const flatTasksToCreate: any[] = [];

      for (const assignment of assignments) {
        for (const task of assignment.tasks) {
          flatTasksToCreate.push({
            title: task.title,
            description: task.description || "",
            assignedStaffId: assignment.staffId,
            assignedStaffName: assignment.staffName,
            assignedStaffPhone: assignment.staffPhone,
            priority: task.priority || "medium",
            status: "pending",
            dueDate: task.dueDate || "Today",
            sourceVoiceTranscription: parsingResult.rawTranscription,
            whatsappSent: false,
          });
        }
      }

      // Save to Firebase
      await createBatchTasks(flatTasksToCreate);

      // 2. Dispatch WhatsApp messages to each staff member
      if (sendWhatsApp) {
        for (const assignment of assignments) {
          setDispatchStatus((prev) => ({
            ...prev,
            [assignment.staffId]: { status: "sending" },
          }));

          const messageText = formatStaffWhatsAppMessage(
            assignment.staffName,
            assignment.tasks
          );

          try {
            const sendRes = await sendWhatsAppMessage(
              assignment.staffPhone,
              messageText
            );

            if (sendRes.success) {
              setDispatchStatus((prev) => ({
                ...prev,
                [assignment.staffId]: { status: "success" },
              }));
            } else {
              setDispatchStatus((prev) => ({
                ...prev,
                [assignment.staffId]: {
                  status: "failed",
                  error: sendRes.error || "WhatsApp delivery failed",
                },
              }));
            }
          } catch (e: any) {
            setDispatchStatus((prev) => ({
              ...prev,
              [assignment.staffId]: {
                status: "failed",
                error: e.message || "Network error",
              },
            }));
          }
        }
      }

      setDispatchComplete(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        onTasksFinalized();
      }, 1800);
    } catch (err: any) {
      console.error("Failed to assign and dispatch tasks:", err);
      alert("Error saving tasks: " + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  const totalTasksCount = assignments.reduce((acc, a) => acc + a.tasks.length, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white sm:rounded-2xl w-full max-w-5xl shadow-2xl border-0 sm:border border-[#E5E7EB] flex flex-col h-full sm:h-auto sm:max-h-[92vh] overflow-hidden">
        {/* Header with Pipeline Stepper */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E7EB] bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-2.5">
              <div className="w-7 h-7 sm:w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] sm:text-[17px] font-bold text-[#111827] leading-tight">
                  Verify & Dispatch Tasks
                </h3>
                <p className="text-[11px] sm:text-[12px] text-[#6B7280] line-clamp-1">
                  Review assignments before sending WhatsApp broadcast
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isDispatching}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lite Pipeline Indicator */}
          <div className="mt-3 pt-2.5 border-t border-[#F3F4F6] flex items-center justify-between text-[11px] sm:text-[12px] overflow-x-auto">
            <div className="flex items-center space-x-1.5 text-emerald-600 font-medium whitespace-nowrap">
              <span className="w-4 h-4 sm:w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] sm:text-[11px] font-bold">
                1
              </span>
              <span>Voice Transcribed</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0 mx-1" />
            <div className="flex items-center space-x-1.5 text-[#4F46E5] font-semibold whitespace-nowrap">
              <span className="w-4 h-4 sm:w-5 h-5 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[10px] sm:text-[11px] font-bold">
                2
              </span>
              <span>Review Tasks</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0 mx-1" />
            <div className="flex items-center space-x-1.5 text-[#6B7280] whitespace-nowrap">
              <span className="w-4 h-4 sm:w-5 h-5 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[10px] sm:text-[11px] font-bold">
                3
              </span>
              <span>WhatsApp Dispatch</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 bg-[#F9FAFB]">
          {/* Voice Transcription Box */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Original Voice Note</span>
              </span>
              <span className="text-[10px] sm:text-[11px] bg-indigo-50 text-[#4F46E5] px-2 py-0.5 rounded-full font-medium">
                Gemini 3.7 Flash
              </span>
            </div>
            <p className="text-[12px] sm:text-[13px] text-[#111827] bg-[#F9FAFB] p-2.5 sm:p-3 rounded-lg border border-[#E5E7EB] italic font-mono leading-relaxed">
              "{parsingResult.rawTranscription || "No speech detected"}"
            </p>
            {parsingResult.summary && (
              <p className="text-[11px] sm:text-[12px] text-[#4B5563] mt-2 font-medium">
                💡 <strong>AI Summary:</strong> {parsingResult.summary}
              </p>
            )}
          </div>

          {/* Unmatched Warnings if any */}
          {parsingResult.unmatchedTasks && parsingResult.unmatchedTasks.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] sm:text-[13px] text-amber-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Unassigned Tasks Detected:</p>
                <ul className="list-disc pl-4 mt-1 text-[11px] sm:text-[12px] space-y-0.5">
                  {parsingResult.unmatchedTasks.map((ut, idx) => (
                    <li key={idx}>{ut}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Staff Assignment Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] sm:text-[14px] font-bold text-[#111827]">
                Matched Team Members ({assignments.length} People, {totalTasksCount} Tasks)
              </h4>
              <span className="text-[11px] text-[#6B7280] hidden sm:inline">
                Edit titles, priorities, or add tasks before broadcasting
              </span>
            </div>

            {assignments.length === 0 ? (
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E7EB] text-center text-[#6B7280] text-[13px]">
                No staff members were matched from the voice note. Please ensure the names match your registered Staff Directory.
              </div>
            ) : (
              assignments.map((assignment, staffIdx) => {
                const statusObj = dispatchStatus[assignment.staffId];

                return (
                  <div
                    key={assignment.staffId || staffIdx}
                    className="bg-white rounded-xl border border-[#E5E7EB] shadow-2xs overflow-hidden transition-all hover:border-indigo-200"
                  >
                    {/* Staff Header Card */}
                    <div className="px-4 sm:px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center space-x-2.5 sm:space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[12px] font-bold shrink-0">
                          {assignment.staffName[0]}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-[13px] sm:text-[14px] text-[#111827]">
                              {assignment.staffName}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <UserCheck className="w-2.5 h-2.5 mr-0.5" />
                              Matched from "{assignment.matchedSpokenName}"
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] sm:text-[12px] text-[#6B7280] font-mono mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>+{assignment.staffPhone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Reassign / Status Actions */}
                      <div className="flex items-center justify-between sm:justify-end space-x-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#E5E7EB]">
                        {statusObj && (
                          <div className="text-[11px] sm:text-[12px]">
                            {statusObj.status === "sending" && (
                              <span className="text-[#4F46E5] animate-pulse font-medium">
                                Sending WhatsApp...
                              </span>
                            )}
                            {statusObj.status === "success" && (
                              <span className="text-emerald-600 font-medium flex items-center">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> WhatsApp Sent
                              </span>
                            )}
                            {statusObj.status === "failed" && (
                              <div className="flex items-center space-x-1.5">
                                <span className="text-red-600 font-medium flex items-center" title={statusObj.error}>
                                  <AlertCircle className="w-3.5 h-3.5 mr-0.5" /> Send Error
                                </span>
                                <button
                                  onClick={() => {
                                    const msg = formatStaffWhatsAppMessage(assignment.staffName, assignment.tasks);
                                    openWhatsAppDirectLink(assignment.staffPhone, msg);
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-600 text-white rounded-md flex items-center space-x-1"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span>Open WhatsApp</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <select
                          value={assignment.staffId}
                          onChange={(e) => handleReassignStaff(staffIdx, e.target.value)}
                          className="text-[11px] sm:text-[12px] px-2 py-1 bg-white border border-[#E5E7EB] rounded-md text-[#374151] focus:outline-hidden"
                          title="Change assigned person"
                        >
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>
                              Reassign: {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Task Items List */}
                    <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                      {assignment.tasks.map((task, taskIdx) => (
                        <div
                          key={taskIdx}
                          className="flex flex-col gap-2 p-2.5 sm:p-3 bg-white border border-[#E5E7EB] rounded-xl hover:border-indigo-200 transition-colors shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex items-center space-x-2 flex-1">
                              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[10px] sm:text-[11px] font-bold flex items-center justify-center shrink-0">
                                {taskIdx + 1}
                              </span>

                              {/* Editable Task Title */}
                              <input
                                type="text"
                                value={task.title}
                                onChange={(e) => handleTaskTitleChange(staffIdx, taskIdx, e.target.value)}
                                className="w-full text-[12px] sm:text-[13px] font-semibold text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#4F46E5] focus:bg-white"
                                placeholder="Task Title..."
                              />
                            </div>

                            {/* Controls: Priority & Due Date */}
                            <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0 pl-7 sm:pl-0">
                              <select
                                value={task.priority}
                                onChange={(e) => handleTaskPriorityChange(staffIdx, taskIdx, e.target.value as TaskPriority)}
                                className="text-[11px] px-2 py-1.5 rounded-lg font-medium border border-[#E5E7EB] bg-white text-[#374151] focus:outline-hidden"
                              >
                                <option value="urgent">🔴 Urgent</option>
                                <option value="high">🟠 High</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="low">🟢 Low</option>
                              </select>

                              <input
                                type="text"
                                value={task.dueDate || "Today"}
                                onChange={(e) => handleTaskDueDateChange(staffIdx, taskIdx, e.target.value)}
                                placeholder="Due date"
                                className="w-20 sm:w-24 text-[11px] px-2 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] focus:outline-hidden text-center"
                              />

                              <button
                                onClick={() => handleDeleteTask(staffIdx, taskIdx)}
                                className="p-1.5 text-[#9CA3AF] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                title="Delete task item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Editable Description / Detail */}
                          <div className="pl-7 sm:pl-8">
                            <input
                              type="text"
                              value={task.description || ""}
                              onChange={(e) => handleTaskDescriptionChange(staffIdx, taskIdx, e.target.value)}
                              placeholder="Task instructions, details, or context..."
                              className="w-full text-[11px] sm:text-[12px] text-[#4B5563] bg-transparent border-b border-dashed border-[#E5E7EB] hover:border-[#D1D5DB] focus:border-[#4F46E5] px-1 py-1 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Add Task Sub-button */}
                      <button
                        onClick={() => handleAddTask(staffIdx)}
                        className="text-[11px] sm:text-[12px] text-[#4F46E5] hover:text-[#4338CA] font-medium flex items-center space-x-1 mt-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add another task for {assignment.staffName}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 sm:py-4 border-t border-[#E5E7EB] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
          <div className="text-[11px] sm:text-[12px] text-[#6B7280] text-center sm:text-left">
            ⚡ Direct client-side dispatch with instant WhatsApp notification.
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <button
              onClick={() => handleConfirmAndDispatch(false)}
              disabled={isDispatching || assignments.length === 0}
              className="w-full sm:w-auto px-3 sm:px-4 py-2.5 sm:py-2 text-[12px] sm:text-[13px] font-medium text-[#374151] bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg transition-colors disabled:opacity-50 text-center"
            >
              Save to Board
            </button>

            <button
              onClick={() => handleConfirmAndDispatch(true)}
              disabled={isDispatching || assignments.length === 0}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-2 text-[12px] sm:text-[13px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg shadow-sm shadow-indigo-200 transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 disabled:opacity-50 text-center"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>
                {isDispatching
                  ? "Sending..."
                  : `Assign & WhatsApp (${assignments.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
