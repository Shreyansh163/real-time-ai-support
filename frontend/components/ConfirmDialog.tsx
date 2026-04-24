"use client";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmTone = "primary",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "primary" | "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const tones: Record<string, string> = {
    primary: "bg-indigo-600 hover:bg-indigo-500",
    danger: "bg-rose-600 hover:bg-rose-500",
    success: "bg-emerald-600 hover:bg-emerald-500",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-sm rounded-md text-white font-medium transition-colors ${tones[confirmTone]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
