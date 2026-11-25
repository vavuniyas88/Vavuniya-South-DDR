import {BarChart3} from 'lucide-react';
import {useMemo} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {TranslationDictionary} from '../i18n/translations.ts';
import type {DutyEntry} from '../types.ts';

interface DutySubmissionsChartProps {
  duties: DutyEntry[];
  officerLabel: string;
  t: TranslationDictionary;
}

interface DayChartPoint {
  date: string;
  shortDate: string;
  submitted: number;
  approved: number;
  total: number;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DutySubmissionsChart({
  duties,
  officerLabel,
  t,
}: DutySubmissionsChartProps) {
  const {chartData, totalSubmitted30Days, pendingCount30Days, approvedCount30Days} = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayMap = new Map<string, {submitted: number; approved: number}>();
    const dates: string[] = [];

    for (let offset = 29; offset >= 0; offset -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const iso = formatLocalDate(d);
      dates.push(iso);
      dayMap.set(iso, {submitted: 0, approved: 0});
    }

    let pendingSum = 0;
    let approvedSum = 0;

    for (const duty of duties) {
      if (duty.officerRole === 'admin') {
        continue;
      }
      if (duty.status !== 'submitted' && duty.status !== 'approved') {
        continue;
      }
      const bucket = dayMap.get(duty.date);
      if (!bucket) {
        continue;
      }
      if (duty.status === 'approved') {
        bucket.approved += 1;
        approvedSum += 1;
      } else {
        bucket.submitted += 1;
        pendingSum += 1;
      }
    }

    const points: DayChartPoint[] = dates.map((iso) => {
      const bucket = dayMap.get(iso) ?? {submitted: 0, approved: 0};
      return {
        date: iso,
        shortDate: iso.slice(5), // MM-DD
        submitted: bucket.submitted,
        approved: bucket.approved,
        total: bucket.submitted + bucket.approved,
      };
    });

    return {
      chartData: points,
      totalSubmitted30Days: pendingSum + approvedSum,
      pendingCount30Days: pendingSum,
      approvedCount30Days: approvedSum,
    };
  }, [duties]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t.admin.chartTitle}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.admin.chartSubtitle} · <span className="font-medium text-slate-700">{officerLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm tabular-nums">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500">{t.admin.chartTotal30Days}: </span>
            <strong className="text-slate-900">{totalSubmitted30Days}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
            <span>{t.admin.chartPendingLabel}: </span>
            <strong>{pendingCount30Days}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900">
            <span>{t.admin.chartApprovedLabel}: </span>
            <strong>{approvedCount30Days}</strong>
          </div>
        </div>
      </div>

      <div className="w-full h-[260px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{top: 8, right: 12, left: -8, bottom: 0}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="shortDate"
              tick={{fontSize: 11, fill: '#64748b'}}
              tickLine={false}
              axisLine={{stroke: '#cbd5e1'}}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              allowDecimals={false}
              tick={{fontSize: 11, fill: '#64748b'}}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              cursor={{fill: '#f1f5f9'}}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                borderRadius: '0.5rem',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              }}
              labelFormatter={(_label, payload) => {
                const point = payload?.[0]?.payload as DayChartPoint | undefined;
                return point ? `${t.common.date}: ${point.date} (${t.admin.chartTotalLabel}: ${point.total})` : '';
              }}
            />
            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '8px'}} />
            <Bar
              dataKey="approved"
              stackId="duties"
              name={t.statuses.approved}
              fill="#0d9488"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="submitted"
              stackId="duties"
              name={t.statuses.submitted}
              fill="#d97706"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {totalSubmitted30Days === 0 && (
        <p className="text-center text-xs text-slate-500">{t.admin.chartNoSubmissions30Days}</p>
      )}
    </section>
  );
}
