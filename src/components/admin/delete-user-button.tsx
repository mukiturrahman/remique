'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteUserButton({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        alert('Failed to delete user.');
        setLoading(false);
      }
    } catch (e) {
      alert('Failed to delete user.');
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="ml-3 inline-flex items-center justify-center rounded-lg bg-red-50 px-3.5 py-1.5 text-[13px] font-semibold text-red-600 border border-red-200 transition-all hover:bg-red-100"
      >
        Delete User
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-ink mb-2">Delete User Account</h2>
            <p className="text-[15px] text-ink-2 mb-4 leading-relaxed">
              Are you absolutely sure you want to completely delete this user?
            </p>
            <div className="rounded-xl bg-red-50 p-4 border border-red-100 mb-6">
              <p className="text-[14px] text-red-700 font-medium">
                Warning: This action cannot be undone. All reminders, notes, chat messages, and subscription data will be permanently wiped from the database.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-[14px] font-semibold text-ink-2 hover:bg-black/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-[14px] font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
