import { LineChart } from 'react-native-chart-kit';
import { Text, useWindowDimensions } from 'react-native';

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

export default function TrendChart({ data, colors, language }: Props) {
  const { width } = useWindowDimensions();
  const labelD = language === 'en' ? 'Expenses' : 'Dépenses';
  const labelR = language === 'en' ? 'Income' : 'Revenus';

  const hasData = data.some((d) => d.depenses > 0 || d.revenus > 0);

  if (!hasData) {
    return (
      <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 20 }}>
        {language === 'en' ? 'No data for this period.' : 'Aucune donnée pour cette période.'}
      </Text>
    );
  }

  const chartData = {
    labels: data.map((d) => d.month),
    datasets: [
      {
        data: data.map((d) => d.depenses),
        color: (opacity = 1) => `rgba(239,68,68,${opacity})`,
        strokeWidth: 2,
      },
      {
        data: data.map((d) => d.revenus),
        color: (opacity = 1) => `rgba(16,185,129,${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: [labelD, labelR],
  };

  return (
    <LineChart
      data={chartData}
      width={width - 80}
      height={200}
      yAxisLabel=""
      yAxisSuffix=""
      fromZero
      bezier
      chartConfig={{
        backgroundColor: colors.surface,
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(99,102,241,${opacity})`,
        labelColor: () => colors.textMuted,
        propsForDots: { r: '4', strokeWidth: '2' },
        propsForLabels: { fontSize: 10 },
      }}
      style={{ borderRadius: 8 }}
    />
  );
}
