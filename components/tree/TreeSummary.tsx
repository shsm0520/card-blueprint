"use client";

import { useMemo } from "react";
import {
  DollarSign,
  Gift,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface TreeSummaryProps {
  nodes: Array<{
    card: {
      name: string;
      issuer: string;
      annualFee: number;
      tags: string[];
    };
    plannedDate?: string | null;
    monthsAfterPrevious?: number | null;
    countsToward524?: boolean;
  }>;
}

export default function TreeSummary({ nodes }: TreeSummaryProps) {
  const stats = useMemo(() => {
    const totalAnnualFee = nodes.reduce(
      (sum, node) => sum + node.card.annualFee,
      0
    );

    // Count reward types from tags
    const rewardTypeCounts: Record<string, number> = {};
    const rewardTypeKeywords = [
      "Cashback",
      "Travel Points",
      "Miles",
      "Hotel Points",
      "MR",
      "UR",
    ];

    nodes.forEach((node) => {
      // Find reward type tags
      const rewardTags = node.card.tags.filter((tag) =>
        rewardTypeKeywords.some((keyword) =>
          tag.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      // If no reward type found, use first tag or "Other"
      const rewardType =
        rewardTags.length > 0 ? rewardTags[0] : node.card.tags[0] || "Other";

      rewardTypeCounts[rewardType] = (rewardTypeCounts[rewardType] || 0) + 1;
    });

    // Count issuers
    const issuerCounts: Record<string, number> = {};
    nodes.forEach((node) => {
      const issuer = node.card.issuer;
      issuerCounts[issuer] = (issuerCounts[issuer] || 0) + 1;
    });

    // 5/24 tracking - count cards that count toward 5/24
    const chase524Count = nodes.filter(
      (node) => node.countsToward524 !== false
    ).length;
    const chase524Status = chase524Count >= 5 ? "over" : "under";

    return {
      totalCards: nodes.length,
      totalAnnualFee,
      rewardTypeCounts,
      issuerCounts,
      chase524Count,
      chase524Status,
    };
  }, [nodes]);

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6 space-y-6 overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-900">Strategy Summary</h3>

      {/* Total Cards */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Cards</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalCards}
            </p>
          </div>
        </div>
      </div>

      {/* Total Annual Fee */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-600 rounded-lg">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Annual Fees</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.totalAnnualFee.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">per year</p>
          </div>
        </div>
      </div>

      {/* Chase 5/24 Status */}
      <div
        className={`p-4 border rounded-lg ${
          stats.chase524Status === "over"
            ? "bg-red-50 border-red-200"
            : "bg-green-50 border-green-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              stats.chase524Status === "over" ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {stats.chase524Status === "over" ? (
              <AlertTriangle className="h-5 w-5 text-white" />
            ) : (
              <Calendar className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Chase 5/24 Status</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.chase524Count}/5
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.chase524Status === "over"
                ? "At or over 5/24 limit"
                : "Under 5/24 limit"}
            </p>
          </div>
        </div>
      </div>

      {/* Reward Types */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-900">Reward Types</h4>
        </div>
        <div className="space-y-2">
          {Object.entries(stats.rewardTypeCounts).map(([type, count]) => (
            <div
              key={type}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <span className="text-sm text-gray-700 capitalize">{type}</span>
              <span className="text-sm font-semibold text-gray-900">
                {count} {count === 1 ? "card" : "cards"}
              </span>
            </div>
          ))}
          {Object.keys(stats.rewardTypeCounts).length === 0 && (
            <p className="text-sm text-gray-500">No cards yet</p>
          )}
        </div>
      </div>

      {/* Card Issuers */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">By Issuer</h4>
        <div className="space-y-2">
          {Object.entries(stats.issuerCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([issuer, count]) => (
              <div
                key={issuer}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="text-sm text-gray-700">{issuer}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {count}
                </span>
              </div>
            ))}
          {Object.keys(stats.issuerCounts).length === 0 && (
            <p className="text-sm text-gray-500">No cards yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
