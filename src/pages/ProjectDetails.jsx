import { useEffect, useMemo, useState } from "react";
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
import { Link, useParams } from "react-router-dom";
import { db } from "../services/firebase";

function ProjectDetails() {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);

  useEffect(() => {
    const loadProject = async () => {
      const projectRef = doc(db, "projects", projectId);
      const projectSnapshot = await getDoc(projectRef);

      if (projectSnapshot.exists()) {
        setProject({
          id: projectSnapshot.id,
          ...projectSnapshot.data(),
        });
      }

      setLoading(false);
    };

    loadProject();
  }, [projectId]);

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
    const notesQuery = query(
      collection(db, "notes"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
      setNotes(
        snapshot.docs.map((noteDoc) => ({
          id: noteDoc.id,
          ...noteDoc.data(),
        }))
      );
    });

    return unsubscribe;
  }, []);

  const projectTasks = useMemo(
    () => tasks.filter((task) => task.projectId === projectId),
    [tasks, projectId]
  );

  const projectNotes = useMemo(
    () => notes.filter((note) => note.projectId === projectId),
    [notes, projectId]
  );

  const openTasks = projectTasks.filter((task) => {
    const status =
      task.status || (task.completed ? "done" : "todo");

    return status !== "done";
  });

  const completedTasks = projectTasks.filter((task) => {
    const status =
      task.status || (task.completed ? "done" : "todo");

    return status === "done";
  });

  const resetNoteForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setEditingNoteId(null);
  };

  const handleNoteSubmit = async (event) => {
    event.preventDefault();

    if (!noteTitle.trim() && !noteContent.trim()) return;

    const noteData = {
      title: noteTitle.trim(),
      content: noteContent.trim(),
      projectId,
    };

    if (editingNoteId) {
      await updateDoc(doc(db, "notes", editingNoteId), {
        ...noteData,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "notes"), {
        ...noteData,
        createdAt: serverTimestamp(),
      });
    }

    resetNoteForm();
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title || "");
    setNoteContent(note.content || "");
  };

  const handleDeleteNote = async (noteId) => {
    await deleteDoc(doc(db, "notes", noteId));

    if (editingNoteId === noteId) {
      resetNoteForm();
    }
  };

  if (loading) {
    return <p>Loading project...</p>;
  }

  if (!project) {
    return (
      <>
        <h1>Project not found</h1>
        <Link to="/projects">Back to Projects</Link>
      </>
    );
  }

  return (
    <>
      <Link to="/projects" className="back-link">
        ← Back to Projects
      </Link>

      <header className="page-header project-detail-header">
        <p className="eyebrow">PROJECT</p>
        <h1>{project.name}</h1>

        {project.description && (
          <p className="date">{project.description}</p>
        )}

        <span
          className={`project-status project-status--${project.status}`}
        >
          {project.status?.replace("-", " ")}
        </span>
      </header>

      <section className="project-stats">
        <div className="stat-card">
          <span className="stat-number">{projectTasks.length}</span>
          <span className="stat-label">Total Tasks</span>
        </div>

        <div className="stat-card">
          <span className="stat-number">{openTasks.length}</span>
          <span className="stat-label">Open</span>
        </div>

        <div className="stat-card">
          <span className="stat-number">{completedTasks.length}</span>
          <span className="stat-label">Completed</span>
        </div>
      </section>

      <section className="project-detail-grid">
        <div className="project-section-card">
          <div className="card-header">
            <h2>Open Tasks</h2>
            <span>{openTasks.length}</span>
          </div>

          {openTasks.length === 0 ? (
            <p className="empty-state">No open tasks.</p>
          ) : (
            <div className="project-task-list">
              {openTasks.map((task) => (
                <div key={task.id} className="project-task-row">
                  <div>
                    <strong>{task.title}</strong>

                    <div className="task-meta">
                      {task.dueDate && (
                        <span>Due {task.dueDate}</span>
                      )}

                      <span
                        className={`priority priority--${task.priority}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="project-section-card">
          <div className="card-header">
            <h2>Completed</h2>
            <span>{completedTasks.length}</span>
          </div>

          {completedTasks.length === 0 ? (
            <p className="empty-state">No completed tasks yet.</p>
          ) : (
            <div className="project-task-list">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="project-task-row project-task-row--complete"
                >
                  <strong>{task.title}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="project-notes-section">
        <div className="project-notes-header">
          <div>
            <p className="eyebrow">PROJECT NOTES</p>
            <h2>Notes</h2>
          </div>

          <span>{projectNotes.length} notes</span>
        </div>

        <div className="project-notes-layout">
          <form className="note-form" onSubmit={handleNoteSubmit}>
            <div className="task-form-header">
              <h3>{editingNoteId ? "Edit Note" : "Add Note"}</h3>

              {editingNoteId && (
                <button
                  type="button"
                  className="text-button"
                  onClick={resetNoteForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <label>
              Title
              <input
                type="text"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Optional title"
              />
            </label>

            <label>
              Note
              <textarea
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Add a note..."
                rows="8"
              />
            </label>

            <button type="submit" className="primary-button">
              {editingNoteId ? "Save Changes" : "Add Note"}
            </button>
          </form>

          <div className="project-notes-list">
            {projectNotes.length === 0 ? (
              <div className="project-section-card">
                <p className="empty-state">No notes for this project yet.</p>
              </div>
            ) : (
              projectNotes.map((note) => (
                <article key={note.id} className="note-card">
                  <div className="note-card-header">
                    <div>
                      {note.title && <h3>{note.title}</h3>}
                    </div>

                    <div className="task-actions">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => handleEditNote(note)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {note.content && (
                    <p className="note-content">{note.content}</p>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default ProjectDetails;