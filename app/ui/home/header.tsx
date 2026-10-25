export default function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">HL Budget</span>
        {children}
      </div>
    </header>
  );
}
