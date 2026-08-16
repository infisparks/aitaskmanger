"use client";

import React, { useState } from "react";
import { StaffContact } from "@/types";
import { addStaffMember, updateStaffMember, deleteStaffMember } from "@/lib/firebase";
import { formatIndianPhoneNumber } from "@/lib/whatsapp";
import { X, UserPlus, Trash2, Edit2, Phone, Building2, Check, Search, Sparkles } from "lucide-react";

interface StaffDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffContact[];
}

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-purple-500",
  "bg-blue-500",
  "bg-teal-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
];

export const StaffDirectoryModal: React.FC<StaffDirectoryModalProps> = ({
  isOpen,
  onClose,
  staffList,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Operations");

  if (!isOpen) return null;

  const resetForm = () => {
    setName("");
    setPhone("");
    setDepartment("Operations");
    setEditingStaffId(null);
    setErrorMsg("");
  };

  const handleEdit = (staff: StaffContact) => {
    setEditingStaffId(staff.id);
    setName(staff.name);
    setPhone(staff.phone);
    setDepartment(staff.department);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter staff member's name");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Please enter valid WhatsApp phone number");
      return;
    }

    const cleanPhone = formatIndianPhoneNumber(phone);
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (editingStaffId) {
        await updateStaffMember(editingStaffId, {
          name: name.trim(),
          phone: cleanPhone,
          department: department.trim() || "General",
        });
      } else {
        const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        await addStaffMember({
          name: name.trim(),
          phone: cleanPhone,
          department: department.trim() || "General",
          avatarColor: randomColor,
          active: true,
        });
      }
      resetForm();
    } catch (err: any) {
      console.error("Error saving staff:", err);
      setErrorMsg(err.message || "Failed to save staff contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, staffName: string) => {
    if (confirm(`Are you sure you want to remove ${staffName} from staff contacts?`)) {
      try {
        await deleteStaffMember(id);
        if (editingStaffId === id) resetForm();
      } catch (err: any) {
        alert("Failed to delete staff: " + err.message);
      }
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white sm:rounded-2xl w-full max-w-4xl shadow-2xl border-0 sm:border border-[#E5E7EB] flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-[16px] sm:text-[20px] font-bold text-[#111827]">
              Staff Directory & Contacts
            </h2>
            <p className="text-[11px] sm:text-[13px] text-[#6B7280]">
              Save contacts once for AI voice matching and WhatsApp dispatch.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 bg-[#F9FAFB]">
          {/* Add / Edit Form Card */}
          <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-[#111827] flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-[#4F46E5]" />
                <span>{editingStaffId ? "Edit Staff Contact" : "Add New Staff Contact"}</span>
              </h3>
              {editingStaffId && (
                <button
                  onClick={resetForm}
                  className="text-[12px] text-[#4F46E5] hover:underline font-medium"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-1">
                    Staff Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mudassir"
                    className="w-full px-3 py-2 text-[14px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-hidden focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <span className="text-[11px] text-[#6B7280] mt-0.5 block">
                    Spoken name for voice matching
                  </span>
                </div>

                {/* WhatsApp Phone */}
                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-1">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[13px] text-[#6B7280] font-medium">
                      +91
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full pl-12 pr-3 py-2 text-[14px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-hidden focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                  <span className="text-[11px] text-[#6B7280] mt-0.5 block">
                    10-digit mobile number
                  </span>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-[14px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-hidden focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="Engineering">Engineering / Tech</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales & Marketing</option>
                    <option value="Accounts">Accounts & Finance</option>
                    <option value="Support">Customer Support</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-[13px] font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingStaffId ? "Update Staff" : "Save Staff Member"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Staff List Table */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
              <div className="flex items-center space-x-2">
                <h4 className="text-[14px] font-semibold text-[#111827]">
                  Registered Staff Members ({staffList.length})
                </h4>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-hidden focus:border-[#4F46E5]"
                />
              </div>
            </div>

            {filteredStaff.length === 0 ? (
              <div className="py-12 text-center text-[#6B7280] text-[13px]">
                {staffList.length === 0 ? (
                  <div className="max-w-sm mx-auto space-y-2">
                    <p className="font-medium text-[#111827]">No staff members registered yet.</p>
                    <p>Add your team members above with their WhatsApp numbers so Gemini can match voice assignments to them.</p>
                  </div>
                ) : (
                  <p>No staff matches "{searchQuery}"</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[12px] font-semibold text-[#6B7280]">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">WhatsApp Contact</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[13px]">
                    {filteredStaff.map((staff) => {
                      const initials = staff.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={staff.id}
                          className="hover:bg-[#F9FAFB] transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold ${
                                  staff.avatarColor || "bg-indigo-500"
                                }`}
                              >
                                {initials}
                              </div>
                              <div>
                                <span className="font-medium text-[#111827] block">
                                  {staff.name}
                                </span>
                                <span className="text-[11px] text-[#6B7280]">
                                  ID: {staff.id.substring(0, 6)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-[#374151]">
                            <div className="flex items-center space-x-1.5 font-mono text-[12px]">
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              <span>+{staff.phone}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF2FF] text-[#4F46E5] border border-indigo-100">
                              {staff.department}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleEdit(staff)}
                                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors"
                                title="Edit staff details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(staff.id, staff.name)}
                                className="p-1.5 rounded-lg text-[#6B7280] hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete staff"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E7EB] bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
