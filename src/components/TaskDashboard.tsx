"use client";

import React, { useState } from "react";
import { TaskItem, StaffContact, TaskStatus, TaskPriority } from "@/types";
import { updateTask, deleteTask } from "@/lib/firebase";
import { formatStaffWhatsAppMessage, sendWhatsAppMessage } from "@/lib/whatsapp";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Send,
  Trash2,
  Edit2,
  Calendar,
  Phone,
  LayoutGrid,
  List,
  Sparkles,
  ArrowUpDown,
  Check
} from "lucide-react";

interface TaskDashboardProps {
  tasks: TaskItem[];
  staffList: StaffContact[];
  onEditTask: (task: TaskItem) => void;
  onOpenVoiceModal: () => void;
  onOpenManualTaskModal: () => void;
  onOpenStaffModal: () => void;
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({
  tasks,
  staffList,
  onEditTask,
  onOpenVoiceModal,
  onOpenManualTaskModal,
  onOpenStaffModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);

  // Statistics
  const totalTasksCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const whatsappDeliveredCount = tasks.filter((t) => t.whatsappSent).length;

  // Filtered Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignedStaffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStaff =
      selectedStaffFilter === "all" || t.assignedStaffId === selectedStaffFilter;

    const matchesStatus =
      selectedStatusFilter === "all" || t.status === selectedStatusFilter;

    return matchesSearch && matchesStaff && matchesStatus;
  });

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDelete = async (taskId: string, title: string) => {
    if (confirm(`Delete task "${title}"?`)) {
      try {
        await deleteTask(taskId);
      } catch (err: any) {
        alert("Failed to delete task: " + err.message);
      }
    }
  };

  const handleResendWhatsApp = async (task: TaskItem) => {
    setSendingWhatsAppId(task.id);
    try {
      const msg = formatStaffWhatsAppMessage(task.assignedStaffName, [
        {
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate,
        },
      ]);

      const res = await sendWhatsAppMessage(task.assignedStaffPhone, msg);
      if (res.success) {
        await updateTask(task.id, {
          whatsappSent: true,
          whatsappSentAt: Date.now(),
        });
        alert(`WhatsApp notification sent to ${task.assignedStaffName}!`);
      } else {
        alert(`WhatsApp failed: ${res.error}`);
      }
    } catch (err: any) {
      alert("Failed to send WhatsApp: " + err.message);
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            🔴 Urgent
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            🟠 High
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            🟡 Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
            🟢 Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3 mr-1" /> Completed
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-[#4F46E5] border border-indigo-200">
            <Clock className="w-3 h-3 mr-1" /> In Progress
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 mr-1" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-[12px] text-[#6B7280]">
            <span>Total Tasks</span>
            <span className="p-1 rounded-md bg-[#F3F4F6] text-[#4F46E5]">
              <List className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[22px] sm:text-[24px] font-bold text-[#111827] mt-1">
            {totalTasksCount}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-1">
            {completedCount} completed ({totalTasksCount ? Math.round((completedCount / totalTasksCount) * 100) : 0}%)
          </p>
        </div>

        {/* Pending Action */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-[12px] text-[#6B7280]">
            <span>Pending Tasks</span>
            <span className="p-1 rounded-md bg-amber-50 text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[22px] sm:text-[24px] font-bold text-amber-600 mt-1">
            {pendingCount}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-1">
            {inProgressCount} in progress
          </p>
        </div>

        {/* WhatsApp Deliveries */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-[12px] text-[#6B7280]">
            <span>WhatsApp Dispatches</span>
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <Send className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[22px] sm:text-[24px] font-bold text-emerald-600 mt-1">
            {whatsappDeliveredCount}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-1">
            Via Evolution API instance
          </p>
        </div>

        {/* Registered Staff */}
        <div 
          onClick={onOpenStaffModal}
          className="bg-white p-4 sm:p-5 rounded-xl border border-[#E5E7EB] shadow-xs hover:border-[#4F46E5] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-[12px] text-[#6B7280]">
            <span>Staff Directory</span>
            <span className="p-1 rounded-md bg-[#EEF2FF] text-[#4F46E5]">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[22px] sm:text-[24px] font-bold text-[#4F46E5] mt-1">
            {staffList.length} Staff
          </p>
          <p className="text-[11px] text-[#4F46E5] font-medium mt-1">
            Manage Contacts &rarr;
          </p>
        </div>
      </div>

      {/* Main Table / Board Container */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        {/* Controls Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white">
          <div className="flex items-center space-x-2">
            <h3 className="text-[16px] font-bold text-[#111827]">
              Task Assignments Board
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-[12px] font-semibold">
              {filteredTasks.length}
            </span>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tasks or staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-hidden focus:border-[#4F46E5]"
              />
            </div>

            {/* Filter by Staff */}
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="px-3 py-1.5 text-[13px] bg-white border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-hidden"
            >
              <option value="all">All Staff Members</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-[13px] bg-white border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {/* View Switcher */}
            <div className="flex items-center bg-[#F3F4F6] rounded-lg p-0.5 border border-[#E5E7EB]">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md text-[12px] font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-white text-[#111827] shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-1.5 rounded-md text-[12px] font-medium transition-colors ${
                  viewMode === "kanban"
                    ? "bg-white text-[#111827] shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
                title="Kanban Board View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#111827]">
                No tasks found
              </p>
              <p className="text-[13px] text-[#6B7280] mt-1 max-w-sm mx-auto">
                {tasks.length === 0
                  ? "Record your voice instructions to automatically assign tasks and WhatsApp team members."
                  : "No tasks matched your current filter criteria."}
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={onOpenVoiceModal}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg shadow-sm shadow-indigo-200 transition-all"
              >
                Record Voice Task
              </button>
              <button
                onClick={onOpenManualTaskModal}
                className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-lg transition-colors"
              >
                Add Manually
              </button>
            </div>
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[12px] font-semibold text-[#6B7280]">
                  <th className="py-3 px-4">Task Details</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">WhatsApp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[13px]">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-[#F9FAFB] transition-colors"
                  >
                    {/* Task Title & Description */}
                    <td className="py-3 px-4 max-w-xs">
                      <div>
                        <span className={`font-medium text-[#111827] block ${task.status === "completed" ? "line-through text-[#9CA3AF]" : ""}`}>
                          {task.title}
                        </span>
                        {task.description && (
                          <span className="text-[11px] text-[#6B7280] line-clamp-1">
                            {task.description}
                          </span>
                        )}
                        {task.sourceVoiceTranscription && (
                          <span className="text-[10px] text-[#4F46E5] inline-flex items-center mt-0.5">
                            <Sparkles className="w-2.5 h-2.5 mr-1" /> Voice AI
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Assigned Staff */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[11px] font-bold">
                          {task.assignedStaffName[0]}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827] block text-[13px]">
                            {task.assignedStaffName}
                          </span>
                          <span className="text-[11px] text-[#6B7280] font-mono">
                            +{task.assignedStaffPhone}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      {getPriorityBadge(task.priority)}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-4">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        className="text-[12px] font-medium py-1 px-2 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] focus:outline-hidden focus:border-[#4F46E5]"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-4 text-[#6B7280] text-[12px]">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-[#9CA3AF]" />
                        <span>{task.dueDate || "Today"}</span>
                      </div>
                    </td>

                    {/* WhatsApp Status & Resend */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {task.whatsappSent ? (
                          <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 mr-1" /> Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Not Sent
                          </span>
                        )}

                        <button
                          onClick={() => handleResendWhatsApp(task)}
                          disabled={sendingWhatsAppId === task.id}
                          className="p-1 rounded-md text-[#6B7280] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors"
                          title="Resend WhatsApp notification"
                        >
                          <Send className={`w-3.5 h-3.5 ${sendingWhatsAppId === task.id ? "animate-spin text-[#4F46E5]" : ""}`} />
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onEditTask(task)}
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id, task.title)}
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Kanban Board View */
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F9FAFB]">
            {/* Pending Column */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                <span className="text-[13px] font-bold text-[#111827] flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Pending</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                  {filteredTasks.filter((t) => t.status === "pending").length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {filteredTasks
                  .filter((t) => t.status === "pending")
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 bg-white border border-[#E5E7EB] rounded-lg shadow-xs space-y-2.5 hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-[13px] font-semibold text-[#111827] line-clamp-2">
                          {task.title}
                        </p>
                        {getPriorityBadge(task.priority)}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1 border-t border-[#F3F4F6]">
                        <span className="font-medium text-[#111827]">
                          👤 {task.assignedStaffName}
                        </span>
                        <button
                          onClick={() => handleStatusChange(task.id, "in_progress")}
                          className="text-[#4F46E5] font-semibold hover:underline"
                        >
                          Start &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                <span className="text-[13px] font-bold text-[#111827] flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]"></span>
                  <span>In Progress</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-[#EEF2FF] text-[#4F46E5] rounded-full">
                  {filteredTasks.filter((t) => t.status === "in_progress").length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {filteredTasks
                  .filter((t) => t.status === "in_progress")
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 bg-white border border-[#E5E7EB] rounded-lg shadow-xs space-y-2.5 hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-[13px] font-semibold text-[#111827] line-clamp-2">
                          {task.title}
                        </p>
                        {getPriorityBadge(task.priority)}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1 border-t border-[#F3F4F6]">
                        <span className="font-medium text-[#111827]">
                          👤 {task.assignedStaffName}
                        </span>
                        <button
                          onClick={() => handleStatusChange(task.id, "completed")}
                          className="text-emerald-600 font-semibold hover:underline"
                        >
                          Done ✓
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Completed Column */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                <span className="text-[13px] font-bold text-[#111827] flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Completed</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                  {filteredTasks.filter((t) => t.status === "completed").length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {filteredTasks
                  .filter((t) => t.status === "completed")
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg space-y-2.5 opacity-80"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-[13px] font-medium text-[#6B7280] line-through line-clamp-2">
                          {task.title}
                        </p>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1 border-t border-[#E5E7EB]">
                        <span>👤 {task.assignedStaffName}</span>
                        <button
                          onClick={() => handleStatusChange(task.id, "pending")}
                          className="text-[#6B7280] hover:underline"
                        >
                          Reopen
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
