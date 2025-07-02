"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { UserDashboard } from "@/app/_components/UserDashboard";
import { FocusTimer } from "@/app/_components/FocusTimer";
import { CommunityPanel } from "@/app/_components/CommunityPanel";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="hero from-primary to-secondary min-h-screen bg-gradient-to-br">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-primary-content text-5xl font-bold">
              FocusTimer
            </h1>
            <p className="text-primary-content/80 py-6">
              Transform your productivity with gamified focus sessions. Track
              your progress, compete with others, and build lasting focus
              habits.
            </p>
            <Link href="/api/auth/signin" className="btn btn-primary btn-lg">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 min-h-screen">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <h1 className="text-xl font-bold">FocusTimer</h1>
        </div>
        <div className="flex-none gap-2">
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar"
            >
              <div className="w-10 rounded-full">
                <img
                  alt="User avatar"
                  src={session.user?.image ?? "/default-avatar.svg"}
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.svg";
                  }}
                />
              </div>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
            >
              <li>
                <span className="text-sm opacity-70">{session.user?.name}</span>
              </li>
              <li>
                <Link href="/api/auth/signout">Logout</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="container mx-auto p-4">
        <div className="grid min-h-[calc(100vh-200px)] grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel - User Dashboard */}
          <div className="lg:col-span-3">
            <UserDashboard />
          </div>

          {/* Middle Panel - Focus Timer */}
          <div className="lg:col-span-6">
            <FocusTimer />
          </div>

          {/* Right Panel - Community */}
          <div className="lg:col-span-3">
            <CommunityPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
