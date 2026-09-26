export const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
    <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    {children}
  </section>
)
