"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { SankeyData } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";

const ResponsiveSankey = dynamic(
  () => import("@nivo/sankey").then((m) => m.ResponsiveSankey),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-xl" /> },
);

type Props = {
  data: SankeyData;
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
  "#0ea5e9",
  "#22c55e",
];

export function MiniSankey({ data, currency }: Props) {
  if (data.nodes.length === 0) {
    return (
      <div className="glass-thin text-muted-foreground flex h-72 items-center justify-center rounded-(--radius-card) text-sm">
        Niciun flow de tranzacții luna asta.
      </div>
    );
  }

  // Atribuie culori stabile pe baza poziției nodurilor.
  const coloredNodes = data.nodes.map((n, i) => ({
    ...n,
    nodeColor: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="glass-thin rounded-(--radius-card) p-2">
      <h3 className="text-muted-foreground px-2 pt-1 text-xs uppercase tracking-wider">
        Bani luna asta
      </h3>
      <div className="h-72 w-full">
        <ResponsiveSankey
          data={{ nodes: coloredNodes, links: data.links }}
          margin={{ top: 8, right: 110, bottom: 8, left: 110 }}
          align="justify"
          colors={(node) => {
            const n = node as unknown as {
              nodeColor?: string;
              data?: { nodeColor?: string };
            };
            return n.nodeColor ?? n.data?.nodeColor ?? "#64748b";
          }}
          nodeOpacity={1}
          nodeHoverOpacity={1}
          nodeThickness={14}
          nodeSpacing={14}
          nodeBorderWidth={0}
          nodeInnerPadding={2}
          linkOpacity={0.3}
          linkHoverOpacity={0.5}
          linkContract={2}
          enableLinkGradient
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={6}
          labelTextColor="currentColor"
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
          nodeTooltip={({ node }: { node: { id: string; value: number } }) => (
            <div className="bg-popover text-popover-foreground rounded-md border px-2 py-1.5 text-xs shadow">
              <p className="font-medium">{node.id}</p>
              <p className="tabular-nums">
                {formatMoney(node.value, currency)}
              </p>
            </div>
          )}
          linkTooltip={({
            link,
          }: {
            link: { source: { id: string }; target: { id: string }; value: number };
          }) => (
            <div className="bg-popover text-popover-foreground rounded-md border px-2 py-1.5 text-xs shadow">
              <p>
                {link.source.id} → {link.target.id}
              </p>
              <p className="tabular-nums font-medium">
                {formatMoney(link.value, currency)}
              </p>
            </div>
          )}
        />
      </div>
    </div>
  );
}
