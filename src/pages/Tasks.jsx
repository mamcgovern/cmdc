import { useEffect, useState } from "react";
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

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");

  const [editingTaskId, setEditingTaskId] = useState(null);

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

  const resetForm = () => {
    setTitle("");
    setDueDate("");
    setPriority("medium");
    setStatus("todo");
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
          <div className="card-header">
            <h2>All Tasks</h2>
            <span>{tasks.length} total</span>
          </div>

          {tasks.length === 0 ? (
            <p className="empty-state">No tasks yet.</p>
          ) : (
            <div className="task-list">
              {tasks.map((task) => {
                const taskStatus =
                  task.status || (task.completed ? "done" : "todo");

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
                      aria-label={
                        task.completed
                          ? "Mark task incomplete"
                          : "Mark task complete"
                      }
                    >
                      {task.completed ? "✓" : ""}
                    </button>

                    <div className="task-content">
                      <div className="task-title">{task.title}</div>

                      <div className="task-meta">
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