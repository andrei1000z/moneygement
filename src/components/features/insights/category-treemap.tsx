"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { TreemapNode } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";

const ResponsiveTreeMap = dynamic(
  () => import("@nivo/treemap").then((m) => m.ResponsiveTreeMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
  },
);

type Props = {
  data: TreemapNode[];
  currency: string;
};

const PALETTE = [
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#64748b",
];

export function CategoryTreemap({ data, currency }: Props) {
  if (data.length === 0) {
    return (
      <div className="border-border/60 bg-card text-muted-foreground flex h-72 items-center justify-center rounded-xl border text-sm">
        Nicio cheltuială în perioada selectată.
      </div>
    );
  }

  const root = {
    name: "Total",
    children: data.map((d, i) => ({
      ...d,
      color: PALETTE[i % PALETTE.length],
    })),
  };

  return (
    <div className="border-border/60 bg-card rounded-xl border p-4">
      <h3 className="text-muted-foreground mb-3 text-xs uppercase tracking-wider">
        Cheltuieli pe categorii
      </h3>
      <div className="h-72 w-full">
        <ResponsiveTreeMap
          data={root}
          identity="name"
          value="value"
          valueFormat={(v: number) => formatMoney(v, currency)}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          labelSkipSize={20}
          label={(node) => {
            const n = node as unknown as {
              id?: string;
              formattedValue?: string | number;
            };
            return `${n.id ?? ""} ${String(n.formattedValue ?? "")}`;
          }}
          labelTextColor="#fff"
          parentLabelTextColor="#fff"
          nodeOpacity={1}
          colors={(node: { data?: { color?: string } }) =>
            node.data?.color ?? "#64748b"
          }
          borderColor="var(--background)"
          borderWidth={2}
          theme={{
            text: { fontSize: 11 },
            tooltip: {
              container: {
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
                borderRadius: 6,
              },
            },
          }}
        />
      </div>
    </div>
  );
}
