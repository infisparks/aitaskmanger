"use client";

import React, { useState } from "react";
import { StaffContact, TaskItem, TaskPriority, TaskStatus } from "@/types";
import { createTask, updateTask } from "@/lib/firebase";
import { formatStaffWhatsAppMessage, sendWhatsAppMessage } from "@/lib/whatsapp";
import { X, Check, Send, AlertCircle, Plus } from "lucide-react";

interface ManualTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffContact[];
  editingTask?: TaskItem | null;
  onSaved: () => void;
}

export const ManualTaskModal: React.FC<ManualTaskModalProps> = ({
  isOpen,
  onClose,
  staffList,
  editingTask,
  onSaved,
}) => {
  const [title, setTitle] = useState(editingTask?.title || "");
  const [description, setDescription] = useState(editingTask?.description || "");
  const [staffId, setStaffId] = useState(editingTask?.assignedStaffId || (staffList[0]?.id || ""));
  const [priority, setPriority] = useState<TaskPriority>(editingTask?.priority || "medium");
  const [status, setStatus] = useState<TaskStatus>(editingTask?.status || "pending");
  const [dueDate, setDueDate] = useState(editingTask?.dueDate || "Today");
  const [sendWhatsAppNow, setSendWhatsAppNow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  React.useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || "");
      setStaffId(editingTask.assignedStaffId);
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setDueDate(editingTask.dueDate || "Today");
      setSendWhatsAppNow(false);
    } else {
      setTitle("");
      setDescription("");
      setStaffId(staffList[0]?.id || "");
      setPriority("medium");
      setStatus("pending");
      setDueDate("Today");
      setSendWhatsAppNow(true);
    }
  }, [editingTask, staffList, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please enter a task title");
      return;
    }
    const selectedStaff = staffList.find((s) => s.id === staffId);
    if (!selectedStaff) {
      setErrorMsg("Please select a staff member");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: title.trim(),
          description: description.trim(),
          assignedStaffId: selectedStaff.id,
          assignedStaffName: selectedStaff.name,
          assignedStaffPhone: selectedStaff.phone,
          priority,
          status,
          dueDate,
        });
      } else {
        const newTask = await createTask({
          title: title.trim(),
          description: description.trim(),
          assignedStaffId: selectedStaff.id,
          assignedStaffName: selectedStaff.name,
          assignedStaffPhone: selectedStaff.phone,
          priority,
          status,
          dueDate,
          whatsappSent: false,
        });

        if (sendWhatsAppNow) {
          const msg = formatStaffWhatsAppMessage(selectedStaff.name, [
            { title: title.trim(), description: description.trim(), priority, dueDate }
          ]);
          await sendWhatsAppMessage(selectedStaff.phone, msg);
          await updateTask(newTask.id, { whatsappSent: true, whatsappSentAt: Date.now() });
        }
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Task save failed:", err);
      setErrorMsg(err.message || "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#E5E7EB] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[#111827]">
            {editingTask ? "Edit Task" : "Create New Task"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deploy updated backend API"
              className="w-full px-3 py-2 text-[14px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-hidden focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add optional details, instructions, or links..."
              className="w-full px-3 py-2 text-[14px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-hidden focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                Assign to Staff <span className="text-red-500">*</span>
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-hidden focus:border-[#4F46E5]"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-hidden focus:border-[#4F46E5]"
              >
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                Due Date
              </label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="Today / Tomorrow / 5:00 PM"
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-hidden focus:border-[#4F46E5]"
              />
            </div>

            {editingTask && (
              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 text-[14px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-hidden focus:border-[#4F46E5]"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>

          {!editingTask && (
            <div className="pt-2">
              <label className="flex items-center space-x-2 text-[13px] text-[#374151] cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsAppNow}
                  onChange={(e) => setSendWhatsAppNow(e.target.checked)}
                  className="w-4 h-4 text-[#4F46E5] rounded border-[#D1D5DB] focus:ring-[#4F46E5]"
                />
                <span className="font-medium">Send WhatsApp notification to staff immediately</span>
              </label>
            </div>
          )}

          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-[13px] font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{editingTask ? "Update Task" : "Create Task"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
