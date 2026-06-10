import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface TrendChartData {
  month: string;
  depenses: number;
  revenus: number;
}

interface Props {
  data: TrendChartData[];
  colors: { surface: string; border: string; textMuted: string; text: string };
  formatValue: (v: number) => string;
  language: string;
}

export default function TrendChart({ data, colors, formatValue, language }: Props) {
  const labelD = language === 'en' ? 'Expenses' : 'Dépenses';
  const labelR = language === 'en' ? 'Income' : 'Revenus';

  const formatY = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return `${v}`;
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradDepenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradRevenus" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />

        <XAxis
          dataKey="month"
          tick={{ fill: colors.textMuted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatY}
          tick={{ fill: colors.textMuted, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />

        <Tooltip
          formatter={(value: any) => [value != null ? formatValue(Number(value)) : '—', '']}
          contentStyle={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            fontSize: 12,
          }}
          labelStyle={{ color: colors.text, fontWeight: 700, marginBottom: 4 }}
          cursor={{ stroke: colors.border, strokeWidth: 1 }}
        />

        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8, color: colors.textMuted }}
        />

        <Area
          type="monotone"
          dataKey="depenses"
          name={labelD}
          stroke="#EF4444"
          strokeWidth={2.5}
          fill="url(#gradDepenses)"
          dot={{ r: 3.5, fill: '#EF4444', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#EF4444' }}
        />
        <Area
          type="monotone"
          dataKey="revenus"
          name={labelR}
          stroke="#10B981"
          strokeWidth={2.5}
          fill="url(#gradRevenus)"
          dot={{ r: 3.5, fill: '#10B981', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#10B981' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
