// Shown instantly on navigation while the target page renders on the server.
// Keeps the navy sidebar area filled so the layout doesn't flash/jump.
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed inset-y-0 left-0 hidden w-64 bg-[#15213C] lg:block" />
      <div className="flex min-h-screen items-center justify-center lg:pl-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-pink/30 border-t-brand-pink" />
      </div>
    </div>
  );
}
