"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/trpc/react";

export function FocusTimer() {
  const [customDuration, setCustomDuration] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    number | undefined
  >();
  const [sessionTitle, setSessionTitle] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const utils = api.useUtils();
  const { data: activeSession } = api.focus.getActiveSession.useQuery();
  const { data: categories } = api.focus.getCategories.useQuery();
  const { data: todos } = api.todo.getAll.useQuery();

  const startSessionMutation = api.focus.startSession.useMutation({
    onSuccess: (session) => {
      setTimeLeft(session.plannedDuration * 60); // Convert to seconds
      setIsRunning(true);
      setIsPaused(false);
      utils.focus.getActiveSession.invalidate();
    },
  });

  const completeSessionMutation = api.focus.completeSession.useMutation({
    onSuccess: () => {
      setIsRunning(false);
      setTimeLeft(0);
      utils.focus.getDashboard.invalidate();
      utils.focus.getActiveSession.invalidate();
    },
  });

  const updateSessionStatusMutation = api.focus.updateSessionStatus.useMutation(
    {
      onSuccess: () => {
        utils.focus.getActiveSession.invalidate();
      },
    },
  );

  const createTodoMutation = api.todo.create.useMutation({
    onSuccess: () => {
      setNewTodo("");
      utils.todo.getAll.invalidate();
    },
  });

  const toggleTodoMutation = api.todo.toggle.useMutation({
    onSuccess: () => {
      utils.todo.getAll.invalidate();
    },
  });

  // Initialize timer if there's an active session
  useEffect(() => {
    if (activeSession && !isRunning) {
      const elapsed = Math.floor(
        (Date.now() - activeSession.startedAt.getTime()) / 1000,
      );
      const remaining = Math.max(
        0,
        activeSession.plannedDuration * 60 - elapsed,
      );
      setTimeLeft(remaining);
      if (activeSession.status === "active" && remaining > 0) {
        setIsRunning(true);
        setIsPaused(false);
      } else if (activeSession.status === "paused") {
        setIsPaused(true);
        setIsRunning(false);
      }
    }
  }, [activeSession, isRunning]);

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            // Auto-complete session
            if (activeSession) {
              completeSessionMutation.mutate({
                sessionId: activeSession.id,
                actualDuration: activeSession.plannedDuration,
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, activeSession, completeSessionMutation]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startSession = (duration: number) => {
    startSessionMutation.mutate({
      title: sessionTitle || undefined,
      categoryId: selectedCategory,
      plannedDuration: duration,
    });
  };

  const pauseSession = () => {
    if (activeSession) {
      updateSessionStatusMutation.mutate({
        sessionId: activeSession.id,
        status: "paused",
      });
      setIsRunning(false);
      setIsPaused(true);
    }
  };

  const resumeSession = () => {
    if (activeSession) {
      updateSessionStatusMutation.mutate({
        sessionId: activeSession.id,
        status: "active",
      });
      setIsRunning(true);
      setIsPaused(false);
    }
  };

  const cancelSession = () => {
    if (activeSession) {
      updateSessionStatusMutation.mutate({
        sessionId: activeSession.id,
        status: "cancelled",
      });
      setIsRunning(false);
      setIsPaused(false);
      setTimeLeft(0);
    }
  };

  const completeSession = () => {
    if (activeSession) {
      const actualMinutes = Math.floor(
        (activeSession.plannedDuration * 60 - timeLeft) / 60,
      );
      completeSessionMutation.mutate({
        sessionId: activeSession.id,
        actualDuration: Math.max(1, actualMinutes),
      });
    }
  };

  const addTodo = () => {
    if (newTodo.trim()) {
      createTodoMutation.mutate({
        title: newTodo.trim(),
        categoryId: selectedCategory,
      });
    }
  };

  const progress = activeSession
    ? ((activeSession.plannedDuration * 60 - timeLeft) /
        (activeSession.plannedDuration * 60)) *
      100
    : 0;

  return (
    <div className="space-y-6">
      {/* Main Timer Card */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body items-center text-center">
          {/* Timer Display */}
          <div className="relative">
            <div
              className="radial-progress text-primary font-mono text-6xl"
              style={
                {
                  "--value": progress,
                  "--size": "12rem",
                  "--thickness": "8px",
                } as React.CSSProperties
              }
              role="progressbar"
              aria-valuenow={progress}
            >
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Session Info */}
          {activeSession && (
            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold">
                {activeSession.title || "Focus Session"}
              </h3>
              {activeSession.category && (
                <div className="badge badge-outline mt-2">
                  {activeSession.category.name}
                </div>
              )}
            </div>
          )}

          {/* Timer Controls */}
          <div className="card-actions mt-6">
            {!isRunning && !isPaused && !activeSession && (
              <div className="w-full space-y-4 text-center">
                <h2 className="text-2xl font-bold">Ready to Focus?</h2>
                <p className="text-base-content/70">
                  Choose a duration to get started
                </p>
              </div>
            )}

            {isRunning && (
              <div className="flex gap-2">
                <button className="btn btn-warning" onClick={pauseSession}>
                  ⏸️ Pause
                </button>
                <button className="btn btn-success" onClick={completeSession}>
                  ✅ Complete
                </button>
                <button className="btn btn-error" onClick={cancelSession}>
                  ❌ Cancel
                </button>
              </div>
            )}

            {isPaused && (
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={resumeSession}>
                  ▶️ Resume
                </button>
                <button className="btn btn-success" onClick={completeSession}>
                  ✅ Complete
                </button>
                <button className="btn btn-error" onClick={cancelSession}>
                  ❌ Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Setup */}
      {!activeSession && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Start New Session</h3>

            {/* Session Title */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Session Title (optional)</span>
              </label>
              <input
                type="text"
                placeholder="What are you focusing on?"
                className="input input-bordered"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
              />
            </div>

            {/* Category Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Category (optional)</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedCategory || ""}
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              >
                <option value="">No category</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Preset Durations */}
            <div className="space-y-2">
              <label className="label">
                <span className="label-text">Quick Start</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className="btn btn-outline"
                  onClick={() => startSession(25)}
                >
                  25 min
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => startSession(45)}
                >
                  45 min
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => startSession(60)}
                >
                  60 min
                </button>
              </div>
            </div>

            {/* Custom Duration */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Custom Duration</span>
              </label>
              <div className="join">
                <input
                  type="number"
                  placeholder="Minutes"
                  className="input input-bordered join-item flex-1"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  min="1"
                  max="480"
                />
                <button
                  className="btn btn-primary join-item"
                  onClick={() => {
                    const duration = parseInt(customDuration);
                    if (duration && duration > 0) {
                      startSession(duration);
                      setCustomDuration("");
                    }
                  }}
                  disabled={!customDuration || parseInt(customDuration) <= 0}
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Todo List */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-sm">📝 Quick Tasks</h3>

          {/* Add Todo */}
          <div className="join">
            <input
              type="text"
              placeholder="Add a quick task..."
              className="input input-bordered join-item flex-1"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTodo()}
            />
            <button
              className="btn btn-primary join-item"
              onClick={addTodo}
              disabled={!newTodo.trim()}
            >
              Add
            </button>
          </div>

          {/* Todo List */}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {todos?.slice(0, 10).map((todo) => (
              <div
                key={todo.id}
                className={`flex items-center gap-2 rounded p-2 ${
                  todo.isCompleted ? "bg-base-200 opacity-60" : "bg-base-200"
                }`}
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={todo.isCompleted}
                  onChange={() => toggleTodoMutation.mutate({ id: todo.id })}
                />
                <span
                  className={`flex-1 text-sm ${todo.isCompleted ? "line-through" : ""}`}
                >
                  {todo.title}
                </span>
                {todo.category && (
                  <div
                    className="badge badge-xs"
                    style={{ backgroundColor: todo.category.color }}
                  >
                    {todo.category.name}
                  </div>
                )}
              </div>
            ))}

            {(!todos || todos.length === 0) && (
              <div className="py-4 text-center text-sm opacity-70">
                No tasks yet. Add one above to get started!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
