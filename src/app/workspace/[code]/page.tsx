"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Member { id: string; nickname: string; role: string; }
interface Project { id: string; name: string; description: string | null; updatedAt: string; }
interface WorkspaceData {
  id: string; name: string; accessCode: string;
  members: Member[]; projects: Project[];
}
interface Session { workspaceId: string; accessCode: string; memberId: string; nickname: string; }

export default function WorkspaceDashboard() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadWorkspace = useCallback(async (wsId: string) => {
    const res = await fetch(`/api/workspace?id=${wsId}`);
    const data = await res.json();
    if (res.ok) setWorkspace(data.workspace);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("sf_session");
    if (!stored) {
      router.push("/workspace/join");
      return;
    }
    const sess: Session = JSON.parse(stored);
    if (sess.accessCode !== code) {
      router.push("/workspace/join");
      return;
    }
    setSession(sess);
    loadWorkspace(sess.workspaceId).finally(() => setLoading(false));
  }, [code, router, loadWorkspace]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !session) return;
    setCreating(true);
    try {
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: session.workspaceId,
          name: newProjectName.trim(),
          memberId: session.memberId,
        }),
      });
      if (res.ok) {
        setNewProjectName("");
        setShowNewProject(false);
        loadWorkspace(session.workspaceId);
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!workspace || !session) return null;

  return (
    <main className="flex-1">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{workspace.name}</h1>
            <p className="text-xs text-muted">
              코드: <span className="font-mono text-accent">{workspace.accessCode}</span> · {workspace.members.length}명
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{session.nickname}</span>
            <button
              onClick={() => router.push("/")}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border text-sm text-muted hover:text-foreground transition-colors"
            >
              홈
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setShowNewProject(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-warm text-[#0b0b0f] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            + 새 프로젝트
          </button>
        </div>

        {/* New project input */}
        {showNewProject && (
          <div className="glass-card p-5 mb-6 flex gap-3 animate-fade-up delay-1">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
              placeholder="프로젝트 이름 (예: Q2 콘텐츠 리서치)"
              className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted/50 outline-none focus:border-accent/50 transition-colors text-sm"
              autoFocus
            />
            <button
              onClick={handleCreateProject}
              disabled={creating || !newProjectName.trim()}
              className="px-5 py-2.5 rounded-lg bg-accent text-[#0b0b0f] font-semibold text-sm disabled:opacity-40"
            >
              {creating ? "..." : "만들기"}
            </button>
            <button
              onClick={() => { setShowNewProject(false); setNewProjectName(""); }}
              className="px-3 py-2.5 rounded-lg bg-surface border border-border text-sm text-muted"
            >
              취소
            </button>
          </div>
        )}

        {/* Projects grid */}
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">프로젝트</h2>
        {workspace.projects.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted mb-2">아직 프로젝트가 없습니다</p>
            <p className="text-muted/50 text-sm">새 프로젝트를 만들어 영상 분석을 시작하세요.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspace.projects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/workspace/${code}/project/${project.id}`)}
                className="glass-card p-5 text-left hover:border-accent/30 transition-all"
              >
                <h3 className="font-semibold text-foreground mb-1">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-muted mb-3 line-clamp-2">{project.description}</p>
                )}
                <p className="text-xs text-muted/50">
                  {new Date(project.updatedAt).toLocaleDateString("ko-KR")}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Members */}
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 mt-12">멤버</h2>
        <div className="flex flex-wrap gap-2">
          {workspace.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border text-sm"
            >
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs text-accent font-semibold">
                {m.nickname[0]}
              </div>
              <span>{m.nickname}</span>
              {m.role === "admin" && (
                <span className="text-xs text-accent/60">관리자</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
