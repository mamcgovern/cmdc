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
import { Link } from "react-router-dom";
import { db } from "../services/firebase";

function Projects() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");

  const [editingProjectId, setEditingProjectId] = useState(null);

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
    setName("");
    setDescription("");
    setStatus("active");
    setEditingProjectId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim()) return;

    const projectData = {
      name: name.trim(),
      description: description.trim(),
      status,
    };

    if (editingProjectId) {
      await updateDoc(doc(db, "projects", editingProjectId), {
        ...projectData,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "projects"), {
        ...projectData,
        createdAt: serverTimestamp(),
      });
    }

    resetForm();
  };

  const handleEdit = (project) => {
    setEditingProjectId(project.id);
    setName(project.name || "");
    setDescription(project.description || "");
    setStatus(project.status || "active");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (projectId) => {
    await deleteDoc(doc(db, "projects", projectId));

    if (editingProjectId === projectId) {
      resetForm();
    }
  };

  const getProjectStats = (projectId) => {
    const projectTasks = tasks.filter(
      (task) => task.projectId === projectId
    );

    const completed = projectTasks.filter((task) => {
      const taskStatus =
        task.status || (task.completed ? "done" : "todo");

      return taskStatus === "done";
    }).length;

    return {
      total: projectTasks.length,
      open: projectTasks.length - completed,
      completed,
    };
  };

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">CMDC</p>
        <h1>Projects</h1>
        <p className="date">
          Keep related tasks, notes, and deadlines together.
        </p>
      </header>

      <section className="project-layout">
        <form className="project-form" onSubmit={handleSubmit}>
          <div className="task-form-header">
            <h2>{editingProjectId ? "Edit Project" : "Add Project"}</h2>

            {editingProjectId && (
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
            Project name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Example: Canvas Support"
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project for?"
              rows="5"
            />
          </label>

          <label>
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <button type="submit" className="primary-button">
            {editingProjectId ? "Save Changes" : "Add Project"}
          </button>
        </form>

        <div className="project-list-card">
          <div className="card-header">
            <h2>Projects</h2>
            <span>{projects.length} total</span>
          </div>

          {projects.length === 0 ? (
            <p className="empty-state">No projects yet.</p>
          ) : (
            <div className="project-grid">
              {projects.map((project) => {
                const stats = getProjectStats(project.id);

                return (
                  <div key={project.id} className="project-card">
                    <div className="project-card-top">
                      <div>
                        <Link
                          to={`/projects/${project.id}`}
                          className="project-title-link"
                        >
                          <h3>{project.name}</h3>
                        </Link>

                        <span
                          className={`project-status project-status--${project.status}`}
                        >
                          {project.status.replace("-", " ")}
                        </span>
                      </div>

                      <div className="task-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => handleEdit(project)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => handleDelete(project.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {project.description && (
                      <p className="project-description">
                        {project.description}
                      </p>
                    )}

                    <div className="project-card-stats">
                      <span>{stats.open} open</span>
                      <span>{stats.completed} completed</span>
                      <span>{stats.total} total</span>
                    </div>

                    <Link
                      to={`/projects/${project.id}`}
                      className="project-open-link"
                    >
                      Open Project →
                    </Link>
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

export default Projects;