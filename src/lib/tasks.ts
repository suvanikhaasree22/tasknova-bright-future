import { supabase } from "@/integrations/supabase/client";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  completed: boolean;
  priority: string;
  created_at: string;
  updated_at: string;
};

export type TaskFilter = "all" | "pending" | "completed" | "overdue";

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Task[];
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(task: Task) {
  return !task.completed && !!task.due_date && task.due_date < todayISO();
}

export function isDueToday(task: Task) {
  return !task.completed && task.due_date === todayISO();
}

export function formatDue(due: string | null) {
  if (!due) return "No due date";
  const date = new Date(`${due}T00:00:00`);
  const today = todayISO();
  if (due === today) return "Due today";
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return due < today ? `Overdue · ${label}` : `Due ${label}`;
}

export function matchesFilter(task: Task, filter: TaskFilter, search: string) {
  const query = search.trim().toLowerCase();
  if (query) {
    const haystack = `${task.title} ${task.notes ?? ""}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filter === "pending") return !task.completed;
  if (filter === "completed") return task.completed;
  if (filter === "overdue") return isOverdue(task);
  return true;
}
