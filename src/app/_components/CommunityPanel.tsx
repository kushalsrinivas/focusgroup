"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

export function CommunityPanel() {
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month"
  >("today");

  const { data: leaderboard } = api.focus.getLeaderboard.useQuery({
    period: selectedPeriod,
    limit: 10,
  });

  const { data: activeSessions } = api.focus.getActiveSessions.useQuery();

  const { data: userRank } = api.focus.getUserRank.useQuery({
    period: selectedPeriod,
  });

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    if (rank <= 10) return "🔥";
    if (rank <= 50) return "⭐";
    return "💪";
  };

  const getPercentileMessage = (percentile: number) => {
    if (percentile >= 90) return "Amazing! You're crushing it! 🚀";
    if (percentile >= 75) return "Great work! Keep it up! 💪";
    if (percentile >= 50) return "You're doing well! 👍";
    if (percentile >= 25) return "Keep pushing forward! 📈";
    return "Every minute counts! 🌱";
  };

  return (
    <div className="space-y-6">
      {/* User Rank Card */}
      {userRank && (
        <div className="card from-primary to-secondary text-primary-content bg-gradient-to-br shadow-lg">
          <div className="card-body text-center">
            <h3 className="card-title justify-center text-lg">Your Rank</h3>
            <div className="text-4xl font-bold">
              {getRankEmoji(userRank.rank)} #{userRank.rank}
            </div>
            <div className="text-sm opacity-90">
              {formatTime(userRank.totalTime)} • Top {userRank.percentile}%
            </div>
            <div className="mt-2 text-xs opacity-80">
              {getPercentileMessage(userRank.percentile)}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-sm">🏆 Leaderboard</h3>
            <div className="tabs tabs-boxed tabs-xs">
              <button
                className={`tab ${selectedPeriod === "today" ? "tab-active" : ""}`}
                onClick={() => setSelectedPeriod("today")}
              >
                Today
              </button>
              <button
                className={`tab ${selectedPeriod === "week" ? "tab-active" : ""}`}
                onClick={() => setSelectedPeriod("week")}
              >
                Week
              </button>
              <button
                className={`tab ${selectedPeriod === "month" ? "tab-active" : ""}`}
                onClick={() => setSelectedPeriod("month")}
              >
                Month
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {leaderboard?.map((user, index) => (
              <div
                key={user.userId}
                className={`flex items-center gap-3 rounded p-2 ${
                  index < 3
                    ? "from-warning/10 bg-gradient-to-r to-transparent"
                    : "bg-base-200"
                }`}
              >
                <div className="text-lg">
                  {index === 0 && "🥇"}
                  {index === 1 && "🥈"}
                  {index === 2 && "🥉"}
                  {index > 2 && (
                    <span className="text-base-content/70 text-sm font-bold">
                      #{index + 1}
                    </span>
                  )}
                </div>

                <div className="avatar">
                  <div className="w-8 rounded-full">
                    <img
                      src={user.userImage ?? "/default-avatar.svg"}
                      alt={user.userName ?? "User"}
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.svg";
                      }}
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {user.userName ?? "Anonymous"}
                  </div>
                  <div className="text-xs opacity-70">
                    {user.sessionCount} session
                    {user.sessionCount !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-primary text-sm font-bold">
                    {formatTime(user.totalTime)}
                  </div>
                </div>
              </div>
            ))}

            {(!leaderboard || leaderboard.length === 0) && (
              <div className="py-4 text-center text-sm opacity-70">
                No data for this period yet.
                <br />
                Be the first to focus! 🎯
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Sessions Feed */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-sm">⚡ Live Sessions</h3>

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {activeSessions?.map((session) => (
              <div
                key={session.id}
                className="bg-base-200 flex items-center gap-3 rounded-lg p-3"
              >
                <div className="avatar">
                  <div className="w-8 rounded-full">
                    <img
                      src={session.userImage ?? "/default-avatar.svg"}
                      alt={session.userName ?? "User"}
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.svg";
                      }}
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {session.userName ?? "Anonymous"}
                  </div>
                  <div className="truncate text-xs opacity-70">
                    {session.title ?? "Focus Session"}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="badge badge-xs badge-success">
                      {session.plannedDuration}m
                    </div>
                    {session.categoryName && (
                      <div
                        className="badge badge-xs text-white"
                        style={{ backgroundColor: session.categoryColor }}
                      >
                        {session.categoryName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs opacity-70">
                    {formatTimeAgo(session.startedAt)}
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-1">
                    <div className="bg-success h-2 w-2 animate-pulse rounded-full"></div>
                    <span className="text-success text-xs font-medium">
                      Live
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {(!activeSessions || activeSessions.length === 0) && (
              <div className="py-8 text-center text-sm opacity-70">
                <div className="mb-2 text-2xl">😴</div>
                No one is focusing right now.
                <br />
                Start a session to motivate others!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Motivational Insights */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-sm">💡 Focus Insights</h3>

          <div className="space-y-3">
            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="h-6 w-6 shrink-0 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div className="text-xs">
                <div className="font-semibold">Peak Focus Time</div>
                <div>Most users focus best at 10 AM ⏰</div>
              </div>
            </div>

            <div className="alert alert-success">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 shrink-0 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-xs">
                <div className="font-semibold">Consistency Tip</div>
                <div>25-minute sessions boost retention by 40% 📚</div>
              </div>
            </div>

            <div className="alert alert-warning">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 shrink-0 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div className="text-xs">
                <div className="font-semibold">Challenge</div>
                <div>Can you beat yesterday's focus time? 🎯</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
