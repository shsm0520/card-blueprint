import { Metadata } from "next";
import { notFound } from "next/navigation";
import TreePageClient from "@/components/tree/TreePageClient";
import Disclaimers from "@/components/tree/Disclaimers";

interface TreePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Fetch tree data
async function getTree(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/card/api/trees/${id}/`, {
      cache: "no-store", // Always fetch fresh data for view count
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Failed to fetch tree:", error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: TreePageProps): Promise<Metadata> {
  const { id } = await params;
  const tree = await getTree(id);

  if (!tree) {
    return {
      title: "Tree Not Found",
    };
  }

  const goalLabels = {
    cashback: "Cashback",
    airline: "Airline Miles",
    hotel: "Hotel Points",
    status: "Hotel Status",
  };

  const description = `Credit card strategy tree: ${tree.title}. Goal: ${
    goalLabels[tree.goal as keyof typeof goalLabels] || tree.goal
  }. Chase 5/24: ${tree.chase524Status}. ${
    tree.nodes.length
  } cards recommended.`;

  return {
    title: `${tree.title} - Card Strategy Tree`,
    description,
    openGraph: {
      title: tree.title,
      description,
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function TreePage({
  params,
  searchParams,
}: TreePageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const tree = await getTree(id);

  if (!tree) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tree.title}</h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span className="inline-flex items-center">
                  <span className="font-medium">Goal:</span>
                  <span className="ml-1 capitalize">{tree.goal}</span>
                </span>
                <span className="inline-flex items-center">
                  <span className="font-medium">Chase 5/24:</span>
                  <span className="ml-1 capitalize">
                    {tree.chase524Status
                      .replace("under", "Under 5/24")
                      .replace("over", "Over 5/24")}
                  </span>
                </span>
                <span className="inline-flex items-center">
                  <span className="font-medium">Views:</span>
                  <span className="ml-1">{tree.viewCount}</span>
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="/card/"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Create Your Own
              </a>
            </div>
          </div>

          {tree.note && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-gray-700">{tree.note}</p>
            </div>
          )}
        </div>
      </header>

      {/* Disclaimers */}
      <Disclaimers />

      {/* Tree Visualization or Editor */}
      <TreePageClient
        tree={tree}
        startInEdit={resolvedSearchParams?.mode === "edit"}
      />

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-500">
        <p>
          Created {new Date(tree.createdAt).toLocaleDateString()} • Last updated{" "}
          {new Date(tree.updatedAt).toLocaleDateString()}
        </p>
      </footer>
    </div>
  );
}
