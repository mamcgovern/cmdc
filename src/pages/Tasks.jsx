import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [projectId, setProjectId] = useState("");

  const [editingTaskId, setEditingTaskId] = useState(null);

  const [view, setView] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  useEffect(() => {
    const tasksQuery = query(
      collection(db, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(
        snapshot.docs.map((taskDoc) => ({
          id: taskDoc.id,
          ...taskDoc.data(),
        }))
      );
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const projectsQuery = query(
      collection(db, "projects"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      setProjects(
        snapshot.docs.map((projectDoc) => ({
          id: projectDoc.id,
          ...projectDoc.data(),
        }))
      );
    });

    return unsubscribe;
  }, []);

  const resetForm = () => {
    setTitle("");
    setDueDate("");
    setPriority("medium");
    setStatus("todo");
    setProjectId("");
    setEditingTaskId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim()) return;

    const taskData = {
      title: title.trim(),
      dueDate: dueDate || null,
      priority,
      status,
      projectId: projectId || null,
      completed: status === "done",
    };

    if (editingTaskId) {
      await updateDoc(doc(db, "tasks", editingTaskId), {
        ...taskData,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "tasks"), {
        ...taskData,
        createdAt: serverTimestamp(),
      });
    }

    resetForm();
  };

  const handleEdit = (task) => {
    setEditingTaskId(task.id);
    setTitle(task.title || "");
    setDueDate(task.dueDate || "");
    setPriority(task.priority || "medium");
    setStatus(task.status || (task.completed ? "done" : "todo"));
    setProjectId(task.projectId || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleStatusChange = async (task, newStatus) => {
    await updateDoc(doc(db, "tasks", task.id), {
      status: newStatus,
      completed: newStatus === "done",
      updatedAt: serverTimestamp(),
    });
  };

  const toggleTask = async (task) => {
    const newStatus = task.completed ? "todo" : "done";

    await updateDoc(doc(db, "tasks", task.id), {
      completed: !task.completed,
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  };

  const handleDelete = async (taskId) => {
    await deleteDoc(doc(db, "tasks", taskId));

    if (editingTaskId === taskId) {
      resetForm();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";

    const [year, month, day] = dateString.split("-");

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTodayString = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getProjectName = (taskProjectId) => {
    if (!taskProjectId) return null;

    const project = projects.find(
      (project) => project.id === taskProjectId
    );

    return project?.name || "Unknown Project";
  };

  const filteredTasks = useMemo(() => {
    const today = getTodayString();

    return tasks.filter((task) => {
      const taskStatus =
        task.status || (task.completed ? "done" : "todo");

      let matchesView = true;

      if (view === "today") {
        matchesView = task.dueDate === today && taskStatus !== "done";
      }

      if (view === "upcoming") {
        matchesView =
          task.dueDate &&
          task.dueDate > today &&
          taskStatus !== "done";
      }

      if (view === "in-progress") {
        matchesView = taskStatus === "in-progress";
      }

      if (view === "completed") {
        matchesView = taskStatus === "done";
      }

      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      const matchesStatus =
        statusFilter === "all" || taskStatus === statusFilter;

      const matchesProject =
        projectFilter === "all" ||
        (projectFilter === "none" && !task.projectId) ||
        task.projectId === projectFilter;

      return (
        matchesView &&
        matchesPriority &&
        matchesStatus &&
        matchesProject
      );
    });
  }, [
    tasks,
    view,
    priorityFilter,
    statusFilter,
    projectFilter,
  ]);

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">CMDC</p>
        <h1>Tasks</h1>
        <p className="date">Organize and track your work.</p>
      </header>

      <section className="task-layout">
        <form className="task-form" onSubmit={handleSubmit}>
          <div className="task-form-header">
            <h2>{editingTaskId ? "Edit Task" : "Add Task"}</h2>

            {editingTaskId && (
              <button
                type="button"
                className="text-button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>

          <label>
            Task
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to get done?"
            />
          </label>

          <label>
            Project
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">No project</option>

              {projects
                .filter((project) => project.status !== "completed")
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </select>
          </label>

          <label>
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>

          <div className="task-form-row">
            <label>
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>
          </div>

          <button type="submit" className="primary-button">
            {editingTaskId ? "Save Changes" : "Add Task"}
          </button>
        </form>

        <div className="task-list-card">
          <div className="task-toolbar">
            <div className="task-views">
              <button
                type="button"
                className={view === "all" ? "task-view active" : "task-view"}
                onClick={() => setView("all")}
              >
                All
              </button>

              <button
                type="button"
                className={view === "today" ? "task-view active" : "task-view"}
                onClick={() => setView("today")}
              >
                Today
              </button>

              <button
                type="button"
                className={
                  view === "upcoming" ? "task-view active" : "task-view"
                }
                onClick={() => setView("upcoming")}
              >
                Upcoming
              </button>

              <button
                type="button"
                className={
                  view === "in-progress" ? "task-view active" : "task-view"
                }
                onClick={() => setView("in-progress")}
              >
                In Progress
              </button>

              <button
                type="button"
                className={
                  view === "completed" ? "task-view active" : "task-view"
                }
                onClick={() => setView("completed")}
              >
                Completed
              </button>
            </div>

            <div className="task-filters">
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="all">All projects</option>
                <option value="none">No project</option>

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="all">All priorities</option>
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="card-header task-list-header">
            <h2>Tasks</h2>
            <span>
              {filteredTasks.length} of {tasks.length}
            </span>
          </div>

          {filteredTasks.length === 0 ? (
            <p className="empty-state">No tasks in this view.</p>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => {
                const taskStatus =
                  task.status || (task.completed ? "done" : "todo");

                const taskProjectName = getProjectName(task.projectId);

                return (
                  <div
                    key={task.id}
                    className={`task-item ${
                      task.completed ? "task-item--complete" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="task-check"
                      onClick={() => toggleTask(task)}
                    >
                      {task.completed ? "✓" : ""}
                    </button>

                    <div className="task-content">
                      <div className="task-title">{task.title}</div>

                      <div className="task-meta">
                        {taskProjectName && (
                          <span className="task-project">
                            {taskProjectName}
                          </span>
                        )}

                        {task.dueDate && (
                          <span>Due {formatDate(task.dueDate)}</span>
                        )}

                        <span
                          className={`priority priority--${task.priority}`}
                        >
                          {task.priority}
                        </span>

                        <select
                          className={`status-select status-select--${taskStatus}`}
                          value={taskStatus}
                          onChange={(event) =>
                            handleStatusChange(task, event.target.value)
                          }
                        >
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </div>

                    <div className="task-actions">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => handleEdit(task)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleDelete(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default Tasks;