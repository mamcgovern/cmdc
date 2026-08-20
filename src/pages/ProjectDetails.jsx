import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  Link,
  useParams,
} from "react-router-dom";

import { db } from "../services/firebase";

function ProjectDetails() {
  const { projectId } =
    useParams();

  const [
    project,
    setProject,
  ] = useState(null);

  const [
    tasks,
    setTasks,
  ] = useState([]);

  const [
    notes,
    setNotes,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /*
   * TASK FORM
   */

  const [
    taskTitle,
    setTaskTitle,
  ] = useState("");

  const [
    taskDueDate,
    setTaskDueDate,
  ] = useState("");

  const [
    taskPriority,
    setTaskPriority,
  ] = useState("medium");

  const [
    taskStatus,
    setTaskStatus,
  ] = useState("todo");

  const [
    editingTaskId,
    setEditingTaskId,
  ] = useState(null);

  /*
   * NOTE FORM
   */

  const [
    noteTitle,
    setNoteTitle,
  ] = useState("");

  const [
    noteContent,
    setNoteContent,
  ] = useState("");

  const [
    editingNoteId,
    setEditingNoteId,
  ] = useState(null);

  /*
   * LOAD PROJECT
   */

  useEffect(() => {
    const loadProject =
      async () => {
        const projectRef =
          doc(
            db,
            "projects",
            projectId
          );

        const projectSnapshot =
          await getDoc(
            projectRef
          );

        if (
          projectSnapshot.exists()
        ) {
          setProject({
            id:
              projectSnapshot.id,

            ...projectSnapshot.data(),
          });
        }

        setLoading(false);
      };

    loadProject();
  }, [projectId]);

  /*
   * LOAD TASKS
   */

  useEffect(() => {
    const tasksQuery =
      query(
        collection(
          db,
          "tasks"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        tasksQuery,
        (snapshot) => {
          setTasks(
            snapshot.docs.map(
              (taskDoc) => ({
                id:
                  taskDoc.id,

                ...taskDoc.data(),
              })
            )
          );
        }
      );

    return unsubscribe;
  }, []);

  /*
   * LOAD NOTES
   */

  useEffect(() => {
    const notesQuery =
      query(
        collection(
          db,
          "notes"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        notesQuery,
        (snapshot) => {
          setNotes(
            snapshot.docs.map(
              (noteDoc) => ({
                id:
                  noteDoc.id,

                ...noteDoc.data(),
              })
            )
          );
        }
      );

    return unsubscribe;
  }, []);

  /*
   * PROJECT TASKS / NOTES
   */

  const projectTasks =
    useMemo(
      () =>
        tasks.filter(
          (task) =>
            task.projectId ===
            projectId
        ),
      [
        tasks,
        projectId,
      ]
    );

  const projectNotes =
    useMemo(
      () =>
        notes.filter(
          (note) =>
            note.projectId ===
            projectId
        ),
      [
        notes,
        projectId,
      ]
    );

  const taskIsComplete =
    (task) => {
      if (
        task.completed === true
      ) {
        return true;
      }

      return (
        task.status === "done"
      );
    };

  const openTasks =
    useMemo(
      () =>
        projectTasks.filter(
          (task) =>
            !taskIsComplete(
              task
            )
        ),
      [projectTasks]
    );

  const completedTasks =
    useMemo(
      () =>
        projectTasks.filter(
          taskIsComplete
        ),
      [projectTasks]
    );

  const progress =
    projectTasks.length === 0
      ? 0
      : Math.round(
          (
            completedTasks.length /
            projectTasks.length
          ) *
            100
        );

  /*
   * TASK FORM
   */

  const resetTaskForm =
    () => {
      setTaskTitle("");
      setTaskDueDate("");
      setTaskPriority(
        "medium"
      );
      setTaskStatus("todo");
      setEditingTaskId(
        null
      );
    };

  const handleTaskSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !taskTitle.trim()
      ) {
        return;
      }

      const taskData = {
        title:
          taskTitle.trim(),

        dueDate:
          taskDueDate ||
          null,

        priority:
          taskPriority,

        status:
          taskStatus,

        projectId,

        completed:
          taskStatus ===
          "done",
      };

      if (editingTaskId) {
        await updateDoc(
          doc(
            db,
            "tasks",
            editingTaskId
          ),
          {
            ...taskData,

            updatedAt:
              serverTimestamp(),
          }
        );
      } else {
        await addDoc(
          collection(
            db,
            "tasks"
          ),
          {
            ...taskData,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      resetTaskForm();
    };

  const handleEditTask =
    (task) => {
      setEditingTaskId(
        task.id
      );

      setTaskTitle(
        task.title || ""
      );

      setTaskDueDate(
        task.dueDate || ""
      );

      setTaskPriority(
        task.priority ||
          "medium"
      );

      setTaskStatus(
        task.status ||
          (
            task.completed
              ? "done"
              : "todo"
          )
      );
    };

  const handleTaskStatusChange =
    async (
      task,
      newStatus
    ) => {
      await updateDoc(
        doc(
          db,
          "tasks",
          task.id
        ),
        {
          status:
            newStatus,

          completed:
            newStatus ===
            "done",

          updatedAt:
            serverTimestamp(),
        }
      );
    };

  const toggleTask =
    async (task) => {
      const isComplete =
        taskIsComplete(
          task
        );

      const newStatus =
        isComplete
          ? "todo"
          : "done";

      await updateDoc(
        doc(
          db,
          "tasks",
          task.id
        ),
        {
          completed:
            !isComplete,

          status:
            newStatus,

          updatedAt:
            serverTimestamp(),
        }
      );
    };

  const handleDeleteTask =
    async (taskId) => {
      const confirmed =
        window.confirm(
          "Delete this task?"
        );

      if (!confirmed) {
        return;
      }

      await deleteDoc(
        doc(
          db,
          "tasks",
          taskId
        )
      );

      if (
        editingTaskId ===
        taskId
      ) {
        resetTaskForm();
      }
    };

  /*
   * NOTES
   */

  const resetNoteForm =
    () => {
      setNoteTitle("");
      setNoteContent("");
      setEditingNoteId(
        null
      );
    };

  const handleNoteSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !noteTitle.trim() &&
        !noteContent.trim()
      ) {
        return;
      }

      const noteData = {
        title:
          noteTitle.trim(),

        content:
          noteContent.trim(),

        projectId,
      };

      if (editingNoteId) {
        await updateDoc(
          doc(
            db,
            "notes",
            editingNoteId
          ),
          {
            ...noteData,

            updatedAt:
              serverTimestamp(),
          }
        );
      } else {
        await addDoc(
          collection(
            db,
            "notes"
          ),
          {
            ...noteData,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      resetNoteForm();
    };

  const handleEditNote =
    (note) => {
      setEditingNoteId(
        note.id
      );

      setNoteTitle(
        note.title || ""
      );

      setNoteContent(
        note.content || ""
      );
    };

  const handleDeleteNote =
    async (noteId) => {
      const confirmed =
        window.confirm(
          "Delete this note?"
        );

      if (!confirmed) {
        return;
      }

      await deleteDoc(
        doc(
          db,
          "notes",
          noteId
        )
      );

      if (
        editingNoteId ===
        noteId
      ) {
        resetNoteForm();
      }
    };

  /*
   * FORMATTERS
   */

  const formatDate =
    (dateString) => {
      if (!dateString) {
        return "";
      }

      const [
        year,
        month,
        day,
      ] =
        dateString.split(
          "-"
        );

      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      ).toLocaleDateString(
        "en-US",
        {
          month:
            "short",

          day:
            "numeric",

          year:
            "numeric",
        }
      );
    };

  const formatProjectStatus =
    (status) => {
      if (
        status ===
        "on-hold"
      ) {
        return "On Hold";
      }

      if (
        status ===
        "complete"
      ) {
        return "Complete";
      }

      if (
        status ===
        "active"
      ) {
        return "Active";
      }

      return "Planning";
    };

  /*
   * LOADING / NOT FOUND
   */

  if (loading) {
    return (
      <p>
        Loading project...
      </p>
    );
  }

  if (!project) {
    return (
      <>
        <h1>
          Project not found
        </h1>

        <Link
          to="/projects"
          className="back-link"
        >
          ← Back to Projects
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        to="/projects"
        className="back-link"
      >
        ← Back to Projects
      </Link>

      {/* PROJECT HEADER */}

      <header
        className="page-header project-detail-header"
        style={{
          "--project-color":
            project.color ||
            "var(--accent)",
        }}
      >
        <div className="project-detail-title-row">
          <div>
            {project.category && (
              <p className="project-detail-category">
                {
                  project.category
                }
              </p>
            )}

            <p className="eyebrow">
              PROJECT
            </p>

            <h1>
              {project.name}
            </h1>

            {project.description && (
              <p className="date">
                {
                  project.description
                }
              </p>
            )}
          </div>

          <span
            className={`project-status project-status--${project.status}`}
          >
            {formatProjectStatus(
              project.status
            )}
          </span>
        </div>

        <div className="project-detail-progress">
          <div className="project-detail-progress-header">
            <span>
              Project Progress
            </span>

            <strong>
              {progress}%
            </strong>
          </div>

          <div className="project-progress-track">
            <div
              className="project-progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </header>

      {/* STATS */}

      <section className="project-stats">
        <div className="stat-card">
          <span className="stat-number">
            {
              projectTasks.length
            }
          </span>

          <span className="stat-label">
            Total Tasks
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-number">
            {
              openTasks.length
            }
          </span>

          <span className="stat-label">
            Open
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-number">
            {
              completedTasks.length
            }
          </span>

          <span className="stat-label">
            Completed
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-number">
            {
              projectNotes.length
            }
          </span>

          <span className="stat-label">
            Notes
          </span>
        </div>
      </section>

      {/* TASK WORKSPACE */}

      <section className="project-workspace">
        <div className="project-task-form-card">
          <div className="task-form-header">
            <div>
              <p className="eyebrow">
                TASK
              </p>

              <h2>
                {editingTaskId
                  ? "Edit Task"
                  : "Add Task"}
              </h2>
            </div>

            {editingTaskId && (
              <button
                type="button"
                className="text-button"
                onClick={
                  resetTaskForm
                }
              >
                Cancel
              </button>
            )}
          </div>

          <form
            className="project-task-form"
            onSubmit={
              handleTaskSubmit
            }
          >
            <label>
              Task

              <input
                type="text"
                value={
                  taskTitle
                }
                onChange={(
                  event
                ) =>
                  setTaskTitle(
                    event.target.value
                  )
                }
                placeholder="What needs to get done?"
              />
            </label>

            <label>
              Due Date

              <input
                type="date"
                value={
                  taskDueDate
                }
                onChange={(
                  event
                ) =>
                  setTaskDueDate(
                    event.target.value
                  )
                }
              />
            </label>

            <div className="project-task-form-row">
              <label>
                Priority

                <select
                  value={
                    taskPriority
                  }
                  onChange={(
                    event
                  ) =>
                    setTaskPriority(
                      event.target.value
                    )
                  }
                >
                  <option value="low">
                    Low
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="high">
                    High
                  </option>
                </select>
              </label>

              <label>
                Status

                <select
                  value={
                    taskStatus
                  }
                  onChange={(
                    event
                  ) =>
                    setTaskStatus(
                      event.target.value
                    )
                  }
                >
                  <option value="todo">
                    To Do
                  </option>

                  <option value="in-progress">
                    In Progress
                  </option>

                  <option value="done">
                    Done
                  </option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="primary-button"
            >
              {editingTaskId
                ? "Save Changes"
                : "Add Task"}
            </button>
          </form>
        </div>

        <div className="project-task-columns">
          {/* OPEN */}

          <div className="project-section-card">
            <div className="card-header">
              <h2>
                Open Tasks
              </h2>

              <span>
                {
                  openTasks.length
                }
              </span>
            </div>

            {openTasks.length ===
            0 ? (
              <p className="empty-state">
                No open tasks.
              </p>
            ) : (
              <div className="project-task-list">
                {openTasks.map(
                  (task) => {
                    const currentStatus =
                      task.status ||
                      (
                        task.completed
                          ? "done"
                          : "todo"
                      );

                    return (
                      <div
                        key={
                          task.id
                        }
                        className="project-task-row"
                      >
                        <button
                          type="button"
                          className="task-check"
                          onClick={() =>
                            toggleTask(
                              task
                            )
                          }
                        />

                        <div className="project-task-content">
                          <strong>
                            {
                              task.title
                            }
                          </strong>

                          <div className="task-meta">
                            {task.dueDate && (
                              <span>
                                Due{" "}
                                {formatDate(
                                  task.dueDate
                                )}
                              </span>
                            )}

                            <span
                              className={`priority priority--${task.priority || "medium"}`}
                            >
                              {task.priority ||
                                "medium"}
                            </span>

                            <select
                              className={`status-select status-select--${currentStatus}`}
                              value={
                                currentStatus
                              }
                              onChange={(
                                event
                              ) =>
                                handleTaskStatusChange(
                                  task,
                                  event.target.value
                                )
                              }
                            >
                              <option value="todo">
                                To Do
                              </option>

                              <option value="in-progress">
                                In Progress
                              </option>

                              <option value="done">
                                Done
                              </option>
                            </select>
                          </div>
                        </div>

                        <div className="task-actions">
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() =>
                              handleEditTask(
                                task
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-button"
                            onClick={() =>
                              handleDeleteTask(
                                task.id
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* COMPLETE */}

          <div className="project-section-card">
            <div className="card-header">
              <h2>
                Completed
              </h2>

              <span>
                {
                  completedTasks.length
                }
              </span>
            </div>

            {completedTasks.length ===
            0 ? (
              <p className="empty-state">
                No completed tasks yet.
              </p>
            ) : (
              <div className="project-task-list">
                {completedTasks.map(
                  (task) => (
                    <div
                      key={
                        task.id
                      }
                      className="project-task-row project-task-row--complete"
                    >
                      <button
                        type="button"
                        className="task-check"
                        onClick={() =>
                          toggleTask(
                            task
                          )
                        }
                      >
                        ✓
                      </button>

                      <div className="project-task-content">
                        <strong>
                          {
                            task.title
                          }
                        </strong>

                        {task.dueDate && (
                          <div className="task-meta">
                            <span>
                              Due{" "}
                              {formatDate(
                                task.dueDate
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="task-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            handleEditTask(
                              task
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            handleDeleteTask(
                              task.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* NOTES */}

      <section className="project-notes-section">
        <div className="project-notes-header">
          <div>
            <p className="eyebrow">
              PROJECT NOTES
            </p>

            <h2>
              Notes
            </h2>
          </div>

          <span>
            {
              projectNotes.length
            }{" "}
            {projectNotes.length ===
            1
              ? "note"
              : "notes"}
          </span>
        </div>

        <div className="project-notes-layout">
          <form
            className="note-form"
            onSubmit={
              handleNoteSubmit
            }
          >
            <div className="task-form-header">
              <h3>
                {editingNoteId
                  ? "Edit Note"
                  : "Add Note"}
              </h3>

              {editingNoteId && (
                <button
                  type="button"
                  className="text-button"
                  onClick={
                    resetNoteForm
                  }
                >
                  Cancel
                </button>
              )}
            </div>

            <label>
              Title

              <input
                type="text"
                value={
                  noteTitle
                }
                onChange={(
                  event
                ) =>
                  setNoteTitle(
                    event.target.value
                  )
                }
                placeholder="Optional title"
              />
            </label>

            <label>
              Note

              <textarea
                value={
                  noteContent
                }
                onChange={(
                  event
                ) =>
                  setNoteContent(
                    event.target.value
                  )
                }
                placeholder="Add a note..."
                rows="8"
              />
            </label>

            <button
              type="submit"
              className="primary-button"
            >
              {editingNoteId
                ? "Save Changes"
                : "Add Note"}
            </button>
          </form>

          <div className="project-notes-list">
            {projectNotes.length ===
            0 ? (
              <div className="project-section-card">
                <p className="empty-state">
                  No notes for this project yet.
                </p>
              </div>
            ) : (
              projectNotes.map(
                (note) => (
                  <article
                    key={
                      note.id
                    }
                    className="note-card"
                  >
                    <div className="note-card-header">
                      <div>
                        {note.title && (
                          <h3>
                            {
                              note.title
                            }
                          </h3>
                        )}
                      </div>

                      <div className="task-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            handleEditNote(
                              note
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            handleDeleteNote(
                              note.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {note.content && (
                      <p className="note-content">
                        {
                          note.content
                        }
                      </p>
                    )}
                  </article>
                )
              )
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default ProjectDetails;