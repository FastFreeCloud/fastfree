export default function Loading() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[var(--ff-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm" style={{ fontFamily: 'var(--ff-font-body)' }}>
          جاري التحميل...
        </p>
      </div>
    </div>
  );
}
