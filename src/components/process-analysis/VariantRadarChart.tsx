import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { type MockVariant } from "@/data/useCaseDetailData";

const RADAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210, 70%, 50%)",
  "hsl(150, 60%, 40%)",
];

const levelToScore = (level: string): number => {
  switch (level) {
    case "low": return 2;
    case "medium": return 5;
    case "high": return 8;
    default: return 5;
  }
};

const roiToScore = (roi: string): number => {
  const pct = parseInt(roi.replace(/[^0-9]/g, ""));
  if (isNaN(pct)) return 5;
  if (pct >= 200) return 9;
  if (pct >= 100) return 7;
  if (pct >= 50) return 5;
  return 3;
};

const timelineToScore = (timeline: string): number => {
  const months = parseInt(timeline.replace(/[^0-9]/g, ""));
  if (isNaN(months)) return 5;
  if (months <= 2) return 9;
  if (months <= 4) return 7;
  if (months <= 6) return 5;
  if (months <= 9) return 3;
  return 1;
};

const costToRiskScore = (cost: string): number => {
  const num = parseInt(cost.replace(/[^0-9]/g, ""));
  if (isNaN(num)) return 5;
  if (num >= 200000) return 2;
  if (num >= 100000) return 4;
  if (num >= 50000) return 6;
  return 8;
};

interface Props {
  variants: MockVariant[];
}

const axes = [
  { key: "cost", label: "Coût" },
  { key: "complexity", label: "Complexité" },
  { key: "roi", label: "ROI" },
  { key: "risk", label: "Risque" },
  { key: "timeline", label: "Délai" },
];

export default function VariantRadarChart({ variants }: Props) {
  const data = axes.map((axis) => {
    const entry: Record<string, string | number> = { axis: axis.label };
    variants.forEach((v) => {
      let score: number;
      switch (axis.key) {
        case "cost":
          score = costToRiskScore(v.estimated_cost);
          break;
        case "complexity":
          // Invert: low complexity = high score (better)
          score = 10 - levelToScore(v.complexity);
          break;
        case "roi":
          score = roiToScore(v.roi_estimate);
          break;
        case "risk":
          // Derive risk from complexity inverse
          score = 10 - levelToScore(v.complexity);
          break;
        case "timeline":
          score = timelineToScore(v.estimated_timeline);
          break;
        default:
          score = 5;
      }
      entry[v.variant_name] = score;
    });
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 10]}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickCount={6}
        />
        {variants.map((v, i) => (
          <Radar
            key={v.variant_number}
            name={v.variant_name}
            dataKey={v.variant_name}
            stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
            fill={RADAR_COLORS[i % RADAR_COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
