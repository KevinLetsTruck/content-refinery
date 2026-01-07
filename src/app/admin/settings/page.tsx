"use client";

import { useState, useEffect } from "react";

interface CCStatus {
  connected: boolean;
  listsCount?: number;
  lists?: Array<{
    id: string;
    name: string;
    memberCount: number;
  }>;
  error?: string;
  authUrl?: string;
}

export default function SettingsPage() {
  const [ccStatus, setCCStatus] = useState<CCStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [message, setMessage] = useState("");

  // Check for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cc_success")) {
      setMessage("✅ Successfully connected to Constant Contact!");
      window.history.replaceState({}, "", "/admin/settings");
    }
    if (params.get("cc_error")) {
      setMessage(`❌ Error: ${params.get("cc_error")}`);
      window.history.replaceState({}, "", "/admin/settings");
    }
  }, []);

  // Fetch CC status
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/constantcontact");
      const data = await response.json();
      setCCStatus(data);
    } catch (error) {
      setCCStatus({ connected: false, error: "Failed to fetch status" });
    } finally {
      setLoading(false);
    }
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch("/api/constantcontact/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName }),
      });
      
      if (response.ok) {
        setMessage(`✅ List "${newListName}" created!`);
        setNewListName("");
        fetchStatus(); // Refresh list
      } else {
        const error = await response.json();
        setMessage(`❌ Failed to create list: ${error.error}`);
      }
    } catch (error) {
      setMessage("❌ Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {message}
          </div>
        )}

        {/* Constant Contact Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            Constant Contact
          </h2>

          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : ccStatus?.connected ? (
            <div>
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Connected ({ccStatus.listsCount} lists)
              </div>

              {/* Lists */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Your Lists</h3>
                <div className="space-y-2">
                  {ccStatus.lists?.map(list => (
                    <div key={list.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <div>
                        <span className="font-medium">{list.name}</span>
                        <span className="text-gray-500 text-sm ml-2">({list.memberCount} contacts)</span>
                      </div>
                      <code className="text-xs text-gray-400">{list.id}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create List */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-700 mb-2">Create New List</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name (e.g., Blood Sugar Guide Leads)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={createList}
                    disabled={creating || !newListName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Connect to Constant Contact to automatically add landing page subscribers to your email lists.
              </p>
              <a
                href="/api/auth/constantcontact"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Connect Constant Contact
              </a>
              {ccStatus?.error && (
                <p className="text-red-500 text-sm mt-2">{ccStatus.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Landing Pages Quick Reference */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Landing Page List IDs</h2>
          <p className="text-gray-600 mb-4">
            Copy a list ID above and add it to your landing page configuration to enable auto-subscription.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <code className="text-sm text-gray-700">
              constantContactListId: &quot;paste-list-id-here&quot;
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
