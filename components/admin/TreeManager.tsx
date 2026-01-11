"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type TreeSummary = {
  id: string;
  title: string;
  goal: string;
  chase524Status: string;
  creditProfile: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function TreeManager({ adminKey }: { adminKey: string }) {
  const [trees, setTrees] = useState<TreeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/card/api/dashboard/trees/", {
        headers: { "X-Admin-Key": adminKey },
      });
      if (!res.ok) throw new Error("Failed to fetch trees");
      const json = await res.json();
      setTrees(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch trees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tree? This cannot be undone.")) return;
    try {
      const res = await fetch(`/card/api/dashboard/trees/${id}/`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      });
      if (!res.ok) throw new Error("Failed to delete tree");
      await fetchTrees();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete tree");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trees</h2>
        <Button variant="outline" onClick={fetchTrees} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trees.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-gray-500">ID: {t.id}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(t.createdAt).toLocaleString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700">
                <div>Goal: {t.goal}</div>
                <div>524: {t.chase524Status}</div>
                <div>Profile: {t.creditProfile}</div>
                <div>Views: {t.viewCount}</div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(`/card/tree/${t.id}/`, "_blank")}
                >
                  View
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(t.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
