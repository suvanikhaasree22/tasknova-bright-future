import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import {
  fetchTasks,
  formatDue,
  isDueToday,
  isOverdue,
  matchesFilter,
  type Task,
  type TaskFilter,
} from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your tasks — TaskNova" },
      {
        name: "description",
        content: "Add tasks, set due dates, search and filter pending or completed work.",
      },
      { property: "og:title", content: "Your tasks — TaskNova" },
      {
        property: "og:description",
        content: "Add tasks, set due dates, search and filter pending or completed work.",
      },
    ],
  }),
  component: Dashboard,
});

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "overdue", label: "Overdue" },
];

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const addTask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You need to be signed in.");
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: title.trim(),
        due_date: dueDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setDueDate("");
      invalidate();
      toast.success("Task added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleTask = useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase
        .from("tasks")
        .update({ completed: !task.completed })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const saveEdit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ title: editTitle.trim(), due_date: editDue || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
      toast.success("Task updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Task deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stats = useMemo(
    () => ({
      pending: tasks.filter((t) => !t.completed).length,
      completed: tasks.filter((t) => t.completed).length,
      overdue: tasks.filter(isOverdue).length,
      today: tasks.filter(isDueToday).length,
    }),
    [tasks],
  );

  const visible = useMemo(
    () => tasks.filter((task) => matchesFilter(task, filter, search)),
    [tasks, filter, search],
  );

  const displayName =
    (user?.user_metadata?.["display_name"] as string | undefined) ??
    user?.email?.split("@")[0] ??
    "friend";
  const initials = displayName.slice(0, 2).toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <div className="pop grid size-11 place-items-center rounded-2xl bg-berry font-display text-xl font-bold text-primary-foreground">
            T
          </div>
          <div>
            <p className="font-display text-xl font-bold leading-none">TaskNova</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Task Studio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={signOut}
            className="h-11 rounded-full bg-card px-5 text-sm font-bold hover:bg-muted"
          >
            Sign out
          </button>
          <div className="grid size-11 place-items-center rounded-full bg-sun font-display font-bold">
            {initials}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-16 md:px-10">
        <div className="space-y-6">
          <div className="pop-lg relative overflow-hidden rounded-[2rem] bg-berry p-7 text-primary-foreground md:p-9">
            <div className="absolute -right-6 -top-10 size-40 rounded-full bg-sun/30" />
            <div className="absolute -bottom-16 -left-8 size-52 rounded-full bg-coral/30" />
            <div className="relative">
              <p className="mb-1 font-display text-sm font-semibold text-sun">
                Hello, {displayName}
              </p>
              <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl">
                You own <span className="text-sun">{stats.pending}</span> open{" "}
                {stats.pending === 1 ? "task" : "tasks"}.
              </h1>
              <p className="mt-4 max-w-md font-medium text-primary-foreground/85">
                {stats.overdue > 0
                  ? `${stats.overdue} ${stats.overdue === 1 ? "is" : "are"} overdue and ${stats.today} due today. Let's clear a few.`
                  : "Nothing overdue. Add what's next and keep the streak warm."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="pop rounded-3xl bg-sun p-5">
              <p className="font-display text-4xl font-bold leading-none">{stats.pending}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                Pending
              </p>
            </div>
            <div className="pop rounded-3xl bg-mint p-5">
              <p className="font-display text-4xl font-bold leading-none">{stats.completed}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                Completed
              </p>
            </div>
            <div className="pop rounded-3xl bg-coral p-5 text-primary-foreground">
              <p className="font-display text-4xl font-bold leading-none">{stats.overdue}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-80">
                Overdue
              </p>
            </div>
            <div className="pop rounded-3xl bg-clay p-5">
              <p className="font-display text-4xl font-bold leading-none">{stats.today}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                Due Today
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              addTask.mutate();
            }}
            className="pop flex flex-col gap-3 rounded-3xl bg-card p-4 sm:flex-row sm:items-center"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              className="h-12 flex-1 rounded-2xl bg-background px-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-coral/25"
            />
            <div className="flex gap-3">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-12 rounded-2xl bg-background px-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-coral/25"
              />
              <button
                type="submit"
                disabled={addTask.isPending}
                className="pop-sm pop-press h-12 rounded-2xl bg-coral px-6 font-display font-semibold text-primary-foreground disabled:opacity-60"
              >
                Add task
              </button>
            </div>
          </form>

          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="relative max-w-md flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                ⌕
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="pop-sm h-12 w-full rounded-full bg-card pl-11 pr-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-coral/25"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`h-10 rounded-full px-4 text-sm font-bold transition ${
                    filter === item.key
                      ? "pop-sm bg-ink text-primary-foreground"
                      : "bg-card hover:bg-muted"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <p className="rounded-3xl bg-card p-6 text-sm font-medium text-muted-foreground">
                Loading your tasks…
              </p>
            )}

            {!isLoading && visible.length === 0 && (
              <div className="pop rounded-3xl bg-card p-8 text-center">
                <p className="font-display text-lg font-semibold">Nothing here yet</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {tasks.length === 0
                    ? "Add your first task above and it'll show up right here."
                    : "No tasks match this search or filter."}
                </p>
              </div>
            )}

            {visible.map((task) => {
              const overdue = isOverdue(task);
              const editing = editingId === task.id;
              return (
                <div
                  key={task.id}
                  className={`pop flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:gap-4 md:p-5 ${
                    task.completed ? "bg-card/60" : "bg-card"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={task.completed ? "Mark as pending" : "Mark as completed"}
                    onClick={() => toggleTask.mutate(task)}
                    className={`grid size-12 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold ${
                      task.completed
                        ? "bg-mint text-primary-foreground"
                        : overdue
                          ? "bg-coral text-primary-foreground"
                          : "bg-sun text-foreground"
                    }`}
                  >
                    {task.completed ? "✓" : overdue ? "!" : "○"}
                  </button>

                  {editing ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-11 flex-1 rounded-2xl bg-background px-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-coral/25"
                      />
                      <input
                        type="date"
                        value={editDue}
                        onChange={(e) => setEditDue(e.target.value)}
                        className="h-11 rounded-2xl bg-background px-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-coral/25"
                      />
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate font-display text-lg font-semibold leading-tight ${
                          task.completed ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      <p
                        className={`truncate text-sm font-medium ${
                          overdue ? "text-coral" : "text-muted-foreground"
                        }`}
                      >
                        {task.completed ? "Completed" : formatDue(task.due_date)}
                      </p>
                    </div>
                  )}

                  <div className="flex shrink-0 gap-2">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit.mutate(task.id)}
                          className="h-10 rounded-full bg-mint px-4 text-sm font-bold text-primary-foreground"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="h-10 rounded-full bg-muted px-4 text-sm font-bold"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(task.id);
                            setEditTitle(task.title);
                            setEditDue(task.due_date ?? "");
                          }}
                          className="h-10 rounded-full bg-muted px-4 text-sm font-bold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask.mutate(task.id)}
                          className="h-10 rounded-full bg-muted px-4 text-sm font-bold text-coral"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
