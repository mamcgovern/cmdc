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

function Notes() {
  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [pinned, setPinned] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState(null);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

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
    setContent("");
    setProjectId("");
    setPinned(false);
    setEditingNoteId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim() && !content.trim()) return;

    const noteData = {
      title: title.trim(),
      content: content.trim(),
      projectId: projectId || null,
      pinned,
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

    resetForm();
  };

  const handleEdit = (note) => {
    setEditingNoteId(note.id);
    setTitle(note.title || "");
    setContent(note.content || "");
    setProjectId(note.projectId || "");
    setPinned(note.pinned || false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (noteId) => {
    await deleteDoc(doc(db, "notes", noteId));

    if (editingNoteId === noteId) {
      resetForm();
    }
  };

  const handleTogglePin = async (note) => {
    await updateDoc(doc(db, "notes", note.id), {
      pinned: !note.pinned,
      updatedAt: serverTimestamp(),
    });
  };

  const getProjectName = (noteProjectId) => {
    if (!noteProjectId) return null;

    const project = projects.find(
      (project) => project.id === noteProjectId
    );

    return project?.name || "Unknown Project";
  };

  const filteredNotes = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return notes
      .filter((note) => {
        const matchesSearch =
          !searchValue ||
          note.title?.toLowerCase().includes(searchValue) ||
          note.content?.toLowerCase().includes(searchValue);

        const matchesProject =
          projectFilter === "all" ||
          (projectFilter === "none" && !note.projectId) ||
          note.projectId === projectFilter;

        return matchesSearch && matchesProject;
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });
  }, [notes, search, projectFilter]);

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">CMDC</p>
        <h1>Notes</h1>
        <p className="date">
          Capture ideas, meeting notes, and reference information.
        </p>
      </header>

      <section className="notes-layout">
        <form className="notes-form" onSubmit={handleSubmit}>
          <div className="task-form-header">
            <h2>{editingNoteId ? "Edit Note" : "Add Note"}</h2>

            {editingNoteId && (
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
            Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Note title"
            />
          </label>

          <label>
            Project
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">No project</option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Note
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Start writing..."
              rows="12"
            />
          </label>

          <label className="pin-checkbox">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(event) => setPinned(event.target.checked)}
            />

            <span>Pin this note</span>
          </label>

          <button type="submit" className="primary-button">
            {editingNoteId ? "Save Changes" : "Add Note"}
          </button>
        </form>

        <div className="notes-main">
          <div className="notes-toolbar">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes..."
              className="notes-search"
            />

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
          </div>

          <div className="card-header notes-header">
            <h2>All Notes</h2>

            <span>
              {filteredNotes.length} of {notes.length}
            </span>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="notes-empty">
              <p>No notes found.</p>
            </div>
          ) : (
            <div className="notes-grid">
              {filteredNotes.map((note) => {
                const projectName = getProjectName(note.projectId);

                return (
                  <article
                    key={note.id}
                    className={`note-card ${
                      note.pinned ? "note-card--pinned" : ""
                    }`}
                  >
                    <div className="note-card-header">
                      <div>
                        {note.pinned && (
                          <span className="pinned-label">Pinned</span>
                        )}

                        {note.title && <h3>{note.title}</h3>}
                      </div>

                      <button
                        type="button"
                        className="pin-button"
                        onClick={() => handleTogglePin(note)}
                        title={note.pinned ? "Unpin note" : "Pin note"}
                      >
                        {note.pinned ? "★" : "☆"}
                      </button>
                    </div>

                    {projectName && (
                      <div className="note-project">
                        {projectName}
                      </div>
                    )}

                    {note.content && (
                      <p className="note-content">{note.content}</p>
                    )}

                    <div className="note-actions">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => handleEdit(note)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleDelete(note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default Notes;