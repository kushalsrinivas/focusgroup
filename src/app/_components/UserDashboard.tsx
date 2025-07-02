"use client";

import { api } from "@/trpc/react";

export function UserDashboard() {
  const { data: dashboard, isLoading } = api.focus.getDashboard.useQuery();
  const { data: weeklyAnalytics } = api.focus.getWeeklyAnalytics.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="skeleton h-4 w-3/4"></div>
            <div className="skeleton h-8 w-full"></div>
            <div className="skeleton h-4 w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats;
  const currentLevelXp = (stats?.totalXp || 0) % 1000;
  const xpProgress = (currentLevelXp / 1000) * 100;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* User Level & XP */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-primary">
            Level {stats?.level || 1}
            <div className="badge badge-secondary">
              {stats?.totalXp || 0} XP
            </div>
          </h2>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Level {(stats?.level || 1) + 1}</span>
              <span>{currentLevelXp}/1000 XP</span>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={xpProgress}
              max="100"
            ></progress>
          </div>
        </div>
      </div>

      {/* Streak Counter */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-sm">🔥 Focus Streak</h3>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-primary text-2xl font-bold">
                {stats?.currentStreak || 0}
              </div>
              <div className="text-xs opacity-70">Current</div>
            </div>
            <div className="divider divider-horizontal"></div>
            <div className="text-center">
              <div className="text-secondary text-2xl font-bold">
                {stats?.longestStreak || 0}
              </div>
              <div className="text-xs opacity-70">Best</div>
            </div>
          </div>

          <div
            className="radial-progress text-primary border-primary/20 mx-auto mt-4 border-4"
            style={
              {
                "--value": Math.min((stats?.currentStreak || 0) * 10, 100),
              } as React.CSSProperties
            }
            role="progressbar"
            aria-valuenow={stats?.currentStreak || 0}
          >
            {stats?.currentStreak || 0}
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-sm">📊 Today's Focus</h3>
          <div className="stats stats-vertical">
            <div className="stat px-0">
              <div className="stat-title text-xs">Focus Time</div>
              <div className="stat-value text-primary text-lg">
                {formatTime(dashboard?.todaysFocusTime || 0)}
              </div>
            </div>
            <div className="stat px-0">
              <div className="stat-title text-xs">Total Sessions</div>
              <div className="stat-value text-secondary text-lg">
                {stats?.totalSessions || 0}
              </div>
            </div>
            <div className="stat px-0">
              <div className="stat-title text-xs">Total Time</div>
              <div className="stat-value text-accent text-lg">
                {formatTime(stats?.totalFocusTime || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      {weeklyAnalytics && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-sm">📈 Weekly Progress</h3>
            <div className="flex h-24 items-end justify-between gap-1">
              {weeklyAnalytics.map((day, index) => {
                const maxTime = Math.max(
                  ...weeklyAnalytics.map((d) => d.totalTime),
                );
                const height =
                  maxTime > 0 ? (day.totalTime / maxTime) * 100 : 0;
                const dayName = new Date(day.date).toLocaleDateString("en", {
                  weekday: "short",
                });

                return (
                  <div
                    key={index}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="bg-primary hover:bg-primary/80 w-full rounded-sm transition-all"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${dayName}: ${formatTime(day.totalTime)}`}
                    ></div>
                    <span className="text-xs opacity-70">{dayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-sm">🏆 Achievements</h3>

          {/* Unlocked Achievements */}
          {dashboard?.achievements && dashboard.achievements.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold opacity-70">Unlocked</h4>
              <div className="flex flex-wrap gap-2">
                {dashboard.achievements.slice(0, 6).map((userAchievement) => (
                  <div
                    key={userAchievement.id}
                    className="badge badge-success badge-lg"
                    title={userAchievement.achievement.description}
                  >
                    {userAchievement.achievement.icon}{" "}
                    {userAchievement.achievement.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Achievements */}
          {dashboard?.allAchievements && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold opacity-70">Next Goals</h4>
              <div className="space-y-2">
                {dashboard.allAchievements
                  .filter(
                    (achievement) =>
                      !dashboard.achievements?.some(
                        (ua) => ua.achievementId === achievement.id,
                      ),
                  )
                  .slice(0, 3)
                  .map((achievement) => (
                    <div
                      key={achievement.id}
                      className="bg-base-200 flex items-center gap-2 rounded p-2"
                    >
                      <div className="badge badge-outline badge-sm">
                        {achievement.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">
                          {achievement.name}
                        </div>
                        <div className="truncate text-xs opacity-70">
                          {achievement.description}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
