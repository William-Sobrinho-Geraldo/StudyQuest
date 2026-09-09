import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const HOURS_PER_DAY = [
  { day: 'Seg', hours: 2.5 },
  { day: 'Ter', hours: 3.0 },
  { day: 'Qua', hours: 1.5 },
  { day: 'Qui', hours: 4.0 },
  { day: 'Sex', hours: 2.0 },
  { day: 'Sáb', hours: 3.5 },
  { day: 'Dom', hours: 1.0 },
]

const HOURS_PER_SUBJECT = [
  { subject: 'Programação', hours: 12 },
  { subject: 'Matemática', hours: 8.5 },
  { subject: 'História', hours: 5.0 },
  { subject: 'Física', hours: 3.5 },
]

const PIE_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981']

export function MetricsCharts() {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-white">Métricas de Estudo</h2>
      <p className="mt-1 text-sm text-slate-400">
        Visão semanal do seu progresso.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm font-semibold text-slate-300">
            Horas estudadas por dia
          </h3>
          <div className="mt-4 flex justify-center">
            <BarChart width={480} height={240} data={HOURS_PER_DAY}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: '#1e293b' }}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="hours" name="Horas" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm font-semibold text-slate-300">
            Horas por disciplina
          </h3>
          <div className="mt-4 flex justify-center">
            <PieChart width={480} height={240}>
              <Pie
                data={HOURS_PER_SUBJECT}
                dataKey="hours"
                nameKey="subject"
                cx="50%"
                cy="50%"
                outerRadius={90}
                isAnimationActive={false}
                label={(entry) => (entry as { subject?: string }).subject ?? ''}
              >
                {HOURS_PER_SUBJECT.map((entry, index) => (
                  <Cell
                    key={entry.subject}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        </div>
      </div>
    </section>
  )
}